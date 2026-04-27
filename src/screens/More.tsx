import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useStore } from '../store/useStore'

const C = '#CDFA41'

const SECTIONS = [
  {
    title: 'Health',
    items: [
      {
        label: 'Blood Work',
        path: '/bloodwork',
        svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L8 8H4l4 4-2 6 6-3 6 3-2-6 4-4h-4z"/></svg>,
      },
      {
        label: 'Body Composition',
        path: '/body-comp',
        svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
      },
      {
        label: 'Exercise Logs',
        path: '/exercise',
        svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5v14M18 5v14M3 8h4M17 8h4M3 16h4M17 16h4"/></svg>,
      },
    ],
  },
  {
    title: 'Protocol',
    items: [
      {
        label: 'Compounds',
        path: '/compounds',
        svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
      },
      {
        label: 'Schedules',
        path: '/schedules',
        svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        label: 'Settings',
        path: '/settings',
        svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
      },
    ],
  },
]

export default function More() {
  const navigate = useNavigate()
  const { user } = useStore()

  return (
    <div className="screen-enter space-y-4 pb-4">
      <h1 className="text-xl font-bold text-text-primary">More</h1>

      {user && (
        <div className="glossy-card">
          <p className="text-text-tertiary text-xs">Signed in as</p>
          <p className="text-text-primary text-sm font-medium">{user.email}</p>
        </div>
      )}

      {SECTIONS.map(section => (
        <div key={section.title}>
          <p className="text-text-tertiary text-xs font-medium mb-2 px-1">{section.title.toUpperCase()}</p>
          <div className="space-y-1">
            {section.items.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full glossy-card flex items-center gap-3 active:scale-[0.99] transition-transform text-left"
              >
                <span className="flex-shrink-0">{item.svg}</span>
                <span className="text-text-primary text-sm flex-1">{item.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#546E7A" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => signOut(auth)}
        className="w-full border border-status-red/30 text-status-red py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
      >
        Sign Out
      </button>

      <div className="text-center pt-2">
        <p className="text-text-tertiary text-xs">ZAP PEP/TRT Tracker • Web</p>
        <p className="text-text-tertiary text-xs mt-0.5">
          <a href="mailto:support@zapanalytics.com" className="text-cyan-primary">support@zapanalytics.com</a>
        </p>
      </div>
    </div>
  )
}
