import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

// Initialize OpenAI client on the server side
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
          content:
            'You are a Christian Biblical scholar. Provide a small group discussion guide for the given passages of Scripture. Your response must be ONLY valid JSON with a \'questions\' array containing the discussion questions. The format should be exactly: {"questions": ["question 1", "question 2", ...]}. Do not include any explanations, markdown, or text outside of the JSON structure.\n\n' +
            `Create ${questions} thought-provoking small group discussion questions based on ${verses}${
              topic ? ` and base the questions on the topic ${topic}` : ""
            }. The questions should not be too long or too wordy to avoid confusing the group, but should still have good substance.`
        }
      ]
    })

    if (!completion.choices[0].message.content) {
      return NextResponse.json(
        { error: "No content received from OpenAI" },
        { status: 500 }
      )
    }

    // Clean the response to ensure it's valid JSON
    let cleanedContent = completion.choices[0].message.content.trim()
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
      console.error("Raw content:", completion.choices[0].message.content)
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
