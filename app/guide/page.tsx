import Link from "next/link"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  orangeDim: "rgba(249,115,22,0.12)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  yellow: "#eab308",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.12)",
  red: "#ef4444",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

type Step = {
  n: number
  title: string
  desc: string
  color: string
  bg: string
  actions: Array<{ href: string; label: string; note: string }>
}

const STEPS: Step[] = [
  {
    n: 1,
    title: "仕入れ判断",
    desc: "BDSで欲しい車を見つけた時 → いくらまで出せるか決める",
    color: C.orange,
    bg: C.orangeDim,
    actions: [
      {
        href: "/bds-border",
        label: "🎯 仕入ボーダー計算",
        note: "車種選択で「計算ボーダー + 過去実績 + BDS落札相場」が一発",
      },
      {
        href: "/auction-day",
        label: "🏁 オークション当日",
        note: "当日は G/N/M キーで高速判定。「ボーダー詳細→」で迷ったら再計算",
      },
    ],
  },
  {
    n: 2,
    title: "落札後の登録",
    desc: "BDSで落札した車を在庫に入れる",
    color: C.blue,
    bg: C.blueDim,
    actions: [
      {
        href: "/inventory",
        label: "▦ 在庫管理 → BDS取込タブ",
        note: "BDS請求書PDFをドラッグ&ドロップ → 自動で車台番号・価格を抽出して一括登録",
      },
    ],
  },
  {
    n: 3,
    title: "出品",
    desc: "整備が終わったらヤフオクに出す",
    color: C.green,
    bg: C.greenDim,
    actions: [
      {
        href: "/inventory",
        label: "▦ 在庫管理 → 車両クリック",
        note: "スマホで写真撮影 → 一括アップロード（在庫詳細ページ）",
      },
      {
        href: "/yahoo-template",
        label: "📝 出品テンプレ",
        note: "車両選択 → 「コピー&ヤフオク出品→」ボタンで本文+タイトル一括コピー、ヤフオク新規出品ページを新タブで開く",
      },
    ],
  },
  {
    n: 4,
    title: "売却実績の入力",
    desc: "売れたら売却価格と日付だけ入れる（30秒）",
    color: C.yellow,
    bg: "rgba(234,179,8,0.12)",
    actions: [
      {
        href: "/inventory",
        label: "▦ 在庫管理 → 売約済みタブ",
        note: "黄色ハイライトの行に「売却価格・日付」を入力 → Enter保存。過去実績が貯まるほど仕入ボーダーの精度UP",
      },
    ],
  },
]

const SIDEBAR_EXPLAIN: Array<{ icon: string; label: string; href: string; desc: string }> = [
  { icon: "◈", label: "ダッシュボード", href: "/", desc: "全体の数字・未入力警告・月利目標進捗" },
  { icon: "🎯", label: "仕入ボーダー", href: "/bds-border", desc: "いくらまで買えるか計算。過去実績・BDS相場も自動" },
  { icon: "🏁", label: "オークション当日", href: "/auction-day", desc: "当日の入札判断（タブで利益スコアボードも）" },
  { icon: "📚", label: "オークション履歴", href: "/auction-history", desc: "BDS落札結果の取込・検索（1000件蓄積）" },
  { icon: "📊", label: "分析・振り返り", href: "/analytics", desc: "5タブ（月次進捗/損益/入札/予測/資金繰り）" },
  { icon: "▲", label: "相場比較", href: "/market", desc: "ヤフオク・BDS相場の手動管理（次回改善予定）" },
  { icon: "🧮", label: "見積・帳票", href: "/quote", desc: "見積逆算と帳票発行（タブ切替）" },
  { icon: "▦", label: "在庫管理", href: "/inventory", desc: "車両一覧・BDS取込・クイック登録・CSV更新" },
  { icon: "📋", label: "古物台帳", href: "/kobutsu", desc: "Googleスプレッドシート連携で古物商台帳を自動更新" },
  { icon: "📖", label: "取扱説明書", href: "/manual", desc: "旧使い方ガイド（markdown版）" },
  { icon: "⚙", label: "設定", href: "/settings", desc: "ユーザー設定＋古物商設定（下部に埋め込み）" },
]

