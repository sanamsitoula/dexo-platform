interface StatCounterProps {
  value: string
  label: string
}

/** Static stat display. Previously animated a count-up via requestAnimationFrame
 * + framer-motion useInView; removed for performance (instant render, no JS
 * animation cost). Splits a leading number from its suffix (e.g. "99.9%"). */
export default function StatCounter({ value, label }: StatCounterProps) {
  return (
    <div className="text-center">
      <div className="bg-gradient-to-r from-indigo-300 via-cyan-200 to-violet-300 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
        {value}
      </div>
      {label && <div className="mt-2 text-sm text-zinc-400">{label}</div>}
    </div>
  )
}
