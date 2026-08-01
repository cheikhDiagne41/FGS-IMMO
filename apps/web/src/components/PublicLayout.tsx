import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import Footer from './Footer';
import Logo from './Logo';

const links = [
  { label: 'Accueil', path: '/' },
  { label: 'Terrains', path: '/terrains' },
  { label: 'Sites', path: '/sites' },
  { label: 'Coopératives', path: '/cooperatives' },
  { label: 'Actualités', path: '/actualites' },
  { label: 'Carte', path: '/carte' },
  { label: 'À propos', path: '/a-propos' },
  { label: 'Gouvernance', path: '/gouvernance' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/"><Logo size={30} /></Link>
          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.path} to={l.path} end={l.path === '/'} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
            <Link to="/login" className="btn-ghost text-sm">Se connecter</Link>
            <Link to="/inscription" className="btn-primary text-sm">S'inscrire</Link>
            <button onClick={() => setOpen((o) => !o)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">☰</button>
          </div>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 px-4 py-2 md:hidden">
            {links.map((l) => (
              <NavLink key={l.path} to={l.path} end={l.path === '/'} onClick={() => setOpen(false)} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}
