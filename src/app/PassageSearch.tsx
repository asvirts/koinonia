"use client"

import OpenAI from "openai"
import { useState } from "react"

export default function PassageSearch(props: {
  search: string
  loading: boolean
}) {
  return props.loading ? (
    <div>Loading...</div>
  ) : (
    <QuestionGenerator verses={props.search} />
  )
}

function QuestionGenerator({ verses }: { verses: string }) {
  const [result, setResult] = useState("No questions generated yet.")

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })

  const questions = 8

  async function generateQuestions() {
    setResult("Generating questions...")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Christian Biblical scholar. Provide a small group discussion guide for the given passages of Scripture. Only reply with the questions in valid JSON format."
        },
        {
          role: "user",
          content: `Create ${questions} small group discussion questions based on ${verses}`
        }
      ],
      response_format: { type: "json_object" },
      store: true
    })

    setResult(
      completion.choices[0].message.content ?? "No questions generated."
    )
  }

  return (
    <div>
      <button
        className="bg-black px-4 py-2 rounded"
        onClick={generateQuestions}
      >
        Generate New Questions
      </button>
      <br></br>
      {result}
    </div>
  )
}
