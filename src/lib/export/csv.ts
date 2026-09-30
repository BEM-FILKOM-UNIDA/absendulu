export type CsvCell = string | number | boolean | null | undefined

const BOM = '\uFEFF'

export function csvEscape(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (!/["\r\n,]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map((cell) => csvEscape(cell)).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}
