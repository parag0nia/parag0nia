import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "W8 DIM SUM EXPERIENCE",
  description: "W8 DIM SUM EXPERIENCE at Rua do Açúcar 76, Lisboa",
  openGraph: {
    title: "W8 DIM SUM EXPERIENCE",
    description: "W8 DIM SUM EXPERIENCE at Rua do Açúcar 76, Lisboa",
    images: [
      {
        url: "/w8-dim-sum.png",
        width: 1200,
        height: 630,
        alt: "W8 DIM SUM EXPERIENCE",
      },
    ],
  },
}

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Link
        href="https://shotgun.live/en/events/w-8-x-dim-sum"
        className="block w-full h-full transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <div className="relative w-full h-full">
          <Image
            src="/w8-dim-sum.png"
            alt="W8 DIM SUM EXPERIENCE at Rua do Açucar 76"
            fill
            className="object-cover"
            priority
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
