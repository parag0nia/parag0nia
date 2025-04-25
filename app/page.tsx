import Link from "next/link"

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Link
        href="https://shotgun.live/en/events/w-8-x-dim-sum"
        className="block w-full h-full transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <div className="relative w-full h-full bg-black">
          {/* Using a regular img tag as a fallback solution */}
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg.jpg-dijHqYvXacjOniQwqmkYQi82hQVHjx.jpeg"
            alt="W8 DIM SUM EXPERIENCE at Rua do Açucar 76"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </Link>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 right-4 p-3 bg-black/70 text-white rounded-lg max-w-xs opacity-70 hover:opacity-100 transition-opacity">
        <p className="text-sm font-medium">Click anywhere to go to event page</p>
      </div>
    </main>
  )
}
