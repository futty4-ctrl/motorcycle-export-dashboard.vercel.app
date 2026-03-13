import type { Metadata } from "next"
import { DM_Mono, DM_Sans } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/sonner"

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
})
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "MotoExport Dashboard",
  description: "バイク輸出管理システム",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body
        className={`${dmMono.variable} ${dmSans.variable}`}
        style={{ margin: 0, background: "#0a0a0a", color: "#f5f5f5" }}
      >
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main
            style={{
              flex: 1,
              marginLeft: 220,
              padding: "32px 36px",
              minHeight: "100vh",
              background: "#0a0a0a",
              boxSizing: "border-box",
            }}
          >
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
