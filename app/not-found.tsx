import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">ページが見つかりません</h2>
      <p className="text-muted-foreground">指定されたページは存在しません。</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        ダッシュボードに戻る
      </Link>
    </div>
  )
}
