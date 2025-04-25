import { ImageResponse } from "next/og"

export const alt = "W8 DIM SUM EXPERIENCE"
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        background: "black",
        width: "100%",
        height: "100%",
      }}
    >
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg.jpg-dijHqYvXacjOniQwqmkYQi82hQVHjx.jpeg"
        alt="W8 DIM SUM EXPERIENCE"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>,
  )
}
