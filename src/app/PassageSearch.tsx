import OpenAI from "openai"

export default async function PassageSearch() {
  const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY })

  const verses = "Galatians 2"
  const questions = 8

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a Christian Biblical scholar. Provide a small group discussion guide for the given passages of Scripture."
      },
      {
        role: "user",
        content: `Create ${questions} small group discussion questions based on ${verses}`
      }
    ],
    store: true
  })

  console.log(completion.choices[0].message)

  return (
    <div>
      <p>{completion.choices[0].message.content}</p>
    </div>
  )
}
