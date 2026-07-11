interface SectionDividerProps {
  variant?: 'wave' | 'glow' | 'diagonal'
  flip?: boolean
  className?: string
}

export default function SectionDivider({ variant = 'wave', flip = false, className = '' }: SectionDividerProps) {
  const common = `w-full ${flip ? 'rotate-180' : ''} ${className}`

  if (variant === 'glow') {
    return (
      <div aria-hidden="true" className={`relative h-24 w-full overflow-hidden ${className}`}>
        <div className="absolute left-1/2 top-1/2 h-32 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-500/20 via-cyan-400/20 to-violet-500/20 blur-3xl" />
      </div>
    )
  }

  if (variant === 'diagonal') {
    return (
      <svg aria-hidden="true" viewBox="0 0 1440 80" className={common} preserveAspectRatio="none">
        <polygon points="0,80 1440,0 1440,80" fill="url(#dexo-diag)" />
        <defs>
          <linearGradient id="dexo-diag" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.12" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 1440 100" className={common} preserveAspectRatio="none">
      <path
        d="M0,40 C240,90 480,0 720,30 C960,60 1200,10 1440,50 L1440,100 L0,100 Z"
        fill="url(#dexo-wave)"
      />
      <defs>
        <linearGradient id="dexo-wave" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  )
}
