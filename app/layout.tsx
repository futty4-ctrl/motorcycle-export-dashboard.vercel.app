import type { Metadata } from "next"
import { DM_Mono, DM_Sans } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { SWRegister } from "@/components/sw-register"

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
  manifest: "/manifest.json",
  themeColor: "#166534",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MotoExport",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${dmMono.variable} ${dmSans.variable}`}
        style={{ margin: 0, background: "#0a0a0a", color: "#f5f5f5" }}
      >
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main className="main-content"
          >
            {children}
          </main>
        </div>
        <Toaster />
        <SWRegister />
      </body>
    </html>
  )
}
