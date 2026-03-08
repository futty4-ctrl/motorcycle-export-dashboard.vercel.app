"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { getRiskAreaImageUrl, getRiskAreaImageUrlLarge } from "@/lib/risk-area-image-url"

export type RiskAreaItem = {
  description: string
  fileId?: string
  path?: string
  imageIndex?: number
  bbox?: { x: number; y: number; width: number; height: number }
}

const DISPLAY_WIDTH = 280
const DISPLAY_HEIGHT = 200

function getImageIdentifier(risk: RiskAreaItem): string {
  return risk.path ?? risk.fileId ?? ""
}

/**
 * bbox がある場合: object-position と clip（overflow）で該当箇所をズーム表示
 */
function CroppedRiskImage({
  fileIdOrPath,
  bbox,
  label,
  onError,
}: {
  fileIdOrPath: string
  bbox: { x: number; y: number; width: number; height: number }
  label: string
  onError: () => void
}) {
  const { x, y, width: nw, height: nh } = bbox
  const src = getRiskAreaImageUrlLarge(fileIdOrPath)
  const imgW = DISPLAY_WIDTH / nw
  const imgH = DISPLAY_HEIGHT / nh
  const objectPositionPct = `${(x + nw / 2) * 100}% ${(y + nh / 2) * 100}%`

  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-lg border-2 border-amber-500/40 bg-muted"
        style={{
          width: DISPLAY_WIDTH,
          height: DISPLAY_HEIGHT,
          clipPath: "inset(0)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="block object-none"
          style={{
            width: imgW,
            height: imgH,
            objectPosition: objectPositionPct,
            marginLeft: -x * imgW,
            marginTop: -y * imgH,
          }}
          onError={onError}
        />
      </div>
      <p className="min-h-[2.5rem] text-sm font-medium text-foreground" title={label}>
        {label}
      </p>
    </div>
  )
}

/**
 * bbox なし: サムネイル全体を表示
 */
function FullThumbnailRiskImage({
  fileIdOrPath,
  label,
  onError,
}: {
  fileIdOrPath: string
  label: string
  onError: () => void
}) {
  const { src } = getRiskAreaImageUrl(fileIdOrPath)

  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-lg border-2 border-amber-500/40 bg-muted"
        style={{ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={onError}
        />
      </div>
      <p className="min-h-[2.5rem] text-sm font-medium text-foreground" title={label}>
        {label}
      </p>
    </div>
  )
}

/**
 * 画像取得失敗時: リスク説明テキストのみ
 */
function TextOnlyRisk({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 px-4"
        style={{ width: DISPLAY_WIDTH }}
      >
        <p className="text-center text-xs text-muted-foreground">画像を表示できません</p>
      </div>
      <p className="min-h-[2.5rem] text-sm font-medium text-foreground" title={label}>
        {label}
      </p>
    </div>
  )
}

type Props = {
  riskAreas: RiskAreaItem[]
  /** 各 risk の imageIndex に対応する Storage パス（vehicleId/ファイル名）の配列。path がない場合のフォールバック用 */
  imagePaths?: string[]
}

export function AiZoomInspection({ riskAreas, imagePaths }: Props) {
  const withImage = riskAreas.filter((r) => getImageIdentifier(r) || (r.imageIndex != null && imagePaths?.length))
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())

  if (withImage.length === 0) return null

  const resolveFileIdOrPath = (risk: RiskAreaItem): string => {
    const id = getImageIdentifier(risk)
    if (id) return id
    if (risk.imageIndex != null && imagePaths?.length) {
      const idx = Math.max(0, Math.min(risk.imageIndex - 1, imagePaths.length - 1))
      return imagePaths[idx] ?? ""
    }
    return ""
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        AIズーム・インスペクション
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Gemini が検知した異常箇所を、元画像の該当範囲で切り出して表示しています。
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {withImage.map((risk, i) => {
          const fileIdOrPath = resolveFileIdOrPath(risk)
          const key = `${fileIdOrPath}-${risk.imageIndex ?? i}-${i}`
          const imageFailed = failedIds.has(key)

          const handleError = () => setFailedIds((prev) => new Set(prev).add(key))

          if (!fileIdOrPath || imageFailed) {
            return (
              <div key={key} className="flex flex-col">
                <TextOnlyRisk label={risk.description} />
              </div>
            )
          }

          return (
            <div key={key} className="flex flex-col">
              {risk.bbox ? (
                <CroppedRiskImage
                  fileIdOrPath={fileIdOrPath}
                  bbox={risk.bbox}
                  label={risk.description}
                  onError={handleError}
                />
              ) : (
                <FullThumbnailRiskImage
                  fileIdOrPath={fileIdOrPath}
                  label={risk.description}
                  onError={handleError}
                />
              )}
              <a
                href={getRiskAreaImageUrl(fileIdOrPath).href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                元写真を開く
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
