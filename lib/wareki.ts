/** 西暦日付文字列を和暦に変換 */
export function toWareki(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr

  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()

  let era: string
  let eraYear: number

  if (y >= 2019) {
    era = '令和'
    eraYear = y - 2018
  } else if (y >= 1989) {
    era = '平成'
    eraYear = y - 1988
  } else if (y >= 1926) {
    era = '昭和'
    eraYear = y - 1925
  } else {
    era = '大正'
    eraYear = y - 1911
  }

  const yearStr = eraYear === 1 ? '元' : String(eraYear)
  return `${era}${yearStr}年${m}月${day}日`
}
