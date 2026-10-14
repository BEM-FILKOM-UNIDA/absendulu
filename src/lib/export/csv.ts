export type CsvCell = string | number | boolean | null | undefined

const BOM = '\uFEFF'

export function csvEscape(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  // ponytail: prefix ' biar Excel/Sheets tidak jalanin isi sel sebagai formula.
  // full_name & nim bisa diisi user sendiri (self-register / CSV import), jadi ini bukan data tepercaya.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (!/["\r\n,]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map((cell) => csvEscape(cell)).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}
