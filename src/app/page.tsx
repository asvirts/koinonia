"use client"

import { useState } from "react"
import PassageSearch from "./PassageSearch"

export default function Home() {
  const [search, setSearch] = useState("")
  const [questions, setQuestions] = useState(8)

  return (
    <main className="p-8 gap-2 flex flex-col items-center justify-center h-full">
      <h1 className="text-3xl font-bold mb-4">Home</h1>
      <input
        className="border rounded p-2 mr-2"
        type="text"
        onChange={(e) => setSearch(e.target.value)}
      />
      <input
        className="border rounded p-2"
        type="number"
        onChange={(e) => setQuestions(parseInt(e.target.value))}
      />
      <PassageSearch search={search} questions={questions} />
    </main>
  )
}
