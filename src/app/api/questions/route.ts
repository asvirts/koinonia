import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface QuestionResponse {
  questions: Array<string | { question: string }>
}

export async function POST(request: NextRequest) {
  try {
    const { verses, questions, topic } = await request.json()

    if (!verses || !questions) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: "o1-mini",
      messages: [
        {
          role: "user",
          content: `You are a Christian Biblical scholar creating small group discussion guides. Return only valid JSON with a 'questions' array.

Create ${questions} discussion questions for ${verses}${
            topic ? ` on the topic of ${topic}` : ""
          }. Questions should be substantial but concise, helping adults understand and apply the passage in a one-hour discussion. Format: {"questions": ["question 1", "question 2", ...]}${
            topic
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
