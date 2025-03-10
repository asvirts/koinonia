"use client"

import OpenAI from "openai"
import { useState } from "react"

interface QuestionResponse {
  questions: Array<string | { question: string }>
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
  const [data, setData] = useState<Array<string | { question: string }>>([])

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

  function formatQuestions(questions: Array<string | { question: string }>) {
    return questions.map((question, index) => (
      <li key={index} className="my-4">
        {typeof question === 'object' && question !== null && 'question' in question
          ? question.question
          : question}
      </li>
    ))
  }

  return (
    <div>
      <button
        className="bg-black text-white hover:bg-gray-800 hover:cursor-pointer px-4 py-2 rounded"
        onClick={() => generateQuestions(verses, questions)}
      >
        Generate New Questions
      </button>
      <p className="py-4">{result}</p>
      <ol className="py-4">{data.length > 0 ? formatQuestions(data) : null}</ol>
    </div>
  )
}
