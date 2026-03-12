"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const C = {
  bg: "#0a0a0b", surface: "#111113", border: "#1e1e22", borderHover: "#2e2e34",
  orange: "#f5720a", orangeDim: "#a34d07", text: "#e8e8ec", textMuted: "#6b6b74",
  textSub: "#9999a8", green: "#22c55e", red: "#ef4444", blue: "#3b82f6", yellow: "#eab308",
};

const s = {
  app: { fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" },
  sidebar: { width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  logo: { padding: "20px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { width: 32, height: 32, background: C.orange, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14, color: "#fff", flexShrink: 0 },
  logoText: { fontSize: 13, fontWeight: "bold", lineHeight: 1.3 },
  nav: { padding: "8px 0", flex: 1 },
  navGroup: { padding: "8px 12px 4px", fontSize: 10, color: C.textMuted, letterSpacing: 1.5 },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12, color: active ? C.orange : C.textSub, background: active ? `${C.orange}15` : "transparent", borderRight: active ? `2px solid ${C.orange}` : "2px solid transparent" }),
  main: { flex: 1, overflowY: "auto", padding: 32 },
  pageTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 12, color: C.textSub, marginBottom: 28 },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 11, color: C.textMuted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 },
  grid4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 },
  kpiCard: (color) => ({ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, borderLeft: `3px solid ${color || C.orange}` }),
  kpiLabel: { fontSize: 11, color: C.textMuted, letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" },
  kpiValue: { fontSize: 26, fontWeight: "bold", letterSpacing: -1 },
  kpiSub: { fontSize: 11, color: C.textSub, marginTop: 4 },
  input: { background: "#0e0e10", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  label: { fontSize: 11, color: C.textSub, marginBottom: 6, display: "block", letterSpacing: 0.5 },
  btn: (variant = "primary") => ({ padding: "10px 20px", borderRadius: 6, border: variant === "ghost" ? `1px solid ${C.border}` : "none", cursor: "pointer", fontSize: 13, fontWeight: "bold", fontFamily: "inherit", letterSpacing: 0.3, background: variant === "primary" ? C.orange : variant === "ghost" ? "transparent" : C.border, color: variant === "primary" ? "#fff" : variant === "ghost" ? C.textSub : C.text }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, color: C.textMuted, borderBottom: `1px solid ${C.border}`, letterSpacing: 1, textTransform: "uppercase" },
  td: { padding: "11px 12px", borderBottom: `1px solid ${C.border}80`, color: C.text },
  badge: (color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 11, background: `${color}20`, color: color, fontWeight: "bold" }),
  divider: { borderBottom: `1px solid ${C.border}`, margin: "20px 0" },
  formRow: { marginBottom: 16 },
  resultBox: (value) => ({ background: value ? `${C.orange}12` : "#0e0e10", border: `1px solid ${value ? C.orange : C.border}`, borderRadius: 8, padding: "16px 20px", textAlign: "center", marginTop: 20 }),
};

const NAV = [
  { group: "MAIN", items: [{ id: "dashboard", label: "ダッシュボード", icon: "◈" }, { id: "bds-simulator", label: "BDS入札シミュ", icon: "⟆" }, { id: "market", label: "BDS過去相場", icon: "∿" }] },
  { group: "BUSINESS", items: [{ id: "documents", label: "見積・請求", icon: "◻" }, { id: "auction-preview", label: "オークション・プレビュー", icon: "◫" }, { id: "inventory", label: "在庫管理", icon: "▦" }] },
  { group: "ANALYTICS", items: [{ id: "analytics", label: "予想 vs 実績", icon: "△" }, { id: "ebay", label: "eBay出品", icon: "⌁" }] },
  { group: "OTHER", items: [{ id: "manual", label: "取扱説明書", icon: "?" }, { id: "settings", label: "設定", icon: "⚙" }] },
];

const SAMPLE_INVENTORY = [
  { id: 1, maker: "Honda", model: "CB400SF", year: 2018, condition: "実働", purchasePrice: 120000, sellingPrice: 185000, status: "在庫", purchased: "2026-01-15" },
  { id: 2, maker: "Yamaha", model: "MT-07", year: 2020, condition: "実働", purchasePrice: 280000, sellingPrice: 420000, status: "出品中", purchased: "2026-01-22" },
  { id: 3, maker: "Suzuki", model: "GSX-R600", year: 2016, condition: "不動", purchasePrice: 45000, sellingPrice: 180000, status: "整備中", purchased: "2026-02-01" },
  { id: 4, maker: "Kawasaki", model: "Ninja 400", year: 2019, condition: "実働", purchasePrice: 190000, sellingPrice: 295000, status: "売約済", purchased: "2026-02-05" },
  { id: 5, maker: "Honda", model: "CBR1000RR", year: 2015, condition: "実働", purchasePrice: 350000, sellingPrice: 520000, status: "在庫", purchased: "2026-02-10" },
];

