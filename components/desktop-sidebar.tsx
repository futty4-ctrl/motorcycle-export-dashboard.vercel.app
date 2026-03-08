"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  ChevronLeft,
  ChevronRight,
  GanttChartSquare,
  BarChart3,
  Calculator,
  TrendingUp,
} from "lucide-react"

const navItems = [
  { label: "ダッシュボード", href: "/", icon: LayoutDashboard },
  { label: "BDS過去相場", href: "/market", icon: TrendingUp },
  { label: "見積・請求", href: "/documents", icon: Calculator },
  { label: "オークション・プレビュー", href: "/auction-preview", icon: GanttChartSquare },
  { label: "在庫管理", href: "/inventory", icon: Package },
  { label: "予想 vs 実績", href: "/analytics", icon: BarChart3 },
  { label: "eBay出品", href: "/ebay", icon: ShoppingBag },
  { label: "設定", href: "/settings", icon: Settings },
]

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? "lg:w-16" : "lg:w-60"
      }`}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <span className="text-sm font-bold text-sidebar-primary-foreground">M</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-sidebar-accent-foreground">
                MotoExport Pro
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary mx-auto">
            <span className="text-sm font-bold text-sidebar-primary-foreground">M</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4">
        <ul className="flex flex-col gap-1" role="list">
          {navItems.map((item) => {
            const isActive =
              item.href !== "#" &&
              (pathname === item.href ||
                (item.href === "/documents" && (pathname === "/quote" || pathname === "/invoice")))
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>折りたたむ</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
