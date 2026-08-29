import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

const styles = {
  primary: 'bg-[var(--ink)] text-[#f7f4ed] shadow-[0_12px_24px_rgba(16,37,45,.14)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]',
  accent: 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_24px_rgba(38,208,207,.22)] hover:-translate-y-0.5 hover:bg-[#55ded4]',
  secondary: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:-translate-y-0.5 hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]',
  ghost: 'text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
  danger: 'bg-[var(--danger)] text-white hover:-translate-y-0.5 hover:bg-[#963b3b]',
} as const

type ButtonVariant = keyof typeof styles

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; children: ReactNode }

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] px-5 text-sm font-bold touch-manipulation transition-[color,background-color,border-color,opacity,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px ${styles[variant]} ${className}`} {...props}>{children}</button>
}

export function ButtonLink({ href, variant = 'primary', className = '', children }: { href: string; variant?: ButtonVariant; className?: string; children: ReactNode }) {
  return <Link href={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] px-5 text-sm font-bold touch-manipulation transition-[color,background-color,border-color,opacity,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:translate-y-px ${styles[variant]} ${className}`}>{children}</Link>
}