const SAMPLE_MARKET = [
  { model: "Honda CB400SF", count: 24, avgPrice: 182000, minPrice: 95000, maxPrice: 320000, trend: "↑" },
  { model: "Yamaha MT-07", count: 18, avgPrice: 380000, minPrice: 220000, maxPrice: 580000, trend: "↑" },
  { model: "Suzuki GSX-R600", count: 12, avgPrice: 195000, minPrice: 80000, maxPrice: 350000, trend: "→" },
  { model: "Kawasaki Ninja 400", count: 31, avgPrice: 270000, minPrice: 140000, maxPrice: 430000, trend: "↑" },
  { model: "Honda CBR1000RR", count: 8, avgPrice: 490000, minPrice: 280000, maxPrice: 750000, trend: "↓" },
];

const ANALYTICS_DATA = [
  { month: "9月", forecast: 520000, actual: 480000, profit: 95000 },
  { month: "10月", forecast: 680000, actual: 710000, profit: 142000 },
  { month: "11月", forecast: 750000, actual: 695000, profit: 128000 },
  { month: "12月", forecast: 820000, actual: 890000, profit: 178000 },
  { month: "1月", forecast: 900000, actual: 850000, profit: 165000 },
  { month: "2月", forecast: 1000000, actual: 970000, profit: 195000 },
];

const fmt = (n) => `¥${Number(n).toLocaleString()}`;
const today = () => new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });

