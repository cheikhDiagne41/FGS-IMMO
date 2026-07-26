import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../../lib/api';

interface Terrain {
  id: string; numeroParcelle: string; titre?: string; prix: number | null;
  statut: string; enVedette?: boolean; site: { nom: string; commune?: string };
  images?: { url: string }[];
}

export default function PublicHome() {
  const { data = [] } = useQuery<Terrain[]>({
    queryKey: ['public-terrains'],
    queryFn: async () => (await api.get('/public/terrains')).data,
  });
  const vedettes = data.filter((t) => t.enVedette).slice(0, 4);
  const recents = data.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white md:p-12">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight md:text-4xl">
          Trouvez votre terrain, rejoignez une coopérative d'habitat
        </h1>
        <p className="mt-3 max-w-xl text-brand-100">
          Vente de terrains, sites viabilisés et coopératives avec paiement par
          mensualités (Wave & Orange Money). Localisez chaque parcelle sur la carte.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/terrains" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-brand-700 hover:bg-brand-50">
            Voir les terrains
          </Link>
          <Link to="/carte" className="rounded-lg bg-white/15 px-5 py-2.5 font-semibold text-white hover:bg-white/25">
            🗺️ Ouvrir la carte
          </Link>
          <Link to="/inscription" className="rounded-lg bg-gold-500 px-5 py-2.5 font-semibold text-white hover:bg-gold-600">
            Créer un compte
          </Link>
        </div>
      </div>

      {/* Vedettes */}
      {vedettes.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-slate-800">★ À la une</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {vedettes.map((t) => (
              <Link key={t.id} to={`/terrains/${t.id}`} className="card overflow-hidden transition hover:shadow-md">
                <div className="-mx-5 -mt-5 mb-3 h-36 overflow-hidden bg-slate-100">
                  {t.images?.[0] ? <img src={t.images[0].url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl">🗺️</div>}
                </div>
                <div className="font-bold text-slate-800">{t.titre ?? `Parcelle ${t.numeroParcelle}`}</div>
                <div className="text-xs text-slate-500">📍 {t.site.nom}</div>
                <div className="mt-1 font-bold text-brand-700">{t.prix ? formatFCFA(Number(t.prix)) : 'Sur demande'}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Récents */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Terrains récents</h2>
          <Link to="/terrains" className="text-sm font-semibold text-brand-600">Tout voir →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recents.map((t) => (
            <Link key={t.id} to={`/terrains/${t.id}`} className="card overflow-hidden transition hover:shadow-md">
              <div className="-mx-5 -mt-5 mb-3 h-36 overflow-hidden bg-slate-100">
                {t.images?.[0] ? <img src={t.images[0].url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl">🗺️</div>}
              </div>
              <div className="font-bold text-slate-800">{t.titre ?? `Parcelle ${t.numeroParcelle}`}</div>
              <div className="text-xs text-slate-500">📍 {t.site.nom}</div>
              <div className="mt-1 font-bold text-brand-700">{t.prix ? formatFCFA(Number(t.prix)) : 'Sur demande'}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
