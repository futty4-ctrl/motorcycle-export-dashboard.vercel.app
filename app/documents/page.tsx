"use client"

import Link from "next/link"
import { ChevronLeft, FileText, Receipt } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function DocumentsPage() {
  return (
    <div className="min-h-dvh bg-background pb-8">
      <div className="mx-auto min-w-0 max-w-2xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <Link
          href="/"
          className="mb-5 flex min-h-[48px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground touch-manipulation -ml-1 pl-1"
        >
          <ChevronLeft className="h-5 w-5 shrink-0" />
          <span>ダッシュボードへ</span>
        </Link>
        <div className="mb-8">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">見積・請求</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            見積書と請求書を作成・印刷・Excel出力
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/quote"
            className="flex min-h-[140px] touch-manipulation transition-opacity hover:opacity-90 active:opacity-80"
          >
            <Card className="flex h-full w-full flex-col border-border transition-colors hover:bg-muted/50 active:bg-muted/70">
              <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground sm:text-lg">見積書</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    目標金額から逆算・Excel入出力
                  </p>
                </div>
                <span className="text-sm font-medium text-primary">作成する →</span>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/invoice"
            className="flex min-h-[140px] touch-manipulation transition-opacity hover:opacity-90 active:opacity-80"
          >
            <Card className="flex h-full w-full flex-col border-border transition-colors hover:bg-muted/50 active:bg-muted/70">
              <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Receipt className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground sm:text-lg">請求書</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    宛先・印鑑対応・印刷・Excel
                  </p>
                </div>
                <span className="text-sm font-medium text-primary">作成する →</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
