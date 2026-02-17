import Link from "next/link"

export default function VehicleNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-semibold">車両が見つかりません</h2>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        ブックマークレットで登録した直後の場合は、反映に少し時間がかかることがあります。
        ダッシュボードを更新し、一覧から該当車両を選んでください。
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        ダッシュボードに戻る
      </Link>
    </div>
  )
}