function Dashboard({ nav }) {
  const totalInventory = SAMPLE_INVENTORY.length;
  const inStock = SAMPLE_INVENTORY.filter(i => i.status === "在庫").length;
  const totalBuyValue = SAMPLE_INVENTORY.reduce((a, i) => a + i.purchasePrice, 0);
  const totalSellValue = SAMPLE_INVENTORY.reduce((a, i) => a + i.sellingPrice, 0);
  const expectedProfit = totalSellValue - totalBuyValue;

  return (
    <div>
      <div style={s.pageTitle}>ダッシュボード</div>
      <div style={s.pageSubtitle}>{today()} · バイク輸出事業 管理システム</div>
      <div style={s.grid4}>
        <div style={s.kpiCard(C.orange)}><div style={s.kpiLabel}>総在庫</div><div style={s.kpiValue}>{totalInventory}<span style={{ fontSize: 14, marginLeft: 4 }}>台</span></div><div style={s.kpiSub}>うち在庫中 {inStock}台</div></div>
        <div style={s.kpiCard(C.green)}><div style={s.kpiLabel}>仕入総額</div><div style={{ ...s.kpiValue, fontSize: 20 }}>{fmt(totalBuyValue)}</div><div style={s.kpiSub}>平均 {fmt(Math.round(totalBuyValue / totalInventory))}/台</div></div>
        <div style={s.kpiCard(C.blue)}><div style={s.kpiLabel}>想定売上</div><div style={{ ...s.kpiValue, fontSize: 20 }}>{fmt(totalSellValue)}</div><div style={s.kpiSub}>平均 {fmt(Math.round(totalSellValue / totalInventory))}/台</div></div>
        <div style={s.kpiCard(C.yellow)}><div style={s.kpiLabel}>想定粗利</div><div style={{ ...s.kpiValue, fontSize: 20, color: C.yellow }}>{fmt(expectedProfit)}</div><div style={s.kpiSub}>利益率 {Math.round((expectedProfit / totalSellValue) * 100)}%</div></div>
      </div>
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>在庫ステータス</div>
          {["在庫", "出品中", "整備中", "売約済"].map(status => {
            const count = SAMPLE_INVENTORY.filter(i => i.status === status).length;
            const pct = Math.round((count / totalInventory) * 100);
            const color = { 在庫: C.orange, 出品中: C.blue, 整備中: C.yellow, 売約済: C.green }[status];
            return (
              <div key={status} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.textSub }}>{status}</span>
                  <span style={{ fontSize: 12, color }}>{count}台 ({pct}%)</span>
                </div>
                <div style={{ background: C.border, borderRadius: 3, height: 4 }}>
                  <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>最近の仕入れ</div>
          {SAMPLE_INVENTORY.slice(0, 4).map(item => {
            const statusColor = { 在庫: C.orange, 出品中: C.blue, 整備中: C.yellow, 売約済: C.green }[item.status];
            return (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}50` }}>
                <div><div style={{ fontSize: 13 }}>{item.maker} {item.model}</div><div style={{ fontSize: 11, color: C.textMuted }}>{item.purchased} · {item.condition}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, color: C.orange }}>{fmt(item.purchasePrice)}</div><span style={s.badge(statusColor)}>{item.status}</span></div>
              </div>
            );
          })}
          <button style={{ ...s.btn("ghost"), marginTop: 12, width: "100%", fontSize: 12 }} onClick={() => nav("inventory")}>在庫一覧を見る →</button>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>月次推移（予想 vs 実績）</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ANALYTICS_DATA}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke={C.textMuted} tick={{ fontSize: 11, fill: C.textMuted }} />
            <YAxis stroke={C.textMuted} tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={v => `${v / 10000}万`} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="forecast" stroke={C.blue} strokeWidth={2} dot={false} name="予想" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="actual" stroke={C.orange} strokeWidth={2} dot={{ fill: C.orange, r: 3 }} name="実績" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BdsSimulator() {
  const [form, setForm] = useState({ maker: "Honda", model: "", year: "", condition: "実働", yahooPrice: "", repairCost: "", targetProfit: "", misc: 10000 });
  const [history, setHistory] = useState([]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const yahooFee = Math.round((Number(form.yahooPrice) || 0) * 0.1);
  const misc = Number(form.misc) || 0;
  const repair = Number(form.repairCost) || 0;
  const profit = Number(form.targetProfit) || 0;
  const bidLimit = (Number(form.yahooPrice) || 0) - yahooFee - misc - repair - profit;
  const save = () => {
    if (!form.model || !form.yahooPrice) return;
    setHistory(h => [{ ...form, bidLimit, savedAt: new Date().toLocaleString("ja-JP"), id: Date.now() }, ...h].slice(0, 20));
    alert("保存しました");
  };
  return (
    <div>
      <div style={s.pageTitle}>BDS入札上限シミュレーター</div>
      <div style={s.pageSubtitle}>ヤフオク相場・整備代・希望利益から入札上限額を計算</div>
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>車両情報</div>
          <div style={s.formRow}><label style={s.label}>メーカー</label><select style={s.input} value={form.maker} onChange={e => set("maker", e.target.value)}>{["Honda","Yamaha","Suzuki","Kawasaki","その他"].map(m => <option key={m}>{m}</option>)}</select></div>
          <div style={s.grid2}>
            <div style={s.formRow}><label style={s.label}>車名</label><input style={s.input} value={form.model} onChange={e => set("model", e.target.value)} placeholder="例: CB400SF" /></div>
            <div style={s.formRow}><label style={s.label}>年式</label><input style={s.input} value={form.year} onChange={e => set("year", e.target.value)} placeholder="例: 2019" /></div>
          </div>
          <div style={s.formRow}><label style={s.label}>状態</label><select style={s.input} value={form.condition} onChange={e => set("condition", e.target.value)}>{["実働","不動","部品取り"].map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>価格設定</div>
          <div style={s.formRow}><label style={s.label}>ヤフオク平均落札額（円）</label><input style={s.input} type="number" value={form.yahooPrice} onChange={e => set("yahooPrice", e.target.value)} placeholder="例: 200000" /></div>
          <div style={s.formRow}><label style={s.label}>想定整備・パーツ代（円）</label><input style={s.input} type="number" value={form.repairCost} onChange={e => set("repairCost", e.target.value)} placeholder="例: 30000" /></div>
          <div style={s.formRow}><label style={s.label}>希望利益（円）</label><input style={s.input} type="number" value={form.targetProfit} onChange={e => set("targetProfit", e.target.value)} placeholder="例: 50000" /></div>
          <div style={s.formRow}><label style={s.label}>出品経費（送料・雑費など）</label><input style={s.input} type="number" value={form.misc} onChange={e => set("misc", e.target.value)} /></div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>計算内訳</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          {[{ label: "ヤフオク手数料(10%)", value: yahooFee, color: C.red }, { label: "出品経費", value: misc, color: C.yellow }, { label: "整備・パーツ代", value: repair, color: C.blue }, { label: "希望利益", value: profit, color: C.green }].map(({ label, value, color }) => (
            <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: "bold", color }}>{fmt(value)}</div>
            </div>
          ))}
        </div>
        <div style={s.resultBox(bidLimit > 0)}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1.5, marginBottom: 8 }}>BDS 入札上限額</div>
          <div style={{ fontSize: 40, fontWeight: "bold", color: bidLimit > 0 ? C.orange : C.red, letterSpacing: -2 }}>{fmt(bidLimit > 0 ? bidLimit : 0)}</div>
          {bidLimit <= 0 && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>⚠ 条件を見直してください</div>}
        </div>
        <button style={{ ...s.btn("primary"), marginTop: 12, width: "100%" }} onClick={save}>保存する</button>
      </div>
      {history.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>保存履歴</div>
          <table style={s.table}>
            <thead><tr>{["日時","車両","状態","ヤフオク相場","入札上限"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{history.map(h => <tr key={h.id}><td style={{ ...s.td, fontSize: 11, color: C.textMuted }}>{h.savedAt}</td><td style={s.td}>{h.maker} {h.model} {h.year && `(${h.year})`}</td><td style={s.td}><span style={s.badge(C.blue)}>{h.condition}</span></td><td style={s.td}>{fmt(h.yahooPrice)}</td><td style={{ ...s.td, color: C.orange, fontWeight: "bold" }}>{fmt(h.bidLimit > 0 ? h.bidLimit : 0)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Market() {
  const [search, setSearch] = useState("");
  const filtered = SAMPLE_MARKET.filter(m => m.model.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={s.pageTitle}>BDS 過去相場</div>
      <div style={s.pageSubtitle}>車種ごとの落札価格集計。仕入れ判断の参考にしてください。</div>
      <div style={{ ...s.card, padding: 16 }}><input style={s.input} placeholder="車種で検索..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div style={s.card}>
        <table style={s.table}>
          <thead><tr>{["車種","件数","平均落札","最低","最高","トレンド"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((row, i) => <tr key={i}><td style={{ ...s.td, fontWeight: "bold" }}>{row.model}</td><td style={{ ...s.td, color: C.textSub }}>{row.count}件</td><td style={{ ...s.td, color: C.orange, fontWeight: "bold" }}>{fmt(row.avgPrice)}</td><td style={{ ...s.td, color: C.textSub }}>{fmt(row.minPrice)}</td><td style={{ ...s.td, color: C.textSub }}>{fmt(row.maxPrice)}</td><td style={s.td}><span style={{ fontSize: 18, color: row.trend === "↑" ? C.green : row.trend === "↓" ? C.red : C.yellow }}>{row.trend}</span></td></tr>)}</tbody>
        </table>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>価格分布</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={SAMPLE_MARKET.slice(0, 5)}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis dataKey="model" stroke={C.textMuted} tick={{ fontSize: 10, fill: C.textMuted }} />
            <YAxis stroke={C.textMuted} tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={v => `${v / 10000}万`} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, fontSize: 12 }} />
            <Bar dataKey="minPrice" fill={C.blue} name="最低" radius={[2,2,0,0]} />
            <Bar dataKey="avgPrice" fill={C.orange} name="平均" radius={[2,2,0,0]} />
            <Bar dataKey="maxPrice" fill={C.green} name="最高" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Documents({ nav }) {
  return (
    <div>
      <div style={s.pageTitle}>見積・請求</div>
      <div style={s.pageSubtitle}>見積書と請求書を作成・印刷・Excel出力</div>
      <div style={s.grid2}>
        {[{ id: "quote", title: "見積書", desc: "目標金額から逆算・Excel入出力", icon: "◻" }, { id: "invoice", title: "請求書", desc: "宛先・印鑑対応・印刷・Excel", icon: "◼" }].map(({ id, title, desc, icon }) => (
          <div key={id} style={{ ...s.card, cursor: "pointer" }} onClick={() => nav(id)}>
            <div style={{ fontSize: 32, marginBottom: 12, color: C.orange }}>{icon}</div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13, color: C.textSub, marginBottom: 16 }}>{desc}</div>
            <button style={s.btn("ghost")}>作成する →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quote() {
  const [items, setItems] = useState([{ name: "", qty: 1, unit: "台", unitPrice: "" }]);
  const [info, setInfo] = useState({ to: "", title: "バイク売買 見積書", date: today(), validDays: "30", tax: 10 });
  const addItem = () => setItems(p => [...p, { name: "", qty: 1, unit: "台", unitPrice: "" }]);
  const updateItem = (i, k, v) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));
  const subtotal = items.reduce((a, item) => a + (Number(item.qty) * Number(item.unitPrice) || 0), 0);
  const tax = Math.round(subtotal * (info.tax / 100));
  const total = subtotal + tax;
  return (
    <div>
      <div style={s.pageTitle}>見積書</div>
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>基本情報</div>
          {[{ label: "宛先", key: "to", placeholder: "株式会社○○ 御中" }, { label: "件名", key: "title" }, { label: "見積日", key: "date" }, { label: "有効期限（日）", key: "validDays" }].map(({ label, key, placeholder }) => (
            <div key={key} style={s.formRow}><label style={s.label}>{label}</label><input style={s.input} value={info[key]} onChange={e => setInfo(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} /></div>
          ))}
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>合計</div>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}><span style={{ color: C.textSub, fontSize: 13 }}>小計</span><span style={{ fontSize: 13 }}>{fmt(subtotal)}</span></div>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}><span style={{ color: C.textSub, fontSize: 13 }}>消費税 ({info.tax}%)</span><span style={{ fontSize: 13 }}>{fmt(tax)}</span></div>
          <div style={s.divider} />
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: "bold" }}>合計金額</span><span style={{ fontSize: 24, fontWeight: "bold", color: C.orange }}>{fmt(total)}</span></div>
          <div style={{ marginTop: 16 }}><label style={s.label}>消費税率</label><select style={s.input} value={info.tax} onChange={e => setInfo(p => ({ ...p, tax: Number(e.target.value) }))}><option value={0}>非課税 (0%)</option><option value={8}>軽減税率 (8%)</option><option value={10}>標準税率 (10%)</option></select></div>
        </div>
      </div>
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={s.cardTitle}>明細</div><button style={s.btn("ghost")} onClick={addItem}>+ 行追加</button></div>
        <table style={s.table}>
          <thead><tr>{["品目・説明","数量","単位","単価","金額",""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{items.map((item, i) => <tr key={i}><td style={s.td}><input style={{ ...s.input, fontSize: 12 }} value={item.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="品目" /></td><td style={s.td}><input style={{ ...s.input, width: 60, fontSize: 12 }} type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} /></td><td style={s.td}><input style={{ ...s.input, width: 60, fontSize: 12 }} value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)} /></td><td style={s.td}><input style={{ ...s.input, fontSize: 12 }} type="number" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", e.target.value)} placeholder="0" /></td><td style={{ ...s.td, color: C.orange }}>{fmt((Number(item.qty)||0)*(Number(item.unitPrice)||0))}</td><td style={s.td}><button style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }} onClick={() => setItems(p => p.filter((_,idx)=>idx!==i))}>×</button></td></tr>)}</tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 12 }}><button style={s.btn("primary")} onClick={() => window.print()}>印刷</button><button style={s.btn("ghost")}>Excel出力</button></div>
    </div>
  );
}

function Invoice() {
  const [form, setForm] = useState({ to: "", from: "合同会社JFP / 株式会社GAMI", invoiceNo: "INV-001", date: today(), dueDate: "" });
  const [items, setItems] = useState([{ name: "", qty: 1, unitPrice: "" }]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addItem = () => setItems(p => [...p, { name: "", qty: 1, unitPrice: "" }]);
  const subtotal = items.reduce((a, item) => a + (Number(item.qty) * Number(item.unitPrice) || 0), 0);
  const tax = Math.round(subtotal * 0.1);
  return (
    <div>
      <div style={s.pageTitle}>請求書</div>
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>請求先</div>
          {[{ label: "宛先", key: "to", placeholder: "株式会社○○ 御中" }, { label: "請求番号", key: "invoiceNo" }, { label: "請求日", key: "date" }, { label: "支払期限", key: "dueDate", placeholder: "例: 2026-03-31" }].map(({ label, key, placeholder }) => (
            <div key={key} style={s.formRow}><label style={s.label}>{label}</label><input style={s.input} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} /></div>
          ))}
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>請求元</div>
          <div style={s.formRow}><label style={s.label}>社名</label><input style={s.input} value={form.from} onChange={e => set("from", e.target.value)} /></div>
          <div style={{ marginTop: 16, padding: 16, background: `${C.orange}10`, borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>請求合計</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: C.orange }}>{fmt(subtotal + tax)}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>（税込10%）</div>
          </div>
        </div>
      </div>
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={s.cardTitle}>明細</div><button style={s.btn("ghost")} onClick={addItem}>+ 行追加</button></div>
        <table style={s.table}>
          <thead><tr>{["品目","数量","単価","金額",""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{items.map((item, i) => <tr key={i}><td style={s.td}><input style={{ ...s.input, fontSize: 12 }} value={item.name} onChange={e => setItems(p => p.map((it,idx)=>idx===i?{...it,name:e.target.value}:it))} placeholder="品目" /></td><td style={s.td}><input style={{ ...s.input, width: 60, fontSize: 12 }} type="number" value={item.qty} onChange={e => setItems(p => p.map((it,idx)=>idx===i?{...it,qty:e.target.value}:it))} /></td><td style={s.td}><input style={{ ...s.input, fontSize: 12 }} type="number" value={item.unitPrice} onChange={e => setItems(p => p.map((it,idx)=>idx===i?{...it,unitPrice:e.target.value}:it))} placeholder="0" /></td><td style={{ ...s.td, color: C.orange }}>{fmt((Number(item.qty)||0)*(Number(item.unitPrice)||0))}</td><td style={s.td}><button style={{ background: "none", border: "none", color: C.red, cursor: "pointer" }} onClick={() => setItems(p=>p.filter((_,idx)=>idx!==i))}>×</button></td></tr>)}</tbody>
        </table>
      </div>
      <button style={s.btn("primary")} onClick={() => window.print()}>印刷</button>
    </div>
  );
}

function AuctionPreview() {
  const [form, setForm] = useState({ title: "", maker: "Honda", model: "", year: "", mileage: "", condition: "実働", description: "", startPrice: "", buyNowPrice: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={s.pageTitle}>オークション・プレビュー</div>
      <div style={s.pageSubtitle}>ヤフオク出品前のプレビュー確認ツール</div>
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>出品情報入力</div>
          <div style={s.formRow}><label style={s.label}>タイトル</label><input style={s.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="例: Honda CB400SF 2019年式 実働 美品" /></div>
          <div style={s.grid2}>
            <div style={s.formRow}><label style={s.label}>メーカー</label><select style={s.input} value={form.maker} onChange={e => set("maker", e.target.value)}>{["Honda","Yamaha","Suzuki","Kawasaki","その他"].map(m => <option key={m}>{m}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>車種</label><input style={s.input} value={form.model} onChange={e => set("model", e.target.value)} placeholder="CB400SF" /></div>
          </div>
          <div style={s.grid2}>
            <div style={s.formRow}><label style={s.label}>年式</label><input style={s.input} value={form.year} onChange={e => set("year", e.target.value)} placeholder="2019" /></div>
            <div style={s.formRow}><label style={s.label}>走行距離(km)</label><input style={s.input} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="15000" /></div>
          </div>
          <div style={s.formRow}><label style={s.label}>状態</label><select style={s.input} value={form.condition} onChange={e => set("condition", e.target.value)}>{["実働","不動","部品取り"].map(c => <option key={c}>{c}</option>)}</select></div>
          <div style={s.formRow}><label style={s.label}>商品説明</label><textarea style={{ ...s.input, height: 80, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="車両の状態・特徴を詳しく記載" /></div>
          <div style={s.grid2}>
            <div style={s.formRow}><label style={s.label}>開始価格</label><input style={s.input} type="number" value={form.startPrice} onChange={e => set("startPrice", e.target.value)} placeholder="1" /></div>
            <div style={s.formRow}><label style={s.label}>即決価格</label><input style={s.input} type="number" value={form.buyNowPrice} onChange={e => set("buyNowPrice", e.target.value)} placeholder="200000" /></div>
          </div>
        </div>
        <div style={{ ...s.card, background: "#0d0d0f" }}>
          <div style={{ ...s.cardTitle, color: C.orange }}>ヤフオク プレビュー</div>
          <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: "bold", lineHeight: 1.4, marginBottom: 8 }}>{form.title || `${form.maker} ${form.model} ${form.year && form.year + "年式"} ${form.condition}`.trim() || "タイトルを入力してください"}</div>
            {form.mileage && <div style={{ fontSize: 12, color: C.textSub }}>走行距離: {Number(form.mileage).toLocaleString()} km</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={s.badge(C.green)}>{form.condition}</span>
            <span style={s.badge(C.blue)}>{form.maker}</span>
            {form.year && <span style={s.badge(C.yellow)}>{form.year}年式</span>}
          </div>
          {form.description && <div style={{ fontSize: 13, color: C.textSub, whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 12 }}>{form.description}</div>}
          <div style={s.divider} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, color: C.textMuted }}>開始価格</span><span style={{ fontSize: 16, fontWeight: "bold" }}>{form.startPrice ? fmt(form.startPrice) : "—"}</span></div>
          {form.buyNowPrice && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: C.textMuted }}>即決価格</span><span style={{ fontSize: 20, fontWeight: "bold", color: C.orange }}>{fmt(form.buyNowPrice)}</span></div>}
        </div>
      </div>
    </div>
  );
}

function Inventory() {
  const [inventory, setInventory] = useState(SAMPLE_INVENTORY);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("全て");
  const [newItem, setNewItem] = useState({ maker: "Honda", model: "", year: "", condition: "実働", purchasePrice: "", sellingPrice: "", status: "在庫", purchased: today() });
  const setN = (k, v) => setNewItem(p => ({ ...p, [k]: v }));
  const filtered = filter === "全て" ? inventory : inventory.filter(i => i.status === filter);
  const statusColor = { 在庫: C.orange, 出品中: C.blue, 整備中: C.yellow, 売約済: C.green };
  const addItem = () => {
    if (!newItem.model) return;
    setInventory(p => [...p, { ...newItem, id: Date.now(), purchasePrice: Number(newItem.purchasePrice), sellingPrice: Number(newItem.sellingPrice) }]);
    setShowForm(false);
    setNewItem({ maker: "Honda", model: "", year: "", condition: "実働", purchasePrice: "", sellingPrice: "", status: "在庫", purchased: today() });
  };
  return (
    <div>
      <div style={s.pageTitle}>在庫管理</div>
      <div style={s.pageSubtitle}>在庫 & 古物台帳の統合管理</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>{["全て","在庫","出品中","整備中","売約済"].map(st => <button key={st} style={{ ...s.btn(filter === st ? "primary" : "ghost"), padding: "6px 14px", fontSize: 12 }} onClick={() => setFilter(st)}>{st}</button>)}</div>
        <button style={s.btn("primary")} onClick={() => setShowForm(p => !p)}>+ 車両登録</button>
      </div>
      {showForm && (
        <div style={s.card}>
          <div style={s.cardTitle}>新規車両登録</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[{ label: "メーカー", key: "maker", type: "select", opts: ["Honda","Yamaha","Suzuki","Kawasaki","その他"] }, { label: "車種", key: "model", type: "input", placeholder: "例: CB400SF" }, { label: "年式", key: "year", type: "input", placeholder: "2019" }, { label: "状態", key: "condition", type: "select", opts: ["実働","不動","部品取り"] }, { label: "仕入価格", key: "purchasePrice", type: "number", placeholder: "0" }, { label: "販売予定価格", key: "sellingPrice", type: "number", placeholder: "0" }, { label: "ステータス", key: "status", type: "select", opts: ["在庫","出品中","整備中","売約済"] }, { label: "仕入日", key: "purchased", type: "input" }].map(({ label, key, type, opts, placeholder }) => (
              <div key={key}><label style={s.label}>{label}</label>{type === "select" ? <select style={s.input} value={newItem[key]} onChange={e => setN(key, e.target.value)}>{opts.map(o => <option key={o}>{o}</option>)}</select> : <input style={s.input} type={type === "number" ? "number" : "text"} value={newItem[key]} onChange={e => setN(key, e.target.value)} placeholder={placeholder} />}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}><button style={s.btn("primary")} onClick={addItem}>登録する</button><button style={s.btn("ghost")} onClick={() => setShowForm(false)}>キャンセル</button></div>
        </div>
      )}
      <div style={s.card}>
        <table style={s.table}>
          <thead><tr>{["メーカー","車種","年式","状態","仕入価格","販売予定","想定利益","ステータス","仕入日"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(item => { const profit = item.sellingPrice - item.purchasePrice; return <tr key={item.id}><td style={s.td}>{item.maker}</td><td style={{ ...s.td, fontWeight: "bold" }}>{item.model}</td><td style={{ ...s.td, color: C.textSub }}>{item.year}</td><td style={s.td}><span style={s.badge(C.blue)}>{item.condition}</span></td><td style={s.td}>{fmt(item.purchasePrice)}</td><td style={{ ...s.td, color: C.orange }}>{fmt(item.sellingPrice)}</td><td style={{ ...s.td, color: profit > 0 ? C.green : C.red, fontWeight: "bold" }}>{fmt(profit)}</td><td style={s.td}><span style={s.badge(statusColor[item.status])}>{item.status}</span></td><td style={{ ...s.td, color: C.textMuted, fontSize: 11 }}>{item.purchased}</td></tr>; })}</tbody>
        </table>
      </div>
    </div>
  );
}

function Analytics() {
  const totalForecast = ANALYTICS_DATA.reduce((a, d) => a + d.forecast, 0);
  const totalActual = ANALYTICS_DATA.reduce((a, d) => a + d.actual, 0);
  const achieveRate = Math.round((totalActual / totalForecast) * 100);
  return (
    <div>
      <div style={s.pageTitle}>予想 vs 実績</div>
      <div style={s.pageSubtitle}>月次の売上予測と実績の比較分析</div>
      <div style={s.grid3}>
        <div style={s.kpiCard(C.blue)}><div style={s.kpiLabel}>累計予想売上</div><div style={{ ...s.kpiValue, fontSize: 20 }}>{fmt(totalForecast)}</div></div>
        <div style={s.kpiCard(C.orange)}><div style={s.kpiLabel}>累計実績売上</div><div style={{ ...s.kpiValue, fontSize: 20 }}>{fmt(totalActual)}</div></div>
        <div style={s.kpiCard(achieveRate >= 100 ? C.green : C.yellow)}><div style={s.kpiLabel}>達成率</div><div style={{ ...s.kpiValue, color: achieveRate >= 100 ? C.green : C.yellow }}>{achieveRate}%</div></div>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>月次 予想 vs 実績</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={ANALYTICS_DATA} barGap={4}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke={C.textMuted} tick={{ fontSize: 12, fill: C.textMuted }} />
            <YAxis stroke={C.textMuted} tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={v => `${v / 10000}万`} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, color: C.textSub }} />
            <Bar dataKey="forecast" fill={`${C.blue}80`} name="予想" radius={[3,3,0,0]} />
            <Bar dataKey="actual" fill={C.orange} name="実績" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>月次粗利推移</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ANALYTICS_DATA}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke={C.textMuted} tick={{ fontSize: 12, fill: C.textMuted }} />
            <YAxis stroke={C.textMuted} tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={v => `${v / 10000}万`} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="profit" stroke={C.green} strokeWidth={2.5} dot={{ fill: C.green, r: 4 }} name="粗利" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Settings() {
  const [cfg, setCfg] = useState({ companyName: "合同会社JFP / 株式会社GAMI", phone: "", email: "", yahooFeeRate: 10, defaultMisc: 10000, defaultProfit: 50000, taxRate: 10 });
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={s.pageTitle}>設定</div>
      <div style={s.pageSubtitle}>システム設定・デフォルト値の管理</div>
      <div style={s.card}>
        <div style={s.cardTitle}>会社情報</div>
        <div style={s.grid2}>{[{ label: "会社名", key: "companyName" }, { label: "電話番号", key: "phone" }, { label: "メールアドレス", key: "email" }].map(({ label, key }) => <div key={key} style={s.formRow}><label style={s.label}>{label}</label><input style={s.input} value={cfg[key]} onChange={e => set(key, e.target.value)} /></div>)}</div>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>BDS計算デフォルト値</div>
        <div style={s.grid3}>{[{ label: "ヤフオク手数料率（%）", key: "yahooFeeRate" }, { label: "デフォルト出品経費（円）", key: "defaultMisc" }, { label: "デフォルト希望利益（円）", key: "defaultProfit" }].map(({ label, key }) => <div key={key} style={s.formRow}><label style={s.label}>{label}</label><input style={s.input} type="number" value={cfg[key]} onChange={e => set(key, e.target.value)} /></div>)}</div>
      </div>
      <button style={s.btn("primary")} onClick={() => alert("保存しました")}>設定を保存</button>
    </div>
  );
}

function Manual() {
  const sections = [
    { title: "ダッシュボード", content: "在庫のKPI・月次推移を一覧表示。仕入れ総額・想定売上・粗利を即把握できます。" },
    { title: "BDS入札シミュレーター", content: "ヤフオク平均相場・整備代・希望利益を入力すると入札上限額を自動計算。現場でモバイルから入力できる設計。" },
    { title: "BDS過去相場", content: "車種ごとの落札価格を集計・表示。平均・最低・最高価格とトレンドで仕入れ判断の参考に。" },
    { title: "見積書・請求書", content: "品目・数量・単価を入力して書類作成。消費税率の選択、印刷機能対応。" },
    { title: "在庫管理", content: "仕入れた車両を登録・管理。ステータス別フィルタリング可能。想定利益も自動計算。" },
    { title: "予想 vs 実績", content: "月次の売上予測と実績を比較。達成率・粗利推移をグラフで可視化。" },
  ];
  return (
    <div>
      <div style={s.pageTitle}>取扱説明書</div>
      <div style={s.pageSubtitle}>MotoExport Pro の使い方ガイド</div>
      {sections.map((sec, i) => <div key={i} style={s.card}><div style={{ display: "flex", gap: 12 }}><div style={{ width: 24, height: 24, background: C.orange, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", color: "#fff", flexShrink: 0 }}>{i + 1}</div><div><div style={{ fontWeight: "bold", marginBottom: 6 }}>{sec.title}</div><div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{sec.content}</div></div></div></div>)}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard nav={setPage} />;
      case "bds-simulator": return <BdsSimulator />;
      case "market": return <Market />;
      case "documents": return <Documents nav={setPage} />;
      case "quote": return <Quote />;
      case "invoice": return <Invoice />;
      case "auction-preview": return <AuctionPreview />;
      case "inventory": return <Inventory />;
      case "analytics": return <Analytics />;
      case "manual": return <Manual />;
      case "settings": return <Settings />;
      default: return <Dashboard nav={setPage} />;
    }
  };
  return (
    <div style={s.app}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.bg}; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; } input:focus, select:focus, textarea:focus { border-color: ${C.orange} !important; } button:hover { opacity: 0.85; }`}</style>
      <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoIcon}>M</div>
          <div style={s.logoText}>MotoExport<br /><span style={{ color: C.orange, fontSize: 11 }}>Pro</span></div>
        </div>
        <nav style={s.nav}>
          {NAV.map(group => (
            <div key={group.group}>
              <div style={s.navGroup}>{group.group}</div>
              {group.items.map(item => (
                <div key={item.id} style={s.navItem(page === item.id || (page === "quote" && item.id === "documents") || (page === "invoice" && item.id === "documents"))} onClick={() => setPage(item.id)}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted }}>
          MotoExport Pro v1.0<br />合同会社JFP
        </div>
      </div>
      <main style={s.main}>{renderPage()}</main>
    </div>
  );
}