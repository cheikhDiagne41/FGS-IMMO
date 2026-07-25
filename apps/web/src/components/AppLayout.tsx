import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { navByRole } from '../lib/nav';
import Logo from './Logo';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
  COMPTABLE: 'Comptable',
  CLIENT: 'Client',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const menu = navByRole[user?.role ?? 'CLIENT'];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col bg-brand-900 text-brand-50 md:flex">
        <div className="border-b border-white/10 p-4">
          <div className="rounded-lg bg-white/95 px-3 py-2">
            <Logo size={30} />
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-brand-100 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-brand-200">
          FGS_IMMO © 2026
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="md:hidden">
            <Logo size={28} />
          </div>
          <div className="hidden text-sm text-slate-500 md:block">
            Espace {roleLabels[user?.role ?? 'CLIENT']}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">
                {user?.email}
              </div>
              <div className="text-xs text-slate-400">
                {roleLabels[user?.role ?? 'CLIENT']}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <button onClick={logout} className="btn-ghost text-xs">
              Déconnexion
            </button>
          </div>
        </header>

        {/* Nav mobile */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
