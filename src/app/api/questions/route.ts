import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

// Rate limiting - simple in-memory store
// In production, use a proper rate limiting solution with Redis
const RATE_LIMIT_DURATION = 60 * 1000 // 1 minute in milliseconds
const MAX_REQUESTS = 5 // 5 requests per minute

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

// Sanitize input to prevent prompt injection attacks
function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[^\w\s.,;:'"?!()-]/g, "")
    .trim()
    .substring(0, 1000)
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

    // Sanitize inputs
    const sanitizedVerses = sanitizeInput(verses)
    const sanitizedTopic = topic ? sanitizeInput(topic) : ""

    const completion = await openai.chat.completions.create({
      model: "o1-mini",
      messages: [
        {
          role: "user",
          content: `You are a Christian Biblical scholar creating small group discussion guides. Return only valid JSON with a 'questions' array.

Create ${questions} discussion questions for ${sanitizedVerses}${
            sanitizedTopic ? ` on the topic of ${sanitizedTopic}` : ""
          }. Questions should be substantial but concise, helping adults understand and apply the passage in a one-hour discussion. Try to create questions that are not too obvious, not too similar to each other, that are not too easy to answer. Aim to create at least one question per Bible verse if possible. If there are more verses than the total number of questions the user asked for, see if you can combine some verses into a single question so all of the verses are included in the discussion guide, but don't force it if it doesn't make sense. Format: {"questions": ["question 1", "question 2", ...]}${
            sanitizedTopic
              ? " Organize thematically."
              : " Follow chapter chronologically."
          }`
        }
      ]
    })

    // Get the content from the response
    const textContent = completion.choices[0]?.message?.content
    if (!textContent) {
      return NextResponse.json(
        { error: "No content received from OpenAI" },
        { status: 500 }
      )
    }

    // Clean the response to ensure it's valid JSON
    let cleanedContent = textContent.trim()
    // If response starts with ``` or ends with ```, remove those markers (common in markdown code blocks)
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent
        .replace(/^```(?:json)?/, "")
        .replace(/```$/, "")
        .trim()
    }
    // If the response has any text before or after the JSON object, try to extract just the JSON part
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanedContent = jsonMatch[0]
    }

    let response: QuestionResponse
    try {
      response = JSON.parse(cleanedContent) as QuestionResponse
    } catch (parseError) {
      console.error("JSON parsing error:", parseError)
      console.error("Raw content:", textContent)
      console.error("Cleaned content:", cleanedContent)
      return NextResponse.json(
        { error: "Failed to parse OpenAI response as JSON" },
        { status: 500 }
      )
    }

    if (!response.questions || !Array.isArray(response.questions)) {
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      )
    }

    return NextResponse.json({ questions: response.questions })
  } catch (error) {
    console.error("Error generating questions:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Something went wrong"
      },
      { status: 500 }
    )
  }
}
