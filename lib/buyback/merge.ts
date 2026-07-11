// 案件フィールドのマージ（新しい非null値で上書き・純関数）
import type { ExtractedFields } from "./hearing"

export type CaseFields = Partial<ExtractedFields>

/** incoming の非null/非undefined値だけを existing に上書きして返す（順不同ヒアリングの累積用） */
export function mergeFields(existing: CaseFields, incoming: Partial<ExtractedFields>): CaseFields {
  const out: CaseFields = { ...existing }
  ;(Object.keys(incoming) as (keyof ExtractedFields)[]).forEach((k) => {
    const v = incoming[k]
    if (v !== null && v !== undefined) {
      // @ts-expect-error 動的キー代入
      out[k] = v
    }
  })
  return out
}
