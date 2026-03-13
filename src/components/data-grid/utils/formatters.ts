import { format as dateFnsFormat } from 'date-fns'

export function formatNumber(
  value: number,
  fmt: 'currency' | 'percent' | 'decimal',
  locale = 'en-US',
  currency = 'USD'
): string {
  if (isNaN(value)) return ''

  switch (fmt) {
    case 'currency':
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
    case 'percent':
      return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1 }).format(value)
    case 'decimal':
      return new Intl.NumberFormat(locale, { style: 'decimal', minimumFractionDigits: 2 }).format(value)
    default:
      return String(value)
  }
}

export function formatDate(value: Date | string | number | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!value) return ''
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) return ''
    return dateFnsFormat(date, fmt)
  } catch {
    return ''
  }
}

export function formatCurrency(value: number, currency = 'USD', locale = 'en-US'): string {
  return formatNumber(value, 'currency', locale, currency)
}

export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}
