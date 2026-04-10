import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { generateDocument } from "@/lib/document-generator"
import type {
  EstimateData,
  InvoiceData,
  ReceiptData,
} from "@/types/document"

type DocType = "見積書" | "請求書" | "領収書"

interface RequestBody {
  docType: DocType
  data: EstimateData | InvoiceData | ReceiptData
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const { docType, data } = body

    if (!docType || !data) {
      return NextResponse.json(
        { error: "docType と data は必須です" },
        { status: 400 }
      )
    }

    const validTypes: DocType[] = ["見積書", "請求書", "領収書"]
    if (!validTypes.includes(docType)) {
      return NextResponse.json(
        { error: `無効な帳票タイプ: ${docType}` },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // 1. issuer_presets テーブルから発行元取得
    const presetName = data.issuerPreset || "yamanoue"
    const { data: issuer, error: issuerError } = await supabase
      .from("issuer_presets")
      .select("*")
      .eq("name", presetName)
      .single()

    if (issuerError) {
      console.warn("発行元プリセット取得失敗:", issuerError.message)
    }

    // 2. 角印画像を取得
    let stampBuffer: Buffer | null = null
    try {
      const sealPath = path.join(process.cwd(), "public", "seal.png")
      stampBuffer = fs.readFileSync(sealPath)
    } catch {
      console.warn("角印画像（public/seal.png）が見つかりません。角印なしで生成します。")
    }

    // 3. docx 生成
    const docxBuffer = await generateDocument(docType, data, issuer ?? null, stampBuffer)

    // 4. total_amount 算出
    let totalAmount = 0
    if (docType === "見積書") {
      const d = data as EstimateData
      totalAmount = d.items?.reduce((s, i) => s + i.total, 0) ?? 0
    } else if (docType === "請求書") {
      const d = data as InvoiceData
      totalAmount = d.items?.reduce((s, i) => s + i.amount, 0) ?? 0
    } else if (docType === "領収書") {
      const d = data as ReceiptData
      totalAmount = d.amount ?? 0
    }

    // 5. documents テーブルに記録を保存
    const clientName =
      (data as EstimateData).client ||
      (data as InvoiceData).client ||
      (data as ReceiptData).client ||
      ""
    const clientAddress = (data as InvoiceData).clientAddress || null
    const docDate =
      (data as EstimateData).date ||
      (data as InvoiceData).date ||
      (data as ReceiptData).date ||
      new Date().toISOString().split("T")[0]

    const { error: insertError } = await supabase.from("documents").insert({
      doc_type: docType,
      doc_date: docDate,
      client_name: clientName,
      client_address: clientAddress,
      total_amount: totalAmount,
      issuer_preset: presetName,
      detail_json: data as unknown as Record<string, unknown>,
    })

    if (insertError) {
      console.error("documents テーブル保存失敗:", insertError.message)
    }

    // 6. docx バイナリをレスポンスとして返却
    const fileName = `${docType}_${clientName || "document"}_${docDate}.docx`

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error("帳票生成エラー:", error)
    return NextResponse.json(
      { error: "帳票の生成に失敗しました" },
      { status: 500 }
    )
  }
}
