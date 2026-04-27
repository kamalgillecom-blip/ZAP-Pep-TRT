import { useMemo, useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { PKCalculator } from '../lib/pkCalculator'
import { BUILTIN_COMPOUNDS } from '../data/compounds'
import { CHART_COLORS, CYAN_PRIMARY, TEXT_TERTIARY, TEXT_PRIMARY, TEXT_SECONDARY, hexToRgba } from '../lib/theme'
import { format } from 'date-fns'

const POINT_COUNT = 300

function formatLevel(val: number): string {
  if (val >= 100) return val.toFixed(0)
  if (val >= 10) return val.toFixed(1)
  if (val >= 1) return val.toFixed(2)
  return val.toFixed(3)
}

export default function Plotter() {
  const { doseLogs, vials } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [timeRange, setTimeRange] = useState(14)
  const [periodOffset, setPeriodOffset] = useState(0)
  const [enabledCompounds, setEnabledCompounds] = useState<Set<string>>(new Set())

  // Build vial color map keyed by compoundName (reliable across Android/web)
  const vialColors = useMemo(() =>
    vials.reduce((acc, v) => { if (v.color && v.compoundName && !acc[v.compoundName]) acc[v.compoundName] = v.color; return acc }, {} as Record<string, string>),
    [vials]
  )

  // Build dose points with half-life from compound library
  const allDosePoints = useMemo(() => {
    const now = Date.now()
    const lookback = (timeRange * 2 + Math.abs(periodOffset) * timeRange) * 86400000
    return doseLogs
      .filter(l => l.dateTime >= now - lookback)
      .map(l => {
        const compound = BUILTIN_COMPOUNDS.find(c => c.name === l.compoundName)
        return {
          doseMg: l.doseMg,
          halfLifeHours: compound?.halfLifeHours ?? 24,
          timeMillis: l.dateTime,
          compoundName: l.compoundName,
          compoundId: l.compoundId,
        }
      })
  }, [doseLogs, timeRange, periodOffset])

  // Time window
  const { startMs, endMs, periodLabel } = useMemo(() => {
    const now = Date.now()
    const shift = periodOffset * timeRange * 86400000
    const startMs = now - timeRange * 86400000 + shift
    const endMs = periodOffset === 0 ? now + timeRange * 0.3 * 86400000 : now + shift
    const periodLabel = `${format(new Date(startMs), 'MMM d')} – ${format(new Date(endMs), 'MMM d')}`
    return { startMs, endMs, periodLabel }
  }, [timeRange, periodOffset])

  // Generate plot data
  const plotData = useMemo(() =>
    PKCalculator.generatePlotData(allDosePoints, startMs, endMs, POINT_COUNT),
    [allDosePoints, startMs, endMs]
  )

  const compoundNames = Object.keys(plotData)

  // Init enabled compounds
  useEffect(() => {
    if (compoundNames.length > 0 && enabledCompounds.size === 0) {
      setEnabledCompounds(new Set(compoundNames))
    }
  }, [compoundNames.length])

  const enabledData = Object.fromEntries(
    Object.entries(plotData).filter(([name]) => enabledCompounds.has(name))
  )

  // Compound display units
  const compoundUnits = useMemo(() => {
    return doseLogs.reduce((acc, l) => {
      if (!acc[l.compoundName]) acc[l.compoundName] = l.doseDisplayUnit
      if (l.doseDisplayUnit === 'mcg') acc[l.compoundName] = 'mcg'
      return acc
    }, {} as Record<string, string>)
  }, [doseLogs])

  // Color per compound — vial color takes priority, fallback to chart palette
  const compoundColor = (name: string, index: number) => {
    if (vialColors[name]) return vialColors[name]
    return CHART_COLORS[index % CHART_COLORS.length]
  }

  // Canvas drawing — smooth bezier curve with gradient fill
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
    const W = rect.width
    const H = rect.height

    const PAD_L = 44, PAD_T = 16, PAD_B = 28, PAD_R = 8
    const chartW = W - PAD_L - PAD_R
    const chartH = H - PAD_T - PAD_B
    const chartBottom = PAD_T + chartH

    ctx.clearRect(0, 0, W, H)

    const allPoints = Object.values(enabledData).flat()
    if (allPoints.length === 0) {
      ctx.fillStyle = TEXT_TERTIARY
      ctx.font = '12px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No dose data to plot', W / 2, H / 2)
      return
    }

    const maxLevelMg = Math.max(...allPoints.map(p => p.levelMg), 0.0001)
    const usesMcg = maxLevelMg < 1.0
    const displayScale = usesMcg ? 1000 : 1
    const yUnit = usesMcg ? 'mcg' : 'mg'
    const maxDisplay = maxLevelMg * displayScale

    const globalTimeRange = Math.max(endMs - startMs, 1)

    // Grid lines & Y labels
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + chartH * (1 - i / 4)
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + chartW, y); ctx.stroke()
      const val = (maxDisplay * i / 4)
      ctx.fillStyle = TEXT_TERTIARY
      ctx.font = '9px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2), PAD_L - 3, y + 3)
    }

    // Y unit label
    ctx.fillStyle = CYAN_PRIMARY
    ctx.font = 'bold 8px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(yUnit, 2, PAD_T + 4)

    // X axis date labels
    ctx.fillStyle = TEXT_TERTIARY
    ctx.font = '9px Inter, sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4
      const t = startMs + globalTimeRange * frac
      const x = PAD_L + frac * chartW
      ctx.fillText(format(new Date(t), 'MM/dd'), x, chartBottom + 16)
    }

    // "Now" line
    const now = Date.now()
    if (now >= startMs && now <= endMs) {
      const nowX = PAD_L + ((now - startMs) / globalTimeRange) * chartW
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = 'rgba(108,117,125,0.5)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(nowX, PAD_T); ctx.lineTo(nowX, chartBottom); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = TEXT_TERTIARY
      ctx.font = '8px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Now', nowX, PAD_T - 2)
    }

    // Draw each compound
    Object.entries(enabledData).forEach(([name, points], index) => {
      if (points.length < 2) return
      const color = compoundColor(name, index)

      const coords = points.map(p => {
        const x = PAD_L + ((p.timeMillis - startMs) / globalTimeRange) * chartW
        const y = Math.max(PAD_T, Math.min(chartBottom, chartBottom - (p.levelMg / maxLevelMg) * chartH))
        return [x, y] as [number, number]
      })

      const peakY = Math.min(...coords.map(c => c[1]))

      // Gradient fill
      const fillGrad = ctx.createLinearGradient(0, peakY, 0, chartBottom)
      fillGrad.addColorStop(0, hexToRgba(color, 0.55))
      fillGrad.addColorStop(0.5, hexToRgba(color, 0.25))
      fillGrad.addColorStop(1, hexToRgba(color, 0.02))
      ctx.fillStyle = fillGrad
      ctx.beginPath()
      ctx.moveTo(coords[0][0], chartBottom)
      ctx.lineTo(coords[0][0], coords[0][1])
      // Catmull-Rom spline
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[Math.max(0, i - 1)]
        const p1 = coords[i]
        const p2 = coords[i + 1]
        const p3 = coords[Math.min(coords.length - 1, i + 2)]
        const tension = 0.3
        const cp1x = p1[0] + (p2[0] - p0[0]) * tension
        const cp1y = p1[1] + (p2[1] - p0[1]) * tension
        const cp2x = p2[0] - (p3[0] - p1[0]) * tension
        const cp2y = p2[1] - (p3[1] - p1[1]) * tension
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
      }
      ctx.lineTo(coords[coords.length - 1][0], chartBottom)
      ctx.closePath()
      ctx.fill()

      // Glow line
      ctx.beginPath()
      ctx.moveTo(coords[0][0], coords[0][1])
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[Math.max(0, i - 1)]
        const p1 = coords[i]
        const p2 = coords[i + 1]
        const p3 = coords[Math.min(coords.length - 1, i + 2)]
        const tension = 0.3
        ctx.bezierCurveTo(
          p1[0] + (p2[0] - p0[0]) * tension, p1[1] + (p2[1] - p0[1]) * tension,
          p2[0] - (p3[0] - p1[0]) * tension, p2[1] - (p3[1] - p1[1]) * tension,
          p2[0], p2[1]
        )
      }
      ctx.strokeStyle = hexToRgba(color, 0.3)
      ctx.lineWidth = 6
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()

      // Main line
      ctx.beginPath()
      ctx.moveTo(coords[0][0], coords[0][1])
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[Math.max(0, i - 1)]
        const p1 = coords[i]
        const p2 = coords[i + 1]
        const p3 = coords[Math.min(coords.length - 1, i + 2)]
        const tension = 0.3
        ctx.bezierCurveTo(
          p1[0] + (p2[0] - p0[0]) * tension, p1[1] + (p2[1] - p0[1]) * tension,
          p2[0] - (p3[0] - p1[0]) * tension, p2[1] - (p3[1] - p1[1]) * tension,
          p2[0], p2[1]
        )
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.stroke()

      // End dot
      const last = coords[coords.length - 1]
      if (last[1] < chartBottom - 2) {
        ctx.beginPath()
        ctx.arc(last[0], last[1], 5, 0, Math.PI * 2)
        ctx.fillStyle = color; ctx.fill()
        ctx.beginPath()
        ctx.arc(last[0], last[1], 2, 0, Math.PI * 2)
        ctx.fillStyle = 'white'; ctx.fill()
      }
    })
  }, [enabledData, startMs, endMs])

  const now = Date.now()

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>Pharmacokinetic Plotter</h1>
        <p className="text-text-secondary text-sm">Active compound serum levels over time</p>
      </div>

      {/* Time range */}
      <div className="flex gap-2">
        {[7, 14, 30, 90].map(d => (
          <button key={d} onClick={() => setTimeRange(d)}
            className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: timeRange === d ? CYAN_PRIMARY : 'rgba(255,255,255,0.06)',
              color: timeRange === d ? '#0A0E14' : TEXT_SECONDARY,
            }}>
            {d}d
          </button>
        ))}
      </div>

      {/* Period nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setPeriodOffset(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: CYAN_PRIMARY, background: 'rgba(211,253,43,0.08)' }}>‹ Prev</button>
        <span className="text-text-secondary text-sm">{periodLabel}</span>
        <button onClick={() => setPeriodOffset(p => Math.min(p + 1, 0))} disabled={periodOffset >= 0}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: periodOffset < 0 ? CYAN_PRIMARY : TEXT_TERTIARY, background: periodOffset < 0 ? 'rgba(211,253,43,0.08)' : 'transparent' }}>
          Next ›
        </button>
      </div>

      {/* Compound toggles */}
      {compoundNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {compoundNames.map((name, i) => {
            const color = compoundColor(name, i)
            const enabled = enabledCompounds.has(name)
            return (
              <button key={name} onClick={() => {
                setEnabledCompounds(prev => {
                  const next = new Set(prev)
                  if (next.has(name)) next.delete(name); else next.add(name)
                  return next
                })
              }}
                className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                style={{
                  background: enabled ? hexToRgba(color, 0.25) : 'transparent',
                  borderColor: enabled ? color : 'rgba(255,255,255,0.15)',
                  color: enabled ? color : TEXT_SECONDARY,
                }}>
                {name}
              </button>
            )
          })}
        </div>
      )}

      {/* Chart */}
      <div className="glossy-card">
        {doseLogs.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-text-secondary text-sm">No dose data to plot. Log some doses first.</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full" style={{ height: 260, display: 'block' }} />
        )}
      </div>

      {/* Legend with current levels */}
      {Object.keys(enabledData).length > 0 && (
        <div className="glossy-card space-y-2">
          <p className="text-text-tertiary text-xs font-medium">CURRENT SERUM LEVELS</p>
          {Object.entries(enabledData).map(([name, points], i) => {
            const color = compoundColor(name, i)
            const unit = compoundUnits[name] ?? 'mg'
            const closest = points.reduce((best, p) => Math.abs(p.timeMillis - now) < Math.abs(best.timeMillis - now) ? p : best, points[0])
            const lvlMg = closest?.levelMg ?? 0
            const display = unit === 'mcg' ? lvlMg * 1000 : lvlMg
            return (
              <div key={name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-text-primary text-sm flex-1">{name}</span>
                <span className="text-sm font-semibold" style={{ color }}>≈{formatLevel(display)} {unit}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
