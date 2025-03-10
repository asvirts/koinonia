"use client"

import OpenAI from "openai"
import { useState } from "react"

interface QuestionResponse {
  questions: string[]
}

export default function PassageSearch(props: {
  search: string
  questions: number
}) {
  return <QuestionGenerator verses={props.search} questions={props.questions} />
}

function QuestionGenerator({
  verses,
  questions
}: {
  verses: string
  questions: number
}) {
  const [result, setResult] = useState("No questions generated yet.")
  const [data, setData] = useState<string[]>([])

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })

  async function generateQuestions(verses: string, questions: number) {
    try {
      setResult("Generating questions...")

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a Christian Biblical scholar. Provide a small group discussion guide for the given passages of Scripture. Only reply with the questions in valid JSON format with a 'questions' array."
          },
          {
            role: "user",
            content: `Create ${questions} small group discussion questions based on ${verses}`
          }
        ],
        response_format: { type: "json_object" }
      })

      if (!completion.choices[0].message.content) {
        throw new Error("No content received from OpenAI")
      }

      const response = JSON.parse(
        completion.choices[0].message.content
      ) as QuestionResponse
      if (!response.questions || !Array.isArray(response.questions)) {
        throw new Error("Invalid response format")
      }

      setData(response.questions)
      setResult("Questions generated successfully!")
    } catch (error) {
      setResult(
        `Error: ${
          error instanceof Error ? error.message : "Something went wrong"
        }`
      )
      setData([])
    }
  }

  function formatQuestions(questions: string[]) {
    return questions.map((question, index) => (
      <li key={index} className="my-4">
        {question}
      </li>
    ))
  }

  return (
    <div>
      <button
        className="bg-black px-4 py-2 rounded"
        onClick={() => generateQuestions(verses, questions)}
      >
        Generate New Questions
      </button>
      <br></br>
      <ol className="py-4">{data.length > 0 && formatQuestions(data)}</ol>
      <p>{result}</p>
    </div>
  )
}
