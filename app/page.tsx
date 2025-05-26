import Link from "next/link"

export default function Home() {
  return (
    <main className="w-screen h-screen bg-black flex items-center justify-center">
      <Link
        href="https://www.instagram.com/w8.lisbon/"
        className="text-white hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
        style={{ fontSize: "32pt" }}
      >
        W8 STUDIO
      </Link>
    </main>
  )
}
