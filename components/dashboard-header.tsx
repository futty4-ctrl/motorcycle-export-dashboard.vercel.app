"use client"

import { Suspense, useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, Bell, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

function HeaderSearchInput() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [localSearch, setLocalSearch] = useState("")
  const isDashboard = pathname === "/"
  const searchValue = isDashboard ? (searchParams.get("q") ?? "") : localSearch
  const setSearchValue = isDashboard
    ? (v: string) => {
        const p = new URLSearchParams(searchParams.toString())
        if (v.trim()) p.set("q", v.trim())
        else p.delete("q")
        const query = p.toString()
        router.replace(query ? `/?${query}` : "/", { scroll: false })
      }
    : setLocalSearch

  useEffect(() => {
    if (!isDashboard) setLocalSearch("")
  }, [isDashboard])

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="車両、VIN、オークション検索..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring lg:h-9"
      />
    </div>
  )
}

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()
  const [hasNotifications] = useState(true)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        <div className="lg:hidden flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">M</span>
          </div>
          <span className="text-sm font-semibold text-foreground">MotoExport</span>
        </div>

        <Suspense fallback={<div className="flex-1 h-10 rounded-lg border border-input bg-card" />}>
          <HeaderSearchInput />
        </Suspense>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:h-9 lg:w-9"
          aria-label="テーマ切替"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <button
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:h-9 lg:w-9"
          aria-label="通知"
        >
          <Bell className="h-4 w-4" />
          {hasNotifications && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
      </div>
    </header>
  )
}
