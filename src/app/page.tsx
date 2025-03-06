"use client"

import { useState } from "react"
import PassageSearch from "./PassageSearch"

export default function Home() {
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  return (
    <main>
      <h1>Home</h1>
      <input type="text" onChange={(e) => setSearch(e.target.value)} />
      <PassageSearch search={search} loading={loading} />
    </main>
  )
}
