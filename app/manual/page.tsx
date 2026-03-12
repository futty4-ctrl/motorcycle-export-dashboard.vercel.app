import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, BookOpen, Package, QrCode, BarChart3, Image, Calculator } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export const metadata: Metadata = {
  title: "取扱説明書 | MotoExport Pro",
  description: "在庫・古物統合管理システムの使い方ガイド。現場のスマホから在庫と古物台帳を一元管理する方法をご案内します。",
}

export default function ManualPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              ダッシュボードへ
            </Link>

            {/* ヘッダー */}
            <header className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl tracking-tight">
                  在庫・古物統合管理システム 取扱説明書
                </h1>
              </div>
              <p className="text-muted-foreground text-base leading-relaxed">
                現場のスマホから在庫と古物台帳を一元管理するための専用アプリの使い方をご案内します。
              </p>
            </header>

            {/* 目次カード */}
            <nav className="mb-10 rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                目次
              </h2>
              <ul className="space-y-2">
                {[
                  { href: "#section-1", label: "1. このシステムの目的" },
                  { href: "#section-2", label: "2. 基本的な業務フロー（使い方）" },
                  { href: "#section-3", label: "3. 経理処理について" },
                  { href: "#section-4", label: "4. 今後追加予定の機能（開発中）" },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-10">
              {/* セクション1 */}
              <section className="scroll-mt-24" id="section-1">
                <div className="rounded-xl border border-border bg-card p-6 sm:p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                      1
                    </span>
                    このシステムの目的
                  </h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    このシステムは、バイク車両およびパーツの「在庫管理」と、法律で義務付けられている「古物台帳（受入・払出）」の記録を、現場のスマホから一元管理するための専用アプリです。
                  </p>
                  <p className="text-foreground leading-relaxed">
                    入力の二度手間をなくし、QRコードを用いた個体管理によって、倉庫内の在庫を正確かつスピーディーに把握することを目的としています。
                  </p>
                </div>
              </section>

              {/* セクション2 */}
              <section className="scroll-mt-24" id="section-2">
                <div className="rounded-xl border border-border bg-card p-6 sm:p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                      2
                    </span>
                    基本的な業務フロー（使い方）
                  </h2>

                  <div className="space-y-8">
                    {/* ① 仕入れ・買取 */}
                    <div className="rounded-lg border border-border bg-muted/30 p-5">
                      <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        ① 仕入れ・買取時の登録（スマホ入力）
                      </h3>
                      <p className="text-foreground text-sm leading-relaxed mb-4">
                        現場で車両やパーツを買い取った際、「在庫管理」画面から新規登録を行います。
                      </p>
                      <ul className="space-y-3 text-sm">
                        <li className="flex gap-3">
                          <span className="text-primary font-semibold shrink-0">在庫・車両情報:</span>
                          <span className="text-foreground">
                            カテゴリ（車体/パーツ）、メーカー、車名（モンキー、ゴリラ等）、車台番号、仕入価格を入力します。
                          </span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-primary font-semibold shrink-0">古物台帳情報:</span>
                          <span className="text-foreground">
                            買い取り相手の氏名、住所、本人確認方法（免許証番号など）を必ず入力してください。
                            <span className="block mt-1 text-amber-600 dark:text-amber-500 font-medium">
                              ※警察の査察時に必要となる重要なデータです
                            </span>
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* ② QRコード */}
                    <div className="rounded-lg border border-border bg-muted/30 p-5">
                      <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-primary" />
                        ② QRコードの発行と貼り付け
                      </h3>
                      <p className="text-foreground text-sm leading-relaxed mb-4">
                        登録が完了すると、その個体専用の「管理番号（INV-〇〇）」と「QRコード」が画面に表示されます。
                      </p>
                      <ul className="space-y-2 text-sm text-foreground list-disc list-inside">
                        <li>
                          ラベルプリンターでQRコードを印刷し、プラスチック荷札等に貼って、車体のハンドルやパーツに結束バンドで取り付けてください。
                        </li>
                        <li>
                          以降、倉庫でQRコードをスマホで読み込むだけで、その個体の詳細データが瞬時に開きます。
                        </li>
                      </ul>
                    </div>

                    {/* ③ ステータス */}
                    <div className="rounded-lg border border-border bg-muted/30 p-5">
                      <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        ③ ステータスの更新と販売
                      </h3>
                      <p className="text-foreground text-sm leading-relaxed">
                        商品の状態に合わせて、一覧画面からステータス（未処理、出品準備中、ヤフオク出品中、売約済みなど）をこまめに更新してください。
                        売却が決定した際は、販売価格や売却先を入力することで「古物台帳（払出）」の記録が完了し、最終的な利益が確定します。
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* セクション3 */}
              <section className="scroll-mt-24" id="section-3">
                <div className="rounded-xl border border-border bg-card p-6 sm:p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                      3
                    </span>
                    経理処理について
                  </h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    当システムは「現場の在庫・古物管理」に特化しています。
                  </p>
                  <p className="text-foreground leading-relaxed">
                    会社全体の経理や決算処理については、月末に当システムから出力した売上・仕入データを、別途「Freee」や「マネーフォワード」などの会計ソフトに取り込んで処理する運用となります。
                  </p>
                </div>
              </section>

              {/* セクション4 */}
              <section className="scroll-mt-24" id="section-4">
                <div className="rounded-xl border border-border bg-card p-6 sm:p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                      4
                    </span>
                    今後追加予定の機能（開発中）
                  </h2>
                  <ul className="space-y-4">
                    <li className="flex gap-3 p-4 rounded-lg border border-border bg-muted/20">
                      <Image className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground">画像管理機能:</span>
                        <span className="text-foreground ml-1">
                          車体やパーツの写真をスマホから直接アップロードし、紐付けて保存できる機能。
                        </span>
                      </div>
                    </li>
                    <li className="flex gap-3 p-4 rounded-lg border border-border bg-muted/20">
                      <Calculator className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground">BDS入札シミュレーター:</span>
                        <span className="text-foreground ml-1">
                          ヤフオクの過去相場から、業者オークション（BDS）での入札上限額を自動計算する機能。
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ChevronLeft className="h-4 w-4" />
                ダッシュボードに戻る
              </Link>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
