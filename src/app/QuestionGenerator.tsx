"use client"

import { useState } from "react"
import OpenAI from "openai"

export default function QuestionGenerator({ verses }: { verses: string }) {
  const [result, setResult] = useState("No questions generated yet.")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateQuestions = async () => {
    setIsGenerating(true)
    setResult("Generating questions...")

    try {
      const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      })
      const completion = await openai.chat.completions.create({
        model: "gpt-4-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a Christian Biblical scholar. Provide a small group discussion guide for the given passages of Scripture. Only reply with the questions in valid JSON format."
          },
          {
            role: "user",
            content: `Create 8 small group discussion questions based on ${verses}`
          }
        ],
        response_format: { type: "json_object" }
      })

      setResult(
        completion.choices[0].message.content ?? "No questions generated."
      )
    } catch (error) {
      setResult("Error generating questions.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <button
        className="bg-black px-4 py-2 rounded"
        onClick={handleGenerateQuestions}
        disabled={isGenerating}
      >
        Generate New Questions
      </button>
      <br />
      {result}
    </div>
  )
}
