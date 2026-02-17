import { GoogleGenerativeAI } from "@google/generative-ai"

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GEMINI_API_KEY が設定されていません。.env.local に追加してください。"
    )
  }
  return new GoogleGenerativeAI(apiKey)
}

export function getGeminiModel() {
  return getGeminiClient().getGenerativeModel({ model: MODEL })
}
