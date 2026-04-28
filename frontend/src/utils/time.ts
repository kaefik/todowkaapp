export function normalizeTimeInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    if (parts.length !== 2) return ''
    const [hStr = '', mStr = ''] = parts
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (isNaN(h) || isNaN(m)) return ''
    if (h < 0 || h > 23 || m < 0 || m > 59) return ''
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.length <= 2) {
    const h = parseInt(digits, 10)
    if (h < 0 || h > 23) return ''
    return `${String(h).padStart(2, '0')}:00`
  }

  const h = parseInt(digits.slice(0, -2), 10)
  const m = parseInt(digits.slice(-2), 10)
  if (isNaN(h) || isNaN(m)) return ''
  if (h < 0 || h > 23 || m < 0 || m > 59) return ''
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
