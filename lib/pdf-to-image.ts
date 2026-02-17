/**
 * PDF の1ページ目を画像（PNG）に変換する。
 * pdf-to-img を使用。API ルートで PDF 受信時にのみ使用。
 */
export async function pdfFirstPageToBase64(pdfBuffer: Buffer): Promise<{
  base64: string
  mimeType: string
}> {
  const { pdf } = await import("pdf-to-img")
  const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`
  const document = await pdf(dataUrl, { scale: 2 })
  const pageBuffer = await document.getPage(1)
  if (!pageBuffer) {
    throw new Error("PDF の1ページ目を画像に変換できませんでした。")
  }
  const buf = Buffer.isBuffer(pageBuffer)
    ? pageBuffer
    : Buffer.from(pageBuffer as ArrayBuffer | Uint8Array)
  return {
    base64: buf.toString("base64"),
    mimeType: "image/png",
  }
}
