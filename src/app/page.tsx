"use client"

import { useState } from "react"
import PassageSearch from "./PassageSearch"

export default function Home() {
  const [search, setSearch] = useState("")
  const [topic, setTopic] = useState("")
  const [questions, setQuestions] = useState(8)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.replace(/\s+/g, " "))
  }

  const handleQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestions(parseInt(e.target.value))
  }

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
  }

  return (
    <main className="p-4 container mx-auto">
      <h1 className="text-3xl font-bold mb-4">Koinonia</h1>
      <h2 className="text-xl mb-4">Small Group Questions Generator</h2>
      <p className="text-gray-500 mb-4">
        Enter a passage of scripture and the number of questions you want to
        generate. The questions will be generated based on the passage(s) and
        the number of questions you request.
      </p>
      <div className="py-4 flex sm:flex-col md:flex-row items-center gap-2">
        <div className="flex-grow w-full">
          <label
            htmlFor="topic"
            className="block text-sm/6 font-medium text-gray-900"
          >
            Verses
          </label>
          <div className="mt-2">
            <div className="flex items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-indigo-600">
              <input
                id="verses"
                name="verses"
                type="text"
                placeholder="e.g. 1 Cor 3:7, Romans 5-8, etc."
                onChange={handleSearchChange}
                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
              />
            </div>
          </div>
        </div>
        <div className="flex-grow w-full">
          <label
            htmlFor="topic"
            className="block text-sm/6 font-medium text-gray-900"
          >
            How many questions?
          </label>
          <div className="mt-2">
            <div className="flex items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-indigo-600">
              <input
                id="questions"
                name="questions"
                type="number"
                onChange={handleQuestionsChange}
                placeholder="e.g. 8, 10, 12, etc."
                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
              />
            </div>
          </div>
        </div>
        <div className="flex-grow w-full">
          <label
            htmlFor="topic"
            className="block text-sm/6 font-medium text-gray-900"
          >
            Topic or Theme
          </label>
          <div className="mt-2">
            <div className="flex items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-indigo-600">
              <input
                id="topic"
                name="topic"
                type="text"
                placeholder="e.g. Faith, Hope, Love, etc."
                onChange={handleTopicChange}
                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
              />
            </div>
          </div>
        </div>
      </div>
      <PassageSearch search={search} questions={questions} topic={topic} />
    </main>
  )
}
