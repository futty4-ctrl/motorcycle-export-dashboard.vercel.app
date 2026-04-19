"use client"

import { useReducer, useMemo, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, Plus, Trash2, FileText, Calculator, FileSpreadsheet, FileUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { quoteReducer, initialQuoteState } from "@/lib/quote-tool/reducer"
import { computeQuote } from "@/lib/quote-tool/calc"
import {
  PRESETS,
  getDefaultTemplateQuote,
  QUOTE_TEMPLATE_CATEGORIES,
} from "@/lib/quote-tool/presets"
import { exportQuoteToExcel } from "@/lib/quote-tool/export-excel"
import { parseQuoteFromExcel } from "@/lib/quote-tool/import-excel"
import { INVOICE_FROM_QUOTE_KEY } from "@/lib/invoice-tool/initial"
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
  const [importing, setImporting] = useState(false)
  const [templateCategoryIndex, setTemplateCategoryIndex] = useState<string>("0")
  const [templateItemIndex, setTemplateItemIndex] = useState<string>("")
  const [templateAddToGroupId, setTemplateAddToGroupId] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sealInputRef = useRef<HTMLInputElement>(null)

  const templateCategory = QUOTE_TEMPLATE_CATEGORIES[Number(templateCategoryIndex)] ?? null
  const templateItems = templateCategory?.items ?? []
  const addToGroupId =
    (templateAddToGroupId && state.groups.some((g) => g.id === templateAddToGroupId)
      ? templateAddToGroupId
      : null) ?? state.groups[0]?.id ?? ""

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

  const handleLoadTemplate = () => {
    const { groups, lines } = getDefaultTemplateQuote()
    dispatch({ type: "IMPORT_QUOTE", payload: { groups, lines } })
    toast.success("標準テンプレートを読み込みました", {
      description: "8カテゴリ・全項目を追加しました。単価を入力してご利用ください。",
    })
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setImporting(true)
    const result = await parseQuoteFromExcel(file)
    setImporting(false)
    if (result.ok) {
      dispatch({
        type: "IMPORT_QUOTE",
        payload: {
          groups: result.groups,
          lines: result.lines,
          targetTotalInclTax: result.totalInclTax ?? undefined,
        },
      })
      toast.success("Excelから読み込みました", {
        description: `${result.groups.length}グループ・${result.lines.length - 1}行を読み込みました。`,
      })
    } else {
      toast.error("読み込みに失敗しました", { description: result.message })
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-8">
      <div className="mx-auto min-w-0 max-w-4xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <Link
          href="/"
          className="mb-5 flex min-h-[48px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground touch-manipulation -ml-1 pl-1"
        >
          <ChevronLeft className="h-5 w-5 shrink-0" />
          <span>ダッシュボードへ戻る</span>
        </Link>
        <div className="mb-5">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <Calculator className="h-6 w-6 shrink-0" />
            見積逆算
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">目標金額から内訳を逆算。テンプレートやプリセットで追加。</p>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-end gap-3 print:hidden">
          <Button
            variant="outline"
            size="default"
            onClick={handleLoadTemplate}
            className="min-h-[44px] touch-manipulation"
          >
            一括読み込み
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
          <Button
            variant="outline"
            size="default"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] touch-manipulation"
          >
            <FileUp className="mr-2 h-4 w-4" />
            {importing ? "読み込み中…" : "Excel"}
          </Button>
          <Button
            variant={showPreview ? "secondary" : "default"}
            size="default"
            onClick={() => setShowPreview(!showPreview)}
            className="min-h-[44px] touch-manipulation"
          >
            <FileText className="mr-2 h-4 w-4" />
            {showPreview ? "編集に戻る" : "見積書プレビュー"}
          </Button>
        </div>

        {!showPreview ? (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">宛先・請求先</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quote-billToName">請求先（相手の名前・会社名）</Label>
                  <Input
                    id="quote-billToName"
                    placeholder="例: 山田太郎 様"
                    value={state.billToName}
                    onChange={(e) =>
                      dispatch({ type: "SET_BILL_TO", payload: { billToName: e.target.value } })
                    }
                    className="h-11 text-base touch-manipulation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-billToAddress">請求先の住所</Label>
                  <Textarea
                    id="quote-billToAddress"
                    placeholder="例: 〒100-0001 東京都千代田区〇〇1-2-3"
                    value={state.billToAddress}
                    onChange={(e) =>
                      dispatch({ type: "SET_BILL_TO", payload: { billToAddress: e.target.value } })
                    }
                    rows={2}
                    className="min-h-[64px] resize-y text-base touch-manipulation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-validUntil">見積有効期限</Label>
                  <Input
                    id="quote-validUntil"
                    placeholder="例: 2026年3月17日"
                    value={state.validUntil}
                    onChange={(e) => dispatch({ type: "SET_VALID_UNTIL", payload: e.target.value })}
                    className="text-base touch-manipulation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-note">備考</Label>
                  <Textarea
                    id="quote-note"
                    placeholder="例: 納期、支払条件など"
                    value={state.note}
                    onChange={(e) => dispatch({ type: "SET_NOTE", payload: e.target.value })}
                    rows={2}
                    className="min-h-[64px] resize-y text-base touch-manipulation"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">発行元・印鑑（右上に表示）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quote-companyName">自社名（会社名・氏名）</Label>
                  <Input
                    id="quote-companyName"
                    placeholder="例: 淵上 郁也"
                    value={state.companyName}
                    onChange={(e) =>
                      dispatch({ type: "SET_COMPANY", payload: { companyName: e.target.value } })
                    }
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-companyAddress">発行元の住所・電話</Label>
                  <Textarea
                    id="quote-companyAddress"
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
                      <img
                        src={state.sealImageDataUrl}
                        alt="印鑑"
                        className="h-14 w-14 object-contain"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">標準テンプレートから追加</CardTitle>
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  カテゴリ→項目→追加先を選んで「選択した項目を追加」
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>カテゴリ</Label>
                    <Select
                      value={templateCategoryIndex}
                      onValueChange={(v) => {
                        setTemplateCategoryIndex(v)
                        setTemplateItemIndex("")
                      }}
                    >
                      <SelectTrigger className="h-11 w-full touch-manipulation">
                        <SelectValue placeholder="選ぶ" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUOTE_TEMPLATE_CATEGORIES.map((cat, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>項目</Label>
                    <Select
                      value={templateItemIndex}
                      onValueChange={setTemplateItemIndex}
                      disabled={templateItems.length === 0}
                    >
                      <SelectTrigger className="h-11 w-full touch-manipulation">
                        <SelectValue placeholder={templateItems.length ? "選ぶ" : "カテゴリを先に選択"} />
                      </SelectTrigger>
                      <SelectContent>
                        {templateItems.map((item, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>追加先のグループ</Label>
                    <Select
                      value={addToGroupId}
                      onValueChange={setTemplateAddToGroupId}
                    >
                      <SelectTrigger className="h-11 w-full touch-manipulation">
                        <SelectValue placeholder="選ぶ" />
                      </SelectTrigger>
                      <SelectContent>
                        {state.groups.sort((a, b) => a.order - b.order).map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="h-11 w-full min-h-[44px] touch-manipulation"
                      disabled={
                        !addToGroupId ||
                        templateItemIndex === "" ||
                        templateItems[Number(templateItemIndex)] == null
                      }
                      onClick={() => {
                        if (!addToGroupId) return
                        const itemLabel = templateItems[Number(templateItemIndex)]
                        if (itemLabel == null) return
                        dispatch({
                          type: "ADD_LINE",
                          payload: {
                            groupId: addToGroupId,
                            line: {
                              label: itemLabel,
                              type: "unit",
                              quantity: 1,
                              unitPrice: 0,
                              amount: 0,
                            },
                          },
                        })
                        setTemplateItemIndex("")
                      }}
                    >
                      選択した項目を追加
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  上で「追加先」を選ぶとそのグループに追加されます。まとめて入れたい場合は「テンプレートを一括読み込み」を利用してください。
                </p>
              </CardContent>
            </Card>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">クイック:</span>
              {PRESETS.map((preset, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="default"
                  className="min-h-[40px] touch-manipulation"
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
                      className="touch-manipulation"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      項目を追加
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
                                  step="any"
                                  inputMode="decimal"
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
            billToName={state.billToName}
            billToAddress={state.billToAddress}
            companyName={state.companyName}
            companyAddress={state.companyAddress}
            note={state.note}
            validUntil={state.validUntil}
            sealImageDataUrl={state.sealImageDataUrl}
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
  billToName,
  billToAddress,
  companyName,
  companyAddress,
  note,
  validUntil,
  sealImageDataUrl,
  groups,
  linesByGroup,
  subtotal,
  tax,
  totalInclTax,
}: {
  billToName: string
  billToAddress: string
  companyName: string
  companyAddress: string
  note: string
  validUntil: string
  sealImageDataUrl: string
  groups: QuoteGroup[]
  linesByGroup: Map<string, QuoteLine[]>
  subtotal: number
  tax: number
  totalInclTax: number
}) {
  const router = useRouter()

  const handleCreateInvoice = () => {
    const sortedGroups = [...groups].sort((a, b) => a.order - b.order)
    const rows: { description: string; quantity: string | number; unit?: string; unitPrice: number; amount: number }[] = []
    for (const group of sortedGroups) {
      const lines = linesByGroup.get(group.id) ?? []
      for (const line of lines) {
        rows.push({
          description: line.label,
          quantity: line.type === "unit" ? line.quantity : "",
          unit: "",
          unitPrice: line.type === "unit" ? line.unitPrice : 0,
          amount: line.amount,
        })
      }
    }
    const payload = {
      billTo: billToName.trim(),
      billToAddress: billToAddress.trim(),
      subject: "見積に基づく請求",
      rows,
      note: note.trim(),
      companyName: companyName.trim(),
      companyAddress: companyAddress.trim(),
      sealImageDataUrl: sealImageDataUrl || "",
    }
    sessionStorage.setItem(INVOICE_FROM_QUOTE_KEY, JSON.stringify(payload))
    router.push("/invoice?from=quote")
  }

  return (
    <div className="quote-preview rounded-lg border border-border bg-white p-8 text-black print:border-0 print:shadow-none">
      <h2 className="mb-6 w-full text-center text-2xl font-semibold tracking-wider">
        見 積 書
      </h2>

      {/* 左上: 請求先（相手） / 右上: 発行元（自分） */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">請求先（相手）</p>
          <p className="text-lg font-medium">{billToName.trim() || "（請求先）"}</p>
          {billToAddress.trim() ? (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{billToAddress.trim()}</p>
          ) : (
            <p className="text-sm text-gray-400">住所未入力</p>
          )}
        </div>
        <div className="space-y-1 text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">発行元（自分）</p>
          <p className="text-lg font-medium">{companyName.trim() || "（発行元）"}</p>
          {companyAddress.trim() ? (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{companyAddress.trim()}</p>
          ) : (
            <p className="text-sm text-gray-400">住所未入力</p>
          )}
          {sealImageDataUrl && (
            <img
              src={sealImageDataUrl}
              alt="印鑑"
              className="ml-auto mt-2 h-20 w-20 object-contain print:h-24 print:w-24"
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-6 text-sm">
        <span>見積日: {new Date().toLocaleDateString("ja-JP")}</span>
        {validUntil.trim() && (
          <span>有効期限: {validUntil.trim()}</span>
        )}
      </div>
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

      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-sm font-medium text-gray-700">備考</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{note.trim() || "—"}</p>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 print:hidden">
        <Button
          variant="default"
          size="default"
          className="min-h-[44px] touch-manipulation"
          onClick={handleCreateInvoice}
        >
          この見積で請求書を作成
        </Button>
        <Button
          variant="outline"
          size="default"
          className="min-h-[44px] touch-manipulation"
          onClick={async () => {
            await exportQuoteToExcel({
              billToName,
              billToAddress,
              companyName,
              companyAddress,
              note,
              validUntil,
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
        <Button
          size="default"
          className="min-h-[44px] touch-manipulation"
          onClick={() => window.print()}
        >
          印刷 / PDFで保存
        </Button>
      </div>
    </div>
  )
}
