import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/quran', label: 'My Quran', icon: '📖' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-60 bg-[#090c12] border-r border-white/[0.06] px-5 py-7 z-40">
      <div className="mb-8">
        <div className="text-xl font-extrabold text-white tracking-tight">
          Hifz <span className="text-indigo-300">Companion</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">Your memorisation app</div>
      </div>
      <nav className="flex flex-col gap-1.5">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${isActive
                ? 'btn-gradient text-white'
                : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
              }`
            }
          >
            <span className="text-base">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
