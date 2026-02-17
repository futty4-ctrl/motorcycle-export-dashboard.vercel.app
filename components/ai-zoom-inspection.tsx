"use client"

import { ExternalLink } from "lucide-react"

export type RiskAreaItem = {
  description: string
  fileId?: string
  bbox?: { x: number; y: number; width: number; height: number }
}

const DISPLAY_WIDTH = 280
const DISPLAY_HEIGHT = 200

/**
 * 正規化座標 bbox で指定された範囲を、元画像から「切り出したように」表示する。
 * CSS の overflow + 画像の scale/position で実現（クロスオリジンでも表示可能）。
 */
function CroppedRiskImage({
  fileId,
  bbox,
  label,
}: {
  fileId: string
  bbox: { x: number; y: number; width: number; height: number }
  label: string
}) {
  const { x, y, width: nw, height: nh } = bbox
  const imgWidth = DISPLAY_WIDTH / nw
  const imgHeight = DISPLAY_HEIGHT / nh
  const marginLeft = -x * imgWidth
  const marginTop = -y * imgHeight
  const src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`

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
          className="block object-none"
          style={{
            width: imgWidth,
            height: imgHeight,
            marginLeft,
            marginTop,
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      </div>
      <p className="min-h-[2.5rem] text-sm font-medium text-foreground" title={label}>
        {label}
      </p>
    </div>
  )
}

/**
 * bbox なしの場合はサムネイル全体を表示
 */
function FullThumbnailRiskImage({ fileId, label }: { fileId: string; label: string }) {
  const src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border-2 border-amber-500/40 bg-muted" style={{ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      </div>
      <p className="min-h-[2.5rem] text-sm font-medium text-foreground" title={label}>
        {label}
      </p>
    </div>
  )
}

type Props = {
  riskAreas: RiskAreaItem[]
}

export function AiZoomInspection({ riskAreas }: Props) {
  const withFileId = riskAreas.filter((r) => r.fileId)

  if (withFileId.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        AIズーム・インスペクション
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Gemini が検知した異常箇所を、元画像の該当範囲で切り出して表示しています。
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {withFileId.map((risk, i) => (
          <div key={`${risk.fileId}-${i}`} className="flex flex-col">
            {risk.fileId && risk.bbox ? (
              <CroppedRiskImage
                fileId={risk.fileId}
                bbox={risk.bbox}
                label={risk.description}
              />
            ) : risk.fileId ? (
              <FullThumbnailRiskImage fileId={risk.fileId} label={risk.description} />
            ) : null}
            <a
              href={`https://drive.google.com/file/d/${risk.fileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              元写真を開く
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
