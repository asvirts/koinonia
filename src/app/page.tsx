"use client"

import { useState } from "react"
import PassageSearch from "./PassageSearch"
import SermonOutlineUpload from "./SermonOutlineUpload"

export default function Home() {
  const [search, setSearch] = useState("")
  const [topic, setTopic] = useState("")
  const [questions, setQuestions] = useState(8)
  const [activeTab, setActiveTab] = useState("questions") // "questions" or "sermon"

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.replace(/\s+/g, " "))
  }

  const handleQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestions(parseInt(e.target.value))
  }

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
  }

  // Handle sermon analysis results and redirect to questions tab
  const handleSermonAnalysisComplete = (
    newTopic: string,
    newVerses: string
  ) => {
    setTopic(newTopic)
    setSearch(newVerses)
    setActiveTab("questions")
  }

  return (
    <main className="p-4 container mx-auto pb-16">
      <h1 className="text-3xl font-bold">Koinonia</h1>
      <p className="text-gray-500 mb-4">
        (κοινωνία) &quot;coin-own-e-uh&quot; | Ancient Greek meaning conveys
        &quot;community,&quot; &quot;partnership,&quot; and &quot;shared
        life&quot;
      </p>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab("questions")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "questions"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Small Group Questions
          </button>
          <button
            onClick={() => setActiveTab("sermon")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sermon"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Sermon Outline Analysis
          </button>
        </nav>
      </div>

      {/* Content for Small Group Questions tab */}
      {activeTab === "questions" && (
        <>
          <h2 className="text-xl mb-4">Small Group Questions Generator</h2>
          <p className="text-gray-500 mb-4">
            Enter a passage of scripture and the number of questions you want to
            generate. The questions will be generated based on the passage(s)
            and the number of questions you request.
          </p>
          <div className="py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="w-full">
              <label
                htmlFor="verses"
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
                    value={search}
                    placeholder="e.g. 1 Cor 3:7, Romans 5-8, etc."
                    onChange={handleSearchChange}
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
            <div className="w-full">
              <label
                htmlFor="questions"
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
            <div className="w-full">
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
                    value={topic}
                    placeholder="e.g. Faith, Hope, Love, etc."
                    onChange={handleTopicChange}
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
          </div>
          <PassageSearch search={search} questions={questions} topic={topic} />
        </>
      )}

      {/* Content for Sermon Outline Analysis tab */}
      {activeTab === "sermon" && (
        <SermonOutlineUpload
          onAnalysisComplete={handleSermonAnalysisComplete}
        />
      )}
    </main>
  )
}