const RULES = [
  "1台あたり仕入上限 15万円（計算ボーダーが超えても）",
  "メイン車種：4ミニ・ネイキッド・オフ車",
  "ヤフオク出品：1円スタート・日曜21時終了・7日間・広告100円×7日",
  "落札後は必ず売却価格・日付を入力（30秒で完了）",
  "時給換算¥3,000以下の作業は自動化・外注を検討",
]

const HEADER_STYLE = {
  fontFamily: C.fontSans,
  fontWeight: 800 as const,
  fontSize: 22,
  letterSpacing: "-0.02em",
  color: C.text,
  margin: 0,
}

const SECTION_TITLE_STYLE = {
  fontFamily: C.fontSans,
  fontWeight: 700 as const,
  fontSize: 16,
  color: C.text,
  marginBottom: 12,
  marginTop: 32,
}

export default function GuidePage() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 960, fontFamily: C.font, color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={HEADER_STYLE}>📖 使い方ガイド</h1>
          <span style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.1em" }}>HOW_TO_USE</span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          迷ったらここ。4ステップ業務フロー＋全画面の1行説明。
        </p>
      </div>

      {/* 業務フロー */}
      <div style={SECTION_TITLE_STYLE}>🔁 毎日の業務フロー（4ステップ）</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {STEPS.map((s) => (
          <div
            key={s.n}
            style={{
              background: C.surface,
              border: `1px solid ${s.color}40`,
              borderLeft: `4px solid ${s.color}`,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: s.bg,
                  border: `1px solid ${s.color}`,
                  color: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: C.fontSans,
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                {s.n}
              </div>
              <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 16, color: s.color }}>
                {s.title}
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14, marginLeft: 44 }}>
              {s.desc}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 44 }}>
              {s.actions.map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  style={{
                    display: "block",
                    padding: "10px 14px",
                    background: C.surfaceHigh,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    textDecoration: "none",
                  }}
                >
                  <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: s.color, marginBottom: 4 }}>
                    {a.label} →
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
                    {a.note}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 全画面説明 */}
      <div style={SECTION_TITLE_STYLE}>🗺️ 全画面の役割（サイドバー順）</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {SIDEBAR_EXPLAIN.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 16 }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
                {p.label}
              </span>
              <span style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, marginLeft: 8 }}>
                {p.href}
              </span>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                {p.desc}
              </div>
            </div>
            <span style={{ color: C.textMuted, fontSize: 14 }}>→</span>
          </Link>
        ))}
      </div>

      {/* 判断ルール */}
      <div style={SECTION_TITLE_STYLE}>🎯 ふっちーの判断ルール</div>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: C.fontSans, fontSize: 13, lineHeight: 2, color: C.textSub }}>
          {RULES.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* KPI目標 */}
      <div style={SECTION_TITLE_STYLE}>📈 バイク事業KPI目標</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "月仕入台数", value: "30台", note: "週10台ペース" },
          { label: "月粗利", value: "150万円", note: "1台5万×30台" },
          { label: "継続月数", value: "3ヶ月連続", note: "達成でeBay解凍" },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
              {k.label}
            </div>
            <div style={{ fontFamily: C.fontSans, fontSize: 22, fontWeight: 800, color: C.orange, lineHeight: 1.1 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>
              {k.note}
            </div>
          </div>
        ))}
      </div>

      {/* 困ったら */}
      <div style={SECTION_TITLE_STYLE}>💡 困ったら</div>
      <div
        style={{
          background: `${C.orange}08`,
          border: `1px solid ${C.orange}40`,
          borderRadius: 10,
          padding: 20,
          fontSize: 13,
          lineHeight: 1.8,
          color: C.textSub,
        }}
      >
        <div>Claude Code（CLI）に聞く：このアプリの全ファイル・全ロジックを把握してます。</div>
        <div style={{ marginTop: 6 }}>例：「仕入ボーダーの計算式は？」「在庫の売約済み一覧を出して」「新しい分析タブ追加して」</div>
      </div>
    </div>
  )
}
