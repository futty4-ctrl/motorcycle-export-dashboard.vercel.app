"use client"

import { useReducer, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Plus, Trash2, FileText, Calculator, FileSpreadsheet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { quoteReducer, initialQuoteState } from "@/lib/quote-tool/reducer"
import { computeQuote } from "@/lib/quote-tool/calc"
import { PRESETS } from "@/lib/quote-tool/presets"
import { exportQuoteToExcel } from "@/lib/quote-tool/export-excel"
import type { QuoteLine, QuoteGroup, RoundingUnit, RoundingMode } from "@/lib/quote-tool/types"

const ROUNDING_UNITS: { value: RoundingUnit; label: string }[] = [
  { value: 1, label: "1円" },
  { value: 10, label: "10円" },
  { value: 100, label: "100円" },
  { value: 1000, label: "1,000円" },
]
const ROUNDING_MODES: { value: RoundingMode; label: string }[] = [
  { value: "floor", label: "切り捨て" },
  { value: "ceil", label: "切り上げ" },
  { value: "round", label: "四捨五入" },
]

function formatYen(n: number): string {
  return `¥${n.toLocaleString()}`
}

export default function QuotePage() {
  const [state, dispatch] = useReducer(quoteReducer, initialQuoteState)
  const [showPreview, setShowPreview] = useState(false)

  const { lines, subtotal, tax, totalInclTax } = useMemo(
    () =>
      computeQuote(state.lines, {
        targetTotalInclTax: state.targetTotalInclTax,
        autoDistribution: state.autoDistribution,
        roundingUnit: state.roundingUnit,
        roundingMode: state.roundingMode,
        taxRate: state.taxRate,
      }),
    [state.lines, state.targetTotalInclTax, state.autoDistribution, state.roundingUnit, state.roundingMode, state.taxRate]
  )

  const linesByGroup = useMemo(() => {
    const map = new Map<string, QuoteLine[]>()
    state.groups.forEach((g) => map.set(g.id, []))
    lines.forEach((line) => {
      const list = map.get(line.groupId) ?? []
      list.push(line)
      map.set(line.groupId, list)
    })
    return map
  }, [state.groups, lines])

  const updateLine = (id: string, patch: Partial<QuoteLine>) => {
    dispatch({ type: "UPDATE_LINE", payload: { id, patch } })
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto min-w-0 max-w-4xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          トップへ
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Calculator className="h-6 w-6" />
            見積逆算ツール
          </h1>
          <Button
            variant={showPreview ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="print:hidden"
          >
            <FileText className="mr-2 h-4 w-4" />
            {showPreview ? "編集に戻る" : "見積書プレビュー"}
          </Button>
        </div>

        {!showPreview ? (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">目標・端数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>目標税込総額（任意）</Label>
                    <Input
                      type="number"
                      placeholder="例: 100000"
                      value={state.targetTotalInclTax ?? ""}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null
                        dispatch({ type: "SET_TARGET_TOTAL", payload: v })
                      }}
                      className="text-base tabular-nums"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>端数単位</Label>
                    <Select
                      value={String(state.roundingUnit)}
                      onValueChange={(v) =>
                        dispatch({ type: "SET_ROUNDING", payload: { unit: Number(v) as RoundingUnit } })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROUNDING_UNITS.map((u) => (
                          <SelectItem key={u.value} value={String(u.value)}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>端数処理</Label>
                    <Select
                      value={state.roundingMode}
                      onValueChange={(v) =>
                        dispatch({ type: "SET_ROUNDING", payload: { mode: v as RoundingMode } })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROUNDING_MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto配分</Label>
                    <Select
                      value={state.autoDistribution}
                      onValueChange={(v: "equal" | "ratio") =>
                        dispatch({ type: "SET_AUTO_DISTRIBUTION", payload: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal">均等</SelectItem>
                        <SelectItem value="ratio">比率</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">プリセット:</span>
              {PRESETS.map((preset, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="touch-manipulation"
                  onClick={() => {
                    const groupId = state.groups[0]?.id ?? ""
                    dispatch({ type: "ADD_PRESET", payload: { preset, groupId } })
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {state.groups
              .sort((a, b) => a.order - b.order)
              .map((group) => (
                <Card key={group.id} className="mb-6">
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        dispatch({ type: "ADD_LINE", payload: { groupId: group.id } })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      行追加
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">項目名</TableHead>
                          <TableHead className="w-[80px] text-right">数量</TableHead>
                          <TableHead className="w-[100px] text-right">単価</TableHead>
                          <TableHead className="w-[120px] text-right">金額</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(linesByGroup.get(group.id) ?? []).map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="p-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={line.label}
                                  onChange={(e) => updateLine(line.id, { label: e.target.value })}
                                  className="h-9 flex-1 text-sm"
                                />
                                {line.type !== "adjustment" && (
                                  <Select
                                    value={line.type}
                                    onValueChange={(v: QuoteLine["type"]) =>
                                      updateLine(line.id, { type: v })
                                    }
                                  >
                                    <SelectTrigger className="h-9 w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="fixed">固定</SelectItem>
                                      <SelectItem value="unit">単価</SelectItem>
                                      <SelectItem value="auto">Auto</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-2 text-right">
                              {line.type === "unit" || line.type === "auto" ? (
                                <Input
                                  type="number"
                                  value={line.quantity}
                                  onChange={(e) =>
                                    updateLine(line.id, { quantity: Number(e.target.value) || 0 })
                                  }
                                  className="h-9 w-16 text-right text-sm tabular-nums"
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="p-2 text-right">
                              {line.type === "unit" ? (
                                <Input
                                  type="number"
                                  value={line.unitPrice}
                                  onChange={(e) =>
                                    updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })
                                  }
                                  className="h-9 w-24 text-right text-sm tabular-nums"
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="p-2 text-right tabular-nums">
                              {line.type === "fixed" ? (
                                <Input
                                  type="number"
                                  value={line.amount}
                                  onChange={(e) =>
                                    updateLine(line.id, { amount: Number(e.target.value) || 0 })
                                  }
                                  className="h-9 w-28 text-right text-sm"
                                />
                              ) : (
                                formatYen(line.amount)
                              )}
                            </TableCell>
                            <TableCell className="p-1">
                              {line.type !== "adjustment" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() =>
                                    dispatch({ type: "DELETE_LINE", payload: { id: line.id } })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="text-sm text-muted-foreground">
                  {state.targetTotalInclTax != null && (
                    <span>目標: {formatYen(state.targetTotalInclTax)} → </span>
                  )}
                  税抜小計 / 消費税 / 税込合計
                </div>
                <div className="flex gap-6 text-right tabular-nums">
                  <span>{formatYen(subtotal)}</span>
                  <span>{formatYen(tax)}</span>
                  <span className="text-lg font-bold">{formatYen(totalInclTax)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <QuotePreviewView
            groups={state.groups}
            linesByGroup={linesByGroup}
            subtotal={subtotal}
            tax={tax}
            totalInclTax={totalInclTax}
          />
        )}
      </div>
    </div>
  )
}

function QuotePreviewView({
  groups,
  linesByGroup,
  subtotal,
  tax,
  totalInclTax,
}: {
  groups: QuoteGroup[]
  linesByGroup: Map<string, QuoteLine[]>
  subtotal: number
  tax: number
  totalInclTax: number
}) {
  return (
    <div className="quote-preview rounded-lg border border-border bg-white p-8 text-black print:border-0 print:shadow-none">
      <h2 className="text-center text-2xl font-semibold tracking-wider">見 積 書</h2>
      <p className="mt-6 text-right text-sm">見積日: {new Date().toLocaleDateString("ja-JP")}</p>
      <div className="mt-8 space-y-6">
        {groups.sort((a, b) => a.order - b.order).map((group) => {
          const groupLines = linesByGroup.get(group.id) ?? []
          if (groupLines.length === 0) return null
          return (
            <div key={group.id}>
              <h3 className="border-b border-gray-300 pb-1 text-sm font-medium">{group.label}</h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left font-normal">摘要</th>
                    <th className="w-20 py-2 text-right font-normal">数量</th>
                    <th className="w-24 py-2 text-right font-normal">単価</th>
                    <th className="w-28 py-2 text-right font-normal">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {groupLines.map((line) => (
                    <tr key={line.id} className="border-b border-gray-100">
                      <td className="py-2">{line.label}</td>
                      <td className="text-right">
                        {line.type === "unit" ? line.quantity : "—"}
                      </td>
                      <td className="text-right">
                        {line.type === "unit" ? formatYen(line.unitPrice) : "—"}
                      </td>
                      <td className="text-right">{formatYen(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
      <div className="mt-8 flex justify-end">
        <table className="w-56 text-sm">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-2">小計（税抜）</td>
              <td className="text-right">{formatYen(subtotal)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="py-2">消費税（10%）</td>
              <td className="text-right">{formatYen(tax)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">合計（税込）</td>
              <td className="text-right font-medium">{formatYen(totalInclTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-8 flex flex-wrap justify-end gap-2 print:hidden">
        <Button
          variant="outline"
          onClick={async () => {
            await exportQuoteToExcel({
              groups,
              linesByGroup,
              subtotal,
              tax,
              totalInclTax,
            })
          }}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excelでダウンロード
        </Button>
        <Button onClick={() => window.print()}>
          印刷 / PDFで保存
        </Button>
      </div>
    </div>
  )
}
