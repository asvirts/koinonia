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
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Christian Biblical scholar. Provide a small group discussion guide for the given passages of Scripture. Only reply with the questions in valid JSON format with a 'questions' array."
        },
        {
          role: "user",
          content: `Create ${questions} thought-provoking small group discussion questions based on ${verses}${
            topic ? ` and base the questions on the topic ${topic}` : ""
          }. The questions should not be too long or too wordy to avoid confusing the group, but should still have good substance.`
        }
      ],
      response_format: { type: "json_object" }
    })

    if (!completion.choices[0].message.content) {
      return NextResponse.json(
        { error: "No content received from OpenAI" },
        { status: 500 }
      )
    }

    let response: QuestionResponse;
    try {
      response = JSON.parse(
        completion.choices[0].message.content
      ) as QuestionResponse;
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw content:", completion.choices[0].message.content);
      return NextResponse.json(
        { error: "Failed to parse OpenAI response as JSON" },
        { status: 500 }
      );
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
