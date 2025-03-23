"use client"

import { useState, useEffect } from "react"

// Define a type for saved question sets
interface SavedQuestionSet {
  id: string
  timestamp: number
  verses: string
  topic: string
  questions: Array<string | { question: string }>
}

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
  const [savedQuestionSets, setSavedQuestionSets] = useState<
    SavedQuestionSet[]
  >([])
  const [showSaved, setShowSaved] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load saved questions from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedQuestions = localStorage.getItem("savedQuestions")
      if (savedQuestions) {
        setSavedQuestionSets(JSON.parse(savedQuestions))
      }
    }
  }, [])

  async function generateQuestions(
    verses: string,
    questions: number,
    topic: string
  ) {
    try {
      setIsLoading(true)
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

      // Save the questions to localStorage
      if (typeof window !== "undefined") {
        const timestamp = Date.now()
        const newQuestionSet: SavedQuestionSet = {
          id: timestamp.toString(),
          timestamp,
          verses,
          topic,
          questions: data.questions
        }

        const updatedSets = [...savedQuestionSets, newQuestionSet]
        setSavedQuestionSets(updatedSets)
        localStorage.setItem("savedQuestions", JSON.stringify(updatedSets))
      }
    } catch (error) {
      setResult(
        `Error: ${
          error instanceof Error ? error.message : "Something went wrong"
        }`
      )
      setData([])
    } finally {
      setIsLoading(false)
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

  function clearAllSaved() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("savedQuestions")
      setSavedQuestionSets([])
    }
  }

  function formatDate(timestamp: number) {
    if (!isClient) {
      return "" // Return empty string during server rendering
    }
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          className={`bg-black text-white hover:bg-gray-800 hover:cursor-pointer px-4 py-2 rounded flex items-center justify-center min-w-36 ${
            isLoading ? "opacity-70 cursor-not-allowed" : ""
          }`}
          onClick={() =>
            !isLoading && generateQuestions(verses, questions, topic)
          }
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating...
            </>
          ) : (
            "Generate New Questions"
          )}
        </button>
        <button
          className="bg-indigo-600 text-white hover:bg-indigo-700 hover:cursor-pointer px-4 py-2 rounded"
          onClick={() => setShowSaved(!showSaved)}
        >
          {showSaved ? "Hide Saved Questions" : "Show Saved Questions"}
        </button>
        {isClient && savedQuestionSets.length > 0 && (
          <button
            className="bg-red-600 text-white hover:bg-red-700 hover:cursor-pointer px-4 py-2 rounded"
            onClick={clearAllSaved}
          >
            Clear All Saved Questions
          </button>
        )}
      </div>

      {!showSaved ? (
        <>
          <p className="py-4">{result}</p>
          <ol className="py-4">
            {data.length > 0 ? formatQuestions(data) : null}
          </ol>
        </>
      ) : (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Saved Question Sets</h2>
          {!isClient ? (
            <p>Loading...</p>
          ) : savedQuestionSets.length === 0 ? (
            <p className="text-gray-500">No saved question sets found.</p>
          ) : (
            <div className="space-y-8">
              {savedQuestionSets
                .slice() // Create a copy to avoid mutating the original array
                .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp in descending order
                .map((set) => (
                  <div key={set.id} className="border p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      {set.topic ? (
                        <>
                          <h3 className="font-bold text-lg">{set.topic}</h3>
                          <p className="text-gray-500">{set.verses}</p>
                        </>
                      ) : (
                        <h3 className="font-bold text-lg">{set.verses}</h3>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDate(set.timestamp)}
                      </span>
                    </div>
                    <ol className="list-decimal pl-6">
                      {formatQuestions(set.questions)}
                    </ol>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
