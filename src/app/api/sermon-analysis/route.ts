import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Define the interface for verse range
interface VerseRange {
  book: string
  chapter: string
  startVerse: number
  endVerse: number
  originalRef: string
}

// Helper interface for parsed verse references
interface ParsedVerseReference {
  book: string
  chapter: string
  verse: number
}

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
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
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
- If a range of verses is mentioned (e.g., Romans 8:1-8), include the range as one entry (like "Romans 8:1-8")
- If in doubt about whether something is a verse reference, INCLUDE IT
- Carefully examine the entire document including section headings, notes, and any marginalia
- Do not filter or exclude any verse references for any reason

You MUST respond with a valid JSON object that contains EXACTLY these fields:
- topic: the main sermon topic as a short phrase (3-5 words)
- verses: an array of strings, each string being a Bible verse reference

Example response format:
{
  "topic": "God's Love and Grace",
  "verses": [
    "John 3:16",
    "Romans 5:8",
    "Ephesians 2:8-9"
  ]
}

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
      // Parse the JSON response
      const parsedResponse = JSON.parse(responseContent)

      // Extract main topic and verses from the JSON
      const mainTopic = parsedResponse.topic
      const verses = parsedResponse.verses || []

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
      function parseVerseReference(ref: string): ParsedVerseReference | null {
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
      let currentRange: VerseRange | null = null

      sortedVerses.forEach((verse) => {
        const parsed = parseVerseReference(verse)

        // If we can't parse this verse reference, just add it as-is
        if (!parsed) {
          if (currentRange) {
            // Add the previous range before adding this unparseable reference
            const typedRange = currentRange as VerseRange
            const rangeText =
              typedRange.startVerse === typedRange.endVerse
                ? typedRange.originalRef
                : `${typedRange.book} ${typedRange.chapter}:${typedRange.startVerse}-${typedRange.endVerse}`
            consolidatedVerses.push(rangeText)
            currentRange = null
          }
          consolidatedVerses.push(verse)
          return
        }

        // If no current range or different book/chapter, start a new range
        if (
          !currentRange ||
          (currentRange as VerseRange).book.toLowerCase() !==
            parsed.book.toLowerCase() ||
          (currentRange as VerseRange).chapter !== parsed.chapter ||
          parsed.verse !== (currentRange as VerseRange).endVerse + 1
        ) {
          // Add the previous range if it exists
          if (currentRange) {
            const typedRange = currentRange as VerseRange
            const rangeText =
              typedRange.startVerse === typedRange.endVerse
                ? typedRange.originalRef
                : `${typedRange.book} ${typedRange.chapter}:${typedRange.startVerse}-${typedRange.endVerse}`
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
        const typedRange = currentRange as VerseRange
        const rangeText =
          typedRange.startVerse === typedRange.endVerse
            ? typedRange.originalRef
            : `${typedRange.book} ${typedRange.chapter}:${typedRange.startVerse}-${typedRange.endVerse}`
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
