const pad = (n: number): string => String(n).padStart(2, '0')

/** "snip-2026-10-10-083112" in local time. */
export function snipBaseName(d: Date): string {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `snip-${date}-${time}`
}

/**
 * A PNG filename for a snip taken at `d`, with -2, -3 … appended when
 * another snip landed in the same second.
 */
export function uniqueSnipName(d: Date, isTaken: (name: string) => boolean): string {
  const base = snipBaseName(d)
  let name = `${base}.png`
  for (let i = 2; isTaken(name); i++) name = `${base}-${i}.png`
  return name
}
