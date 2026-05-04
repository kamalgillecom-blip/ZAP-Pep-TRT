import { NavLink, Outlet, useLocation } from 'react-router-dom'

const C = '#C4EF95'
const DIM = '#546E7A'

function Icon({ children, active }: { children: (color: string) => React.ReactNode; active: boolean }) {
  return <>{children(active ? C : DIM)}</>
}

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Dashboard',
    svg: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    path: '/dose-log',
    label: 'Doses',
    svg: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
      </svg>
    ),
  },
  {
    path: '/vials',
    label: 'Vials',
    svg: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6m-6 0v2l-5 7h16L14 5V3m-5 0h6"/><path d="M6 12v7a2 2 0 002 2h8a2 2 0 002-2v-7"/>
      </svg>
    ),
  },
  {
    path: '/exercise',
    label: 'Exercise',
    svg: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16M18 4v16"/><path d="M2 8.5h4M18 8.5h4M2 15.5h4M18 15.5h4"/><line x1="6" y1="12" x2="18" y2="12" strokeWidth="2.5"/>
      </svg>
    ),
  },
  {
    path: '/more',
    label: 'More',
    svg: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={c} stroke={c} strokeWidth="1">
        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
      </svg>
    ),
  },
]

const SIDEBAR_ITEMS = [
  {
    path: '/',
    label: 'Dashboard',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    path: '/dose-log',
    label: 'Dose Log',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
      </svg>
    ),
  },
  {
    path: '/vials',
    label: 'Vials',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6m-6 0v2l-5 7h16L14 5V3m-5 0h6"/><path d="M6 12v7a2 2 0 002 2h8a2 2 0 002-2v-7"/>
      </svg>
    ),
  },
  {
    path: '/body-comp',
    label: 'Body Comp',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    path: '/plotter',
    label: 'PK Plotter',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    path: '/schedules',
    label: 'Schedules',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    path: '/bloodwork',
    label: 'Blood Work',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L8 8H4l4 4-2 6 6-3 6 3-2-6 4-4h-4z"/>
      </svg>
    ),
  },
  {
    path: '/compounds',
    label: 'Compounds',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
  },
  {
    path: '/more',
    label: 'More',
    svg: (c: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={c} stroke={c} strokeWidth="1">
        <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
      </svg>
    ),
  },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 fixed left-0 top-0 bottom-0 z-20" style={{
        background: 'linear-gradient(180deg, #0e1218 0%, #070a0f 60%, #020305 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.6), inset -1px 0 0 rgba(255,255,255,0.04)',
      }}>
        {/* Gloss highlight strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 120, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
          borderRadius: '0 0 0 0',
        }} />

        <div className="px-4 py-4 flex items-center gap-3 relative" style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        }}>
          <img src="/logo.png" alt="ZAP" className="w-10 h-10 rounded-xl flex-shrink-0" style={{ filter: 'drop-shadow(0 0 10px rgba(205,250,65,0.45))' }} />
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: C }}>ZAP PEP/TRT</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Tracker</p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto relative">
          {SIDEBAR_ITEMS.map(item => {
            const active = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(205,250,65,0.15) 0%, rgba(205,250,65,0.07) 100%)',
                  color: C,
                  fontWeight: 600,
                  boxShadow: 'inset 0 1px 0 rgba(205,250,65,0.15), 0 1px 8px rgba(205,250,65,0.08)',
                  border: '1px solid rgba(205,250,65,0.12)',
                } : {
                  color: 'rgba(255,255,255,0.45)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.cssText += ';background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8)' }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' } }}
              >
                <Icon active={active}>{item.svg}</Icon>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 py-3 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>v1.0 Web</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 flex flex-col">
        <div className="flex-1 px-4 pt-5 pb-24 md:pb-6 max-w-2xl md:max-w-4xl mx-auto w-full">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <nav className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-20 safe-bottom">
          <div className="flex items-center justify-around py-2 px-2">
            {NAV_ITEMS.map(item => {
              const active = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[48px]"
                >
                  <Icon active={active}>{item.svg}</Icon>
                  <span className="text-xs" style={{ color: active ? C : DIM }}>
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </main>
    </div>
  )
}
