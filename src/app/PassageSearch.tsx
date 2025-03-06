export default function PassageSearch() {
  const data = fetch(`https://api.esv.org/v3/passage/search/?q=John3:16`, {
    headers: {
      Authorization: `Token ${process.env.NEXT_PUBLIC_API_KEY}`
    }
  }).then((res) => res.json())

  console.log(data)

  return (
    <div>
      <p>{data}</p>
    </div>
  )
}
