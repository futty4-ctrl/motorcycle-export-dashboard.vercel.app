// 客の自由文 → 項目抽出（既存の Gemini ラッパを再利用）。
// ※Claude API は使わない（仕様書 §14）。Gemini 2.5 Flash のみ。
import { getGeminiModel } from "@/lib/ai/gemini"
import { EXTRACTION_PROMPT, parseExtraction, type ExtractedFields } from "./hearing"

/** 客のメッセージ（複数連結可）から項目を抽出。失敗時 null（呼び出し側は原文保存にフォールバック） */
export async function extractFields(userText: string): Promise<ExtractedFields | null> {
  const model = getGeminiModel()
  const result = await model.generateContent([EXTRACTION_PROMPT, `客のメッセージ:\n${userText}`])
  const text = result.response.text()
  return parseExtraction(text)
}
