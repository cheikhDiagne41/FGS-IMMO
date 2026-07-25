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

export default function AdminDashboard() {
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/dashboard/admin')).data,
  });

  const { data: ventes = [] } = useQuery({
    queryKey: ['ventes'],
    queryFn: async () => (await api.get('/dashboard/ventes')).data,
  });

  const { data: cotisations = [] } = useQuery({
    queryKey: ['cotisations'],
    queryFn: async () => (await api.get('/dashboard/cotisations')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-sm text-slate-500">Vue d'ensemble de l'activité FGS_IMMO</p>
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
              <Bar dataKey="total" fill="#0f9253" radius={[4, 4, 0, 0]} />
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
                stroke="#e6a817"
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
    </div>
  );
}
