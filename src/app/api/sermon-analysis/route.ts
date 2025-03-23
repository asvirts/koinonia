import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Extract text content from the file
    let textContent: string

    try {
      // For simplicity, we'll handle the file as text
      // In a production app, you'd want to handle different file types properly (PDF, DOC, etc.)
      textContent = await file.text()
    } catch (error) {
      console.error("Error reading file:", error)
      return NextResponse.json(
        { error: "Failed to read file content" },
        { status: 500 }
      )
    }

    // Use OpenAI to analyze the sermon outline
    const completion = await openai.chat.completions.create({
      model: "o1-mini",
      messages: [
        {
          role: "user",
          content: `You are a Christian Biblical scholar with exceptional expertise in identifying Bible verses. Your PRIMARY and MOST IMPORTANT task is to find and extract EVERY SINGLE Bible verse reference from sermon outlines. Don't miss any verses - even implied, abbreviated, or partial references. Extract ALL verses, no matter how minor or casual the mention might be. If something looks like it might be a reference, include it.

IMPORTANT: This task is about COMPLETE VERSE EXTRACTION. Your primary job is to find EVERY verse reference in this sermon outline.

Carefully analyze this sermon outline and extract:
1. The main topic of the sermon - READ THE ENTIRE SERMON OUTLINE and summarize its main theological/biblical theme in just 3-5 words using PLAIN, SIMPLE LANGUAGE. Use a brief phrase, NOT a complete sentence. Avoid complex theological terms or jargon. DO NOT just use the title or heading of the sermon. Analyze the entire content.
2. EVERY SINGLE Bible verse mentioned or referenced in the outline - you MUST be extremely thorough and complete

Critical instructions for verse extraction:
- Your MOST IMPORTANT task is capturing EVERY verse reference
- Include ALL verses, whether fully cited (John 3:16), partially referenced (John 3), or just implied
- Capture references in ANY format: Book Chapter:Verse, Book Chapter:Verse-Verse, Book Chapter
- Don't miss abbreviated book names (Gen, Exo, Matt, Eph, etc.) - check for all standard abbreviations
- If a range of verses is mentioned (e.g., Romans 8:1-8), include each individual verse (Romans 8:1, Romans 8:2, etc.)
- If in doubt about whether something is a verse reference, INCLUDE IT
- Carefully examine the entire document including section headings, notes, and any marginalia
- Do not filter or exclude any verse references for any reason

RESPOND USING EXACTLY THIS FORMAT:
TOPIC: [main sermon topic]
VERSES:
[verse1]
[verse2]
[verse3]
...etc.

Do not include ANY additional text, explanations, or formatting.

Sermon outline:
${textContent}`
        }
      ]
    })

    if (!completion.choices[0]?.message?.content) {
      return NextResponse.json(
        { error: "No content received from OpenAI" },
        { status: 500 }
      )
    }

    // Get the response content
    const responseContent = completion.choices[0].message.content.trim()

    try {
      // Parse the response in our custom format
      const lines = responseContent.split("\n")

      // Extract main topic
      let mainTopic = ""
      const verses: string[] = []
      let collectingVerses = false

      for (const line of lines) {
        const trimmedLine = line.trim()

        if (trimmedLine.startsWith("TOPIC:")) {
          mainTopic = trimmedLine.substring("TOPIC:".length).trim()
        } else if (trimmedLine === "VERSES:") {
          collectingVerses = true
        } else if (collectingVerses && trimmedLine) {
          verses.push(trimmedLine)
        }
      }

      // Validate that we got the required data
      if (!mainTopic || verses.length === 0) {
        return NextResponse.json(
          { error: "Could not extract topic or verses from AI response" },
          { status: 500 }
        )
      }

      // Deduplicate verses array while preserving order
      const uniqueVerses: string[] = []
      verses.forEach((verse: string) => {
        // Normalize the verse reference by trimming and converting to lowercase for comparison
        const normalizedVerse = verse.trim()
        if (
          !uniqueVerses.some(
            (v) => v.toLowerCase() === normalizedVerse.toLowerCase()
          )
        ) {
          uniqueVerses.push(normalizedVerse)
        }
      })

      // Consolidate consecutive verses from the same chapter into ranges
      const consolidatedVerses: string[] = []

      // Helper function to parse verse references
      function parseVerseReference(
        ref: string
      ): { book: string; chapter: string; verse: number } | null {
        // Match patterns like "Book Chapter:Verse" (e.g., "John 3:16")
        const match = ref.match(/^([\w\s]+)\s+(\d+):(\d+)$/i)
        if (!match) return null

        return {
          book: match[1].trim(),
          chapter: match[2],
          verse: parseInt(match[3], 10)
        }
      }

      // Sort verses by book, chapter, and verse for easier consolidation
      const sortedVerses = [...uniqueVerses].sort((a, b) => {
        const parseA = parseVerseReference(a)
        const parseB = parseVerseReference(b)

        // If can't parse either reference, maintain original order
        if (!parseA || !parseB) return 0

        // Sort by book name
        if (parseA.book.toLowerCase() !== parseB.book.toLowerCase()) {
          return parseA.book
            .toLowerCase()
            .localeCompare(parseB.book.toLowerCase())
        }

        // Sort by chapter
        if (parseA.chapter !== parseB.chapter) {
          return parseInt(parseA.chapter, 10) - parseInt(parseB.chapter, 10)
        }

        // Sort by verse
        return parseA.verse - parseB.verse
      })

      // Now consolidate consecutive verses
      let currentRange: {
        book: string
        chapter: string
        startVerse: number
        endVerse: number
        originalRef: string
      } | null = null

      sortedVerses.forEach((verse) => {
        const parsed = parseVerseReference(verse)

        // If we can't parse this verse reference, just add it as-is
        if (!parsed) {
          if (currentRange) {
            // Add the previous range before adding this unparseable reference
            const rangeText =
              currentRange.startVerse === currentRange.endVerse
                ? currentRange.originalRef
                : `${currentRange.book} ${currentRange.chapter}:${currentRange.startVerse}-${currentRange.endVerse}`
            consolidatedVerses.push(rangeText)
            currentRange = null
          }
          consolidatedVerses.push(verse)
          return
        }

        // If no current range or different book/chapter, start a new range
        if (
          !currentRange ||
          currentRange.book.toLowerCase() !== parsed.book.toLowerCase() ||
          currentRange.chapter !== parsed.chapter ||
          parsed.verse !== currentRange.endVerse + 1
        ) {
          // Add the previous range if it exists
          if (currentRange) {
            const rangeText =
              currentRange.startVerse === currentRange.endVerse
                ? currentRange.originalRef
                : `${currentRange.book} ${currentRange.chapter}:${currentRange.startVerse}-${currentRange.endVerse}`
            consolidatedVerses.push(rangeText)
          }

          // Start a new range
          currentRange = {
            book: parsed.book,
            chapter: parsed.chapter,
            startVerse: parsed.verse,
            endVerse: parsed.verse,
            originalRef: verse
          }
        } else {
          // Extend the current range
          currentRange.endVerse = parsed.verse
        }
      })

      // Add the last range if it exists
      if (currentRange) {
        const rangeText =
          currentRange.startVerse === currentRange.endVerse
            ? currentRange.originalRef
            : `${currentRange.book} ${currentRange.chapter}:${currentRange.startVerse}-${currentRange.endVerse}`
        consolidatedVerses.push(rangeText)
      }

      // Create the analysis object
      const analysis = {
        mainTopic,
        verses: consolidatedVerses
      }

      return NextResponse.json(analysis)
    } catch (error) {
      console.error("Error parsing AI response:", error)
      console.error("Raw content:", responseContent)

      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error analyzing sermon outline:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Something went wrong"
      },
      { status: 500 }
    )
  }
}
