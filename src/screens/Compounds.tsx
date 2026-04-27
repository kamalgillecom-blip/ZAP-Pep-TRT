import { useState } from 'react'
import { BUILTIN_COMPOUNDS, CATEGORY_COLORS, CATEGORY_LABELS } from '../data/compounds'

export default function Compounds() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)

  const categories = ['ALL', 'TRT', 'AAS', 'PEPTIDE', 'SARM', 'AI', 'SERM', 'OTHER', 'MEDICATION', 'SUPPLEMENT']
  const filtered = BUILTIN_COMPOUNDS.filter(c =>
    (category === 'ALL' || c.category === category) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="screen-enter space-y-4 pb-4">
      <h1 className="text-xl font-bold text-text-primary">Compounds</h1>

      <input
        type="text"
        placeholder="Search compounds..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-dark-variant border border-dark-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:border-cyan-primary transition-colors"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === cat ? 'bg-cyan-primary text-dark-bg' : 'bg-dark-variant border border-dark-border text-text-secondary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="glossy-card">
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[c.category] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium">{c.name}</p>
                  <p className="text-text-tertiary text-xs">{CATEGORY_LABELS[c.category]} · {c.defaultDoseUnit} · {c.defaultRouteOfAdmin}</p>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#546E7A" strokeWidth="2"
                  className={`transition-transform ${expanded === c.id ? 'rotate-90' : ''}`}
                >
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>

            {expanded === c.id && (
              <div className="mt-3 pt-3 border-t border-dark-border space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-dark-variant rounded-lg p-2">
                    <p className="text-text-tertiary text-xs">Half-Life</p>
                    <p className="text-text-primary text-sm font-medium">
                      {c.halfLifeHours >= 24 ? `${(c.halfLifeHours / 24).toFixed(1)}d` : `${c.halfLifeHours}h`}
                    </p>
                  </div>
                  <div className="bg-dark-variant rounded-lg p-2">
                    <p className="text-text-tertiary text-xs">Route</p>
                    <p className="text-text-primary text-sm font-medium">{c.defaultRouteOfAdmin}</p>
                  </div>
                  <div className="bg-dark-variant rounded-lg p-2">
                    <p className="text-text-tertiary text-xs">Default Unit</p>
                    <p className="text-text-primary text-sm font-medium">{c.defaultDoseUnit}</p>
                  </div>
                  <div className="bg-dark-variant rounded-lg p-2">
                    <p className="text-text-tertiary text-xs">Category</p>
                    <p className="text-sm font-medium" style={{ color: CATEGORY_COLORS[c.category] }}>{CATEGORY_LABELS[c.category]}</p>
                  </div>
                </div>
                {c.description && (
                  <p className="text-text-secondary text-xs leading-relaxed">{c.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
