import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
  COMPTABLE: 'Comptable',
  CLIENT: 'Client',
};

const menuByRole: Record<string, string[]> = {
  ADMIN: ['Tableau de bord', 'Sites', 'Coopératives', 'Terrains', 'Clients', 'Paiements', 'Factures', 'Rapports'],
  GESTIONNAIRE: ['Tableau de bord', 'Sites', 'Coopératives', 'Terrains', 'Clients'],
  COMPTABLE: ['Tableau de bord', 'Paiements', 'Factures', 'Rapports'],
  CLIENT: ['Mon espace', 'Ma coopérative', 'Mes paiements', 'Mes factures'],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const menu = menuByRole[user?.role ?? 'CLIENT'];

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
          {menu.map((item, i) => (
            <a
              key={item}
              href="#"
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                i === 0
                  ? 'bg-white/15 text-white'
                  : 'text-brand-100 hover:bg-white/10'
              }`}
            >
              {item}
            </a>
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

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
