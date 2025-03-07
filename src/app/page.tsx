"use client"

import { useState } from "react"
import PassageSearch from "./PassageSearch"

export default function Home() {
  const [search, setSearch] = useState("")
  const [questions, setQuestions] = useState(8)

  return (
    <main>
      <h1>Home</h1>
      <input
        className="border"
        type="text"
        onChange={(e) => setSearch(e.target.value)}
      />
      <input
        className="border"
        type="number"
        onChange={(e) => setQuestions(parseInt(e.target.value))}
      />
      <PassageSearch search={search} questions={questions} />
    </main>
  )
}
