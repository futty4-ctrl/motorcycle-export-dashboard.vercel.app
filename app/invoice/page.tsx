"use client"

import { Suspense, useReducer, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Printer, FileSpreadsheet, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { invoiceReducer } from "@/lib/invoice-tool/reducer"
import {
  getInitialInvoiceState,
  buildInvoiceStateFromQuote,
  INVOICE_FROM_QUOTE_KEY,
} from "@/lib/invoice-tool/initial"
import type { InvoiceState } from "@/lib/invoice-tool/types"
import { exportInvoiceToExcel } from "@/lib/quote-tool/export-excel"

function formatYen(n: number): string {
  if (n === 0) return "¥0"
  return `¥${n >= 0 ? n.toLocaleString() : `-${Math.abs(n).toLocaleString()}`}`
}

function computeTotal(rows: InvoiceState["rows"]) {
  const subtotal = rows.reduce((s, r) => s + Number(r.amount) || 0, 0)
  const tax = 0
  return { subtotal, tax, total: subtotal }
}

function InvoicePageContent() {
  const searchParams = useSearchParams()
  const [state, dispatch] = useReducer(invoiceReducer, getInitialInvoiceState())
  const sealInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const from = searchParams.get("from")
    if (from !== "quote") return
    try {
      const raw = sessionStorage.getItem(INVOICE_FROM_QUOTE_KEY)
      if (!raw) return
      const payload = JSON.parse(raw) as Parameters<typeof buildInvoiceStateFromQuote>[0]
      sessionStorage.removeItem(INVOICE_FROM_QUOTE_KEY)
      const patch = buildInvoiceStateFromQuote(payload)
      dispatch({ type: "REPLACE_STATE", payload: patch })
    } catch {
      sessionStorage.removeItem(INVOICE_FROM_QUOTE_KEY)
    }
  }, [searchParams])

  const { subtotal, tax, total } = computeTotal(state.rows)

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    const addressLines = state.billToAddress.trim().split("\n").filter(Boolean)
    const address = addressLines.join(" ")
    const postalCode = addressLines.find((l) => /^〒/.test(l)) ?? ""
    const tel = addressLines.find((l) => /TEL|電話/.test(l)) ?? ""
    await exportInvoiceToExcel({
      issueDate: state.issueDate,
      billTo: state.billTo.trim(),
      subject: state.subject.trim(),
      bank: state.bank,
      address: address || undefined,
      postalCode: postalCode || undefined,
      tel: tel || undefined,
      companyName: state.companyName.trim() || undefined,
      companyAddress: state.companyAddress.trim() || undefined,
      rows: state.rows.map((r) => ({
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        unitPrice: r.unitPrice,
        amount: r.amount,
      })),
      note: state.note.trim() || undefined,
    })
  }

  return (
    <div className="min-h-dvh bg-background pb-8">
      <div className="mx-auto min-w-0 max-w-4xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <Link
          href="/documents"
          className="mb-5 flex min-h-[48px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground touch-manipulation -ml-1 pl-1 print:hidden"
        >
          <ChevronLeft className="h-5 w-5 shrink-0" />
          <span>見積・請求へ戻る</span>
        </Link>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">請求書</h1>
          <div className="flex flex-wrap gap-3 print:hidden">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="default"
              className="min-h-[44px] touch-manipulation"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={handlePrint}
              size="default"
              className="min-h-[44px] touch-manipulation"
            >
              <Printer className="mr-2 h-4 w-4" />
              印刷
            </Button>
          </div>
        </div>

        <Card className="mb-6 print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">宛先</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-billToName">相手の名前（会社名・氏名）</Label>
              <Input
                id="invoice-billToName"
                placeholder="例: 株式会社〇〇 御中"
                value={state.billTo}
                onChange={(e) => dispatch({ type: "SET_BILL_TO", payload: e.target.value })}
                className="h-11 text-base touch-manipulation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-billToAddress">住所</Label>
              <Textarea
                id="invoice-billToAddress"
                placeholder="例: 〒100-0001 東京都千代田区〇〇1-2-3"
                value={state.billToAddress}
                onChange={(e) => dispatch({ type: "SET_BILL_TO_ADDRESS", payload: e.target.value })}
                rows={2}
                className="min-h-[64px] resize-y text-base touch-manipulation"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">発行元・印鑑（右上に表示）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-companyName">自社名（会社名・氏名）</Label>
              <Input
                id="invoice-companyName"
                placeholder="例: 淵上 郁也"
                value={state.companyName}
                onChange={(e) =>
                  dispatch({ type: "SET_COMPANY", payload: { companyName: e.target.value } })
                }
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-companyAddress">発行元の住所・電話</Label>
              <Textarea
                id="invoice-companyAddress"
                placeholder={"例: 〒570-0006\n大阪府守口市八雲西町2-1-27\nTEL： 090-6423-4268"}
                value={state.companyAddress}
                onChange={(e) =>
                  dispatch({ type: "SET_COMPANY", payload: { companyAddress: e.target.value } })
                }
                rows={2}
                className="min-h-[64px] resize-y text-base touch-manipulation"
              />
            </div>
            <div className="space-y-2">
              <Label>印鑑画像</Label>
              <input
                ref={sealInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const r = new FileReader()
                  r.onload = () =>
                    dispatch({ type: "SET_COMPANY", payload: { sealImageDataUrl: String(r.result) } })
                  r.readAsDataURL(f)
                  e.target.value = ""
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sealInputRef.current?.click()}
                >
                  {state.sealImageDataUrl ? "画像を差し替え" : "画像を選択"}
                </Button>
                {state.sealImageDataUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      dispatch({ type: "SET_COMPANY", payload: { sealImageDataUrl: "" } })
                    }
                  >
                    削除
                  </Button>
                )}
                {state.sealImageDataUrl && (
                  <img src={state.sealImageDataUrl} alt="印鑑" className="h-14 w-14 object-contain" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">請求内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice-issueDate">請求日</Label>
                <Input
                  id="invoice-issueDate"
                  value={state.issueDate}
                  onChange={(e) => dispatch({ type: "SET_ISSUE_DATE", payload: e.target.value })}
                  placeholder="例: 2025年11月24日"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-subject">件名</Label>
                <Input
                  id="invoice-subject"
                  value={state.subject}
                  onChange={(e) => dispatch({ type: "SET_SUBJECT", payload: e.target.value })}
                  placeholder="例: 作業代金"
                  className="text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>振込先</Label>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Input
                  placeholder="金融機関名"
                  value={state.bank.name}
                  onChange={(e) => dispatch({ type: "SET_BANK", payload: { name: e.target.value } })}
                />
                <Input
                  placeholder="支店名"
                  value={state.bank.branch}
                  onChange={(e) =>
                    dispatch({ type: "SET_BANK", payload: { branch: e.target.value } })
                  }
                />
                <Input
                  placeholder="店番"
                  value={state.bank.branchCode}
                  onChange={(e) =>
                    dispatch({ type: "SET_BANK", payload: { branchCode: e.target.value } })
                  }
                />
                <Input
                  placeholder="口座種別（普通など）"
                  value={state.bank.accountType}
                  onChange={(e) =>
                    dispatch({ type: "SET_BANK", payload: { accountType: e.target.value } })
                  }
                />
                <Input
                  placeholder="口座番号"
                  value={state.bank.accountNumber}
                  onChange={(e) =>
                    dispatch({ type: "SET_BANK", payload: { accountNumber: e.target.value } })
                  }
                />
                <Input
                  placeholder="口座名義"
                  value={state.bank.accountName}
                  onChange={(e) =>
                    dispatch({ type: "SET_BANK", payload: { accountName: e.target.value } })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-note">備考</Label>
              <Textarea
                id="invoice-note"
                value={state.note}
                onChange={(e) => dispatch({ type: "SET_NOTE", payload: e.target.value })}
                rows={2}
                className="text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 print:hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">明細（項目は追加・削除できます）</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: "ADD_ROW" })}
              className="touch-manipulation"
            >
              <Plus className="mr-1 h-4 w-4" />
              項目を追加
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">摘要</TableHead>
                  <TableHead className="w-20 text-right">数量</TableHead>
                  <TableHead className="w-16">単位</TableHead>
                  <TableHead className="w-24 text-right">単価</TableHead>
                  <TableHead className="w-28 text-right">金額</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2">
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ROW",
                            payload: { id: row.id, patch: { description: e.target.value } },
                          })
                        }
                        className="h-9 text-sm"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={row.quantity}
                        onChange={(e) => {
                          const v = e.target.value
                          const num = Number(v)
                          dispatch({
                            type: "UPDATE_ROW",
                            payload: {
                              id: row.id,
                              patch: {
                                quantity: v === "" || Number.isNaN(num) ? v : num,
                                amount: num && row.unitPrice ? num * row.unitPrice : row.amount,
                              },
                            },
                          })
                        }}
                        className="h-9 w-20 text-right text-sm tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.unit ?? ""}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ROW",
                            payload: { id: row.id, patch: { unit: e.target.value } },
                          })
                        }
                        placeholder="個, 式, 時間..."
                        className="h-9 w-16 text-sm"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        value={row.unitPrice || ""}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0
                          dispatch({
                            type: "UPDATE_ROW",
                            payload: {
                              id: row.id,
                              patch: {
                                unitPrice: v,
                                amount:
                                  typeof row.quantity === "number"
                                    ? row.quantity * v
                                    : (Number(row.quantity) || 0) * v,
                              },
                            },
                          })
                        }}
                        className="h-9 w-24 text-right text-sm tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        value={row.amount || ""}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ROW",
                            payload: {
                              id: row.id,
                              patch: { amount: Number(e.target.value) || 0 },
                            },
                          })
                        }
                        className="h-9 w-28 text-right text-sm tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => dispatch({ type: "DELETE_ROW", payload: { id: row.id } })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="invoice-sheet rounded-lg border border-border bg-white p-8 text-black print:border-0 print:shadow-none">
          <h2 className="mb-6 w-full text-center text-2xl font-medium tracking-widest">
            御 請 求 書
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">宛先</p>
              <p className="text-lg font-medium">{state.billTo.trim() || "—"}</p>
              {state.billToAddress.trim() && (
                <p className="whitespace-pre-wrap text-sm text-gray-700">{state.billToAddress.trim()}</p>
              )}
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">自社</p>
              <p className="text-lg font-medium">{state.companyName.trim() || "—"}</p>
              {state.companyAddress.trim() && (
                <p className="whitespace-pre-wrap text-sm text-gray-700">{state.companyAddress.trim()}</p>
              )}
              {state.sealImageDataUrl && (
                <img
                  src={state.sealImageDataUrl}
                  alt="印鑑"
                  className="ml-auto mt-2 h-20 w-20 object-contain print:h-24 print:w-24"
                />
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">請求日</p>
              <p className="mt-1">{state.issueDate}</p>
            </div>
            <div className="text-right sm:justify-self-end">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">振込先</p>
              <p className="mt-1">{state.bank.name} {state.bank.branch}（店番{state.bank.branchCode}）</p>
              <p>口座 {state.bank.accountType} {state.bank.accountNumber} {state.bank.accountName}</p>
            </div>
          </div>

          <p className="mt-4 text-lg font-medium">件名： {state.subject.trim() || "—"}</p>

          <table className="invoice-table mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black">
                <th className="py-2 text-left font-normal">摘要</th>
                <th className="w-20 py-2 text-right font-normal">数量</th>
                <th className="w-16 py-2 text-center font-normal">単位</th>
                <th className="w-24 py-2 text-right font-normal">単価</th>
                <th className="w-28 py-2 text-right font-normal">金額</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-300">
                  <td className="py-2">{row.description}</td>
                  <td className="text-right">{row.quantity}</td>
                  <td className="text-center">{row.unit ?? ""}</td>
                  <td className="text-right">
                    {row.unitPrice ? formatYen(row.unitPrice) : ""}
                  </td>
                  <td className="text-right">{formatYen(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <table className="w-48 text-sm">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1">小計</td>
                  <td className="text-right">{formatYen(subtotal)}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1">消費税</td>
                  <td className="text-right">{formatYen(tax)}</td>
                </tr>
                <tr>
                  <td className="py-1 font-medium">合計（税込）</td>
                  <td className="text-right font-medium">{formatYen(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700">備考</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {state.note.trim() || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        </div>
      }
    >
      <InvoicePageContent />
    </Suspense>
  )
}
