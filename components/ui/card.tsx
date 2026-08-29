import type { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(16,37,45,.06)] ${className}`} {...props}>{children}</div>
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`space-y-1.5 p-6 ${className}`} {...props}>{children}</div>
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-bold tracking-[-0.025em] ${className}`} {...props}>{children}</h2>
}

export function CardDescription({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm leading-6 text-[var(--muted)] ${className}`} {...props}>{children}</p>
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 pb-6 ${className}`} {...props}>{children}</div>
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center px-6 pb-6 ${className}`} {...props}>{children}</div>
}
