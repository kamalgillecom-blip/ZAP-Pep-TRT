// Exact match to Android Color.kt
export const CYAN_PRIMARY = '#C4EF95'
export const CYAN_LIGHT = '#DDFB6E'
export const CYAN_DARK = '#AADE2E'
export const SILVER = '#C0C0C0'
export const NEON_GREEN = '#00E676'
export const NEON_GREEN_DARK = '#00C853'
export const DARK_BG = '#0A0E14'
export const DARK_SURFACE = '#121820'
export const DARK_VARIANT = '#1A2230'
export const DARK_CARD_BORDER = 'rgba(255,255,255,0.12)'
export const TEXT_PRIMARY = '#E8EAED'
export const TEXT_SECONDARY = '#ADB5BD'
export const TEXT_TERTIARY = '#6C757D'
export const STATUS_GREEN = '#4CAF50'
export const STATUS_YELLOW = '#FFEB3B'
export const STATUS_RED = '#FF5252'
export const STATUS_ORANGE = '#FF9800'

export const CHART_COLORS = [
  '#C4EF95', // Lime (matches CyanPrimary)
  '#C0C0C0', // Silver
  '#FF6D00', // Orange
  '#00E676', // Green
  '#FF4081', // Pink
  '#FFD740', // Amber
  '#448AFF', // Blue
  '#E040FB', // Purple Pink
]

export function chartColor(index: number, compoundColor?: string): string {
  if (compoundColor) return compoundColor
  return CHART_COLORS[index % CHART_COLORS.length]
}

// Converts Android ARGB integer OR CSS hex string to a CSS hex string
export function toHexColor(color: any): string {
  if (typeof color === 'string' && color.startsWith('#')) return color
  if (typeof color === 'number') {
    // Android ARGB int (may be negative for colors with full alpha)
    const u = color >>> 0  // treat as unsigned 32-bit
    const r = (u >>> 16) & 0xFF
    const g = (u >>> 8) & 0xFF
    const b = u & 0xFF
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }
  return '#C4EF95'  // fallback
}

export function hexToRgba(hex: any, alpha: number): string {
  const h = toHexColor(hex)
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
