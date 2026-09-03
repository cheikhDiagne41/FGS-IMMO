import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import SiteFormModal from '../components/SiteFormModal';
import BadgeGestionnaire from '../components/BadgeGestionnaire';

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
  type?: string;
  photos?: { id: string; url: string }[];
  vendeur?: { id: string; nom: string } | null;
  _count: { cooperatives: number; terrains: number };
}

const statutStyle: Record<string, string> = {
  DISPONIBLE: 'bg-brand-50 text-brand-700',
  EN_COMMERCIALISATION: 'bg-amber-50 text-amber-700',
  CLOTURE: 'bg-slate-200 text-slate-600',
};

export default function Sites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'GESTIONNAIRE' ||
    user?.role === 'VENDEUR';
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => (await api.get('/sites')).data,
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/sites/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
    onError: (e: any) =>
      alert(e?.response?.data?.message ?? 'Suppression impossible.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sites immobiliers</h1>
          <p className="text-sm text-slate-500">
            Gestion des sites et de leurs lotissements
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            ＋ Nouveau site
          </button>
        )}
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((s) => (
          <Link key={s.id} to={`/sites/${s.id}`} className="card block overflow-hidden transition hover:shadow-md hover:ring-2 hover:ring-brand-200">
            {s.photos && s.photos[0] && (
              <div className="-mx-5 -mt-5 mb-4 h-36 overflow-hidden">
                <img src={s.photos[0].url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">
                  {s.code}
                </div>
                <h3 className="font-bold text-slate-800">{s.nom}</h3>
                <div className="text-sm text-slate-500">
                  {[s.commune, s.region].filter(Boolean).join(', ')}
                </div>
                <div className="mt-1">
                  <BadgeGestionnaire vendeur={s.vendeur} />
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
            {isAdmin && (
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(s); }}
                  className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (confirm(`Supprimer le site « ${s.nom} » ?`)) del.mutate(s.id);
                  }}
                  className="flex-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  🗑️ Supprimer
                </button>
              </div>
            )}
          </Link>
        ))}
      </div>

      {sites.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">Aucun site.</div>
      )}

      {showForm && <SiteFormModal onClose={() => setShowForm(false)} />}
      {editing && (
        <SiteFormModal initial={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
