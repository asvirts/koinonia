import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

// Initialize Anthropic client on the server side
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
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

    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      system:
        "You are a Christian Biblical scholar creating small group discussion guides. Return only valid JSON with a 'questions' array.",
      messages: [
        {
          role: "user",
          content: `Create ${questions} discussion questions for ${verses}${
            topic ? ` on the topic of ${topic}` : ""
          }. Questions should be substantial but concise, helping adults understand and apply the passage in a one-hour discussion. Format: {"questions": ["question 1", "question 2", ...]}${
            topic
              ? " Organize thematically."
              : " Follow chapter chronologically."
          }`
        }
      ]
    })

    // Get the content from the first block, ensuring it's a text block
    const textContent = message.content.find((block) => block.type === "text")
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No text content received from Claude" },
        { status: 500 }
      )
    }

    // Clean the response to ensure it's valid JSON
    let cleanedContent = textContent.text.trim()
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
      console.error("Raw content:", textContent.text)
      console.error("Cleaned content:", cleanedContent)
      return NextResponse.json(
        { error: "Failed to parse Claude response as JSON" },
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
