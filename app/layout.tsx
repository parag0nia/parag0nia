import type React from "react"
import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "W8 DIM SUM EXPERIENCE",
  description: "W8 DIM SUM EXPERIENCE at Rua do Açúcar 76, Lisboa",
  openGraph: {
    title: "W8 DIM SUM EXPERIENCE",
    description: "W8 DIM SUM EXPERIENCE at Rua do Açúcar 76, Lisboa",
    url: "https://www.w8.studio",
    siteName: "W8 Studio",
  },
  twitter: {
    title: "W8 DIM SUM EXPERIENCE",
    description: "W8 DIM SUM EXPERIENCE at Rua do Açúcar 76, Lisboa",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
