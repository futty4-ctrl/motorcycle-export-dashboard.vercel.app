/**
 * 車両一覧カード表示用の共通型
 * Supabase / スプレッドシート どちらからでもマッピング可能
 */

import type { VehicleStatus } from "@/lib/data"

export type VehicleDisplay = {
  id: string
  status: VehicleStatus
  /** 表示名（車体番号・名前・ID のいずれか） */
  name: string
  year?: number
  image: string
  /** 0-100。利益率やシナリオ利益から算出。プログレスバー・色に使用 */
  profitScore: number
  expectedProfitJPY: number
  expectedProfitUSD?: number
  mileage?: string
  auctionGrade?: string
  /** BDS評価（Supabase の bds_rating） */
  bdsRating?: string | null
  /** 車体番号 */
  chassisNumber?: string | null
  /** 当該車両の Drive フォルダ URL（写真アップロード先の親） */
  driveLink?: string | null
}

/** 利益率（0-100）に応じたプログレスバーの色クラス */
export function getProfitBarColorClass(profitScore: number): string {
  if (profitScore >= 70) return "bg-primary"
  if (profitScore >= 45) return "bg-accent"
  return "bg-destructive"
}

export function getProfitBarTrackClass(profitScore: number): string {
  if (profitScore >= 70) return "bg-primary/20"
  if (profitScore >= 45) return "bg-accent/20"
  return "bg-destructive/20"
}
