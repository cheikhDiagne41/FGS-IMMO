import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../../lib/api';

interface Terrain {
  id: string;
  numeroParcelle: string;
  titre?: string;
  prix: number | null;
  superficie: number;
  type: string;
  statut: 'DISPONIBLE' | 'RESERVE' | 'VENDU';
  enVedette?: boolean;
  site: { nom: string; commune?: string };
  images?: { url: string }[];
}

const badge: Record<string, string> = {
  DISPONIBLE: 'bg-brand-50 text-brand-700',
  RESERVE: 'bg-amber-50 text-amber-700',
  VENDU: 'bg-slate-200 text-slate-600',
};

export default function PublicTerrains() {
  const { data = [], isLoading } = useQuery<Terrain[]>({
    queryKey: ['public-terrains'],
    queryFn: async () => (await api.get('/public/terrains')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Terrains à vendre</h1>
        <p className="text-sm text-slate-500">
          Parcourez nos parcelles disponibles. Créez un compte pour réserver ou acheter.
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((t) => (
          <Link key={t.id} to={`/terrains/${t.id}`}
            className="card overflow-hidden transition hover:shadow-md hover:ring-2 hover:ring-brand-200">
            <div className="relative -mx-5 -mt-5 mb-3 h-40 overflow-hidden bg-slate-100">
              {t.images?.[0]
                ? <img src={t.images[0].url} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-4xl">🗺️</div>}
              {t.enVedette && (
                <span className="absolute left-2 top-2 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-white">★ Vedette</span>
              )}
              <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge[t.statut]}`}>
                {t.statut}
              </span>
            </div>
            <div className="font-bold text-slate-800">
              {t.titre ?? `Parcelle N° ${t.numeroParcelle}`}
            </div>
            <div className="text-xs text-slate-500">
              📍 {t.site.nom}{t.site.commune ? ` · ${t.site.commune}` : ''}
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-[11px] text-slate-400">{Number(t.superficie)} m² · {t.type}</div>
              <div className="font-bold text-brand-700">
                {t.prix ? formatFCFA(Number(t.prix)) : 'Sur demande'}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!isLoading && data.length === 0 && (
        <div className="card text-center text-slate-400">Aucun terrain publié.</div>
      )}
    </div>
  );
}
