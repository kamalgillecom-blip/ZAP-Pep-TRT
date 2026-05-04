import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'
import { BUILTIN_COMPOUNDS } from '../data/compounds'
import { toHexColor } from '../lib/theme'

const toMs = (val: any): number => {
  if (typeof val === 'number') return val
  if (val?.toMillis) return val.toMillis()
  if (val?.seconds) return val.seconds * 1000
  return new Date(val).getTime()
}

const INJECTION_SITES = [
  'Left Deltoid', 'Right Deltoid', 'Left Glute', 'Right Glute',
  'Left Quad', 'Right Quad', 'Left Abdomen', 'Right Abdomen',
  'Left VG', 'Right VG', 'Left Lat', 'Right Lat',
]

export default function DoseLog() {
  const { doseLogs, vials, user } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editLog, setEditLog] = useState<any | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Vial color map keyed by compoundName
  const vialColors = useMemo(() =>
    vials.reduce((acc, v) => {
      if (v.color != null && v.compoundName && !acc[v.compoundName]) acc[v.compoundName] = toHexColor(v.color)
      return acc
    }, {} as Record<string, string>),
    [vials]
  )

  // Color for a dose — vial color > compound category color > fallback
  const doseColor = (log: any) => {
    if (vialColors[log.compoundName]) return vialColors[log.compoundName]
    const compound = BUILTIN_COMPOUNDS.find(c => c.name === log.compoundName)
    return compound ? '#C4EF95' : '#546E7A'
  }

  const filtered = doseLogs.filter(l =>
    l.compoundName.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!user) return
    await deleteDoc(doc(db, 'users', user.uid, 'dose_logs', id))
    setConfirmDelete(null)
  }

  const handleEdit = async () => {
    if (!user || !editLog) return
    setEditSaving(true)
    try {
      const displayVal = parseFloat(editLog.doseDisplayValue)
      let doseMg = displayVal
      if (editLog.doseDisplayUnit === 'mcg') doseMg = displayVal / 1000
      else if (editLog.doseDisplayUnit === 'IU') doseMg = displayVal * 0.333

      await updateDoc(doc(db, 'users', user.uid, 'dose_logs', editLog.id), {
        doseDisplayValue: displayVal,
        doseDisplayUnit: editLog.doseDisplayUnit,
        doseMg,
        injectionSite: editLog.injectionSite || null,
        notes: editLog.notes || null,
        dateTime: new Date(editLog.dateTimeStr).getTime(),
      })
      setEditLog(null)
    } finally {
      setEditSaving(false)
    }
  }

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const dateKey = format(new Date(toMs(log.dateTime)), 'EEEE, MMMM d yyyy')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(log)
    return acc
  }, {} as Record<string, typeof doseLogs>)

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Dose Log</h1>
        <button
          onClick={() => navigate('/add-dose')}
          className="bg-cyan-primary text-dark-bg text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          + Add
        </button>
      </div>

      <input
        type="text"
        placeholder="Search compounds..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-dark-variant border border-dark-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:border-cyan-primary transition-colors"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary text-base">No doses logged yet</p>
          <p className="text-text-tertiary text-sm mt-1">Tap + Add to log your first dose</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, logs]) => (
          <div key={date}>
            <p className="text-text-tertiary text-xs font-medium mb-2 px-1">{date}</p>
            <div className="space-y-2">
              {logs.map(log => {
                const color = doseColor(log)
                return (
                  <div key={log.id} className="glossy-card">
                    <div className="flex items-center gap-3">
                      {/* Color dot */}
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-semibold text-sm">{log.compoundName}</p>
                        <p className="text-xs mt-0.5" style={{ color }}>
                          {log.doseDisplayValue} {log.doseDisplayUnit}
                          {log.injectionSite && ` · ${log.injectionSite}`}
                        </p>
                        {log.notes && <p className="text-text-tertiary text-xs mt-1 truncate">{log.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <p className="text-text-tertiary text-xs">{format(new Date(toMs(log.dateTime)), 'h:mm a')}</p>
                        {/* Edit */}
                        <button
                          onClick={() => setEditLog({
                            ...log,
                            dateTimeStr: format(new Date(toMs(log.dateTime)), "yyyy-MM-dd'T'HH:mm"),
                          })}
                          className="text-text-tertiary/60 hover:text-cyan-primary p-1"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setConfirmDelete(log.id)}
                          className="text-status-red/60 hover:text-status-red p-1"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="glossy-card w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-text-primary font-semibold mb-2">Delete this dose?</p>
            <p className="text-text-tertiary text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-dark-border text-text-secondary py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-status-red text-white py-2.5 rounded-xl text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEditLog(null)}>
          <div className="w-full max-w-md mx-auto" onClick={e => e.stopPropagation()}>
            <div className="glossy-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-semibold">Edit Dose</p>
                <button onClick={() => setEditLog(null)} className="text-text-tertiary">✕</button>
              </div>

              <p className="text-cyan-primary font-semibold text-sm">{editLog.compoundName}</p>

              <div className="flex gap-2">
                <input
                  type="number"
                  value={editLog.doseDisplayValue}
                  onChange={e => setEditLog((l: any) => ({ ...l, doseDisplayValue: e.target.value }))}
                  className="flex-1 bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                  placeholder="Dose"
                />
                <select
                  value={editLog.doseDisplayUnit}
                  onChange={e => setEditLog((l: any) => ({ ...l, doseDisplayUnit: e.target.value }))}
                  className="bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                >
                  {['mcg', 'mg', 'IU', 'ml'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={editLog.dateTimeStr}
                  onChange={e => setEditLog((l: any) => ({ ...l, dateTimeStr: e.target.value }))}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-2">Injection Site</label>
                <div className="flex flex-wrap gap-1.5">
                  {INJECTION_SITES.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditLog((l: any) => ({ ...l, injectionSite: l.injectionSite === s ? '' : s }))}
                      className="px-2 py-1 rounded-full text-xs transition-colors"
                      style={{
                        background: editLog.injectionSite === s ? 'rgba(205,250,65,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${editLog.injectionSite === s ? '#C4EF95' : 'rgba(255,255,255,0.1)'}`,
                        color: editLog.injectionSite === s ? '#C4EF95' : '#ADB5BD',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Notes</label>
                <textarea
                  value={editLog.notes || ''}
                  onChange={e => setEditLog((l: any) => ({ ...l, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2 text-text-primary text-sm focus:border-cyan-primary resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditLog(null)} className="flex-1 border border-dark-border text-text-secondary py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleEdit} disabled={editSaving}
                  className="flex-1 bg-cyan-primary text-dark-bg font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
