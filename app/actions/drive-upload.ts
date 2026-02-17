"use server"

import {
  createDriveFolder,
  uploadToDriveFolder,
} from "@/lib/google-sheets"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * 画像を Google Drive の指定親フォルダ内に新規フォルダを作成して保存し、
 * ファイルURLをデータベースに保存する（1枚用）
 */
export async function uploadImageToDriveAndSave(params: {
  imageBase64: string
  mimeType: string
  fileName?: string
  /** 親フォルダID。未指定時は GOOGLE_DRIVE_PARENT_FOLDER_ID を使用 */
  parentFolderId?: string
  vehicleId?: string | null
}): Promise<{
  success: boolean
  fileUrl?: string
  folderUrl?: string
  error?: string
}> {
  const result = await uploadImagesBatchToDriveAndSave({
    images: [
      {
        imageBase64: params.imageBase64,
        mimeType: params.mimeType,
        fileName: params.fileName,
      },
    ],
    parentFolderId: params.parentFolderId,
    vehicleId: params.vehicleId,
  })
  if (!result.success || !result.fileUrls?.length) {
    return { success: false, error: result.error }
  }
  return {
    success: true,
    fileUrl: result.fileUrls[0],
    folderUrl: result.folderUrl,
  }
}

/**
 * 複数画像を1つのフォルダにまとめてアップロードする。
 * 1回のアップロードで1フォルダに全画像を入れる（フォルダが乱立しないようにする）
 */
export async function uploadImagesBatchToDriveAndSave(params: {
  images: {
    imageBase64: string
    mimeType: string
    fileName?: string
  }[]
  parentFolderId?: string
  vehicleId?: string | null
}): Promise<{
  success: boolean
  folderUrl?: string
  fileUrls?: string[]
  error?: string
}> {
  const parentId =
    params.parentFolderId ?? process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
  if (!parentId) {
    return {
      success: false,
      error:
        "親フォルダが指定されていません。GOOGLE_DRIVE_PARENT_FOLDER_ID を設定するか、parentFolderId を渡してください。",
    }
  }

  if (params.images.length === 0) {
    return { success: false, error: "画像がありません。" }
  }

  try {
    const now = new Date()
    const timestamp = now.toISOString().replace(/\D/g, "").slice(0, 14)
    const subfolderName = `upload_${timestamp}`

    const { id: folderId, webViewLink: folderUrl } = await createDriveFolder(
      subfolderName,
      parentId
    )

    const supabase = createServerSupabaseClient()
    const fileUrls: string[] = []

    for (let i = 0; i < params.images.length; i++) {
      const img = params.images[i]
      const ext = img.mimeType === "image/png" ? "png" : "jpg"
      const fileName =
        img.fileName?.trim() || `photo_${Date.now()}_${i + 1}.${ext}`

      const { webViewLink: fileUrl } = await uploadToDriveFolder(
        folderId,
        fileName,
        img.mimeType,
        img.imageBase64
      )

      fileUrls.push(fileUrl)

      await supabase.from("drive_uploads").insert({
        file_url: fileUrl,
        file_name: fileName,
        mime_type: img.mimeType,
        drive_folder_id: folderId,
        drive_folder_url: folderUrl ?? `https://drive.google.com/drive/folders/${folderId}`,
        vehicle_id: params.vehicleId ?? null,
      })
    }

    return {
      success: true,
      folderUrl: folderUrl ?? `https://drive.google.com/drive/folders/${folderId}`,
      fileUrls,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "アップロードに失敗しました"
    return { success: false, error: message }
  }
}
