import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Extract text content from the file
    let textContent: string

    try {
      // For simplicity, we'll handle the file as text
      // In a production app, you'd want to handle different file types properly (PDF, DOC, etc.)
      textContent = await file.text()
    } catch (error) {
      console.error("Error reading file:", error)
      return NextResponse.json(
        { error: "Failed to read file content" },
        { status: 500 }
      )
    }

    // Use Claude to analyze the sermon outline
    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      system:
        "You are a Christian Biblical scholar. Analyze sermons and output only JSON with mainTopic and verses fields.",
      messages: [
        {
          role: "user",
          content: `Analyze this sermon outline and identify: 
1. The main topic 
2. All Bible verses that should be included

Response format: {"mainTopic": "topic", "verses": ["reference1", "reference2", ...]}

Sermon outline:
${textContent}`
        }
      ]
    })

    // Get the content from the first block, ensuring it's a text block
    const responseContent = message.content.find(
      (block) => block.type === "text"
    )
    if (!responseContent || responseContent.type !== "text") {
      return NextResponse.json(
        { error: "No text content received from Claude" },
        { status: 500 }
      )
    }

    // Clean the response to ensure it's valid JSON
    let cleanedContent = responseContent.text.trim()

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

    try {
      const analysis = JSON.parse(cleanedContent)

      // Validate that the required fields are present
      if (
        !analysis.mainTopic ||
        !analysis.verses ||
        !Array.isArray(analysis.verses)
      ) {
        return NextResponse.json(
          { error: "Invalid response format from AI" },
          { status: 500 }
        )
      }

      return NextResponse.json(analysis)
    } catch (parseError) {
      console.error("JSON parsing error:", parseError)
      console.error("Raw content:", responseContent.text)
      console.error("Cleaned content:", cleanedContent)

      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error analyzing sermon outline:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Something went wrong"
      },
      { status: 500 }
    )
  }
}
