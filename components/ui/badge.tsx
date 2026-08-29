import type { HTMLAttributes } from 'react'

export function Badge({ variant = 'default', className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'success' | 'muted' | 'danger' }) {
  const variants = {
    default: 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
    success: 'bg-[#e4f1bd] text-[#476b16]',
    muted: 'bg-[var(--surface-muted)] text-[var(--muted)]',
    danger: 'bg-[#f8dddd] text-[var(--danger)]',
  }
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${variants[variant]} ${className}`} {...props} />
}
