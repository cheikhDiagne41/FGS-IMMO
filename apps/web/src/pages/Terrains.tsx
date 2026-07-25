import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import TerrainDetailModal from '../components/TerrainDetailModal';
import TerrainFormModal from '../components/TerrainFormModal';

interface Terrain {
  id: string;
  numeroParcelle: string;
  superficie: number;
  prix: number | null;
  type: string;
  statut: 'DISPONIBLE' | 'RESERVE' | 'VENDU';
  site: { nom: string; commune?: string };
}

const statutStyle: Record<string, string> = {
  DISPONIBLE: 'bg-brand-50 text-brand-700',
  RESERVE: 'bg-amber-50 text-amber-700',
  VENDU: 'bg-slate-200 text-slate-600',
};

export default function Terrains() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GESTIONNAIRE';
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    statut: '',
    type: '',
    prixMax: '',
    superficieMin: '',
  });

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));

  const { data: terrains = [], isLoading } = useQuery<Terrain[]>({
    queryKey: ['terrains', filters],
    queryFn: async () =>
      (await api.get(`/terrains?${params.toString()}`)).data,
  });

  const set = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Terrains</h1>
          <p className="text-sm text-slate-500">
            Catalogue des parcelles — cliquez sur une parcelle pour voir sa fiche
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            ＋ Nouveau terrain
          </button>
        )}
      </div>

      {/* Barre de filtres */}
      <div className="card grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="label">Statut</label>
          <select
            className="input"
            value={filters.statut}
            onChange={(e) => set('statut', e.target.value)}
          >
            <option value="">Tous</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="RESERVE">Réservé</option>
            <option value="VENDU">Vendu</option>
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={filters.type}
            onChange={(e) => set('type', e.target.value)}
          >
            <option value="">Tous</option>
            <option value="HABITATION">Habitation</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="AGRICOLE">Agricole</option>
            <option value="MIXTE">Mixte</option>
          </select>
        </div>
        <div>
          <label className="label">Prix max (FCFA)</label>
          <input
            type="number"
            className="input"
            value={filters.prixMax}
            onChange={(e) => set('prixMax', e.target.value)}
            placeholder="ex : 20000000"
          />
        </div>
        <div>
          <label className="label">Superficie min (m²)</label>
          <input
            type="number"
            className="input"
            value={filters.superficieMin}
            onChange={(e) => set('superficieMin', e.target.value)}
            placeholder="ex : 200"
          />
        </div>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {terrains.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className="card cursor-pointer text-left transition hover:shadow-md hover:ring-2 hover:ring-brand-200"
          >
            <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-4xl">
              🗺️
            </div>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-slate-800">
                  Parcelle {t.numeroParcelle}
                </div>
                <div className="text-xs text-slate-500">
                  {t.site.nom}
                  {t.site.commune ? ` · ${t.site.commune}` : ''}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statutStyle[t.statut]}`}
              >
                {t.statut}
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-[11px] text-slate-400">
                  {Number(t.superficie)} m² · {t.type}
                </div>
                <div className="font-bold text-brand-700">
                  {t.prix ? formatFCFA(Number(t.prix)) : 'Prix sur demande'}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {terrains.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">
          Aucun terrain ne correspond à ces critères.
        </div>
      )}

      {selected && (
        <TerrainDetailModal
          terrainId={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {showForm && <TerrainFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
