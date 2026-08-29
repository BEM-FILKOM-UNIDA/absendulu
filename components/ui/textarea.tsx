import type { TextareaHTMLAttributes } from 'react'

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`min-h-28 w-full resize-y rounded-[4px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-soft)] focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[var(--accent-soft)] ${className}`} {...props} />
}
