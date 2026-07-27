import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Site {
  id: string;
  code: string;
  nom: string;
  region?: string;
  commune?: string;
  type?: string;
  photos?: { url: string }[];
  _count: { cooperatives: number; terrains: number };
}

export default function PublicSites() {
  const { data = [], isLoading } = useQuery<Site[]>({
    queryKey: ['public-sites'],
    queryFn: async () => (await api.get('/public/sites')).data,
  });

  return (
    <div className="space-y-8 py-4">
      <div>
        <span className="eyebrow">Nos implantations</span>
        <h1 className="h-display text-3xl md:text-5xl">Nos sites</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Cliquez sur un site pour le localiser sur la carte et voir les
          informations du gérant.
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <Link key={s.id} to={`/sites/${s.id}`} className="group block">
            <div className="zoom relative h-72 rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-100">
              {s.photos?.[0] ? (
                <img src={s.photos[0].url} alt="" />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">🏘️</div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-brand-700 shadow">
                {s.type === 'VENTE_DIRECTE' ? 'Vente directe' : 'Coopérative'}
              </span>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/70">{s.code}</div>
                <div className="text-2xl font-bold">{s.nom}</div>
                <div className="text-sm text-white/80">
                  📍 {[s.commune, s.region].filter(Boolean).join(', ')}
                </div>
                <div className="mt-1 text-xs text-white/70">
                  {s._count.terrains} parcelles · {s._count.cooperatives} coopérative(s)
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!isLoading && data.length === 0 && (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 ring-1 ring-slate-100">
          Aucun site publié.
        </div>
      )}
    </div>
  );
}
