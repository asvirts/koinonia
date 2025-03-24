"use client"

import { useState, useEffect } from "react"

interface SermonAnalysisResult {
  verses: string[]
  mainTopic: string
}

interface SavedSermonAnalysis {
  id: string
  timestamp: number
  mainTopic: string
  verses: string[]
  fileTitle: string
}

interface SermonOutlineUploadProps {
  onAnalysisComplete: (topic: string, verses: string) => void
}

export default function SermonOutlineUpload({
  onAnalysisComplete
}: SermonOutlineUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<SermonAnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [savedAnalyses, setSavedAnalyses] = useState<SavedSermonAnalysis[]>([])
  const [showSaved, setShowSaved] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load saved analyses from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSermonAnalyses = localStorage.getItem("savedSermonAnalyses")
      if (savedSermonAnalyses) {
        setSavedAnalyses(JSON.parse(savedSermonAnalyses))
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError("Please select a file to upload")
      return
    }

    // Check file type (allowing text and document files)
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please upload a text or document file (.txt, .pdf, .doc, .docx)"
      )
      return
    }

    // Check file extension as an additional security layer
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    const allowedExtensions = ["txt", "pdf", "doc", "docx"]
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      setError(
        "Invalid file format. Please upload a .txt, .pdf, .doc, or .docx file"
      )
      return
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError("File size must be less than 5MB")
      return
    }

    try {
      setIsUploading(true)
      setError("")

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/sermon-analysis", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze sermon outline")
      }

      const data = await response.json()
      setResult(data)

      // Save the analysis to localStorage
      if (typeof window !== "undefined" && data.mainTopic && data.verses) {
        const timestamp = Date.now()
        const newAnalysis: SavedSermonAnalysis = {
          id: timestamp.toString(),
          timestamp,
          mainTopic: data.mainTopic,
          verses: data.verses,
          fileTitle: file.name
        }

        const updatedAnalyses = [...savedAnalyses, newAnalysis]
        setSavedAnalyses(updatedAnalyses)
        localStorage.setItem(
          "savedSermonAnalyses",
          JSON.stringify(updatedAnalyses)
        )
      }

      // Pass the results back to the parent component and redirect
      if (data.mainTopic && data.verses) {
        // Convert verses array to a comma-separated string that can be used in search
        const versesString = data.verses.join(", ")
        onAnalysisComplete(data.mainTopic, versesString)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsUploading(false)
    }
  }

  function clearAllSaved() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("savedSermonAnalyses")
      setSavedAnalyses([])
    }
  }

  function formatDate(timestamp: number) {
    if (!isClient) {
      return "" // Return empty string during server rendering
    }
    return new Date(timestamp).toLocaleString()
  }

  function handleUseAnalysis(analysis: SavedSermonAnalysis) {
    const versesString = analysis.verses.join(", ")
    onAnalysisComplete(analysis.mainTopic, versesString)
  }

  return (
    <div className="my-8">
      <h2 className="text-xl mb-4">Sermon Outline Analysis</h2>
      <p className="text-gray-500 mb-4">
        Upload a sermon outline document to have AI analyze it and identify
        relevant Bible verses and the main topic.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          className="bg-indigo-600 text-white hover:bg-indigo-700 hover:cursor-pointer px-4 py-2 rounded"
          onClick={() => setShowSaved(!showSaved)}
        >
          {showSaved ? "Hide Saved Analyses" : "Show Saved Analyses"}
        </button>
        {isClient && savedAnalyses.length > 0 && (
          <button
            className="bg-red-600 text-white hover:bg-red-700 hover:cursor-pointer px-4 py-2 rounded"
            onClick={clearAllSaved}
          >
            Clear All Saved Analyses
          </button>
        )}
      </div>

      {!showSaved ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="sermon-file"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Upload Sermon Outline
              </label>
              <input
                id="sermon-file"
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gray-50 file:text-gray-700
                  hover:file:bg-gray-100"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isUploading || !file}
              className={`bg-black text-white hover:bg-gray-800 hover:cursor-pointer px-4 py-2 rounded flex items-center justify-center ${
                isUploading || !file ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isUploading ? (
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
                  Analyzing...
                </>
              ) : (
                "Analyze Sermon Outline"
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8 p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>

              <div className="mb-4">
                <h4 className="font-medium">Main Topic:</h4>
                <p className="mt-1">{result.mainTopic}</p>
              </div>

              <div>
                <h4 className="font-bold text-lg">Suggested Bible Verses:</h4>
                {result.verses.length > 0 ? (
                  <ul className="mt-1 space-y-1 list-disc pl-5">
                    {result.verses.map((verse, index) => (
                      <li key={index}>{verse}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-gray-500">No verses found.</p>
                )}
              </div>

              <button
                onClick={() => {
                  if (result.mainTopic && result.verses) {
                    const versesString = result.verses.join(", ")
                    onAnalysisComplete(result.mainTopic, versesString)
                  }
                }}
                className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700 hover:cursor-pointer px-4 py-2 rounded"
              >
                Use These Results for Questions
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Saved Sermon Analyses</h2>
          {!isClient ? (
            <p>Loading...</p>
          ) : savedAnalyses.length === 0 ? (
            <p className="text-gray-500">No saved sermon analyses found.</p>
          ) : (
            <div className="space-y-8">
              {savedAnalyses
                .slice() // Create a copy to avoid mutating the original array
                .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp in descending order
                .map((analysis) => (
                  <div key={analysis.id} className="border p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{analysis.fileTitle}</h3>
                        <button
                          onClick={() => handleUseAnalysis(analysis)}
                          className="bg-indigo-600 text-white hover:bg-indigo-700 hover:cursor-pointer px-3 py-1 rounded text-sm"
                        >
                          Use This Analysis
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(analysis.timestamp)}
                      </span>
                    </div>
                    <div className="mb-3">
                      <h4 className="font-medium">Topic:</h4>
                      <p className="mt-1">{analysis.mainTopic}</p>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-medium">Verses:</h4>
                      <ul className="mt-1 space-y-1 list-disc pl-5">
                        {analysis.verses.map((verse, index) => (
                          <li key={index}>{verse}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
