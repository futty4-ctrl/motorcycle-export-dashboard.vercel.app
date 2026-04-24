/**
 * 50-125cc 主要車種の型式マスター
 * 型式コード → { メーカー, 車種名, 排気量 }
 *
 * ヤフオク検索精度を上げるため、型式選択時に車種名も併用する
 */
export type BikeTypeCode = {
  maker: string
  model: string
  cc: number
}

export const BIKE_TYPE_CODES_50_125: Record<string, BikeTypeCode> = {
  // ── ヤマハ シグナス系 ──
  SE44J: { maker: "ヤマハ", model: "シグナスX", cc: 125 },
  SE46J: { maker: "ヤマハ", model: "シグナスX SR", cc: 125 },
  SED6J: { maker: "ヤマハ", model: "シグナスX SR", cc: 125 },
  SED8J: { maker: "ヤマハ", model: "シグナスグリファス", cc: 125 },
  SE12J: { maker: "ヤマハ", model: "シグナスX", cc: 125 },

  // ── ヤマハ アクシス系 ──
  SED7J: { maker: "ヤマハ", model: "アクシスZ", cc: 125 },
  SEJ6J: { maker: "ヤマハ", model: "AXIS125Z", cc: 125 },
  SB01J: { maker: "ヤマハ", model: "アクシス", cc: 125 },
  SA09J: { maker: "ヤマハ", model: "アクシス90", cc: 90 },
  SE03J: { maker: "ヤマハ", model: "アクシストリート", cc: 125 },

  // ── ヤマハ JOG ──
  "3KJ": { maker: "ヤマハ", model: "JOG", cc: 50 },
  "3YJ": { maker: "ヤマハ", model: "JOG", cc: 50 },
  "3YK": { maker: "ヤマハ", model: "JOG", cc: 50 },
  "4JP": { maker: "ヤマハ", model: "JOG ZR", cc: 50 },
  "4LV": { maker: "ヤマハ", model: "JOG ZR", cc: 50 },
  SA36J: { maker: "ヤマハ", model: "JOG", cc: 50 },
  SA39J: { maker: "ヤマハ", model: "JOG", cc: 50 },
  SA55J: { maker: "ヤマハ", model: "JOG", cc: 50 },
  SA58J: { maker: "ヤマハ", model: "JOG", cc: 50 },

  // ── ヤマハ VINO ──
  "5AU": { maker: "ヤマハ", model: "VINO", cc: 50 },
  SA10J: { maker: "ヤマハ", model: "VINO", cc: 50 },
  SA26J: { maker: "ヤマハ", model: "VINO", cc: 50 },
  SA37J: { maker: "ヤマハ", model: "VINO", cc: 50 },
  SA54J: { maker: "ヤマハ", model: "VINO", cc: 50 },
  SA59J: { maker: "ヤマハ", model: "VINO", cc: 50 },

  // ── ヤマハ BW's / GEAR ──
  SEA1J: { maker: "ヤマハ", model: "BW's 125", cc: 125 },
  UA06J: { maker: "ヤマハ", model: "GEAR", cc: 50 },
  UA07J: { maker: "ヤマハ", model: "GEAR", cc: 50 },

  // ── スズキ アドレス系 ──
  CF11A: { maker: "スズキ", model: "アドレスV100", cc: 100 },
  CF4MA: { maker: "スズキ", model: "アドレスV125", cc: 125 },
  CF4EA: { maker: "スズキ", model: "アドレスV125S", cc: 125 },
  CA1FA: { maker: "スズキ", model: "アドレスV50", cc: 50 },
  CA1FB: { maker: "スズキ", model: "アドレスV50", cc: 50 },
  CE11A: { maker: "スズキ", model: "アドレス110", cc: 110 },
  CE13A: { maker: "スズキ", model: "アドレス110", cc: 110 },
  DW11A: { maker: "スズキ", model: "アドレス110", cc: 110 },

  // ── スズキ Let's / ZZ / チョイノリ ──
  CA1KA: { maker: "スズキ", model: "Let's", cc: 50 },
  CA1KB: { maker: "スズキ", model: "Let's", cc: 50 },
  CA47A: { maker: "スズキ", model: "Let's", cc: 50 },
  CA4AA: { maker: "スズキ", model: "Let's II", cc: 50 },
  CA4PA: { maker: "スズキ", model: "Let's 4", cc: 50 },
  CA45A: { maker: "スズキ", model: "Let's 5", cc: 50 },
  CA1PB: { maker: "スズキ", model: "ZZ", cc: 50 },
  CA1PC: { maker: "スズキ", model: "ZZ", cc: 50 },
  CA41A: { maker: "スズキ", model: "チョイノリ", cc: 50 },

  // ── ホンダ モンキー / ゴリラ ──
  Z50J: { maker: "ホンダ", model: "モンキー", cc: 50 },
  Z50Z: { maker: "ホンダ", model: "モンキー", cc: 50 },
  AB27: { maker: "ホンダ", model: "モンキー", cc: 50 },
  JB02: { maker: "ホンダ", model: "モンキー125", cc: 125 },

  // ── ホンダ ダックス ──
  ST50: { maker: "ホンダ", model: "ダックス", cc: 50 },
  ST125: { maker: "ホンダ", model: "ダックス125", cc: 125 },
  JB04: { maker: "ホンダ", model: "ダックス125", cc: 125 },

  // ── ホンダ スーパーカブ / クロスカブ ──
  C50: { maker: "ホンダ", model: "スーパーカブ50", cc: 50 },
  AA01: { maker: "ホンダ", model: "スーパーカブ50", cc: 50 },
  AA09: { maker: "ホンダ", model: "スーパーカブ50", cc: 50 },
  C100: { maker: "ホンダ", model: "スーパーカブ110", cc: 110 },
  JA10: { maker: "ホンダ", model: "スーパーカブ110", cc: 110 },
  JA44: { maker: "ホンダ", model: "スーパーカブ110", cc: 110 },
  JA58: { maker: "ホンダ", model: "スーパーカブ110", cc: 110 },
  JA07: { maker: "ホンダ", model: "クロスカブ110", cc: 110 },
  JA45: { maker: "ホンダ", model: "クロスカブ110", cc: 110 },

  // ── ホンダ PCX ──
  JF28: { maker: "ホンダ", model: "PCX", cc: 125 },
  JF56: { maker: "ホンダ", model: "PCX", cc: 125 },
  JK05: { maker: "ホンダ", model: "PCX", cc: 125 },

  // ── ホンダ Dio ──
  AF18: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF25: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF27: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF34: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF35: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF55: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF56: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF62: { maker: "ホンダ", model: "Dio", cc: 50 },
  AF68: { maker: "ホンダ", model: "Dio", cc: 50 },

  // ── ホンダ Lead ──
  AF48: { maker: "ホンダ", model: "Lead100", cc: 100 },
  JF19: { maker: "ホンダ", model: "Lead110", cc: 110 },
  JF45: { maker: "ホンダ", model: "Lead125", cc: 125 },

  // ── ホンダ GROM ──
  JC61: { maker: "ホンダ", model: "GROM", cc: 125 },
  JC75: { maker: "ホンダ", model: "GROM", cc: 125 },
  JC92: { maker: "ホンダ", model: "GROM", cc: 125 },

  // ── ホンダ Today / Zoomer / ZOOK ──
  AF61: { maker: "ホンダ", model: "Today", cc: 50 },
  AF67: { maker: "ホンダ", model: "Today", cc: 50 },
  AF58: { maker: "ホンダ", model: "Zoomer", cc: 50 },
  JF52: { maker: "ホンダ", model: "Zoomer-X", cc: 110 },

  // ── ホンダ エイプ / XR ──
  AC16: { maker: "ホンダ", model: "APE50", cc: 50 },
  HC07: { maker: "ホンダ", model: "APE100", cc: 100 },
  AD13: { maker: "ホンダ", model: "XR50", cc: 50 },
  HD13: { maker: "ホンダ", model: "XR100", cc: 100 },

  // ── カワサキ KSR ──
  MX050B: { maker: "カワサキ", model: "KSR", cc: 50 },
  MX080: { maker: "カワサキ", model: "KSR", cc: 80 },
  MX110B: { maker: "カワサキ", model: "KSR110", cc: 110 },
  KL110: { maker: "カワサキ", model: "KSR110", cc: 110 },
  KL125: { maker: "カワサキ", model: "KSR PRO", cc: 125 },
}

/**
 * 型式コードから車種情報を取得
 */
export function lookupBikeType(code: string): BikeTypeCode | null {
  const upper = code.toUpperCase().replace(/[\s-].*$/, "")
  return BIKE_TYPE_CODES_50_125[upper] ?? null
}

/**
 * 型式コードに対応する車種名を返す（見つからなければ null）
 */
export function resolveModelName(code: string): string | null {
  const info = lookupBikeType(code)
  return info ? `${info.maker} ${info.model}` : null
}

/**
 * すべての型式コード一覧
 */
export function getAllTypeCodes(): Array<{ code: string } & BikeTypeCode> {
  return Object.entries(BIKE_TYPE_CODES_50_125)
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => {
      if (a.maker !== b.maker) return a.maker.localeCompare(b.maker)
      if (a.model !== b.model) return a.model.localeCompare(b.model)
      return a.code.localeCompare(b.code)
    })
}
