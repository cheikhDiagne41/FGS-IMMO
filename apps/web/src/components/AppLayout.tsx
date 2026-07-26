import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const menu = navByRole[user?.role ?? 'CLIENT'];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Barre de navigation horizontale */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Logo size={30} />

          {/* Navigation (desktop) */}
          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
            <div className="hidden text-right sm:block">
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
            <button onClick={logout} className="btn-ghost hidden text-xs sm:inline-flex">
              Déconnexion
            </button>
            {/* Bouton menu mobile */}
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Navigation (mobile, dépliable) */}
        {open && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 px-4 py-2 md:hidden">
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={logout}
              className="mt-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              Déconnexion
            </button>
          </nav>
        )}
      </header>

      {/* Contenu */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        FGS_IMMO © 2026 — Plateforme immobilière
      </footer>
    </div>
  );
}
