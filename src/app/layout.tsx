import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Small Group Questions Generator",
  description: "Generate small group questions based on a passage of scripture."
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
