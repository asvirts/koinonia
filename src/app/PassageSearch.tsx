"use client"

import { useState } from "react"

export default function PassageSearch(props: {
  search: string
  questions: number
  topic: string
}) {
  return (
    <QuestionGenerator
      verses={props.search}
      questions={props.questions}
      topic={props.topic}
    />
  )
}

function QuestionGenerator({
  verses,
  questions,
  topic
}: {
  verses: string
  questions: number
  topic: string
}) {
  const [result, setResult] = useState("No questions generated yet.")
  const [data, setData] = useState<Array<string | { question: string }>>([])

  async function generateQuestions(
    verses: string,
    questions: number,
    topic: string
  ) {
    try {
      setResult("Generating questions...")

      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ verses, questions, topic })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate questions")
      }

      const data = await response.json()

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid response format")
      }

      setData(data.questions)
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
        {typeof question === "object" &&
        question !== null &&
        "question" in question
          ? question.question
          : question}
      </li>
    ))
  }

  return (
    <div>
      <button
        className="bg-black text-white hover:bg-gray-800 hover:cursor-pointer px-4 py-2 rounded"
        onClick={() => generateQuestions(verses, questions, topic)}
      >
        Generate New Questions
      </button>
      <p className="py-4">{result}</p>
      <ol className="py-4">{data.length > 0 ? formatQuestions(data) : null}</ol>
    </div>
  )
}
