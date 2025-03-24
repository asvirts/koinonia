import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

// Rate limiting - simple in-memory store
// In production, use a proper rate limiting solution with Redis
const RATE_LIMIT_DURATION = 60 * 1000 // 1 minute in milliseconds
const MAX_REQUESTS = 20 // 20 requests per minute (increased from 5)

interface RateLimitEntry {
  count: number
  startTime: number
}

// Rate limit cache - should be replaced with Redis in production
const rateLimitCache = new Map<string, RateLimitEntry>()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface QuestionResponse {
  questions: Array<string | { question: string }>
}

interface OpenAIErrorResponse {
  response?: {
    data?: {
      error?: {
        message?: string
        type?: string
        code?: string
      }
    }
  }
}

// Sanitize input to prevent prompt injection attacks
function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[^\w\s.,;:'"?!()-]/g, "")
    .trim()
    .substring(0, 1000)
}

// Helper function to chunk array into smaller pieces
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Helper function to generate questions for a chunk of verses
async function generateQuestionsForChunk(
  verses: string,
  questions: number,
  topic?: string
): Promise<QuestionResponse> {
  const sanitizedVerses = sanitizeInput(verses)
  const sanitizedTopic = topic ? sanitizeInput(topic) : ""

  try {
    console.log("Attempting to generate questions for verses:", sanitizedVerses)
    console.log("Using topic:", sanitizedTopic)
    console.log("Number of questions requested:", questions)

    // Check if API key is present
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured")
      throw new Error("OpenAI API key is not configured")
    }

    const completion = await openai.chat.completions
      .create({
        model: "o1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a JSON-only response API. You must ONLY return valid JSON objects with no additional text, markdown formatting, or explanations. The response must be parseable by JSON.parse()."
          },
          {
            role: "user",
            content: `Return a JSON object with exactly this structure: {"questions": ["question1", "question2", ...]}

Create ${questions} discussion questions for these Bible verses: ${sanitizedVerses}${
              sanitizedTopic ? ` on the topic of ${sanitizedTopic}` : ""
            }. Questions should be substantial but concise, helping adults understand and apply the passage in a one-hour discussion. Try to create questions that are not too obvious, not too similar to each other, that are not too easy to answer. Aim to create at least one question per Bible verse if possible. If there are more verses than the total number of questions the user asked for, see if you can combine some verses into a single question so all of the verses are included in the discussion guide, but don't force it if it doesn't make sense.${
              sanitizedTopic
                ? " Organize thematically."
                : " Follow chapter chronologically."
            }

IMPORTANT: Return ONLY the JSON object with no additional text, markdown formatting, or explanations.`
          }
        ],
        max_completion_tokens: 1000
      })
      .catch((error) => {
        console.error("OpenAI API error:", error)
        if (error.response) {
          console.error("OpenAI API error response:", error.response.data)
          // Log the specific error message from OpenAI
          if (error.response.data?.error?.message) {
            console.error(
              "OpenAI error message:",
              error.response.data.error.message
            )
          }
        }
        throw error
      })

    const textContent = completion.choices[0]?.message?.content
    if (!textContent) {
      console.error(
        "No content received from OpenAI for verses:",
        sanitizedVerses
      )
      return { questions: [] }
    }

    console.log("Received response from OpenAI:", textContent)

    let cleanedContent = textContent.trim()
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent
        .replace(/^```(?:json)?/, "")
        .replace(/```$/, "")
        .trim()
    }
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanedContent = jsonMatch[0]
    }

    console.log("Cleaned content:", cleanedContent)

    try {
      const response = JSON.parse(cleanedContent) as QuestionResponse
      if (!response.questions || !Array.isArray(response.questions)) {
        console.error("Invalid response format for verses:", sanitizedVerses)
        console.error("Response:", response)
        return { questions: [] }
      }
      console.log("Successfully parsed questions:", response.questions)
      return response
    } catch (parseError) {
      console.error(
        "Error parsing OpenAI response for verses:",
        sanitizedVerses,
        parseError
      )
      console.error("Raw content that failed to parse:", cleanedContent)
      return { questions: [] }
    }
  } catch (error) {
    console.error(
      "Error generating questions for verses:",
      sanitizedVerses,
      error
    )
    if (error instanceof Error) {
      console.error("Error details:", error.message)
      console.error("Error stack:", error.stack)
      if ("response" in error) {
        console.error(
          "API Error response:",
          (error as OpenAIErrorResponse).response?.data
        )
      }
    }
    return { questions: [] }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting (in production, get this from headers)
    const ip = request.headers.get("x-forwarded-for") || "unknown"

    // Rate limiting check
    const now = Date.now()
    const rateLimit = rateLimitCache.get(ip)

    if (rateLimit) {
      // Reset rate limit if duration has passed
      if (now - rateLimit.startTime > RATE_LIMIT_DURATION) {
        rateLimitCache.set(ip, { count: 1, startTime: now })
      } else if (rateLimit.count >= MAX_REQUESTS) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        )
      } else {
        // Increment the request count
        rateLimitCache.set(ip, {
          count: rateLimit.count + 1,
          startTime: rateLimit.startTime
        })
      }
    } else {
      // First request from this IP
      rateLimitCache.set(ip, { count: 1, startTime: now })
    }

    // Content-type validation
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected application/json." },
        { status: 400 }
      )
    }

    const { verses, questions, topic } = await request.json()

    if (!verses || !questions) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    // Validate and sanitize inputs
    if (typeof verses !== "string" || verses.length > 1000) {
      return NextResponse.json(
        { error: "Invalid verses parameter" },
        { status: 400 }
      )
    }

    if (typeof questions !== "number" || questions < 1 || questions > 20) {
      return NextResponse.json(
        {
          error:
            "Invalid questions parameter. Must be a number between 1 and 20."
        },
        { status: 400 }
      )
    }

    // Split verses into chunks of 3 (reduced from 5 to handle complexity better)
    const verseArray = verses.split(",").map((v) => v.trim())
    console.log(`Processing ${verseArray.length} verses in chunks`)

    const verseChunks = chunkArray(verseArray, 3)

    // Calculate questions per chunk (round up to ensure we get enough questions)
    const questionsPerChunk = Math.ceil(questions / verseChunks.length)
    console.log(
      `Processing ${verseChunks.length} chunks with ${questionsPerChunk} questions per chunk`
    )

    // Process each chunk
    const allQuestions: Array<string | { question: string }> = []
    for (const [index, chunk] of verseChunks.entries()) {
      try {
        console.log(`Processing chunk ${index + 1}/${verseChunks.length}`)
        const chunkResponse = await generateQuestionsForChunk(
          chunk.join(", "),
          questionsPerChunk,
          topic
        )
        if (chunkResponse.questions && chunkResponse.questions.length > 0) {
          allQuestions.push(...chunkResponse.questions)
          console.log(
            `Successfully generated ${
              chunkResponse.questions.length
            } questions for chunk ${index + 1}`
          )
        } else {
          console.error(`No questions generated for chunk ${index + 1}`)
        }
      } catch (error) {
        console.error(`Error processing chunk ${index + 1}:`, error)
        // Continue with other chunks even if one fails
        continue
      }
    }

    // If we got no questions at all, try one more time with a smaller subset
    if (allQuestions.length === 0) {
      console.log(
        "No questions generated from chunks, trying with a smaller subset"
      )
      const subsetVerses = verseArray.slice(0, 5).join(", ") // Try with just first 5 verses
      const fullResponse = await generateQuestionsForChunk(
        subsetVerses,
        questions,
        topic
      )
      if (fullResponse.questions && fullResponse.questions.length > 0) {
        allQuestions.push(...fullResponse.questions)
        console.log(
          `Successfully generated ${fullResponse.questions.length} questions from subset`
        )
      }
    }

    // If we still have no questions, return an error
    if (allQuestions.length === 0) {
      console.error("Failed to generate any questions after all attempts")
      return NextResponse.json(
        { error: "Failed to generate any questions. Please try again." },
        { status: 500 }
      )
    }

    // Take only the requested number of questions
    const finalQuestions = allQuestions.slice(0, questions)
    console.log(
      `Successfully generated ${finalQuestions.length} questions total`
    )

    return NextResponse.json({ questions: finalQuestions })
  } catch (error) {
    console.error("Error generating questions:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
