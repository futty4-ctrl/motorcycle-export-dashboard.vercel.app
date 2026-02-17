import fs from "node:fs"
import { Readable } from "node:stream"
import { google } from "googleapis"

export type ServiceAccountCredentials = {
  client_email: string
  private_key: string
}

/**
 * 環境変数からサービスアカウント認証情報を取得する。
 * GOOGLE_SERVICE_ACCOUNT_JSON: サービスアカウントJSON全体（文字列）
 * または GOOGLE_APPLICATION_CREDENTIALS: 認証JSONファイルのパス
 */
function getCredentials(): ServiceAccountCredentials {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (json) {
    try {
      const parsed = JSON.parse(json) as { client_email?: string; private_key?: string }
      if (parsed.client_email && parsed.private_key) {
        return { client_email: parsed.client_email, private_key: parsed.private_key }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON の JSON が不正です: ${msg}`)
    }
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (path) {
    const content = fs.readFileSync(path, "utf8")
    const parsed = JSON.parse(content) as { client_email?: string; private_key?: string }
    if (parsed.client_email && parsed.private_key) {
      return { client_email: parsed.client_email, private_key: parsed.private_key }
    }
  }

  throw new Error(
    "Google 認証情報が設定されていません。GOOGLE_SERVICE_ACCOUNT_JSON または GOOGLE_APPLICATION_CREDENTIALS を設定してください。"
  )
}

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
]

function getAuth() {
  const credentials = getCredentials()
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, "\n"),
    },
    scopes: GOOGLE_SCOPES,
  })
}

/**
 * サービスアカウントで Google Sheets API クライアントを取得する
 */
export function getSheetsClient() {
  const auth = getAuth()
  return google.sheets({ version: "v4", auth })
}

/**
 * スプレッドシートの指定範囲を読み取る
 */
export async function getSheetValues(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })
  const rows = (res.data.values ?? []) as string[][]
  return rows
}

/**
 * スプレッドシートの指定シート末尾に1行追加する。
 * @returns 追加された行の範囲（例: "車両!A12:K12"）。書き戻しに利用可能。
 */
export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string,
  values: (string | number)[]
): Promise<string> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:K`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [values.map((v) => String(v))],
    },
  })
  const updatedRange = res.data.updates?.updatedRange
  if (!updatedRange) throw new Error("追加した行の範囲を取得できませんでした")
  return updatedRange
}

/**
 * スプレッドシートの指定範囲に値を書き込む（該当行への書き戻しに使用）
 */
export async function updateSheetRange(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: values.map((row) => row.map((v) => String(v))),
    },
  })
}

// ========== 古物台帳（古物営業法に基づく記載） ==========

export const KOBUTSUCHO_SHEET_NAME = "古物台帳"

/** 古物台帳の1行分（法令で定められた項目） */
export type KobutsuchoRowData = {
  /** 取引の年月日（YYYY-MM-DD または 和暦表記可） */
  date: string
  /** 品目（例: 二輪車） */
  itemCategory: string
  /** 特徴（車体番号・型式・状態等） */
  features: string
  /** 数量 */
  quantity: number
  /** 代金（円） */
  priceJpy: number
  /** 相手方（譲渡人の氏名・住所等） */
  counterparty: string
}

const KOBUTSUCHO_HEADERS: string[] = [
  "年月日",
  "品目",
  "特徴",
  "数量",
  "代金",
  "相手方",
]

/**
 * 「古物台帳」シートが存在することを保証し、ヘッダー行があればそのまま、なければ書き込む。
 * シートが無い場合は新規作成してヘッダーを書き込む。
 */
export async function ensureKobutsuchoSheet(
  spreadsheetId: string
): Promise<void> {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  })
  const sheetList = meta.data.sheets ?? []
  const hasSheet = sheetList.some(
    (s) => (s.properties?.title ?? "") === KOBUTSUCHO_SHEET_NAME
  )

  if (!hasSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: KOBUTSUCHO_SHEET_NAME },
            },
          },
        ],
      },
    })
  }

  const range = `${KOBUTSUCHO_SHEET_NAME}!A1:F1`
  let existing: string[][] = []
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })
    existing = (res.data.values ?? []) as string[][]
  } catch {
    // シートはあるが範囲が未作成の場合は values が空
  }
  const needsHeader =
    existing.length === 0 ||
    existing[0]?.length === 0 ||
    existing[0]?.[0]?.trim() !== KOBUTSUCHO_HEADERS[0]
  if (needsHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [KOBUTSUCHO_HEADERS] },
    })
  }
}

/**
 * 古物台帳に1行追加する。ensureKobutsuchoSheet を内部で呼ぶ。
 * 車両が落札（Status: Won）になったときに呼び、法令で定められた項目を一行追加する。
 */
