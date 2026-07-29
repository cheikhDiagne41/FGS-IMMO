import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, formatFCFA } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import SiteFormModal from '../components/SiteFormModal';
import TerrainFormModal from '../components/TerrainFormModal';

interface AdminStats {
  totalClients: number;
  totalCooperatives: number;
  totalSites: number;
  terrainsDisponibles: number;
  terrainsVendus: number;
  totalEncaissements: number;
  paiementsDuMois: number;
  paiementsEnRetard: number;
  nouveauxInscrits: number;
}

const moisCourt = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

function StatCard({
  label,
  value,
  accent = 'brand',
  sub,
}: {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}) {
  const colors: Record<string, string> = {
    brand: 'from-brand-500 to-brand-700',
    gold: 'from-gold-400 to-gold-600',
    red: 'from-rose-400 to-rose-600',
    slate: 'from-slate-500 to-slate-700',
  };
  return (
    <div className="card overflow-hidden">
      <div
        className={`mb-3 inline-flex rounded-lg bg-gradient-to-br ${colors[accent]} px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white`}
      >
        {label}
      </div>
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

interface GestionItem {
  label: string;
  path: string;
  icon: string;
  desc: string;
  roles: string[];
  badge?: number;
  count?: number | string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'ADMIN';
  const [newSite, setNewSite] = useState(false);
  const [newTerrain, setNewTerrain] = useState(false);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/dashboard/admin')).data,
  });

  const { data: demandes = [] } = useQuery({
    queryKey: ['demandes-count'],
    queryFn: async () => (await api.get('/adhesions/demandes')).data,
    enabled: role === 'ADMIN' || role === 'GESTIONNAIRE',
  });
  const { data: paiementsAtt = [] } = useQuery({
    queryKey: ['paiements-attente'],
    queryFn: async () => (await api.get('/paiements?statut=EN_ATTENTE')).data,
    enabled: role !== 'CLIENT',
  });

  const { data: ventes = [] } = useQuery({
    queryKey: ['ventes'],
    queryFn: async () => (await api.get('/dashboard/ventes')).data,
  });

  const { data: cotisations = [] } = useQuery({
    queryKey: ['cotisations'],
    queryFn: async () => (await api.get('/dashboard/cotisations')).data,
  });

  const gestion: GestionItem[] = [
    { label: 'Demandes', path: '/demandes', icon: '📥', desc: 'Adhésions à valider', roles: ['ADMIN', 'GESTIONNAIRE'], badge: demandes.length },
    { label: 'Dossiers', path: '/dossiers', icon: '📂', desc: 'Clients & encaissements', roles: ['ADMIN', 'GESTIONNAIRE', 'COMPTABLE'] },
    { label: 'Paiements', path: '/paiements', icon: '💳', desc: 'À confirmer', roles: ['ADMIN', 'GESTIONNAIRE', 'COMPTABLE'], badge: paiementsAtt.length },
    { label: 'Sites', path: '/sites', icon: '🏘️', desc: 'Gérer les sites', roles: ['ADMIN', 'GESTIONNAIRE'], count: stats?.totalSites },
    { label: 'Terrains', path: '/terrains', icon: '🗺️', desc: 'Gérer les parcelles', roles: ['ADMIN', 'GESTIONNAIRE', 'COMPTABLE'], count: `${stats?.terrainsDisponibles ?? '—'} dispo.` },
    { label: 'Coopératives', path: '/cooperatives', icon: '👥', desc: 'Gérer les coopératives', roles: ['ADMIN', 'GESTIONNAIRE', 'COMPTABLE'], count: stats?.totalCooperatives },
    { label: 'Vendeurs', path: '/vendeur', icon: '🧑‍💼', desc: 'Société & agents', roles: ['ADMIN'] },
    { label: 'Rapports', path: '/rapports', icon: '📊', desc: 'PDF & Excel', roles: ['ADMIN', 'GESTIONNAIRE', 'COMPTABLE'] },
    { label: 'Carte', path: '/carte', icon: '🌍', desc: 'Terrains géolocalisés', roles: ['ADMIN', 'GESTIONNAIRE', 'COMPTABLE'] },
  ].filter((g) => g.roles.includes(role));

  const isGestion = role === 'ADMIN' || role === 'GESTIONNAIRE';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-sm text-slate-500">Pilotage de l'activité FGS_IMMO</p>
        </div>
        {isGestion && (
          <div className="flex gap-2">
            <button onClick={() => setNewSite(true)} className="btn-ghost text-sm">＋ Site</button>
            <button onClick={() => setNewTerrain(true)} className="btn-primary text-sm">＋ Terrain</button>
          </div>
        )}
      </div>

      {/* Hub de gestion */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {gestion.map((g) => (
          <Link
            key={g.path}
            to={g.path}
            className="group relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {!!g.badge && g.badge > 0 && (
              <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                {g.badge}
              </span>
            )}
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-2xl">
              {g.icon}
            </div>
            <div className="font-bold text-slate-800 group-hover:text-brand-700">{g.label}</div>
            <div className="text-xs text-slate-400">
              {g.count != null ? `${g.count} · ` : ''}{g.desc}
            </div>
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clients" value={stats?.totalClients ?? '—'} />
        <StatCard label="Coopératives" value={stats?.totalCooperatives ?? '—'} />
        <StatCard label="Sites" value={stats?.totalSites ?? '—'} accent="slate" />
        <StatCard
          label="Terrains dispo."
          value={stats?.terrainsDisponibles ?? '—'}
          sub={`${stats?.terrainsVendus ?? 0} vendus`}
        />
        <StatCard
          label="Total encaissé"
          value={stats ? formatFCFA(stats.totalEncaissements) : '—'}
          accent="gold"
        />
        <StatCard
          label="Paiements du mois"
          value={stats ? formatFCFA(stats.paiementsDuMois) : '—'}
          accent="brand"
        />
        <StatCard
          label="Paiements en retard"
          value={stats?.paiementsEnRetard ?? '—'}
          accent="red"
        />
        <StatCard
          label="Nouveaux inscrits"
          value={stats?.nouveauxInscrits ?? '—'}
          sub="30 derniers jours"
        />
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold text-slate-700">
            Ventes de terrains (12 mois)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ventes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="mois" tickFormatter={moisCourt} fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip labelFormatter={moisCourt} />
              <Bar dataKey="total" fill="#1e4d8c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {ventes.length === 0 && (
            <p className="text-center text-xs text-slate-400">
              Aucune vente enregistrée pour l'instant.
            </p>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold text-slate-700">
            Cotisations encaissées (12 mois)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={cotisations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="mois" tickFormatter={moisCourt} fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                labelFormatter={moisCourt}
                formatter={(v: number) => formatFCFA(v)}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#e98b32"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {cotisations.length === 0 && (
            <p className="text-center text-xs text-slate-400">
              Aucune cotisation encaissée pour l'instant.
            </p>
          )}
        </div>
      </div>

      {newSite && <SiteFormModal onClose={() => setNewSite(false)} />}
      {newTerrain && <TerrainFormModal onClose={() => setNewTerrain(false)} />}
    </div>
  );
}
