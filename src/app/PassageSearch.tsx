import OpenAI from "openai"

export default async function PassageSearch(props: {
  search: string
  loading: boolean
}) {
  const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY })

  const verses = "Galatians 2"
  const questions = 8

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a Christian Biblical scholar. Provide a small group discussion guide for the given passages of Scripture. Only reply with the questions in valid JSON format."
      },
      {
        role: "user",
        content: `Create ${questions} small group discussion questions based on ${verses}`
      }
    ],
    response_format: { type: "json_object" },
    store: true
  })

  return props.loading ? (
    <div>Loading...</div>
  ) : (
    <div>{completion.choices[0].message.content}</div>
  )
}
