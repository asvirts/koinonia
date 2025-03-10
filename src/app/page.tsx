"use client"

import { useState } from "react"
import PassageSearch from "./PassageSearch"

export default function Home() {
  const [search, setSearch] = useState("")
  const [questions, setQuestions] = useState(8)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.replace(/\s+/g, ' '))
  }

  const handleQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestions(parseInt(e.target.value))
  }

  return (
    <main className="p-4 container mx-auto">
      <h1 className="text-3xl font-bold mb-4">Small Group Questions Generator</h1>
      <p className="text-gray-500 mb-4">Enter a passage of scripture and the number of questions you want to generate.  The questions will be generated based on the passage(s) and the number of questions you request.</p>
      <div className="py-4 flex items-center gap-2">
        <div className="flex flex-col">
        <label className="text-gray-500" htmlFor="search">Verses</label>
        <input
          id="search"
          className="border rounded p-2 mr-2"
          type="text"
          onChange={handleSearchChange}
        />
        </div>
        <div className="flex flex-col">
          <label className="text-gray-500" htmlFor="questions"># of Questions</label>
          <input
            id="questions"
            className="border rounded p-2"
            type="number"
            onChange={handleQuestionsChange}
          />
        </div>
      </div>
      <PassageSearch search={search} questions={questions} />
    </main>
  )
}
