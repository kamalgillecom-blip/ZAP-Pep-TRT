import { useMemo, useState, useRef, useEffect, Component, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { PKCalculator } from '../lib/pkCalculator'
import { BUILTIN_COMPOUNDS } from '../data/compounds'
import { CHART_COLORS, CYAN_PRIMARY, NEON_GREEN, TEXT_TERTIARY, TEXT_PRIMARY, TEXT_SECONDARY, hexToRgba, toHexColor } from '../lib/theme'
import { format, subDays, startOfWeek, addWeeks, startOfDay } from 'date-fns'
import { useMockData } from '../lib/useMockData'

const C = CYAN_PRIMARY

const toMs = (val: any): number => {
  if (typeof val === 'number') return val
  if (val?.toMillis) return val.toMillis()
  if (val?.seconds) return val.seconds * 1000
  return new Date(val).getTime()
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e: any) { return { error: String(e?.message || e) } }
  render() {
    if (this.state.error) return (
      <div style={{ color: 'white', padding: 20, background: '#1a0a0a', borderRadius: 8 }}>
        <p style={{ color: '#FF5252', fontWeight: 'bold' }}>Dashboard Error:</p>
        <pre style={{ color: '#ccc', fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 8 }}>{this.state.error}</pre>
      </div>
    )
    return this.props.children
  }
}

// ── Canvas bar chart ──────────────────────────────────────────────────────────
function BarChartCanvas({ data, compoundNames, compoundColors, height = 160 }: {
  data: Record<string, any>[]
  compoundNames: string[]
  compoundColors: Record<string, string>
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height

    const PAD_L = 30, PAD_T = 14, PAD_B = 22, PAD_R = 4
    const chartW = W - PAD_L - PAD_R
    const chartH = H - PAD_T - PAD_B
    const chartBottom = PAD_T + chartH

    ctx.clearRect(0, 0, W, H)

    // Max is the single largest individual compound dose across all days (same as Android)
    const maxVal = Math.max(
      ...data.flatMap(d => compoundNames.map(n => Number(d[n]) || 0)),
      1
    )

    // Grid lines
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + chartH * (1 - i / 4)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke()
      const val = maxVal * i / 4
      ctx.fillStyle = '#6C757D'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(val > 0 ? (val >= 10 ? val.toFixed(0) : val.toFixed(1)) : '', PAD_L - 3, y + 3)
    }

    const barGroupW = chartW / data.length
    const barW = barGroupW * 0.38   // slim modern bars
    const cornerRad = Math.min(barW / 2, 6)

    // Helper: path with only top corners rounded
    const topRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx.closePath()
    }

    data.forEach((d, gi) => {
      const groupCenterX = PAD_L + gi * barGroupW + barGroupW / 2

      // Background track (full height, subtle)
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.beginPath()
      ctx.roundRect(groupCenterX - barW / 2, PAD_T, barW, chartH, cornerRad)
      ctx.fill()

      // Sort this day's compounds descending — LARGEST drawn first (behind)
      const dayCompounds = compoundNames
        .map((name, ci) => ({ name, ci, val: Number(d[name]) || 0 }))
        .filter(c => c.val > 0)
        .sort((a, b) => b.val - a.val)

      dayCompounds.forEach(({ name, ci, val }, compIndex) => {
        const color = compoundColors[name] || CHART_COLORS[ci % CHART_COLORS.length]
        const barH = Math.max((val / maxVal) * chartH, 4)
        const barTop = chartBottom - barH
        const xOffset = compIndex * barW * 0.04
        const x = groupCenterX - barW / 2 + xOffset
        const w = barW - xOffset
        const r = Math.min(cornerRad, barH / 2, w / 2)

        // Gradient fill: bright top → dimmer bottom
        const grad = ctx.createLinearGradient(0, barTop, 0, chartBottom)
        grad.addColorStop(0, hexToRgba(color, 0.95))
        grad.addColorStop(1, hexToRgba(color, 0.40))
        ctx.fillStyle = grad

        // Glow shadow before fill
        ctx.shadowColor = color
        ctx.shadowBlur = 10
        topRoundedRect(x, barTop, w, barH, r)
        ctx.fill()
        ctx.shadowBlur = 0

        // Glow outline stroke
        ctx.strokeStyle = hexToRgba(color, 0.55)
        ctx.lineWidth = 1
        topRoundedRect(x, barTop, w, barH, r)
        ctx.stroke()
      })

      // Day label
      ctx.fillStyle = '#ADB5BD'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(String(d.day || ''), groupCenterX, H - 4)
    })
  }, [data, compoundNames, compoundColors])

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
}

