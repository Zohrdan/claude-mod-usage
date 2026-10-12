// Pure formatting helpers: no `$`, so the tests can call them directly.

const FAMILY = /claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?/i

/** `claude-opus-5-5[1m]` → `Opus 5.5 · 1M`; anything unrecognised passes through. */
export function modelName(id: string | undefined): string | undefined {
  if (!id) return undefined
  const big = /\[1m\]/i.test(id) ? ' · 1M' : ''
  const m = FAMILY.exec(id)
  if (!m) return id.replace(/\[1m\]/i, '') + big
  const word = m[1] ?? ''
  const family = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  return `${family} ${m[2]}${m[3] ? '.' + m[3] : ''}${big}`
}

/** 184_000 → `184k`, 1_000_000 → `1M`. */
export function tokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

/** Milliseconds until a reset → `2h5m`, `6d15h`, `42m`, `now`. */
export function countdown(ms: number): string {
  if (ms <= 0) return 'now'
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d}d${h}h`
  if (h > 0) return `${h}h${m}m`
  return `${Math.max(m, 1)}m`
}

/** A bar of `width` cells with half-cell precision: [filled, half, empty]. */
export function bar(percent: number, width: number): [string, string, string] {
  const p = Math.max(0, Math.min(100, percent))
  const halves = Math.round((p / 100) * width * 2)
  const full = Math.floor(halves / 2)
  const half = halves % 2 === 1 ? '╸' : ''
  const empty = width - full - (half ? 1 : 0)
  return ['━'.repeat(full), half, '━'.repeat(empty)]
}

/** The meter's own hue until it runs hot: amber from 70%, rose from 90%. */
export function heat(percent: number, base: string): string {
  if (percent >= 90) return '#fb7185'
  if (percent >= 70) return '#fbbf24'
  return base
}

/** `five_hour` → `5h`, `seven_day` → `wk`, `spend_limit` → `spend`. */
export function limitLabel(kind: string): string {
  if (kind === 'five_hour') return '5h'
  if (kind === 'seven_day') return 'wk'
  if (kind === 'spend_limit') return 'spend'
  return kind.replace(/_/g, ' ')
}

export function usd(n: number): string {
  return n >= 100 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`
}
