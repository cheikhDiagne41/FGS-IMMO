import { useState } from 'react';
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

  const [q, setQ] = useState('');
  const [statut, setStatut] = useState('');
  const [type, setType] = useState('');

  const filtered = data.filter((t) => {
    if (statut && t.statut !== statut) return false;
    if (type && t.type !== type) return false;
    if (q) {
      const s = `${t.titre ?? ''} ${t.numeroParcelle} ${t.site.nom} ${t.site.commune ?? ''}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 py-4">
      <div>
        <span className="eyebrow">Catalogue</span>
        <h1 className="h-display text-3xl md:text-5xl">Terrains à vendre</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Parcourez nos parcelles disponibles. Créez un compte pour réserver,
          adhérer à une coopérative ou acheter directement.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Rechercher un terrain, un site, une commune…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input max-w-[180px]" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="RESERVE">Réservé</option>
          <option value="VENDU">Vendu</option>
        </select>
        <select className="input max-w-[180px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          <option value="HABITATION">Habitation</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="AGRICOLE">Agricole</option>
          <option value="MIXTE">Mixte</option>
        </select>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}
      {!isLoading && (
        <div className="text-sm text-slate-400">{filtered.length} terrain(s)</div>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((t) => (
          <Link key={t.id} to={`/terrains/${t.id}`} className="group block">
            <div className="zoom relative aspect-[4/3] rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-100">
              {t.images?.[0] ? (
                <img src={t.images[0].url} alt="" />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl">🗺️</div>
              )}
              {t.enVedette && (
                <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold text-white shadow">★ Vedette</span>
              )}
              <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold shadow ${badge[t.statut]}`}>
                {t.statut}
              </span>
            </div>
            <div className="mt-3">
              <div className="font-bold text-slate-900 group-hover:text-brand-700">
                {t.titre ?? `Parcelle N° ${t.numeroParcelle}`}
              </div>
              <div className="text-sm text-slate-500">📍 {t.site.nom}{t.site.commune ? ` · ${t.site.commune}` : ''}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">{Number(t.superficie)} m² · {t.type}</span>
                <span className="font-extrabold text-brand-700">{t.prix ? formatFCFA(Number(t.prix)) : 'Sur demande'}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!isLoading && filtered.length === 0 && (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 ring-1 ring-slate-100">
          Aucun terrain ne correspond à votre recherche.
        </div>
      )}
    </div>
  );
}
