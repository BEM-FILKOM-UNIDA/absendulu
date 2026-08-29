function LoadingBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--surface-muted)] ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-label="Memuat halaman" role="status">
      <div className="space-y-4 border-b border-[var(--border)] pb-8">
        <LoadingBlock className="h-3 w-40" />
        <LoadingBlock className="h-20 w-72" />
        <LoadingBlock className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <LoadingBlock key={index} className="h-36" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <LoadingBlock className="h-72" />
        <LoadingBlock className="h-72" />
      </div>
    </div>
  )
}
