"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Settings, Flag, LineChart } from "lucide-react"

const navItems = [
  { label: "ホーム", href: "/", icon: LayoutDashboard },
  { label: "当日", href: "/auction-day", icon: Flag },
  { label: "在庫", href: "/inventory", icon: Package },
  { label: "分析", href: "/analytics", icon: LineChart },
  { label: "設定", href: "/settings", icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="flex items-center justify-around px-2 py-2" role="list">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors touch-manipulation active:opacity-80 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
