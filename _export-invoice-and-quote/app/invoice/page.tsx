"use client"

import Link from "next/link"
import { ChevronLeft, Printer, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportInvoiceToExcel } from "@/lib/quote-tool/export-excel"

/** 請求書1行 */
type InvoiceRow = {
  description: string
  quantity: string | number
  unitPrice: number
  amount: number
}

/** サンプルデータ（参考PDFに近い構成） */
const SAMPLE = {
  issueDate: "2025年11月24日",
  billTo: "株式A-produce株式会社 御中",
  subject: "作業代金",
  bank: {
    name: "福岡銀行",
    branch: "藤崎支店",
    branchCode: "252",
    accountType: "普通",
    accountNumber: "1510241",
    accountName: "淵上 郁也",
  },
  address: "大阪府守口市八雲西町2-1-27",
  postalCode: "〒570-0006",
  tel: "TEL： 090-6423-4268",
  rows: [
    { description: "作業費(淵上 ハーフ5日)", quantity: "7,000", unitPrice: 35_000, amount: 193_740 },
    { description: "作業費(小寺 1日8時間)", quantity: "1", unitPrice: 0, amount: -50_000 },
    { description: "家賃", quantity: "", unitPrice: 0, amount: -20_060 },
    { description: "先月の差額分", quantity: "", unitPrice: 0, amount: 0 },
    { description: "備考", quantity: "", unitPrice: 0, amount: 0 },
  ] as InvoiceRow[],
  note: "下記のとおり、領収申し上げます。",
}

function formatYen(n: number): string {
  if (n === 0) return "¥0"
  return `¥${n >= 0 ? n.toLocaleString() : `-${Math.abs(n).toLocaleString()}`}`
}

export default function InvoicePage() {
  const subtotal = 193_740
  const tax = 0
  const total = subtotal

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    await exportInvoiceToExcel({
      issueDate: SAMPLE.issueDate,
      billTo: SAMPLE.billTo,
      subject: SAMPLE.subject,
      bank: SAMPLE.bank,
      address: SAMPLE.address,
      postalCode: SAMPLE.postalCode,
      tel: SAMPLE.tel,
      rows: SAMPLE.rows,
      note: SAMPLE.note,
    })
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto min-w-0 max-w-3xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          トップへ
        </Link>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-foreground">請求書</h1>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button onClick={handleExportExcel} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excelでダウンロード
            </Button>
            <Button onClick={handlePrint} size="sm">
              <Printer className="mr-2 h-4 w-4" />
              印刷 / PDFで保存
            </Button>
          </div>
        </div>

        <div className="invoice-sheet rounded-lg border border-border bg-white p-8 text-black print:border-0 print:shadow-none">
          <h2 className="text-center text-2xl font-medium tracking-widest">
            御 請 求 書
          </h2>
          <div className="mt-4 flex justify-end text-sm">
            請求日： {SAMPLE.issueDate}
          </div>
          <div className="mt-2 text-right text-lg font-medium">
            {SAMPLE.billTo}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p>振込先： {SAMPLE.bank.name}</p>
              <p>支店名 {SAMPLE.bank.branch}</p>
              <p>店番{SAMPLE.bank.branchCode}</p>
              <p>口座番号 {SAMPLE.bank.accountType}{SAMPLE.bank.accountNumber}</p>
              <p>{SAMPLE.bank.accountName}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p>{SAMPLE.address}</p>
              <p>{SAMPLE.postalCode}</p>
              <p>{SAMPLE.tel}</p>
            </div>
          </div>

          <p className="mt-4 text-sm">件名： {SAMPLE.subject}</p>

          <table className="invoice-table mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black">
                <th className="py-2 text-left font-normal">摘要</th>
                <th className="w-20 py-2 text-right font-normal">数量</th>
                <th className="w-24 py-2 text-right font-normal">単価</th>
                <th className="w-28 py-2 text-right font-normal">金額</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-300">
                  <td className="py-2">{row.description}</td>
                  <td className="text-right">{row.quantity}</td>
                  <td className="text-right">{row.unitPrice ? formatYen(row.unitPrice) : ""}</td>
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
                  <td className="py-1 font-medium">合計</td>
                  <td className="text-right font-medium">{formatYen(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-sm">
            合計金額 {formatYen(total)} （税込）
          </p>

          {SAMPLE.note && (
            <p className="mt-6 text-sm">{SAMPLE.note}</p>
          )}
        </div>
      </div>
    </div>
  )
}
