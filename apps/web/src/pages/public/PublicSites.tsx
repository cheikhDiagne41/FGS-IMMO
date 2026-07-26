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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nos sites</h1>
        <p className="text-sm text-slate-500">
          Cliquez sur un site pour le localiser et voir les informations du gérant.
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((s) => (
          <Link key={s.id} to={`/sites/${s.id}`}
            className="card overflow-hidden transition hover:shadow-md hover:ring-2 hover:ring-brand-200">
            <div className="-mx-5 -mt-5 mb-3 h-40 overflow-hidden bg-slate-100">
              {s.photos?.[0]
                ? <img src={s.photos[0].url} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-4xl">🏘️</div>}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">{s.code}</div>
                <div className="font-bold text-slate-800">{s.nom}</div>
                <div className="text-sm text-slate-500">
                  {[s.commune, s.region].filter(Boolean).join(', ')}
                </div>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                {s.type === 'VENTE_DIRECTE' ? 'Vente directe' : 'Coopérative'}
              </span>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span>{s._count.terrains} parcelles</span>
              <span>{s._count.cooperatives} coopérative(s)</span>
            </div>
          </Link>
        ))}
      </div>
      {!isLoading && data.length === 0 && (
        <div className="card text-center text-slate-400">Aucun site publié.</div>
      )}
    </div>
  );
}