// ── Canvas area/line chart ────────────────────────────────────────────────────
function AreaChartCanvas({ data, color, height = 160, yLabel }: {
  data: { label: string; value: number }[]
  color: string
  height?: number
  yLabel?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height

    const PAD_L = 44, PAD_T = 8, PAD_B = 22, PAD_R = 4
    const chartW = W - PAD_L - PAD_R
    const chartH = H - PAD_T - PAD_B
    const chartBottom = PAD_T + chartH

    ctx.clearRect(0, 0, W, H)

    if (data.length < 2) {
      ctx.fillStyle = TEXT_TERTIARY; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Not enough data', W / 2, H / 2)
      return
    }

    const vals = data.map(d => d.value)
    const minV = Math.min(...vals), maxV = Math.max(...vals)
    const range = maxV - minV || 1
    const paddedMin = minV - range * 0.1, paddedMax = maxV + range * 0.1
    const paddedRange = paddedMax - paddedMin

    const toX = (i: number) => PAD_L + (i / (data.length - 1)) * chartW
    const toY = (v: number) => chartBottom - ((v - paddedMin) / paddedRange) * chartH

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + chartH * (1 - i / 4)
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke()
      const val = paddedMin + paddedRange * (i / 4)
      ctx.fillStyle = '#6C757D'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(1), PAD_L - 3, y + 3)
    }

    if (yLabel) {
      ctx.fillStyle = color; ctx.font = 'bold 8px Inter, sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(yLabel, 2, PAD_T + 4)
    }

    const coords = data.map((d, i) => [toX(i), toY(d.value)] as [number, number])

    const grad = ctx.createLinearGradient(0, PAD_T, 0, chartBottom)
    grad.addColorStop(0, hexToRgba(color, 0.5))
    grad.addColorStop(0.5, hexToRgba(color, 0.18))
    grad.addColorStop(1, hexToRgba(color, 0.02))

    const drawCurve = () => {
      ctx.moveTo(coords[0][0], coords[0][1])
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[Math.max(0, i - 1)], p1 = coords[i]
        const p2 = coords[i + 1], p3 = coords[Math.min(coords.length - 1, i + 2)]
        const t = 0.3
        ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t,
          p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1])
      }
    }

    ctx.beginPath(); ctx.moveTo(coords[0][0], chartBottom); ctx.lineTo(coords[0][0], coords[0][1])
    drawCurve()
    ctx.lineTo(coords[coords.length - 1][0], chartBottom); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()

    ctx.beginPath(); drawCurve()
    ctx.strokeStyle = hexToRgba(color, 0.3); ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()

    ctx.beginPath(); drawCurve()
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke()

    const last = coords[coords.length - 1]
    ctx.beginPath(); ctx.arc(last[0], last[1], 5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
    ctx.beginPath(); ctx.arc(last[0], last[1], 2, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()

    ctx.fillStyle = '#6C757D'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'
    ;[0, Math.floor(data.length / 2), data.length - 1].forEach(i => {
      ctx.fillText(data[i].label, toX(i), H - 4)
    })
  }, [data, color, yLabel])

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
    const toX = (i: number) => (i / (data.length - 1)) * W
    const toY = (v: number) => H - 4 - ((v - min) / range) * (H - 8)
    const coords = data.map((v, i) => [toX(i), toY(v)] as [number, number])
    ctx.clearRect(0, 0, W, H)
    ctx.beginPath(); ctx.moveTo(coords[0][0], coords[0][1])
    for (let i = 1; i < coords.length; i++) {
      const mid = [(coords[i - 1][0] + coords[i][0]) / 2, (coords[i - 1][1] + coords[i][1]) / 2]
      ctx.quadraticCurveTo(coords[i - 1][0], coords[i - 1][1], mid[0], mid[1])
    }
    ctx.lineTo(coords[coords.length - 1][0], coords[coords.length - 1][1])
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
  }, [data, color])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}

