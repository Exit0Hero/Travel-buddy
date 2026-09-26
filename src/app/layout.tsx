import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Travel Buddy — Trips that fit your day",
  description: "A calmer way to find the right place, at the right pace, for the time you actually have.",
}

export const viewport: Viewport = {
  themeColor: "#070b0d",
  colorScheme: "dark",
  userScalable: true,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
