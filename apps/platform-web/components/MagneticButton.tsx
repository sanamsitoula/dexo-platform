import Link from 'next/link'
import { type ReactNode } from 'react'

interface MagneticButtonProps {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
  external?: boolean
}

export default function MagneticButton({ href, children, variant = 'primary', className = '', external }: MagneticButtonProps) {
  const base =
    'relative inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400'
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_45px_rgba(34,211,238,0.55)]'
      : 'border border-white/20 bg-white/5 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/10'

  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </Link>
  )
}
