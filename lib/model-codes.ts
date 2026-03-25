// 型式マスター — Honda / Yamaha / Suzuki / Kawasaki 50〜400cc
// query: ヤフオク検索用キーワード（型式込み）
// katashiki: 代表型式（複数世代ある場合は配列）

export interface ModelCode {
  maker: "Honda" | "Yamaha" | "Suzuki" | "Kawasaki"
  label: string          // 表示名
  katashiki: string[]    // 型式（複数世代）
  cc: number             // 排気量（代表値）
  category: string       // カテゴリ
  query: string          // ヤフオク検索クエリ（型式込み）
}

export const MODEL_CODES: ModelCode[] = [

  // ────────────────────────────────────────────────
  // HONDA
  // ────────────────────────────────────────────────

  // 4mini
  { maker: "Honda", label: "モンキー50",      katashiki: ["Z50J", "AB27"],        cc: 50,  category: "4mini",    query: "モンキー Z50J AB27" },
  { maker: "Honda", label: "ゴリラ",          katashiki: ["Z50J", "AB27"],        cc: 50,  category: "4mini",    query: "ゴリラ Z50J AB27" },
  { maker: "Honda", label: "エイプ50",        katashiki: ["AC16"],                cc: 50,  category: "4mini",    query: "エイプ50 AC16" },
  { maker: "Honda", label: "エイプ100",       katashiki: ["HC07"],                cc: 100, category: "4mini",    query: "エイプ100 HC07" },
  { maker: "Honda", label: "ダックス50",      katashiki: ["ST50", "AB26"],        cc: 50,  category: "4mini",    query: "ダックス50 ST50" },
  { maker: "Honda", label: "シャリー",        katashiki: ["CF50"],                cc: 50,  category: "4mini",    query: "シャリー CF50" },
  { maker: "Honda", label: "ジャズ",          katashiki: ["AC09"],                cc: 50,  category: "4mini",    query: "ジャズ AC09" },
  { maker: "Honda", label: "マグナ50",        katashiki: ["AC13"],                cc: 50,  category: "4mini",    query: "マグナ50 AC13" },
  { maker: "Honda", label: "NS-1",            katashiki: ["AC12"],                cc: 50,  category: "4mini",    query: "NS-1 AC12" },
  { maker: "Honda", label: "NSR50",           katashiki: ["AC10"],                cc: 50,  category: "4mini",    query: "NSR50 AC10" },
  { maker: "Honda", label: "モンキー125",     katashiki: ["JB02", "JB05"],        cc: 125, category: "4mini",    query: "モンキー125 JB02 JB05" },
  { maker: "Honda", label: "ダックス125",     katashiki: ["JB04"],                cc: 125, category: "4mini",    query: "ダックス125 JB04" },
  { maker: "Honda", label: "グロム(MSX125)",  katashiki: ["JC61", "JC75"],        cc: 125, category: "4mini",    query: "グロム MSX125 JC61 JC75" },

  // カブ系
  { maker: "Honda", label: "スーパーカブ50",  katashiki: ["C50", "AA01", "AA04", "AA09"], cc: 50, category: "カブ", query: "スーパーカブ50 C50 AA01" },
  { maker: "Honda", label: "スーパーカブ70",  katashiki: ["C70"],                 cc: 70,  category: "カブ",     query: "スーパーカブ70 C70" },
  { maker: "Honda", label: "スーパーカブ90",  katashiki: ["C90", "HA02"],         cc: 90,  category: "カブ",     query: "スーパーカブ90 C90 HA02" },
  { maker: "Honda", label: "スーパーカブ110", katashiki: ["JA07", "JA10", "JA44", "JA59"], cc: 110, category: "カブ", query: "スーパーカブ110 JA10 JA44" },
  // スーパーカブ125はC125・CT125に統合（独立モデルとしては存在しない）
  { maker: "Honda", label: "スーパーカブC125", katashiki: ["JA48", "JA58", "JA71"], cc: 125, category: "カブ",   query: "スーパーカブC125 JA48 JA58 JA71" },
  { maker: "Honda", label: "クロスカブ110",   katashiki: ["JA45", "JA60"],        cc: 110, category: "カブ",     query: "クロスカブ110 JA45 JA60" },
  { maker: "Honda", label: "クロスカブ50",    katashiki: ["AA06"],                cc: 50,  category: "カブ",     query: "クロスカブ50 AA06" },
  { maker: "Honda", label: "ハンターカブCT125",katashiki: ["JA55", "JA65"],       cc: 125, category: "カブ",     query: "ハンターカブ CT125 JA55 JA65" },
  { maker: "Honda", label: "リトルカブ",      katashiki: ["AA01"],                cc: 50,  category: "カブ",     query: "リトルカブ AA01" },

  // 50cc スポーツ
  { maker: "Honda", label: "CB50",           katashiki: ["CB50J"],               cc: 50,  category: "旧車50",    query: "CB50 CB50J" },
  { maker: "Honda", label: "ベンリィ50S",    katashiki: ["CD50"],                cc: 50,  category: "旧車50",    query: "ベンリィ50S CD50" },
  { maker: "Honda", label: "CRM50",          katashiki: ["HE01"],                cc: 50,  category: "オフ",      query: "CRM50 HE01" },
  { maker: "Honda", label: "XR50モタード",   katashiki: ["HC06"],                cc: 50,  category: "オフ",      query: "XR50 モタード HC06" },

  // 50cc スクーター
  { maker: "Honda", label: "Dio ZX",         katashiki: ["AF28", "AF35"],        cc: 50,  category: "スクーター", query: "Dio ZX AF28 AF35" },
  { maker: "Honda", label: "ライブDio",      katashiki: ["AF34", "AF35"],        cc: 50,  category: "スクーター", query: "ライブDio AF34 AF35" },
  { maker: "Honda", label: "Dio",            katashiki: ["AF18", "AF25", "AF62", "AF68"], cc: 50, category: "スクーター", query: "ホンダ Dio AF18 AF25 AF62 AF68" },
  { maker: "Honda", label: "スーパーDio",    katashiki: ["AF27"],                cc: 50,  category: "スクーター", query: "スーパーDio AF27" },
  { maker: "Honda", label: "スマートDio",    katashiki: ["AF56", "AF57"],        cc: 50,  category: "スクーター", query: "スマートDio AF56 AF57" },
  { maker: "Honda", label: "タクト",         katashiki: ["AF16", "AF24", "AF30", "AF51", "AF75", "AF79"], cc: 50, category: "スクーター", query: "タクト AF30 AF75 AF79" },
  { maker: "Honda", label: "スクーピー",     katashiki: ["AF55"],                cc: 50,  category: "スクーター", query: "スクーピー クレアスクーピー AF55" },
  { maker: "Honda", label: "ジョルノ",       katashiki: ["AF24", "AF70", "AF77"], cc: 50,  category: "スクーター", query: "ジョルノ AF24 AF70 AF77" },
  { maker: "Honda", label: "ジョルノクレア", katashiki: ["AF54"],                cc: 50,  category: "スクーター", query: "ジョルノクレア AF54" },
  { maker: "Honda", label: "Today",          katashiki: ["AF61", "AF67"],        cc: 50,  category: "スクーター", query: "Today AF61 AF67" },
  { maker: "Honda", label: "ズーマー",       katashiki: ["AF58", "AF70"],        cc: 50,  category: "スクーター", query: "ズーマー AF58 AF70" },
  { maker: "Honda", label: "リード50",       katashiki: ["AF20", "AF48"],        cc: 50,  category: "スクーター", query: "リード50 AF20 AF48" },
  { maker: "Honda", label: "Stream",         katashiki: ["TB07"],                cc: 50,  category: "スクーター", query: "ストリーム ホンダ TB07" },
  { maker: "Honda", label: "Gyro Canopy",    katashiki: ["TA02", "TA03"],        cc: 50,  category: "スクーター", query: "ジャイロキャノピー TA02 TA03" },
  { maker: "Honda", label: "Gyro X",         katashiki: ["TD01", "TD02"],        cc: 50,  category: "スクーター", query: "ジャイロX TD01 TD02" },
  { maker: "Honda", label: "Gyro Up",        katashiki: ["TA01"],                cc: 50,  category: "スクーター", query: "ジャイロアップ TA01" },
  { maker: "Honda", label: "Road Fox",       katashiki: ["TB10"],                cc: 50,  category: "スクーター", query: "ロードフォックス TB10" },
  { maker: "Honda", label: "ダンク",         katashiki: ["AF74", "AF78"],        cc: 50,  category: "スクーター", query: "ダンク AF74 AF78" },
  { maker: "Honda", label: "ビート",         katashiki: ["AF07"],                cc: 50,  category: "スクーター", query: "ビート ホンダ AF07" },
  { maker: "Honda", label: "ドリーム50",     katashiki: ["AC15"],                cc: 50,  category: "4mini",    query: "ドリーム50 AC15" },
  { maker: "Honda", label: "モトコンポ",     katashiki: ["AB12"],                cc: 50,  category: "4mini",    query: "モトコンポ AB12" },

  // スクーター（125cc）
  { maker: "Honda", label: "PCX125",         katashiki: ["JF28", "JF56", "JF81", "JK05"], cc: 125, category: "スクーター", query: "PCX125 JF28 JF56 JF81 JK05" },
  { maker: "Honda", label: "リード125",      katashiki: ["JF45", "JF86"],        cc: 125, category: "スクーター", query: "リード125 JF45 JF86" },
  { maker: "Honda", label: "Dio110",         katashiki: ["JF31", "JF58", "JK03"], cc: 110, category: "スクーター", query: "Dio110 JF31 JF58 JK03" },
  { maker: "Honda", label: "スペイシー100",  katashiki: ["JF13"],                cc: 100, category: "スクーター", query: "スペイシー100 JF13" },

  // スポーツ125
  { maker: "Honda", label: "CBR125R",        katashiki: ["JC50"],                cc: 125, category: "スポーツ125", query: "CBR125R JC50" },
  { maker: "Honda", label: "CB125R",         katashiki: ["JC79", "JC92"],        cc: 125, category: "スポーツ125", query: "CB125R JC79 JC92" },

  // ビジネス
  { maker: "Honda", label: "ベンリィ110",    katashiki: ["JA09"],                cc: 110, category: "カブ",     query: "ベンリィ110 JA09" },
  { maker: "Honda", label: "ベンリィ110プロ", katashiki: ["JA09"],               cc: 110, category: "カブ",     query: "ベンリィ110プロ BENLY PRO JA09" },
  { maker: "Honda", label: "ベンリィCD90",   katashiki: ["HA03"],                cc: 90,  category: "カブ",     query: "ベンリィCD90 HA03" },
  { maker: "Honda", label: "ベンリィCD125T", katashiki: ["JA03"],                cc: 125, category: "カブ",     query: "ベンリィCD125T JA03" },
  { maker: "Honda", label: "スーパーカブ110プロ", katashiki: ["JA10", "JA42"],    cc: 110, category: "カブ",     query: "スーパーカブ110プロ JA10 JA42" },

  // スクーター（51〜125cc追加）
  { maker: "Honda", label: "リード110",      katashiki: ["JF19"],                cc: 110, category: "スクーター", query: "リード110 リードEX JF19" },
  { maker: "Honda", label: "リード100",      katashiki: ["JF06"],                cc: 100, category: "スクーター", query: "リード100 JF06" },
  { maker: "Honda", label: "リード90",       katashiki: ["HF05"],                cc: 90,  category: "スクーター", query: "リード90 HF05" },
  { maker: "Honda", label: "Shモード",       katashiki: ["JF51"],                cc: 125, category: "スクーター", query: "Shモード JF51" },
  { maker: "Honda", label: "ジョーカー90",   katashiki: ["HF09"],                cc: 90,  category: "スクーター", query: "ジョーカー90 HF09" },

  // スポーツ（51〜125cc追加）
  { maker: "Honda", label: "NSR80",          katashiki: ["HC06"],                cc: 80,  category: "4mini",    query: "NSR80 HC06" },
  { maker: "Honda", label: "CRF125F",        katashiki: ["JE03"],                cc: 125, category: "オフ",     query: "CRF125F JE03" },

  // オフロード
  { maker: "Honda", label: "XR100モタード",  katashiki: ["HE05"],                cc: 100, category: "オフ",     query: "XR100 モタード HE05" },
  { maker: "Honda", label: "CRF100F",        katashiki: ["HE05"],                cc: 100, category: "オフ",     query: "CRF100F" },
  { maker: "Honda", label: "XR250",          katashiki: ["MD30"],                cc: 250, category: "オフ250",  query: "XR250 MD30" },
  { maker: "Honda", label: "CRF250L",        katashiki: ["MD38", "MD44"],        cc: 250, category: "オフ250",  query: "CRF250L MD38 MD44" },
  { maker: "Honda", label: "XLR250R",        katashiki: ["MD22"],                cc: 250, category: "オフ250",  query: "XLR250R MD22" },

  // ネイキッド250（追加）
  { maker: "Honda", label: "CB250F",         katashiki: ["MC43"],                cc: 250, category: "ネイキッド250", query: "CB250F MC43" },
  { maker: "Honda", label: "CB250R",         katashiki: ["MC52"],                cc: 250, category: "ネイキッド250", query: "CB250R MC52" },
  { maker: "Honda", label: "Jade250",        katashiki: ["MC23"],                cc: 250, category: "ネイキッド250", query: "ジェイド250 MC23" },
  { maker: "Honda", label: "Degree250",      katashiki: ["MD26"],                cc: 250, category: "オフ250",   query: "ディグリー MD26" },
  { maker: "Honda", label: "GB250クラブマン", katashiki: ["MC10"],               cc: 250, category: "旧車250",   query: "GB250 クラブマン MC10" },
  { maker: "Honda", label: "AX-1(NX250)",   katashiki: ["MD21"],                cc: 250, category: "オフ250",   query: "AX-1 NX250 MD21" },
  { maker: "Honda", label: "VT250F",         katashiki: ["MC08", "MC15"],        cc: 250, category: "旧車250",   query: "VT250F MC08 MC15" },
  { maker: "Honda", label: "SL230",          katashiki: ["MD33"],                cc: 230, category: "オフ250",   query: "SL230 MD33" },
  { maker: "Honda", label: "CB250RS",        katashiki: ["MC02"],                cc: 250, category: "旧車250",   query: "CB250RS MC02" },

  // BDSランキング上位・漏れ追加
  { maker: "Honda", label: "CL250",          katashiki: ["MC57"],                cc: 250, category: "ネイキッド250", query: "CL250 MC57" },
  { maker: "Honda", label: "ADV160",         katashiki: ["KF54"],                cc: 160, category: "スクーター", query: "ADV160 KF54" },
  { maker: "Honda", label: "GB350",          katashiki: ["NC59"],                cc: 350, category: "ネイキッド400", query: "GB350 NC59" },
  { maker: "Honda", label: "GB350S",         katashiki: ["NC59"],                cc: 350, category: "ネイキッド400", query: "GB350S NC59" },
  { maker: "Honda", label: "CBR400R",        katashiki: ["NC47", "NC56", "NC65"], cc: 400, category: "スポーツ400", query: "CBR400R NC47 NC56 NC65" },
  { maker: "Honda", label: "400X",           katashiki: ["NC47", "NC56"],        cc: 400, category: "アドベンチャー", query: "400X NC47 NC56" },

  // ネイキッド/スポーツ250〜400
  { maker: "Honda", label: "CB400SF",        katashiki: ["NC31", "NC36", "NC39", "NC42"], cc: 400, category: "ネイキッド400", query: "CB400SF NC31 NC36 NC39 NC42" },
  { maker: "Honda", label: "CB400SB",        katashiki: ["NC42"],                cc: 400, category: "ネイキッド400", query: "CB400SB NC42" },
  { maker: "Honda", label: "CB400F",         katashiki: ["NC47"],                cc: 400, category: "ネイキッド400", query: "CB400F NC47" },
  { maker: "Honda", label: "Hornet250",      katashiki: ["MC31"],                cc: 250, category: "ネイキッド250", query: "ホーネット250 MC31" },
  { maker: "Honda", label: "Rebel250",       katashiki: ["MC13", "MC49"],        cc: 250, category: "アメリカン250", query: "レブル250 MC13 MC49" },
  { maker: "Honda", label: "Steed400",       katashiki: ["NC26"],                cc: 400, category: "アメリカン400", query: "スティード400 NC26" },
  { maker: "Honda", label: "VFR400R",        katashiki: ["NC21", "NC24", "NC30"], cc: 400, category: "スポーツ400", query: "VFR400R NC30 NC24" },
  { maker: "Honda", label: "CBR400RR",       katashiki: ["NC23", "NC29"],        cc: 400, category: "スポーツ400", query: "CBR400RR NC23 NC29" },
  { maker: "Honda", label: "CBR250RR",       katashiki: ["MC22", "MC51"],        cc: 250, category: "スポーツ250", query: "CBR250RR MC22 MC51" },
  { maker: "Honda", label: "CBR250R",        katashiki: ["MC41"],                cc: 250, category: "スポーツ250", query: "CBR250R MC41" },
  { maker: "Honda", label: "NSR250R",        katashiki: ["MC16", "MC18", "MC21", "MC28"], cc: 250, category: "レプリカ250", query: "NSR250R MC16 MC18 MC21 MC28" },

  // ネイキッド/スポーツ250（追加）
  { maker: "Honda", label: "VTR250",         katashiki: ["MC33", "BA-MC33", "JBK-MC33"], cc: 250, category: "ネイキッド250", query: "VTR250 MC33" },
  { maker: "Honda", label: "Spada250",       katashiki: ["MC20"],                cc: 250, category: "ネイキッド250", query: "スパーダ VT250 MC20" },
  { maker: "Honda", label: "CB-1",           katashiki: ["NC27"],                cc: 400, category: "ネイキッド400", query: "CB-1 NC27" },
  { maker: "Honda", label: "RVF400",         katashiki: ["NC35"],                cc: 400, category: "スポーツ400", query: "RVF400 NC35" },
  { maker: "Honda", label: "FTR223",         katashiki: ["MC34"],                cc: 223, category: "ネイキッド250", query: "FTR223 MC34" },
  { maker: "Honda", label: "XR230",          katashiki: ["MD36"],                cc: 230, category: "オフ250",   query: "XR230 MD36" },
  { maker: "Honda", label: "CRM250R",        katashiki: ["MD24", "MD32"],        cc: 250, category: "オフ250",   query: "CRM250R MD24 MD32" },

  // 旧車400（追加）
  { maker: "Honda", label: "VT400S",         katashiki: ["NC57"],                cc: 400, category: "ネイキッド400", query: "VT400S NC57" },
  { maker: "Honda", label: "CB400FOUR",      katashiki: ["CB400F"],              cc: 400, category: "旧車400",   query: "CB400FOUR ホンダ 旧車" },

  // 旧車
  { maker: "Honda", label: "CBX400F",        katashiki: ["NC07"],                cc: 400, category: "旧車400",   query: "CBX400F NC07" },
  { maker: "Honda", label: "CB400N",         katashiki: ["CB400N"],              cc: 400, category: "旧車400",   query: "CB400N ホーク" },
  { maker: "Honda", label: "CB400SS",        katashiki: ["NC41"],                cc: 400, category: "ネイキッド400", query: "CB400SS NC41" },
  { maker: "Honda", label: "GB400TT",        katashiki: ["NC22"],                cc: 400, category: "旧車400",   query: "GB400TT NC22" },

  // 125cc ネイキッド
  { maker: "Honda", label: "CB125T",         katashiki: ["JC06"],                cc: 125, category: "旧車50",    query: "CB125T JC06" },

  // 250cc スクーター（ビッグスクーター系）
  { maker: "Honda", label: "フュージョン",   katashiki: ["MF02"],                cc: 250, category: "スクーター", query: "フュージョン FUSION MF02" },
  { maker: "Honda", label: "フォーサイト",   katashiki: ["MF04"],                cc: 250, category: "スクーター", query: "フォーサイト FORESIGHT MF04" },

  // 逆輸入・海外モデル
  { maker: "Honda", label: "Wave125",        katashiki: ["JF36"],                cc: 125, category: "カブ",     query: "Wave125 ウェーブ125 JF36" },

  // 売れ筋追加
  { maker: "Honda", label: "PCX160",         katashiki: ["KF47"],                cc: 160, category: "スクーター", query: "PCX160 KF47" },
  { maker: "Honda", label: "フォルツァ250",  katashiki: ["MF06", "MF08", "MF10"], cc: 250, category: "スクーター", query: "フォルツァ250 FORZA MF06 MF08 MF10" },
  { maker: "Honda", label: "フォルツァSi",   katashiki: ["MF13"],                cc: 250, category: "スクーター", query: "フォルツァSi MF13" },
  { maker: "Honda", label: "スペイシー125",  katashiki: ["JF04"],                cc: 125, category: "スクーター", query: "スペイシー125 JF04" },
  { maker: "Honda", label: "Zoomer-X",       katashiki: ["JF52"],                cc: 110, category: "スクーター", query: "ズーマーX Zoomer-X JF52" },
  { maker: "Honda", label: "Rebel300",       katashiki: ["MC60"],                cc: 300, category: "アメリカン250", query: "レブル300 Rebel300 MC60" },
  { maker: "Honda", label: "CB300R",         katashiki: ["NC58"],                cc: 300, category: "ネイキッド250", query: "CB300R NC58" },


  // ────────────────────────────────────────────────
  // YAMAHA
  // ────────────────────────────────────────────────

  // スクーター50cc
  { maker: "Yamaha", label: "JOG",           katashiki: ["27V", "3KJ", "SA01J", "SA16J", "SA36J", "SA39J"], cc: 50, category: "スクーター", query: "JOG 3KJ SA36J SA39J" },
  { maker: "Yamaha", label: "JOG ZR",        katashiki: ["3YK", "SA36J"],        cc: 50,  category: "スクーター", query: "JOG ZR 3YK SA36J" },
  { maker: "Yamaha", label: "JOG アプリオ",  katashiki: ["4LV", "SA11J"],        cc: 50,  category: "スクーター", query: "JOG アプリオ 4LV SA11J" },
  { maker: "Yamaha", label: "ビーノ",        katashiki: ["SA10J", "SA26J", "SA37J", "SA54J"], cc: 50, category: "スクーター", query: "ビーノ SA10J SA26J SA37J" },
  { maker: "Yamaha", label: "BW'S50",        katashiki: ["5BX", "YW50"],         cc: 50,  category: "スクーター", query: "BW'S 50 5BX YW50" },
  { maker: "Yamaha", label: "ギア50",        katashiki: ["4KN", "UA06J", "UA07J", "UA08J"], cc: 50, category: "スクーター", query: "ギア GEAR 4KN UA06J UA07J UA08J" },
  { maker: "Yamaha", label: "ニュースギア",  katashiki: ["4KN", "UA06J", "UA07J", "UA08J"], cc: 50, category: "スクーター", query: "ニュースギア NEWSGEAR UA06J UA07J UA08J" },
  { maker: "Yamaha", label: "マジェスティ50",katashiki: ["SA05J"],               cc: 50,  category: "スクーター", query: "マジェスティ50 SA05J" },
  { maker: "Yamaha", label: "Passol",        katashiki: ["SA21J", "SA26J"],      cc: 50,  category: "スクーター", query: "パッソル SA21J SA26J" },

  // 50cc スポーツ・オフ
  { maker: "Yamaha", label: "TZM50R",        katashiki: ["4KJ"],                 cc: 50,  category: "旧車50",    query: "TZM50R 4KJ" },
  { maker: "Yamaha", label: "ポッケ",        katashiki: ["3FC"],                 cc: 50,  category: "4mini",    query: "ポッケ ヤマハ 3FC" },
  { maker: "Yamaha", label: "チャンプ50",    katashiki: ["12V"],                 cc: 50,  category: "旧車50",    query: "チャンプ50 ヤマハ 12V" },
  { maker: "Yamaha", label: "DT50",          katashiki: ["2V1"],                 cc: 50,  category: "オフ",      query: "DT50 ヤマハ 2V1" },
  { maker: "Yamaha", label: "YB-1",          katashiki: ["4AC"],                 cc: 50,  category: "旧車50",    query: "YB-1 4AC" },
  { maker: "Yamaha", label: "ミニトレ GT50", katashiki: ["GT50"],                cc: 50,  category: "旧車50",    query: "ミニトレ GT50 ヤマハ" },
  { maker: "Yamaha", label: "RD50",          katashiki: ["RD50"],                cc: 50,  category: "旧車50",    query: "RD50 ヤマハ" },

  // スクーター125cc
  { maker: "Yamaha", label: "トリシティ125", katashiki: ["SE82J", "SEC1J", "SEK1J"], cc: 125, category: "スクーター", query: "トリシティ125 SE82J SEC1J SEK1J" },
  { maker: "Yamaha", label: "シグナスX",     katashiki: ["5UA", "SE44J", "SE12J", "SED8J"], cc: 125, category: "スクーター", query: "シグナスX 5UA SE44J SE12J SED8J" },
  { maker: "Yamaha", label: "シグナスグリファス", katashiki: ["B7W"],            cc: 125, category: "スクーター", query: "シグナスグリファス B7W" },
  { maker: "Yamaha", label: "NMAX125",       katashiki: ["SE86J", "SED6J", "SEG6J", "SEL1J"], cc: 125, category: "スクーター", query: "NMAX125 SE86J SED6J SEG6J SEL1J" },
  { maker: "Yamaha", label: "アクシスZ",     katashiki: ["SED7J", "SEJ6J"],      cc: 125, category: "スクーター", query: "アクシスZ SED7J SEJ6J" },
  { maker: "Yamaha", label: "マジェスティS", katashiki: ["SG28J", "SG52J"],      cc: 155, category: "スクーター", query: "マジェスティS SG28J SG52J" },
  { maker: "Yamaha", label: "マジェスティ125", katashiki: ["5CA", "SE27"],       cc: 125, category: "スクーター", query: "マジェスティ125 5CA SE27" },
  { maker: "Yamaha", label: "JOG125",        katashiki: ["SEJ5J"],               cc: 125, category: "スクーター", query: "JOG125 ジョグ125 SEJ5J" },
  { maker: "Yamaha", label: "アクシストリート", katashiki: ["SE53J"],             cc: 125, category: "スクーター", query: "アクシストリート SE53J" },
  { maker: "Yamaha", label: "アクシス90",    katashiki: ["3VR"],                 cc: 90,  category: "スクーター", query: "アクシス90 3VR" },
  { maker: "Yamaha", label: "BW'S100",       katashiki: ["SB02"],                cc: 100, category: "スクーター", query: "BW'S100 SB02" },

  // スポーツ・クラシック125
  { maker: "Yamaha", label: "SR125",         katashiki: ["4WP"],                 cc: 125, category: "旧車50",    query: "SR125 ヤマハ 4WP" },
  { maker: "Yamaha", label: "RZ125",         katashiki: ["13W", "1GV"],          cc: 125, category: "旧車50",    query: "RZ125 13W 1GV" },
  { maker: "Yamaha", label: "DT125R",        katashiki: ["3FW"],                 cc: 125, category: "オフ",      query: "DT125R 3FW" },
  { maker: "Yamaha", label: "TZR125",        katashiki: ["2RM", "3TY"],          cc: 125, category: "旧車50",    query: "TZR125 2RM 3TY" },
  { maker: "Yamaha", label: "YBR125",        katashiki: ["RE03"],                cc: 125, category: "旧車50",    query: "YBR125 RE03 逆輸入" },

  // スポーツ125
  { maker: "Yamaha", label: "YZF-R125",      katashiki: ["RE32J"],               cc: 125, category: "スポーツ125", query: "YZF-R125 RE32J" },
  { maker: "Yamaha", label: "MT-125",        katashiki: ["RG43J"],               cc: 125, category: "スポーツ125", query: "MT-125 RG43J" },
  { maker: "Yamaha", label: "XSR125",        katashiki: ["RG50J"],               cc: 125, category: "スポーツ125", query: "XSR125 RG50J" },

  // オフ250
  { maker: "Yamaha", label: "セロー250",     katashiki: ["DG17J", "DG31J"],      cc: 250, category: "オフ250",   query: "セロー250 DG17J DG31J" },
  { maker: "Yamaha", label: "トリッカー",    katashiki: ["DG10J"],               cc: 250, category: "オフ250",   query: "トリッカー DG10J" },
  { maker: "Yamaha", label: "WR250R",        katashiki: ["DG15J"],               cc: 250, category: "オフ250",   query: "WR250R DG15J" },
  { maker: "Yamaha", label: "WR250X",        katashiki: ["DG15J"],               cc: 250, category: "オフ250",   query: "WR250X DG15J" },
  { maker: "Yamaha", label: "TW225",         katashiki: ["DG05J", "DG08J"],      cc: 225, category: "オフ250",   query: "TW225 DG05J DG08J" },
  { maker: "Yamaha", label: "TT-R125",       katashiki: ["DG03"],                cc: 125, category: "オフ",      query: "TTR125 DG03" },

  // ネイキッド/スポーツ250〜400
  { maker: "Yamaha", label: "XJR400",        katashiki: ["4HM", "RH02J", "RH03J"], cc: 400, category: "ネイキッド400", query: "XJR400 4HM RH02J RH03J" },
  { maker: "Yamaha", label: "FZ400",         katashiki: ["4YR"],                 cc: 400, category: "ネイキッド400", query: "FZ400 4YR" },
  { maker: "Yamaha", label: "SR400",         katashiki: ["RH01J", "RH16J"],      cc: 400, category: "ネイキッド400", query: "SR400 RH01J RH16J" },
  { maker: "Yamaha", label: "SRX400",        katashiki: ["1JL"],                 cc: 400, category: "旧車400",   query: "SRX400 1JL" },
  { maker: "Yamaha", label: "Dragstar400",   katashiki: ["VH01J", "VH02J"],      cc: 400, category: "アメリカン400", query: "ドラッグスター400 VH01J VH02J" },
  { maker: "Yamaha", label: "YZF-R25",       katashiki: ["RG10J"],               cc: 250, category: "スポーツ250", query: "YZF-R25 RG10J" },
  { maker: "Yamaha", label: "MT-25",         katashiki: ["RG10J"],               cc: 250, category: "スポーツ250", query: "MT-25 RG10J" },
  { maker: "Yamaha", label: "FZR400R",       katashiki: ["3TJ", "3EN"],          cc: 400, category: "レプリカ400", query: "FZR400R 3TJ 3EN" },
  { maker: "Yamaha", label: "TZR250",        katashiki: ["2MA", "3MA", "3XV"],   cc: 250, category: "レプリカ250", query: "TZR250 2MA 3MA 3XV" },
  { maker: "Yamaha", label: "RZ250R",        katashiki: ["29L"],                 cc: 250, category: "旧車250",   query: "RZ250R 29L" },

  // スクーター250
  { maker: "Yamaha", label: "マジェスティ250", katashiki: ["4HC", "5SJ", "SG03J", "SG20J"], cc: 250, category: "スクーター", query: "マジェスティ250 コマジェ 4HC 5SJ SG03J SG20J" },
  { maker: "Yamaha", label: "グランドマジェスティ250", katashiki: ["SG15J"],       cc: 250, category: "スクーター", query: "グランドマジェスティ250 SG15J" },
  { maker: "Yamaha", label: "グランドマジェスティ400", katashiki: ["SH04J", "SH06J"], cc: 400, category: "スクーター", query: "グランドマジェスティ400 SH04J SH06J" },

  // アメリカン250
  { maker: "Yamaha", label: "ドラッグスター250", katashiki: ["3JA", "VG01J"],    cc: 250, category: "アメリカン250", query: "ドラッグスター250 3JA VG01J" },

  // スポーツ250（追加）
  { maker: "Yamaha", label: "FZR250",        katashiki: ["2KR", "3LN"],          cc: 250, category: "レプリカ250", query: "FZR250 2KR 3LN" },
  { maker: "Yamaha", label: "Zeal250",       katashiki: ["4JX"],                 cc: 250, category: "ネイキッド250", query: "ジール250 4JX" },
  { maker: "Yamaha", label: "DT230ランツァ", katashiki: ["3RM"],                 cc: 230, category: "オフ250",   query: "DT230 ランツァ 3RM" },
  { maker: "Yamaha", label: "セロー225",    katashiki: ["2NF", "3RW"],          cc: 225, category: "オフ250",   query: "セロー225 2NF 3RW" },
  { maker: "Yamaha", label: "FZ250フェザー",katashiki: ["1HX"],                 cc: 250, category: "旧車250",   query: "FZ250 フェザー 1HX" },
  { maker: "Yamaha", label: "TT250R",        katashiki: ["4GY"],                 cc: 250, category: "オフ250",   query: "TT250R ヤマハ 4GY" },
  { maker: "Yamaha", label: "TDR250",        katashiki: ["2YK"],                 cc: 250, category: "オフ250",   query: "TDR250 2YK" },
  { maker: "Yamaha", label: "SDR200",        katashiki: ["2TV"],                 cc: 200, category: "旧車250",   query: "SDR200 2TV" },
  { maker: "Yamaha", label: "RZ250",         katashiki: ["1X1"],                 cc: 250, category: "旧車250",   query: "RZ250 ヤマハ 1X1" },
  { maker: "Yamaha", label: "MT-03",         katashiki: ["RH07J"],               cc: 320, category: "スポーツ250", query: "MT-03 ヤマハ RH07J" },
  { maker: "Yamaha", label: "YZF-R3",        katashiki: ["RH12J"],               cc: 320, category: "スポーツ250", query: "YZF-R3 RH12J" },

  // 売れ筋追加
  { maker: "Yamaha", label: "BW'S125",       katashiki: ["SEA6J", "SED9J"],      cc: 125, category: "スクーター", query: "BW'S125 BWS SEA6J SED9J" },

  // 50cc（追加）
  { maker: "Yamaha", label: "YSR50",         katashiki: ["2TX", "2TW"],          cc: 50,  category: "4mini",    query: "YSR50 2TX 2TW" },
  { maker: "Yamaha", label: "RZ50",          katashiki: ["12A"],                 cc: 50,  category: "旧車50",   query: "RZ50 ヤマハ 12A" },
  { maker: "Yamaha", label: "TZR50R",        katashiki: ["3TU"],                 cc: 50,  category: "旧車50",   query: "TZR50R 3TU" },
  { maker: "Yamaha", label: "TDR50",         katashiki: ["3FY"],                 cc: 50,  category: "オフ",     query: "TDR50 3FY" },
  { maker: "Yamaha", label: "VOX",           katashiki: ["SA31J", "SA52J"],      cc: 50,  category: "スクーター", query: "VOX ボックス SA31J SA52J" },
  { maker: "Yamaha", label: "E-Vino",        katashiki: ["SY11J"],               cc: 50,  category: "スクーター", query: "E-Vino イービーノ SY11J" },
  { maker: "Yamaha", label: "YB-1 Four",     katashiki: ["F5B"],                 cc: 50,  category: "旧車50",   query: "YB-1 Four F5B" },
  { maker: "Yamaha", label: "ミント",        katashiki: ["1YU"],                 cc: 50,  category: "スクーター", query: "ミント ヤマハ 1YU" },
  { maker: "Yamaha", label: "アクシス50",    katashiki: ["3VP"],                 cc: 50,  category: "スクーター", query: "アクシス50 3VP" },
  { maker: "Yamaha", label: "チャピィ",      katashiki: ["LB50II"],              cc: 50,  category: "4mini",    query: "チャピィ チャッピー LB50" },
  { maker: "Yamaha", label: "MR50",          katashiki: ["354"],                 cc: 50,  category: "オフ",     query: "MR50 ヤマハ" },

  // 100cc（追加）
  { maker: "Yamaha", label: "グランドアクシス100", katashiki: ["SB01J"],         cc: 100, category: "スクーター", query: "グランドアクシス100 SB01J" },

  // 250cc（追加）
  { maker: "Yamaha", label: "TW200",         katashiki: ["2JS"],                 cc: 200, category: "オフ250",   query: "TW200 ヤマハ 2JS" },
  { maker: "Yamaha", label: "ルネッサ250",   katashiki: ["3HM"],                 cc: 250, category: "ネイキッド250", query: "ルネッサ250 3HM" },
  { maker: "Yamaha", label: "R1-Z",          katashiki: ["1XG"],                 cc: 250, category: "レプリカ250", query: "R1-Z 1XG" },
  { maker: "Yamaha", label: "XV250ビラーゴ", katashiki: ["3DM"],                 cc: 250, category: "アメリカン250", query: "XV250 ビラーゴ 3DM" },

  // 400cc（追加）
  { maker: "Yamaha", label: "ディバージョン400", katashiki: ["4BR"],             cc: 400, category: "ネイキッド400", query: "ディバージョン400 4BR" },
  { maker: "Yamaha", label: "XV400ビラーゴ", katashiki: ["55V"],                 cc: 400, category: "アメリカン400", query: "XV400 ビラーゴ 55V" },
  { maker: "Yamaha", label: "FZ400R",        katashiki: ["1WX"],                 cc: 400, category: "旧車400",   query: "FZ400R ヤマハ 1WX" },
  { maker: "Yamaha", label: "XJ400",         katashiki: ["4AA"],                 cc: 400, category: "旧車400",   query: "XJ400 ヤマハ 4AA" },


  // ────────────────────────────────────────────────
  // SUZUKI
  // ────────────────────────────────────────────────

  // スクーター50cc
  { maker: "Suzuki", label: "レッツ2",       katashiki: ["CA1KA", "CA1PA"],      cc: 50,  category: "スクーター", query: "レッツ2 CA1KA CA1PA" },
  { maker: "Suzuki", label: "レッツ4",       katashiki: ["CA43A"],               cc: 50,  category: "スクーター", query: "レッツ4 CA43A" },
  { maker: "Suzuki", label: "レッツ5",       katashiki: ["CA47A"],               cc: 50,  category: "スクーター", query: "レッツ5 CA47A" },
  { maker: "Suzuki", label: "レッツ",        katashiki: ["CA4AA"],               cc: 50,  category: "スクーター", query: "レッツ スズキ CA4AA" },
  { maker: "Suzuki", label: "アドレス50",    katashiki: ["CA1CA", "CA13A"],      cc: 50,  category: "スクーター", query: "アドレス50 CA1CA CA13A" },
  { maker: "Suzuki", label: "アドレスV50",   katashiki: ["CA1FA", "CA42A"],      cc: 50,  category: "スクーター", query: "アドレスV50 CA1FA CA42A" },
  { maker: "Suzuki", label: "アドレスV100",  katashiki: ["CE11A", "CE13A"],      cc: 100, category: "スクーター", query: "アドレスV100 CE11A CE13A" },
  { maker: "Suzuki", label: "ストリートマジック50", katashiki: ["CA18A"],        cc: 50,  category: "スクーター", query: "ストリートマジック CA18A" },
  { maker: "Suzuki", label: "バーディー50",  katashiki: ["FB50"],                cc: 50,  category: "カブ",      query: "バーディー50 FB50" },
  { maker: "Suzuki", label: "バーディー90",  katashiki: ["FB90"],                cc: 90,  category: "カブ",      query: "バーディー90 FB90" },
  { maker: "Suzuki", label: "ZZ",            katashiki: ["CA1PA"],               cc: 50,  category: "スクーター", query: "ZZ スズキ CA1PA" },
  { maker: "Suzuki", label: "セピア",        katashiki: ["CA1CA", "CA1CE"],      cc: 50,  category: "スクーター", query: "セピア CA1CA CA1CE" },
  { maker: "Suzuki", label: "セピアZZ",      katashiki: ["CA1CE"],               cc: 50,  category: "スクーター", query: "セピアZZ CA1CE" },
  { maker: "Suzuki", label: "ウルフ50",      katashiki: ["AA43A"],               cc: 50,  category: "旧車50",    query: "ウルフ50 AA43A" },
  { maker: "Suzuki", label: "RG50Γ",         katashiki: ["HC11A"],               cc: 50,  category: "旧車50",    query: "RG50 ガンマ HC11A" },
  { maker: "Suzuki", label: "Hi-Up R",       katashiki: ["CA18A"],               cc: 50,  category: "スクーター", query: "ハイアップ スズキ" },
  { maker: "Suzuki", label: "チョイノリ",    katashiki: ["CZ41A"],               cc: 50,  category: "スクーター", query: "チョイノリ CZ41A" },
  { maker: "Suzuki", label: "ヴェルデ",      katashiki: ["CA1MA"],               cc: 50,  category: "スクーター", query: "ヴェルデ CA1MA" },
  { maker: "Suzuki", label: "バンバン50",    katashiki: ["RV50"],                cc: 50,  category: "オフ",      query: "バンバン50 RV50" },
  { maker: "Suzuki", label: "ジェンマ50",    katashiki: ["CS50"],                cc: 50,  category: "スクーター", query: "ジェンマ50 スズキ CS50" },
  { maker: "Suzuki", label: "GAG",           katashiki: ["LA41A"],               cc: 50,  category: "4mini",    query: "ギャグ GAG LA41A" },
  { maker: "Suzuki", label: "GS50",          katashiki: ["NA41A"],               cc: 50,  category: "旧車50",    query: "GS50 NA41A" },
  { maker: "Suzuki", label: "DR-Z50",        katashiki: ["JA42A"],               cc: 50,  category: "オフ",      query: "DR-Z50 スズキ JA42A" },

  // スクーター125cc
  { maker: "Suzuki", label: "Avenis125",     katashiki: ["CE59A"],               cc: 125, category: "スクーター", query: "アヴェニス125 CE59A" },
  { maker: "Suzuki", label: "スウィッシュ",  katashiki: ["DV12B"],               cc: 125, category: "スクーター", query: "スウィッシュ SWISH DV12B" },
  { maker: "Suzuki", label: "アドレスV125",  katashiki: ["CF46A", "CF4EA"],       cc: 125, category: "スクーター", query: "アドレスV125 CF46A CF4EA" },
  { maker: "Suzuki", label: "アドレスV125G", katashiki: ["CF46A", "CF4EA"],       cc: 125, category: "スクーター", query: "アドレスV125G CF46A CF4EA" },
  { maker: "Suzuki", label: "アドレスV125S", katashiki: ["CF4MA"],               cc: 125, category: "スクーター", query: "アドレスV125S CF4MA" },
  { maker: "Suzuki", label: "アドレス110",   katashiki: ["CF11A", "CE47A"],      cc: 110, category: "スクーター", query: "アドレス110 CF11A CE47A" },
  { maker: "Suzuki", label: "バーグマン125", katashiki: ["CF47A"],               cc: 125, category: "スクーター", query: "バーグマン125 CF47A" },
  { maker: "Suzuki", label: "ヴェクスター125", katashiki: ["CF42A"],             cc: 125, category: "スクーター", query: "ヴェクスター125 CF42A" },
  { maker: "Suzuki", label: "ストリートマジック110", katashiki: ["CF12A"],        cc: 110, category: "スクーター", query: "ストリートマジック110 CF12A" },
  { maker: "Suzuki", label: "バーグマンストリート125EX", katashiki: ["EA23M"],    cc: 125, category: "スクーター", query: "バーグマンストリート125EX EA23M" },

  // ネイキッド・クラシック125
  { maker: "Suzuki", label: "GN125",         katashiki: ["NF41A"],               cc: 125, category: "旧車50",    query: "GN125 NF41A" },
  { maker: "Suzuki", label: "GS125E",        katashiki: ["NF41B"],               cc: 125, category: "旧車50",    query: "GS125E NF41B" },
  { maker: "Suzuki", label: "EN125",         katashiki: ["EN125"],               cc: 125, category: "旧車50",    query: "EN125 スズキ 逆輸入" },
  { maker: "Suzuki", label: "RG125ガンマ",   katashiki: ["NF13A"],               cc: 125, category: "旧車50",    query: "RG125 ガンマ NF13A" },
  { maker: "Suzuki", label: "ウルフ125",     katashiki: ["NF13A"],               cc: 125, category: "旧車50",    query: "ウルフ125 NF13A" },
  { maker: "Suzuki", label: "マローダー125", katashiki: ["NF48A"],               cc: 125, category: "旧車50",    query: "マローダー125 GZ125 NF48A" },
  { maker: "Suzuki", label: "ジェベル125",   katashiki: ["SF44A"],               cc: 125, category: "オフ",      query: "ジェベル125 SF44A" },

  // スポーツ125
  { maker: "Suzuki", label: "TS125R",        katashiki: ["SF15A"],               cc: 125, category: "オフ",      query: "TS125R SF15A" },
  { maker: "Suzuki", label: "GSX-S125",      katashiki: ["DS11A"],               cc: 125, category: "スポーツ125", query: "GSX-S125 DS11A" },
  { maker: "Suzuki", label: "GSX-R125",      katashiki: ["DL34A"],               cc: 125, category: "スポーツ125", query: "GSX-R125 DL34A" },
  { maker: "Suzuki", label: "ジクサー125",   katashiki: ["NF54A"],               cc: 125, category: "スポーツ125", query: "ジクサー125 NF54A" },

  // オフ250
  { maker: "Suzuki", label: "ジェベル250",   katashiki: ["SJ44A", "SJ45A"],      cc: 250, category: "オフ250",   query: "ジェベル250 SJ44A SJ45A" },
  { maker: "Suzuki", label: "DR250S",        katashiki: ["SJ44A"],               cc: 250, category: "オフ250",   query: "DR250S スズキ" },
  { maker: "Suzuki", label: "TS200R",        katashiki: ["SH13A"],               cc: 200, category: "オフ",      query: "TS200R SH13A" },
  { maker: "Suzuki", label: "Djebel200",    katashiki: ["SH42A"],               cc: 200, category: "オフ250",   query: "ジェベル200 SH42A" },
  { maker: "Suzuki", label: "DR-Z250",      katashiki: ["SK43A"],               cc: 250, category: "オフ250",   query: "DR-Z250 SK43A" },
  { maker: "Suzuki", label: "GSX250Sカタナ",katashiki: ["GJ77A"],               cc: 250, category: "スポーツ250", query: "GSX250S カタナ GJ77A" },
  { maker: "Suzuki", label: "グラストラッカー",  katashiki: ["NJ47A"],           cc: 250, category: "ネイキッド250", query: "グラストラッカー NJ47A" },
  { maker: "Suzuki", label: "グラストラッカービッグボーイ", katashiki: ["NJ47A"], cc: 250, category: "ネイキッド250", query: "グラストラッカー ビッグボーイ NJ47A" },
  { maker: "Suzuki", label: "Van Van200",   katashiki: ["NJ47A"],               cc: 200, category: "ネイキッド250", query: "バンバン200 NJ47A" },
  { maker: "Suzuki", label: "RF400",        katashiki: ["GK78A"],               cc: 400, category: "スポーツ400", query: "RF400 GK78A" },

  // ネイキッド/スポーツ250〜400
  { maker: "Suzuki", label: "バンディット250", katashiki: ["GJ74A", "GJ77A", "GJ79A"], cc: 250, category: "ネイキッド250", query: "バンディット250 GJ74A GJ77A" },
  { maker: "Suzuki", label: "GSX250R",       katashiki: ["DN11A"],               cc: 250, category: "スポーツ250", query: "GSX250R DN11A" },
  { maker: "Suzuki", label: "バンディット400", katashiki: ["GK75A", "GK7BA", "GK78A"], cc: 400, category: "ネイキッド400", query: "バンディット400 GK75A GK7BA" },
  { maker: "Suzuki", label: "GSX400インパルス", katashiki: ["GK79A"],            cc: 400, category: "ネイキッド400", query: "GSX400 インパルス GK79A" },
  { maker: "Suzuki", label: "GSX400Sカタナ", katashiki: ["GK77A"],               cc: 400, category: "ネイキッド400", query: "GSX400S カタナ GK77A" },
  { maker: "Suzuki", label: "SV400S",        katashiki: ["VK53A"],               cc: 400, category: "ネイキッド400", query: "SV400S VK53A" },
  { maker: "Suzuki", label: "RG250Γ",        katashiki: ["GJ21A"],               cc: 250, category: "レプリカ250", query: "RG250 ガンマ GJ21A" },
  { maker: "Suzuki", label: "ウルフ250",     katashiki: ["SP30A"],               cc: 250, category: "スポーツ250", query: "ウルフ250 SP30A" },

  // スポーツ250（追加）
  { maker: "Suzuki", label: "RGV250Γ",       katashiki: ["VJ21A", "VJ22A", "VJ23A"], cc: 250, category: "レプリカ250", query: "RGV250 ガンマ VJ21A VJ22A VJ23A" },
  { maker: "Suzuki", label: "GSX-R250",      katashiki: ["GJ73A"],               cc: 250, category: "スポーツ250", query: "GSX-R250 GJ73A" },
  { maker: "Suzuki", label: "Across250",     katashiki: ["GJ75A"],               cc: 250, category: "スポーツ250", query: "アクロス GJ75A" },
  { maker: "Suzuki", label: "Vストローム250", katashiki: ["DS11A"],              cc: 250, category: "アドベンチャー", query: "Vストローム250 DS11A" },

  // アメリカン400
  { maker: "Suzuki", label: "イントルーダー400", katashiki: ["VK51A"],           cc: 400, category: "アメリカン400", query: "イントルーダー400 VK51A" },

  // 旧車
  { maker: "Suzuki", label: "GS400E",        katashiki: ["GS400E"],              cc: 400, category: "旧車400",   query: "GS400 スズキ" },

  // 追加
  { maker: "Suzuki", label: "アドレス125",   katashiki: ["DT11A", "CF92A"],      cc: 125, category: "スクーター", query: "アドレス125 DT11A CF92A" },
  { maker: "Suzuki", label: "GSX-R400",      katashiki: ["GK73A", "GK76A"],      cc: 400, category: "スポーツ400", query: "GSX-R400 GK73A GK76A" },
  { maker: "Suzuki", label: "イントルーダークラシック400", katashiki: ["VK54A"], cc: 400, category: "アメリカン400", query: "イントルーダークラシック400 VK54A" },
  { maker: "Suzuki", label: "ジクサーSF250", katashiki: ["GL10A"],               cc: 250, category: "スポーツ250", query: "ジクサーSF250 GL10A" },
  { maker: "Suzuki", label: "Vストローム250SX", katashiki: ["DS45A"],            cc: 250, category: "アドベンチャー", query: "Vストローム250SX DS45A" },
  { maker: "Suzuki", label: "スカイウェイブ250", katashiki: ["CJ43A", "CJ44A", "CJ46A"], cc: 250, category: "スクーター", query: "スカイウェイブ250 CJ43A CJ44A CJ46A" },
  { maker: "Suzuki", label: "スカイウェイブ400", katashiki: ["CK43A", "CK44A", "CK45A"], cc: 400, category: "スクーター", query: "スカイウェイブ400 CK43A CK44A CK45A" },
  { maker: "Suzuki", label: "バーグマン200",    katashiki: ["CH41A"],               cc: 200, category: "スクーター", query: "バーグマン200 Burgman CH41A" },


  // ────────────────────────────────────────────────
  // KAWASAKI
  // ────────────────────────────────────────────────

  // 50cc
  { maker: "Kawasaki", label: "KSR-I",        katashiki: ["KS50A"],               cc: 50,  category: "4mini",    query: "KSR-I KS50A" },
  { maker: "Kawasaki", label: "KSR-II",       katashiki: ["KS50B"],               cc: 50,  category: "4mini",    query: "KSR-II KS50B" },
  { maker: "Kawasaki", label: "AR50",         katashiki: ["AR50C"],               cc: 50,  category: "旧車50",   query: "AR50 AR50C" },
  { maker: "Kawasaki", label: "KH50",         katashiki: ["KH50"],                cc: 50,  category: "旧車50",   query: "KH50 カワサキ" },
  { maker: "Kawasaki", label: "KR50",         katashiki: ["KR50"],                cc: 50,  category: "旧車50",   query: "KR50 カワサキ" },
  { maker: "Kawasaki", label: "AE50",         katashiki: ["AE50"],                cc: 50,  category: "旧車50",   query: "AE50 カワサキ" },
  { maker: "Kawasaki", label: "AV50",         katashiki: ["AV050A"],              cc: 50,  category: "旧車50",   query: "AV50 カワサキ AV050A" },

  // 110cc
  { maker: "Kawasaki", label: "KSR110",       katashiki: ["KL110A"],              cc: 110, category: "4mini",    query: "KSR110 KL110A" },

  // 125cc
  { maker: "Kawasaki", label: "Z125 Pro",     katashiki: ["BR125H"],              cc: 125, category: "スポーツ125", query: "Z125 PRO BR125H" },
  { maker: "Kawasaki", label: "Ninja125",     katashiki: ["BX125A", "BX125B"],    cc: 125, category: "スポーツ125", query: "Ninja125 BX125A BX125B" },
  { maker: "Kawasaki", label: "エリミネーター125", katashiki: ["BN125A"],         cc: 125, category: "旧車50",    query: "エリミネーター125 BN125A" },
  { maker: "Kawasaki", label: "Dトラッカー125", katashiki: ["LX125D"],           cc: 125, category: "オフ",      query: "Dトラッカー125 LX125D" },
  { maker: "Kawasaki", label: "KDX125SR",     katashiki: ["DX125A"],              cc: 125, category: "オフ",      query: "KDX125SR DX125A" },

  // 250cc
  { maker: "Kawasaki", label: "Ninja250R",    katashiki: ["EX250K"],              cc: 250, category: "スポーツ250", query: "Ninja250R EX250K" },
  { maker: "Kawasaki", label: "Ninja250",     katashiki: ["EX250L", "EX250P"],    cc: 250, category: "スポーツ250", query: "Ninja250 EX250L EX250P" },
  { maker: "Kawasaki", label: "Z250",         katashiki: ["ER250C"],              cc: 250, category: "ネイキッド250", query: "Z250 ER250C" },
  { maker: "Kawasaki", label: "Ninja250SL",   katashiki: ["BX250A"],              cc: 250, category: "スポーツ250", query: "Ninja250SL BX250A" },
  { maker: "Kawasaki", label: "エストレヤ",   katashiki: ["BJ250A", "BJ250E"],    cc: 250, category: "ネイキッド250", query: "エストレヤ BJ250A BJ250E" },
  { maker: "Kawasaki", label: "バリウス",     katashiki: ["ZR250C"],              cc: 250, category: "ネイキッド250", query: "バリウス ZR250C" },
  { maker: "Kawasaki", label: "KLX250",       katashiki: ["LX250E", "LX250S"],    cc: 250, category: "オフ250",   query: "KLX250 LX250E LX250S" },
  { maker: "Kawasaki", label: "D-Tracker",    katashiki: ["LX250E"],              cc: 250, category: "オフ250",   query: "D-Tracker LX250E" },
  { maker: "Kawasaki", label: "スーパーシェルパ", katashiki: ["KL250R"],          cc: 250, category: "オフ250",   query: "スーパーシェルパ KL250R" },

  // 400cc
  { maker: "Kawasaki", label: "Ninja400",     katashiki: ["EX400E", "EX400G", "EX400L"], cc: 400, category: "スポーツ400", query: "Ninja400 EX400E EX400G EX400L" },
  { maker: "Kawasaki", label: "Z400",         katashiki: ["ER400C"],              cc: 400, category: "ネイキッド400", query: "Z400 ER400C" },
  { maker: "Kawasaki", label: "ZRX400",       katashiki: ["ZR400E", "ZR400F"],    cc: 400, category: "ネイキッド400", query: "ZRX400 ZR400E ZR400F" },
  { maker: "Kawasaki", label: "ゼファー400",  katashiki: ["ZR400A", "ZR400C"],    cc: 400, category: "ネイキッド400", query: "ゼファー400 ZR400A ZR400C" },
  { maker: "Kawasaki", label: "エリミネーター400", katashiki: ["ZL400A"],         cc: 400, category: "アメリカン400", query: "エリミネーター400 ZL400A" },
  { maker: "Kawasaki", label: "GPZ400R",      katashiki: ["ZX400D", "ZX400E"],    cc: 400, category: "スポーツ400", query: "GPZ400R ZX400D ZX400E" },
  { maker: "Kawasaki", label: "ZXR400",       katashiki: ["ZX400H", "ZX400J", "ZX400L"], cc: 400, category: "スポーツ400", query: "ZXR400 ZX400H ZX400L" },

  // 250cc（追加）
  { maker: "Kawasaki", label: "ZZR250",       katashiki: ["EX250H"],              cc: 250, category: "スポーツ250", query: "ZZR250 EX250H" },
  { maker: "Kawasaki", label: "GPX250R",      katashiki: ["EX250F"],              cc: 250, category: "スポーツ250", query: "GPX250R EX250F" },
  { maker: "Kawasaki", label: "エリミネーター250", katashiki: ["EL250A"],         cc: 250, category: "アメリカン250", query: "エリミネーター250 EL250A" },
  { maker: "Kawasaki", label: "KDX250SR",     katashiki: ["KDX250SR"],            cc: 250, category: "オフ250",   query: "KDX250SR カワサキ" },
  { maker: "Kawasaki", label: "KDX220R",     katashiki: ["KDX220D"],             cc: 220, category: "オフ250",   query: "KDX220R KDX220D" },
  { maker: "Kawasaki", label: "KDX200",      katashiki: ["KDX200H"],             cc: 200, category: "オフ250",   query: "KDX200 KDX200H" },
  { maker: "Kawasaki", label: "ZXR250",      katashiki: ["ZX250A"],              cc: 250, category: "スポーツ250", query: "ZXR250 ZX250A" },
  { maker: "Kawasaki", label: "GPZ250R",     katashiki: ["EX250A"],              cc: 250, category: "スポーツ250", query: "GPZ250R EX250A" },
  { maker: "Kawasaki", label: "AR125",       katashiki: ["AR125A"],              cc: 125, category: "旧車50",    query: "AR125 AR125A" },
  { maker: "Kawasaki", label: "KMX125",      katashiki: ["KMX125A"],             cc: 125, category: "オフ",      query: "KMX125 KMX125A" },
  { maker: "Kawasaki", label: "KR250",       katashiki: ["KR250A"],              cc: 250, category: "旧車250",   query: "KR250 KR250A" },
  { maker: "Kawasaki", label: "D-TrackerX",  katashiki: ["LX250S"],              cc: 250, category: "オフ250",   query: "D-TrackerX LX250S" },

  // 400cc（追加）
  { maker: "Kawasaki", label: "W400",         katashiki: ["EJ400A"],              cc: 400, category: "ネイキッド400", query: "W400 EJ400A" },

  // 旧車400
  { maker: "Kawasaki", label: "Z400FX",       katashiki: ["KZ400E"],              cc: 400, category: "旧車400",   query: "Z400FX KZ400E カワサキ" },
  { maker: "Kawasaki", label: "Z400GP",       katashiki: ["ZX400A"],              cc: 400, category: "旧車400",   query: "Z400GP カワサキ" },

  // 追加
  { maker: "Kawasaki", label: "ゼファーχ",   katashiki: ["ZR400G", "ZR400H"],    cc: 400, category: "ネイキッド400", query: "ゼファーχ ZR400G ZR400H" },
  { maker: "Kawasaki", label: "ZX-4R",        katashiki: ["ZX400P"],              cc: 400, category: "スポーツ400", query: "ZX-4R ZX400P" },
  { maker: "Kawasaki", label: "KLX125",       katashiki: ["LX125C"],              cc: 125, category: "オフ",      query: "KLX125 LX125C" },
  { maker: "Kawasaki", label: "KH125",        katashiki: ["KH125A"],              cc: 125, category: "旧車50",    query: "KH125 カワサキ KH125A" },
  { maker: "Kawasaki", label: "Versys-X250",  katashiki: ["LZ250C"],              cc: 250, category: "アドベンチャー", query: "Versys-X250 LZ250C" },
  { maker: "Kawasaki", label: "エリミネーター400LX", katashiki: ["ZL400B"],      cc: 400, category: "アメリカン400", query: "エリミネーター400LX ZL400B" },
  { maker: "Kawasaki", label: "GPZ400",       katashiki: ["ZX400A", "ZX400C"],    cc: 400, category: "旧車400",   query: "GPZ400 カワサキ ZX400C" },
  { maker: "Kawasaki", label: "Z1-R400",      katashiki: ["KZ400"],               cc: 400, category: "旧車400",   query: "Z1-R400 KZ400" },
  { maker: "Kawasaki", label: "KLX230",       katashiki: ["LE230A"],              cc: 230, category: "オフ250",   query: "KLX230 LE230A" },
  { maker: "Kawasaki", label: "Z250SL",       katashiki: ["BX250B"],              cc: 250, category: "ネイキッド250", query: "Z250SL BX250B" },
]

// CC帯ラベル
export const CC_RANGES = ["〜50cc", "51〜125cc", "126〜250cc", "251〜400cc"] as const
export type CCRange = typeof CC_RANGES[number]

export const getCCRange = (cc: number): CCRange => {
  if (cc <= 50) return "〜50cc"
  if (cc <= 125) return "51〜125cc"
  if (cc <= 250) return "126〜250cc"
  return "251〜400cc"
}

// メーカー別に絞り込む
export const getModelsByMaker = (maker: ModelCode["maker"]) =>
  MODEL_CODES.filter((m) => m.maker === maker)

// CC帯で絞り込む
export const getModelsByCCRange = (range: CCRange) =>
  MODEL_CODES.filter((m) => getCCRange(m.cc) === range)

// 全メーカー一覧
export const ALL_MAKERS = ["Honda", "Yamaha", "Suzuki", "Kawasaki"] as const
