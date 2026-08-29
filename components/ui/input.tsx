import type { InputHTMLAttributes } from 'react'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`flex h-12 w-full rounded-[4px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-soft)] focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />
}