export async function appendKobutsuchoRow(
  spreadsheetId: string,
  row: KobutsuchoRowData
): Promise<string> {
  await ensureKobutsuchoSheet(spreadsheetId)
  const values: (string | number)[] = [
    row.date,
    row.itemCategory,
    row.features,
    row.quantity,
    row.priceJpy,
    row.counterparty,
  ]
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${KOBUTSUCHO_SHEET_NAME}!A:F`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values.map((v) => String(v))] },
  })
  const updatedRange = res.data.updates?.updatedRange
  if (!updatedRange) throw new Error("古物台帳への行追加後に範囲を取得できませんでした")
  return updatedRange
}

/**
 * サービスアカウントで Google Drive API クライアントを取得する
 */
export function getDriveClient() {
  const auth = getAuth()
  return google.drive({ version: "v3", auth })
}

const FOLDER_MIME = "application/vnd.google-apps.folder"

/**
 * Google Drive にフォルダを新規作成し、そのフォルダのURLを返す
 * @param folderName フォルダ名（例: UUID）
 * @param parentId 親フォルダID。未指定時はルートに作成
 */
export async function createDriveFolder(
  folderName: string,
  parentId?: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient()
  const body: { name: string; mimeType: string; parents?: string[] } = {
    name: folderName,
    mimeType: FOLDER_MIME,
  }
  if (parentId) {
    body.parents = [parentId]
  }
  const res = await drive.files.create({
    requestBody: body,
    fields: "id, webViewLink",
  })
  const id = res.data.id
  const webViewLink = res.data.webViewLink
  if (!id) throw new Error("フォルダ作成後にIDを取得できませんでした")
  return {
    id,
    webViewLink: webViewLink ?? `https://drive.google.com/drive/folders/${id}`,
  }
}

/** 車両用Driveフォルダのサブフォルダ名（メディアストレージ用途） */
export const VEHICLE_SUBFOLDERS = ["inspect", "photos", "export"] as const

/**
 * 車両ID名のフォルダをDriveに作成し、配下に inspect / photos / export の3サブフォルダを生成する。
 * メディアストレージとして使用する想定。
 * @param vehicleId 車両ID（フォルダ名になる）
 * @param parentId 親フォルダID。未指定時はルートに作成
 */
export async function createVehicleDriveFolder(
  vehicleId: string,
  parentId?: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient()
  const parents: string[] = parentId ? [parentId] : []

  const rootBody = {
    name: vehicleId,
    mimeType: FOLDER_MIME,
    ...(parents.length ? { parents } : {}),
  }
  const rootRes = await drive.files.create({
    requestBody: rootBody,
    fields: "id, webViewLink",
  })
  const rootId = rootRes.data.id
  if (!rootId) throw new Error("車両フォルダの作成に失敗しました")

  for (const subName of VEHICLE_SUBFOLDERS) {
    await drive.files.create({
      requestBody: {
        name: subName,
        mimeType: FOLDER_MIME,
        parents: [rootId],
      },
      fields: "id",
    })
  }

  const webViewLink =
    rootRes.data.webViewLink ?? `https://drive.google.com/drive/folders/${rootId}`
  return { id: rootId, webViewLink }
}

/**
 * drive_link URL からフォルダIDを抽出する
 * 例: https://drive.google.com/drive/folders/abc123 → abc123
 */
export function extractDriveFolderId(driveLink: string | null): string | null {
  if (!driveLink) return null
  const m = driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

/**
 * 指定フォルダにファイルをアップロードする（写真用）
 */
export async function uploadToDriveFolder(
  folderId: string,
  fileName: string,
  mimeType: string,
  base64Data: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient()
  const buf = Buffer.from(base64Data, "base64")
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buf),
    },
    fields: "id, webViewLink",
  })
  const id = res.data.id
  const webViewLink = res.data.webViewLink
  if (!id) throw new Error("アップロード後にファイルIDを取得できませんでした")
  return {
    id,
    webViewLink: webViewLink ?? `https://drive.google.com/file/d/${id}/view`,
  }
}

/**
 * 指定した親フォルダ内に新しいフォルダを自動作成し、その中に画像を保存する
 * @returns 作成したフォルダのID・URLと、アップロードしたファイルのURL
 */
export async function createSubfolderAndUploadImage(
  parentFolderId: string,
  subfolderName: string,
  fileName: string,
  mimeType: string,
  base64Data: string
): Promise<{
  folderId: string
  folderUrl: string
  fileId: string
  fileUrl: string
}> {
  const { id: folderId, webViewLink: folderUrl } = await createDriveFolder(
    subfolderName,
    parentFolderId
  )
  const { id: fileId, webViewLink: fileUrl } = await uploadToDriveFolder(
    folderId,
    fileName,
    mimeType,
    base64Data
  )
  return { folderId, folderUrl, fileId, fileUrl }
}

const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
]

/**
 * 指定フォルダとそのサブフォルダ内の画像ファイルを再帰的に列挙する
 */
export async function listImageFilesInFolder(folderId: string): Promise<
  { id: string; name: string; mimeType: string }[]
> {
  const drive = getDriveClient()
  const result: { id: string; name: string; mimeType: string }[] = []

  async function listRecursive(parentId: string) {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType)",
      pageSize: 100,
    })
    const files = res.data.files ?? []
    for (const f of files) {
      if (!f.id) continue
      const mime = (f.mimeType ?? "").toLowerCase()
      if (mime === "application/vnd.google-apps.folder") {
        await listRecursive(f.id)
      } else if (IMAGE_MIMES.some((m) => mime === m || mime.startsWith("image/"))) {
        result.push({
          id: f.id,
          name: f.name ?? "",
          mimeType: mime || "image/jpeg",
        })
      }
    }
  }

  await listRecursive(folderId)
  return result
}

/**
 * Drive 上のファイルを base64 で取得する（画像を Gemini に渡す用）
 */
export async function getDriveFileContentAsBase64(
  fileId: string,
  mimeType: string
): Promise<string> {
  const drive = getDriveClient()
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  )
  const buf = Buffer.from(res.data as ArrayBuffer)
  return buf.toString("base64")
}
