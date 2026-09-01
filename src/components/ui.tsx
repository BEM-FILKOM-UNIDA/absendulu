import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const styles = {
  primary: 'bg-[var(--ink)] text-[#f7f4ed] hover:bg-[var(--accent-strong)]',
  accent: 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[#55ded4]',
  danger: 'bg-[var(--danger)] text-white hover:bg-[#963b3b]',
} as const

export function ButtonLink({ href, children, variant = 'primary', className = '' }: { href: string; children: ReactNode; variant?: keyof typeof styles; className?: string }) {
  return <Link to={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] px-5 text-sm font-bold transition-[color,background-color,transform] hover:-translate-y-0.5 ${styles[variant]} ${className}`}>{children}</Link>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(16,37,45,.06)] ${className}`}>{children}</div>
}

export function Badge({ children, variant = 'muted' }: { children: ReactNode; variant?: 'success' | 'danger' | 'muted' }) {
  const classes = variant === 'success' ? 'bg-[#e4f1bd] text-[#476b16]' : variant === 'danger' ? 'bg-[#f8dddd] text-[var(--danger)]' : 'bg-[var(--surface-muted)] text-[var(--muted)]'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${classes}`}>{children}</span>
}
