import type { QuoteLine, QuoteGroup } from "./types"

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export type PresetItem = {
  label: string
  type: QuoteLine["type"]
  quantity?: number
  unitPrice?: number
  amount?: number
  autoRatio?: number
}

export function createLineFromPreset(
  preset: PresetItem,
  groupId: string,
  id?: string
): QuoteLine {
  const line: QuoteLine = {
    id: id ?? uid(),
    label: preset.label,
    type: preset.type,
    quantity: preset.quantity ?? 1,
    unitPrice: preset.unitPrice ?? 0,
    amount: preset.amount ?? 0,
    groupId,
  }
  if (preset.autoRatio != null) line.autoRatio = preset.autoRatio
  return line
}

/** クイック追加用プリセット（従来） */
export const PRESETS: PresetItem[] = [
  { label: "2t車 1台", type: "unit", quantity: 1, unitPrice: 35000 },
  { label: "4t車 1台", type: "unit", quantity: 1, unitPrice: 55000 },
  { label: "作業員 1名", type: "unit", quantity: 1, unitPrice: 8000 },
  { label: "作業員 2名", type: "unit", quantity: 2, unitPrice: 8000 },
  { label: "階段割増", type: "fixed", amount: 5000 },
  { label: "エレベーター作業", type: "fixed", amount: 3000 },
  { label: "処分料金（実費）", type: "auto", autoRatio: 1 },
  { label: "諸経費", type: "auto", autoRatio: 1 },
  { label: "その他", type: "auto", autoRatio: 1 },
]

/** 簡易デフォルト（3グループ） */
export const DEFAULT_GROUPS: QuoteGroup[] = [
  { id: "work", label: "作業費", order: 0 },
  { id: "transport", label: "運搬費", order: 1 },
  { id: "other", label: "その他", order: 2 },
]

/**
 * 標準テンプレート：現場作業・搬出・処分・諸経費の8カテゴリ＋全項目
 * 「標準テンプレートを読み込む」で一括適用
 */
export const QUOTE_TEMPLATE_GROUPS: Omit<QuoteGroup, "id">[] = [
  { label: "① 現場作業費（人件・基本作業）", order: 0 },
  { label: "② 搬出・運搬費", order: 1 },
  { label: "③ 処分費（基本）", order: 2 },
  { label: "④ 家電リサイクル系", order: 3 },
  { label: "⑤ 危険物・特殊処分", order: 4 },
  { label: "⑥ 養生・清掃・仕上げ", order: 5 },
  { label: "⑦ 立地・環境割増", order: 6 },
  { label: "⑧ 諸経費・管理・調整", order: 7 },
]

const QUOTE_TEMPLATE_ITEMS: string[][] = [
  [
    "作業員 人件費（通常）",
    "作業責任者手当",
    "仕分け作業費",
    "分別作業費",
    "梱包作業費",
    "解体作業費（家具）",
    "解体作業費（物置）",
    "重量物搬出費",
    "大型家具搬出費",
    "家電搬出費",
    "危険物搬出費",
    "書類整理費",
    "貴重品探索費",
    "仏壇搬出費",
    "神棚撤去費",
    "遺品供養仕分け費",
  ],
  [
    "軽トラック 車両費",
    "2t平 車両費",
    "2t箱 車両費",
    "3t 車両費",
    "車両追加費",
    "ピストン回送費",
    "積込補助費",
    "長距離運搬費",
    "高速道路費",
    "フェリー費",
    "燃料費",
    "ドライバー人件費",
    "横持ち運搬費",
  ],
  [
    "可燃ごみ処分費",
    "不燃ごみ処分費",
    "混載ごみ処分費",
    "粗大ごみ処分費",
    "家具処分費",
    "マットレス処分費",
    "布団処分費",
    "畳処分費",
    "カーペット処分費",
    "木材処分費",
    "金属処分費",
    "プラスチック処分費",
    "紙類処分費",
  ],
  [
    "冷蔵庫 リサイクル費",
    "洗濯機 リサイクル費",
    "テレビ リサイクル費",
    "エアコン リサイクル費",
    "乾燥機 処分費",
    "電子レンジ 処分費",
    "パソコン 処分費",
    "プリンター 処分費",
  ],
  [
    "スプレー缶処分費",
    "塗料処分費",
    "灯油処分費",
    "ガスボンベ処分費",
    "消火器処分費",
    "バッテリー処分費",
    "タイヤ処分費",
    "医療廃棄物処分費",
    "薬品処分費",
    "金庫処分費",
    "ピアノ搬出処分費",
    "仏壇供養処分費",
  ],
  [
    "養生材費",
    "床養生費",
    "壁養生費",
    "エレベーター養生費",
    "簡易清掃費",
    "ハウスクリーニング",
    "消臭作業費",
    "害虫駆除費",
    "特殊清掃費",
    "汚染物撤去費",
  ],
  [
    "階段作業費（2階）",
    "階段作業費（3階以上）",
    "EVなし割増",
    "搬出距離長割増",
    "団地作業費",
    "戸建作業費",
    "狭小地作業費",
    "駐車困難費",
    "遠方出張費",
    "夜間作業費",
    "早朝作業費",
    "日曜祝日割増",
  ],
  [
    "現場管理費",
    "安全管理費",
    "駐車場費",
    "交通費",
    "資材費",
    "外注費",
    "保険費",
    "事務手数料",
    "見積作成費",
    "立会費",
    "買取相殺（▲）",
    "特別値引き（▲）",
    "キャンペーン値引き（▲）",
    "端数調整",
    "利益調整",
  ],
]

/**
 * プルダウン用：カテゴリ別項目リスト（細かい項目分け）
 */
export const QUOTE_TEMPLATE_CATEGORIES: { label: string; items: string[] }[] =
  QUOTE_TEMPLATE_GROUPS.map((g, i) => ({
    label: g.label,
    items: QUOTE_TEMPLATE_ITEMS[i] ?? [],
  }))

/**
 * 標準テンプレート（8カテゴリ＋全項目）を groups / lines に展開する
 * 各項目は type: "unit", quantity: 1, unitPrice: 0。最後のグループに調整行を1本追加
 */
export function getDefaultTemplateQuote(): { groups: QuoteGroup[]; lines: QuoteLine[] } {
  const groups: QuoteGroup[] = QUOTE_TEMPLATE_GROUPS.map((g, i) => ({
    id: uid(),
    label: g.label,
    order: g.order,
  }))

  const lines: QuoteLine[] = []
  const groupItems = QUOTE_TEMPLATE_ITEMS

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const items = groupItems[gi] ?? []
    for (const label of items) {
      lines.push({
        id: uid(),
        label,
        type: "unit",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        groupId: group.id,
      })
    }
    // 最後のグループの末尾に調整行を追加
    if (gi === groups.length - 1) {
      lines.push({
        id: uid(),
        label: "調整",
        type: "adjustment",
        quantity: 0,
        unitPrice: 0,
        amount: 0,
        groupId: group.id,
      })
    }
  }

  return { groups, lines }
}
