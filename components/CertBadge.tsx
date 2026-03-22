'use client'

interface CertBadgeProps {
  subject: string
  level: 'pro' | 'master'
  compact?: boolean
}

export default function CertBadge({ subject, level, compact = false }: CertBadgeProps) {
  const isPro = level === 'pro'
  const color = isPro ? '#8000FF' : '#10B981'
  const bg = isPro ? 'rgba(128,0,255,0.1)' : 'rgba(16,185,129,0.1)'
  const label = isPro ? 'PRO' : 'MASTER'

  if (compact) {
    return (
      <span
        style={{ backgroundColor: bg, color, borderColor: color }}
        className="inline-flex items-center gap-0.5 border rounded-full px-2 py-0.5 text-[10px] font-bold leading-none whitespace-nowrap"
      >
        {subject} {label}
      </span>
    )
  }

  return (
    <span
      style={{ backgroundColor: bg, color, borderColor: color }}
      className="inline-flex items-center gap-1 border rounded-full px-3 py-1 text-xs font-bold leading-none whitespace-nowrap"
    >
      {subject} {label}
    </span>
  )
}
