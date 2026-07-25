import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';

interface Site {
  id: string;
  code: string;
  nom: string;
  region?: string;
  commune?: string;
  superficie?: number;
  nbParcelles: number;
  prixReference?: number;
  statut: string;
  _count: { cooperatives: number; terrains: number };
}

const statutStyle: Record<string, string> = {
  DISPONIBLE: 'bg-brand-50 text-brand-700',
  EN_COMMERCIALISATION: 'bg-amber-50 text-amber-700',
  CLOTURE: 'bg-slate-200 text-slate-600',
};

export default function Sites() {
  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => (await api.get('/sites')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sites immobiliers</h1>
        <p className="text-sm text-slate-500">
          Gestion des sites et de leurs lotissements
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">
                  {s.code}
                </div>
                <h3 className="font-bold text-slate-800">{s.nom}</h3>
                <div className="text-sm text-slate-500">
                  {[s.commune, s.region].filter(Boolean).join(', ')}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statutStyle[s.statut] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {s.statut.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="font-bold text-slate-800">{s.nbParcelles}</div>
                <div className="text-[11px] text-slate-400">Parcelles</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="font-bold text-slate-800">
                  {s._count.cooperatives}
                </div>
                <div className="text-[11px] text-slate-400">Coops</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="font-bold text-slate-800">
                  {s._count.terrains}
                </div>
                <div className="text-[11px] text-slate-400">Terrains</div>
              </div>
            </div>

            {s.prixReference && (
              <div className="mt-3 text-sm text-slate-500">
                Prix de référence :{' '}
                <span className="font-semibold text-brand-700">
                  {formatFCFA(s.prixReference)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {sites.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">Aucun site.</div>
      )}
    </div>
  );
}
