// ponytail: satu peta label status — 3 pemakai (list, dashboard, detail); tanpa ini enum mentah tampil ke user
export const eventStatusLabels: Record<string, string> = {
  active: 'Aktif',
  draft: 'Draft',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export function eventStatusLabel(status: string): string {
  return eventStatusLabels[status] ?? status
}