function RadialDial({ label, value, max, color, unit, id }: { label: string; value: number; max: number; color: string; unit?: string; id: string }) {
  const S = 96
  const STROKE = 8
  const R = (S - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const SWEEP = 0.72        // 72% of circle (~260°), gap at bottom-center
  const ROT = 144           // start angle (deg) — gap sits at bottom
  const pct = max > 0 ? Math.min(value / max, 1) : 0

  // Arc fills FROM the start: dynamic dasharray, no offset needed
  const trackLen = CIRC * SWEEP
  const fillLen  = trackLen * pct

  const gradId = `dial-grad-${id}`

  // Start and tip positions for gradient + glow dot
  const startAngle = ROT * (Math.PI / 180)
  const tipAngle   = (ROT + pct * SWEEP * 360) * (Math.PI / 180)
  const sx = S / 2 + R * Math.cos(startAngle)
  const sy = S / 2 + R * Math.sin(startAngle)
  const tx = S / 2 + R * Math.cos(tipAngle)
  const ty = S / 2 + R * Math.sin(tipAngle)

  return (
    <div className="glossy-card flex-1 flex flex-col items-center pt-2 pb-2 gap-0" style={{ minWidth: 0 }}>
      <div style={{ position: 'relative', width: S, height: S * 0.72, overflow: 'hidden' }}>
        <svg width={S} height={S} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1={sx} y1={sy} x2={tx} y2={ty} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Track ring */}
          <circle cx={S/2} cy={S/2} r={R} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE}
            strokeDasharray={`${trackLen} ${CIRC - trackLen}`}
            strokeLinecap="round"
            transform={`rotate(${ROT} ${S/2} ${S/2})`} />
          {/* Filled arc — grows from start as pct increases */}
          <circle cx={S/2} cy={S/2} r={R} fill="none"
            stroke={`url(#${gradId})`} strokeWidth={STROKE}
            strokeDasharray={`${fillLen} ${CIRC - fillLen}`}
            strokeLinecap="round"
            transform={`rotate(${ROT} ${S/2} ${S/2})`}
            style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}99)` }} />
          {/* Bright tip dot */}
          {pct > 0.03 && (
            <circle cx={tx} cy={ty} r={STROKE / 2 + 1.5} fill={color}
              style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
          )}
        </svg>
        {/* Center value — positioned in upper 72% of SVG */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: S, height: S * 0.72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p className="font-bold tabular-nums" style={{ color, fontSize: 20, lineHeight: 1 }}>{value}</p>
          {unit && <p className="text-text-tertiary" style={{ fontSize: 9, marginTop: 2 }}>{unit}</p>}
        </div>
      </div>
      <p className="text-text-tertiary font-medium text-center" style={{ fontSize: 10, marginTop: 4 }}>{label}</p>
    </div>
  )
}

// ── PK Mini Chart (dashboard embed) ──────────────────────────────────────────
function PKMiniChart() {
  const { doseLogs, vials } = useStore()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const POINT_COUNT = 200
  const TIME_DAYS = 14

  const vialColors = useMemo(() =>
    vials.reduce((acc, v) => {
      if (v.color != null && v.compoundName && !acc[v.compoundName])
        acc[v.compoundName] = toHexColor(v.color)
      return acc
    }, {} as Record<string, string>),
    [vials]
  )

  const { plotData, startMs, endMs } = useMemo(() => {
    const now = Date.now()
    const startMs = now - TIME_DAYS * 86400000
    const endMs   = now + TIME_DAYS * 0.25 * 86400000
    const points = doseLogs
      .filter(l => toMs(l.dateTime) >= startMs - TIME_DAYS * 86400000)
      .map(l => {
        const compound = BUILTIN_COMPOUNDS.find(c => c.name === l.compoundName)
        return { doseMg: l.doseMg || 0, halfLifeHours: compound?.halfLifeHours ?? 24, timeMillis: toMs(l.dateTime), compoundName: l.compoundName, compoundId: l.compoundId }
      })
    return { plotData: PKCalculator.generatePlotData(points, startMs, endMs, POINT_COUNT), startMs, endMs }
  }, [doseLogs])

  const compoundNames = Object.keys(plotData)

  const compoundUnits = useMemo(() =>
    doseLogs.reduce((acc, l) => {
      if (!acc[l.compoundName]) acc[l.compoundName] = l.doseDisplayUnit ?? 'mg'
      if (l.doseDisplayUnit === 'mcg') acc[l.compoundName] = 'mcg'
      return acc
    }, {} as Record<string, string>),
    [doseLogs]
  )

  const getColor = (name: string, i: number) => vialColors[name] || CHART_COLORS[i % CHART_COLORS.length]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    const PAD_L = 40, PAD_T = 14, PAD_B = 24, PAD_R = 6
    const chartW = W - PAD_L - PAD_R
    const chartH = H - PAD_T - PAD_B
    const chartBottom = PAD_T + chartH

    ctx.clearRect(0, 0, W, H)

    const allPts = Object.values(plotData).flat()
    if (allPts.length === 0) {
      ctx.fillStyle = TEXT_TERTIARY; ctx.font = '12px Inter, sans-serif'
      ctx.textAlign = 'center'; ctx.fillText('No dose data', W / 2, H / 2)
      return
    }

    const maxMg = Math.max(...allPts.map(p => p.levelMg), 0.0001)
    const usesMcg = maxMg < 1.0
    const scale = usesMcg ? 1000 : 1
    const timeRange = endMs - startMs

    // Grid
    ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + chartH * (1 - i / 4)
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke()
      const val = maxMg * scale * i / 4
      ctx.fillStyle = '#6C757D'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2), PAD_L - 3, y + 3)
    }

    // Y unit
    ctx.fillStyle = C; ctx.font = 'bold 8px Inter, sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(usesMcg ? 'mcg' : 'mg', 2, PAD_T + 4)

    // X labels
    ctx.fillStyle = '#6C757D'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'
    for (let i = 0; i <= 3; i++) {
      const t = startMs + timeRange * (i / 3)
      ctx.fillText(format(new Date(t), 'MMM d'), PAD_L + chartW * (i / 3), H - 4)
    }

    // Now line
    const now = Date.now()
    const nowX = PAD_L + ((now - startMs) / timeRange) * chartW
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(108,117,125,0.45)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(nowX, PAD_T); ctx.lineTo(nowX, chartBottom); ctx.stroke()
    ctx.setLineDash([]); ctx.fillStyle = '#6C757D'; ctx.font = '8px Inter, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Now', nowX, PAD_T - 2)

    // Draw compounds
    Object.entries(plotData).forEach(([name, points], idx) => {
      if (points.length < 2) return
      const color = getColor(name, idx)
      const coords = points.map(p => [
        PAD_L + ((p.timeMillis - startMs) / timeRange) * chartW,
        Math.max(PAD_T, chartBottom - (p.levelMg / maxMg) * chartH)
      ] as [number, number])

      const drawSpline = () => {
        ctx.moveTo(coords[0][0], coords[0][1])
        for (let i = 0; i < coords.length - 1; i++) {
          const p0 = coords[Math.max(0, i - 1)], p1 = coords[i]
          const p2 = coords[i + 1], p3 = coords[Math.min(coords.length - 1, i + 2)]
          const t = 0.3
          ctx.bezierCurveTo(p1[0]+(p2[0]-p0[0])*t, p1[1]+(p2[1]-p0[1])*t, p2[0]-(p3[0]-p1[0])*t, p2[1]-(p3[1]-p1[1])*t, p2[0], p2[1])
        }
      }

      // Fill
      const peakY = Math.min(...coords.map(c => c[1]))
      const fillGrad = ctx.createLinearGradient(0, peakY, 0, chartBottom)
      fillGrad.addColorStop(0, hexToRgba(color, 0.5))
      fillGrad.addColorStop(0.6, hexToRgba(color, 0.15))
      fillGrad.addColorStop(1, hexToRgba(color, 0.02))
      ctx.fillStyle = fillGrad
      ctx.beginPath(); ctx.moveTo(coords[0][0], chartBottom); ctx.lineTo(coords[0][0], coords[0][1])
      drawSpline(); ctx.lineTo(coords[coords.length-1][0], chartBottom); ctx.closePath(); ctx.fill()

      // Glow line
      ctx.beginPath(); drawSpline()
      ctx.strokeStyle = hexToRgba(color, 0.28); ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()

      // Main line
      ctx.beginPath(); ctx.moveTo(coords[0][0], coords[0][1]); drawSpline()
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()

      // End dot
      const last = coords[coords.length - 1]
      if (last[1] < chartBottom - 2) {
        ctx.beginPath(); ctx.arc(last[0], last[1], 4, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill()
        ctx.beginPath(); ctx.arc(last[0], last[1], 1.5, 0, Math.PI*2); ctx.fillStyle = 'white'; ctx.fill()
      }
    })
  }, [plotData, startMs, endMs])

  const now = Date.now()

  return (
    <div className="glossy-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-primary font-semibold text-sm">Pharmacokinetics</p>
          <p className="text-text-tertiary text-xs">serum levels · last {TIME_DAYS} days</p>
        </div>
        <button onClick={() => navigate('/plotter')}
          className="text-xs font-medium px-3 py-1 rounded-lg"
          style={{ color: C, background: 'rgba(205,250,65,0.08)' }}>
          Full View →
        </button>
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: 200, display: 'block' }} />
      {compoundNames.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-dark-border">
          {compoundNames.map((name, i) => {
            const color = getColor(name, i)
            const unit = compoundUnits[name] ?? 'mg'
            const pts = plotData[name]
            const closest = pts.reduce((b, p) => Math.abs(p.timeMillis - now) < Math.abs(b.timeMillis - now) ? p : b, pts[0])
            const lvl = (unit === 'mcg' ? closest.levelMg * 1000 : closest.levelMg)
            const lvlStr = lvl >= 100 ? lvl.toFixed(0) : lvl >= 10 ? lvl.toFixed(1) : lvl >= 1 ? lvl.toFixed(2) : lvl.toFixed(3)
            return (
              <div key={name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-text-primary text-xs flex-1">{name}</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color }}>≈{lvlStr} {unit}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Log Dose', path: '/add-dose', svg: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg> },
  { label: 'Plotter', path: '/plotter', svg: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { label: 'Vials', path: '/vials', svg: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6m-6 0v2l-5 7h16L14 5V3m-5 0h6"/><path d="M6 12v7a2 2 0 002 2h8a2 2 0 002-2v-7"/></svg> },
  { label: 'Body Comp', path: '/body-comp', svg: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
  { label: 'Blood Work', path: '/bloodwork', svg: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L8 8H4l4 4-2 6 6-3 6 3-2-6 4-4h-4z"/></svg> },
  { label: 'Compounds', path: '/compounds', svg: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
]

function DashboardInner() {
  const { doseLogs, bodyComps, vials, user } = useStore()
  const navigate = useNavigate()
  const [activeCharts, setActiveCharts] = useState<Set<string>>(new Set(['Weekly Doses']))
  const [weekOffset, setWeekOffset] = useState(0)
  const [doseFilter, setDoseFilter] = useState('All')
  const [selectedCompound, setSelectedCompound] = useState<string | null>(null)
  const [showCompoundPicker, setShowCompoundPicker] = useState(false)
  const [hiddenCompounds, setHiddenCompounds] = useState<Set<string>>(new Set())
  const [showMockWarn, setShowMockWarn] = useState(false)
  const [activeAttr, setActiveAttr] = useState('energyLevel')

  const { hasMockData, deleting, seedMockData, deleteMockData } = useMockData(user?.uid)

  // Seed demo data for brand-new users (no real dose logs yet)
  useEffect(() => {
    if (!user?.uid || hasMockData) return
    const flag = localStorage.getItem(`zap_has_mock_data_${user.uid}`)
    if (flag === 'false') return // user deliberately cleared it
    // Only seed if Firestore hasn't loaded real data yet (checked after brief delay)
    const t = setTimeout(() => {
      if (doseLogs.length === 0 && bodyComps.length === 0 && vials.length === 0) {
        seedMockData()
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [user?.uid])

  const handleLogDose = () => {
    if (hasMockData && !localStorage.getItem(`zap_mock_warned_${user?.uid}`)) {
      setShowMockWarn(true)
    } else {
      navigate('/add-dose')
    }
  }

  const vialColors = useMemo(() =>
    vials.reduce((acc, v) => {
      if (v.color != null && v.compoundName && !acc[v.compoundName])
        acc[v.compoundName] = toHexColor(v.color)
      return acc
    }, {} as Record<string, string>),
    [vials]
  )

  const activeCompounds = useMemo(() => {
    const now = Date.now()
    const monthAgo = now - 30 * 86400000
    const recent = doseLogs.filter(l => toMs(l.dateTime) >= monthAgo)
    const dosePoints = recent.map(l => {
      const compound = BUILTIN_COMPOUNDS.find(c => c.name === l.compoundName)
      return { doseMg: l.doseMg || 0, halfLifeHours: compound?.halfLifeHours ?? 24, timeMillis: toMs(l.dateTime), compoundName: l.compoundName }
    })
    const levels = PKCalculator.levelsByCompound(dosePoints, now)
    return Object.entries(levels)
      .filter(([, lvl]) => lvl > 0.0001)
      .map(([name, lvl]) => {
        const log = recent.find(l => l.compoundName === name)
        const unit = log?.doseDisplayUnit ?? 'mg'
        const display = unit === 'mcg' ? lvl * 1000 : lvl
        return { name, display, unit, color: vialColors[name] }
      })
      .sort((a, b) => b.display - a.display)
  }, [doseLogs, vials, vialColors])

  const allCompoundNames = useMemo(() => {
    const names = new Set<string>()
    doseLogs.forEach(l => names.add(l.compoundName))
    return Array.from(names).sort()
  }, [doseLogs])

  const { weeklyData, compoundNames, visibleCompoundColors } = useMemo(() => {
    const baseMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekStart = addWeeks(baseMonday, weekOffset).getTime()
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    const rows = DAY_LABELS.map((day, i) => {
      const dayStart = weekStart + i * 86400000
      const dayEnd = dayStart + 86400000
      const dayDoses = doseLogs.filter(l => toMs(l.dateTime) >= dayStart && toMs(l.dateTime) < dayEnd)
      const byCompound = dayDoses.reduce((acc, l) => {
        if (doseFilter !== 'All') {
          const cmp = BUILTIN_COMPOUNDS.find(c => c.name === l.compoundName)
          if (doseFilter === 'TRT' && cmp?.category !== 'TRT') return acc
          if (doseFilter === 'Peptides' && cmp?.category !== 'PEPTIDE') return acc
        }
        if (selectedCompound && l.compoundName !== selectedCompound) return acc
        if (!acc[l.compoundName]) acc[l.compoundName] = 0
        acc[l.compoundName] += (l.doseMg || 0)
        return acc
      }, {} as Record<string, number>)
      return { day, ...byCompound }
    })

    const names = Array.from(new Set(rows.flatMap(d => Object.keys(d).filter(k => k !== 'day'))))
    const colorMap: Record<string, string> = {}
    names.forEach((name, i) => {
      colorMap[name] = vialColors[name] || CHART_COLORS[i % CHART_COLORS.length]
    })

    return { weeklyData: rows, compoundNames: names, visibleCompoundColors: colorMap }
  }, [doseLogs, weekOffset, doseFilter, selectedCompound, vialColors])

  const visibleCompoundNames = compoundNames.filter(n => !hiddenCompounds.has(n))

  const toggleCompound = (name: string) => {
    setHiddenCompounds(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const weightData = useMemo(() =>
    [...bodyComps].slice(0, 30).reverse()
      .filter(b => b.date != null)
      .map(b => ({
        label: format(new Date(toMs(b.date)), 'MMM d'),
        value: b.weightLbs,
      })),
    [bodyComps]
  )

  const weekLabel = useMemo(() => {
    const monday = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset)
    const sunday = addWeeks(monday, 1)
    return `${format(monday, 'MMM d')} – ${format(subDays(sunday, 1), 'MMM d')}`
  }, [weekOffset])

  const todayDoses = doseLogs.filter(l => toMs(l.dateTime) >= startOfDay(new Date()).getTime()).length
  const latestWeight = bodyComps[0]?.weightLbs
  const activeVials = vials.filter(v => v.isActive).length

  const ATTR_OPTIONS = [
    { key: 'energyLevel',          label: 'Energy',      color: '#FFD740' },
    { key: 'sleepQuality',         label: 'Sleep',       color: '#7C4DFF' },
    { key: 'libidoQuality',        label: 'Libido',      color: '#FF4081' },
    { key: 'morningWood',          label: 'Morning Wood',color: '#00E5FF' },
    { key: 'erectionQuality',      label: 'Erections',   color: '#69F0AE' },
    { key: 'irritationAggression', label: 'Irritation',  color: '#FF6D00' },
  ]

  const attrChartData = useMemo(() => {
    const key = activeAttr
    const logsWithVal = [...doseLogs]
      .filter(l => {
        const v = (l as any)[key]
        return typeof v === 'number' && v > 0
      })
      .sort((a, b) => toMs(a.dateTime) - toMs(b.dateTime))

    // Group by calendar day, average values
    const byDay: Record<string, { sum: number; count: number }> = {}
    logsWithVal.forEach(l => {
      const day = format(new Date(toMs(l.dateTime)), 'MMM d')
      if (!byDay[day]) byDay[day] = { sum: 0, count: 0 }
      byDay[day].sum += (l as any)[key]
      byDay[day].count++
    })

    return Object.entries(byDay).map(([label, { sum, count }]) => ({
      label,
      value: Math.round((sum / count) * 10) / 10,
    }))
  }, [doseLogs, activeAttr])

  const CHART_TABS = ['Weekly Doses', 'Weight Trend', 'Attribute Trends']

  const toggleChart = (tab: string) => {
    setActiveCharts(prev => {
      const next = new Set(prev)
      if (next.has(tab)) { if (next.size > 1) next.delete(tab) } else next.add(tab)
      return next
    })
  }

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: C }}>ZAP</span>
            <span className="text-white"> PEP/TRT Tracker</span>
          </h1>
          <p className="text-text-secondary text-sm">Your protocol at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {hasMockData && (
            <button
              onClick={() => deleteMockData()}
              disabled={deleting}
              className="text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
              style={{ background: 'rgba(255,59,48,0.12)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.25)' }}>
              {deleting ? '…' : 'Clear Demo'}
            </button>
          )}
          <button onClick={handleLogDose}
            className="text-dark-bg text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: C }}>
            + Log Dose
          </button>
        </div>
      </div>

      {/* Mock data warning modal */}
      {showMockWarn && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glossy-card max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,200,0,0.15)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFC800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-semibold text-sm">You're viewing demo data</p>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                  Start logging your real data. Tap <span style={{ color: '#FF3B30' }}>Clear Demo</span> at any time to remove sample entries.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  deleteMockData()
                  localStorage.setItem(`zap_mock_warned_${user?.uid}`, '1')
                  setShowMockWarn(false)
                  navigate('/add-dose')
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,59,48,0.12)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.25)' }}>
                Clear Demo &amp; Log
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(`zap_mock_warned_${user?.uid}`, '1')
                  setShowMockWarn(false)
                  navigate('/add-dose')
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: C, color: '#0A0E14' }}>
                Log Real Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <RadialDial id="doses" label="Today's Doses" value={todayDoses} max={Math.max(todayDoses, 5)} color={C} />
        <RadialDial id="weight" label="Weight" value={latestWeight ? parseFloat(latestWeight.toFixed(1)) : 0} max={400} color={NEON_GREEN} unit="lbs" />
        <RadialDial id="vials" label="Active Vials" value={activeVials} max={20} color="#C0C0C0" />
      </div>

      <div className="glossy-card">
        <div className="flex gap-1 mb-3">
          {CHART_TABS.map((tab) => {
            const active = activeCharts.has(tab)
            return (
              <button key={tab} onClick={() => toggleChart(tab)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors relative"
                style={{ background: active ? C : 'rgba(255,255,255,0.05)', color: active ? '#0A0E14' : TEXT_SECONDARY }}>
                {tab}
                {active && activeCharts.size > 1 && (
                  <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 8, color: '#0A0E14', opacity: 0.6 }}>✓</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="space-y-5">
          {activeCharts.has('Weekly Doses') && (
            <div>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <div className="flex gap-1 flex-wrap">
                  {['All', 'TRT', 'Peptides'].map(f => (
                    <button key={f} onClick={() => { setDoseFilter(f); setSelectedCompound(null) }}
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: doseFilter === f && !selectedCompound ? C : 'rgba(255,255,255,0.06)',
                        color: doseFilter === f && !selectedCompound ? '#0A0E14' : TEXT_SECONDARY,
                      }}>
                      {f}
                    </button>
                  ))}
                  <div className="relative">
                    <button onClick={() => setShowCompoundPicker(!showCompoundPicker)}
                      className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                      style={{
                        background: selectedCompound ? C : 'rgba(255,255,255,0.06)',
                        color: selectedCompound ? '#0A0E14' : TEXT_SECONDARY,
                      }}>
                      {selectedCompound ? selectedCompound.split(' ').slice(0, 2).join(' ') : 'Compound'}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {showCompoundPicker && (
                      <div className="absolute left-0 top-full mt-1 z-30 bg-dark-surface border border-dark-border rounded-xl shadow-xl min-w-48 max-h-52 overflow-y-auto">
                        <button onClick={() => { setSelectedCompound(null); setDoseFilter('All'); setShowCompoundPicker(false) }}
                          className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-dark-variant">
                          All Compounds
                        </button>
                        {allCompoundNames.map(name => (
                          <button key={name} onClick={() => { setSelectedCompound(name); setDoseFilter('All'); setShowCompoundPicker(false) }}
                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2"
                            style={{ color: selectedCompound === name ? C : TEXT_PRIMARY }}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: vialColors[name] || C }} />
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => setWeekOffset(w => w - 1)} style={{ color: C }} className="p-1">‹</button>
                  <span className="text-text-tertiary text-xs">{weekOffset === 0 ? 'This Week' : weekLabel}</span>
                  <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset === 0}
                    style={{ color: weekOffset < 0 ? C : TEXT_TERTIARY }} className="p-1">›</button>
                </div>
              </div>

              {visibleCompoundNames.length === 0 ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-text-tertiary text-sm">{compoundNames.length === 0 ? 'No doses this week' : 'All compounds hidden'}</p>
                </div>
              ) : (
                <BarChartCanvas data={weeklyData} compoundNames={visibleCompoundNames} compoundColors={visibleCompoundColors} height={160} />
              )}

              {compoundNames.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-2 mt-3">
                  {compoundNames.map((name) => {
                    const color = visibleCompoundColors[name]
                    const hidden = hiddenCompounds.has(name)
                    return (
                      <button key={name} onClick={() => toggleCompound(name)}
                        className="flex items-center gap-1.5 transition-opacity"
                        style={{ opacity: hidden ? 0.4 : 1 }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: hidden ? 'transparent' : color, border: `1.5px solid ${color}` }}>
                          {!hidden && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-text-tertiary text-xs">{name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeCharts.has('Weight Trend') && (
            <div>
              {activeCharts.size > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <p className="text-text-tertiary text-xs font-medium px-1">Weight Trend</p>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>
              )}
              <p className="text-text-secondary text-xs font-medium mb-2">Weight (lbs)</p>
              <AreaChartCanvas data={weightData} color={NEON_GREEN} height={160} yLabel="lbs" />
            </div>
          )}

          {activeCharts.has('Attribute Trends') && (
            <div>
              {activeCharts.size > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <p className="text-text-tertiary text-xs font-medium px-1">Attribute Trends</p>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>
              )}
              {/* Attribute selector */}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {ATTR_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => setActiveAttr(opt.key)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: activeAttr === opt.key ? opt.color + '33' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${activeAttr === opt.key ? opt.color : 'rgba(255,255,255,0.1)'}`,
                      color: activeAttr === opt.key ? opt.color : TEXT_SECONDARY,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {attrChartData.length >= 2 ? (
                <AreaChartCanvas
                  data={attrChartData}
                  color={ATTR_OPTIONS.find(o => o.key === activeAttr)?.color ?? C}
                  height={160}
                  yLabel="/ 5"
                />
              ) : (
                <div className="h-36 flex items-center justify-center">
                  <p className="text-text-tertiary text-sm text-center">
                    {attrChartData.length === 0
                      ? 'Log post-dose attributes to see trends'
                      : 'Need 2+ days of data'}
                  </p>
                </div>
              )}
              {/* Scale reminder */}
              {attrChartData.length >= 2 && (
                <p className="text-text-tertiary text-xs mt-1 text-right">
                  Scale: 1 – 5 · {ATTR_OPTIONS.find(o => o.key === activeAttr)?.label}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <PKMiniChart />

      <div className="glossy-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full" style={{ background: C }} />
          <div>
            <p className="text-text-primary font-semibold text-sm">Active Compounds</p>
            <p className="text-text-tertiary text-xs">current in body circulation</p>
          </div>
        </div>
        {activeCompounds.length === 0 ? (
          <p className="text-text-tertiary text-sm">No active compounds. Log a dose to get started.</p>
        ) : (
          <div className="space-y-2">
            {activeCompounds.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: c.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-text-primary text-sm">{c.name}</span>
                </div>
                <span className="font-semibold text-sm" style={{ color: C }}>
                  ≈{c.display >= 100 ? c.display.toFixed(0) : c.display >= 1 ? c.display.toFixed(1) : c.display.toFixed(2)} {c.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="glossy-card flex-1">
          <p className="text-text-tertiary text-xs mb-1">This Week</p>
          <div className="flex gap-4">
            <div>
              <p className="font-bold text-xl" style={{ color: C }}>{todayDoses}</p>
              <p className="text-text-tertiary text-xs">Today</p>
            </div>
            <div>
              <p className="font-bold text-xl" style={{ color: '#C0C0C0' }}>{activeCompounds.length}</p>
              <p className="text-text-tertiary text-xs">Active</p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/schedules')}
          className="glossy-card flex flex-col items-center justify-center gap-1 px-4 active:scale-95 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-text-primary text-xs">Schedule</span>
        </button>
        <button onClick={() => navigate('/bloodwork')}
          className="glossy-card flex flex-col items-center justify-center gap-1 px-4 active:scale-95 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L8 8H4l4 4-2 6 6-3 6 3-2-6 4-4h-4z"/>
          </svg>
          <span className="text-text-primary text-xs">Labs</span>
        </button>
      </div>

      {latestWeight && (
        <button onClick={() => navigate('/body-comp')} className="glossy-card w-full text-left active:scale-[0.99] transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <p className="text-text-primary font-semibold text-sm">Body Composition</p>
              </div>
              <div className="flex gap-5">
                <div>
                  <p className="font-bold text-lg" style={{ color: NEON_GREEN }}>{latestWeight.toFixed(1)}</p>
                  <p className="text-text-tertiary text-xs">lbs</p>
                </div>
                {bodyComps[0]?.bodyFatPercent && (
                  <div>
                    <p className="font-bold text-lg" style={{ color: NEON_GREEN }}>{bodyComps[0].bodyFatPercent.toFixed(1)}%</p>
                    <p className="text-text-tertiary text-xs">body fat</p>
                  </div>
                )}
              </div>
            </div>
            {weightData.length >= 2 && (
              <div className="w-28 h-14">
                <Sparkline data={weightData.map(d => d.value)} color={NEON_GREEN} />
              </div>
            )}
          </div>
        </button>
      )}

      <div className="glossy-card">
        <p className="text-text-primary font-semibold text-sm mb-3">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(a => (
            <button key={a.path} onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 py-3 rounded-xl text-xs active:scale-95 transition-transform"
              style={{ background: 'rgba(205,250,65,0.06)', border: '1px solid rgba(205,250,65,0.15)', color: TEXT_PRIMARY }}>
              {a.svg(C)}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {doseLogs.length > 0 && (
        <div className="glossy-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-primary font-semibold text-sm">Recent Doses</p>
            <button onClick={() => navigate('/dose-log')} className="text-xs" style={{ color: C }}>View all</button>
          </div>
          <div className="space-y-2">
            {doseLogs.slice(0, 5).map((log, i) => {
              const color = vialColors[log.compoundName] || CHART_COLORS[i % CHART_COLORS.length]
              return (
                <div key={log.id} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <div>
                      <p className="text-text-primary text-sm">{log.compoundName}</p>
                      <p className="text-text-tertiary text-xs">{log.doseDisplayValue} {log.doseDisplayUnit}</p>
                    </div>
                  </div>
                  <p className="text-text-tertiary text-xs">{format(new Date(toMs(log.dateTime)), 'MMM d, h:mm a')}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardInner />
    </ErrorBoundary>
  )
}
