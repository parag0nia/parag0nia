import Link from "next/link"
import PortraitCloud from "@/components/portrait-cloud"

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#111]">
      <PortraitCloud className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <Link
          href="https://www.instagram.com/w8.lisbon/"
          className="pointer-events-auto rounded text-white transition-colors hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
          style={{ fontSize: "32pt" }}
        >
          W8 STUDIO
        </Link>
      </div>
    </main>
  )
}
