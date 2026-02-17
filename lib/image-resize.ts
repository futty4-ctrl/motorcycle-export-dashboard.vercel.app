/**
 * 解析用画像の軽量化（Gemini Vision 送信用）。
 * 元画像は Drive にそのまま残し、API 送信時のみ長辺 1024px・WebP 圧縮でペイロードを削減する。
 */

import sharp from "sharp"

const LONG_EDGE_PX = 1024
const WEBP_QUALITY = 85

/**
 * 画像を長辺 1024px にリサイズし、WebP で圧縮して base64 を返す。
 * 解析速度と API ペイロード制限回避のため、Gemini に渡す直前に呼ぶ。
 * リサイズ・変換に失敗した場合は元の base64 と mimeType をそのまま返す（解析は継続）。
 */
export async function resizeImageForAnalysis(
  base64: string,
  mimeType: string
): Promise<{ base64: string; mimeType: string }> {
  try {
    const buf = Buffer.from(base64, "base64")
    const pipeline = sharp(buf)
    const meta = await pipeline.metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    const longEdge = Math.max(w, h, 1)
    if (longEdge <= LONG_EDGE_PX) {
      // すでに小さい場合は WebP に変換するだけ（容量削減）
      const out = await pipeline
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
      return { base64: out.toString("base64"), mimeType: "image/webp" }
    }
    const scale = LONG_EDGE_PX / longEdge
    const out = await pipeline
      .resize(Math.round(w * scale), Math.round(h * scale), { fit: "inside" })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
    return { base64: out.toString("base64"), mimeType: "image/webp" }
  } catch {
    return { base64, mimeType: mimeType || "image/jpeg" }
  }
}

/** BDS 全画面スクショ用: 幅 2000px 程度・WebP で AI 解析に最適化 */
const BDS_SCREENSHOT_WIDTH = 2000
const BDS_WEBP_QUALITY = 88

/** 複数枚送信時: ペイロード制限回避のため長辺 1200px・やや強めの圧縮 */
const BDS_MULTI_LONG_EDGE = 1200
const BDS_MULTI_WEBP_QUALITY = 82

export async function resizeScreenshotForBds(
  base64: string,
  mimeType: string
): Promise<{ base64: string; mimeType: string }> {
  try {
    const buf = Buffer.from(base64, "base64")
    const pipeline = sharp(buf)
    const meta = await pipeline.metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (w <= 0 || h <= 0) return { base64, mimeType: mimeType || "image/jpeg" }
    const scale = w > BDS_SCREENSHOT_WIDTH ? BDS_SCREENSHOT_WIDTH / w : 1
    const out = await pipeline
      .resize(Math.round(w * scale), Math.round(h * scale), { fit: "inside" })
      .webp({ quality: BDS_WEBP_QUALITY })
      .toBuffer()
    return { base64: out.toString("base64"), mimeType: "image/webp" }
  } catch {
    return { base64, mimeType: mimeType || "image/jpeg" }
  }
}

/**
 * 複数枚（2〜3枚）を送る場合の BDS 用リサイズ。1枚あたり長辺 1200px・WebP で圧縮し、
 * API ペイロード制限を超えないようにする。
 */
export async function resizeScreenshotForBdsMulti(
  base64: string,
  mimeType: string
): Promise<{ base64: string; mimeType: string }> {
  try {
    const buf = Buffer.from(base64, "base64")
    const pipeline = sharp(buf)
    const meta = await pipeline.metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    const longEdge = Math.max(w, h, 1)
    if (longEdge <= BDS_MULTI_LONG_EDGE) {
      const out = await pipeline
        .webp({ quality: BDS_MULTI_WEBP_QUALITY })
        .toBuffer()
      return { base64: out.toString("base64"), mimeType: "image/webp" }
    }
    const scale = BDS_MULTI_LONG_EDGE / longEdge
    const out = await pipeline
      .resize(Math.round(w * scale), Math.round(h * scale), { fit: "inside" })
      .webp({ quality: BDS_MULTI_WEBP_QUALITY })
      .toBuffer()
    return { base64: out.toString("base64"), mimeType: "image/webp" }
  } catch {
    return { base64, mimeType: mimeType || "image/jpeg" }
  }
}
