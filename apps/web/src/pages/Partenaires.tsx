import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Partenaire {
  id: string;
  nom: string;
  logoUrl: string;
  siteWeb?: string;
  ordre: number;
}

export default function PartenairesPage() {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [ordre, setOrdre] = useState('0');
  const [logo, setLogo] = useState<File | null>(null);

  const { data = [], isLoading } = useQuery<Partenaire[]>({
    queryKey: ['partenaires'],
    queryFn: async () => (await api.get('/partenaires')).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('nom', nom);
      if (siteWeb) fd.append('siteWeb', siteWeb);
      fd.append('ordre', ordre || '0');
      if (logo) fd.append('logo', logo);
      return (await api.post('/partenaires', fd)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partenaires'] });
      setNom('');
      setSiteWeb('');
      setOrdre('0');
      setLogo(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/partenaires/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partenaires'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Partenaires</h1>
        <p className="text-sm text-slate-500">
          Logos affichés dans la section « Nos partenaires » de la page d'accueil.
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold text-slate-800">＋ Ajouter un partenaire</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Nom *</label>
            <input
              className="input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex : Banque Agricole"
            />
          </div>
          <div>
            <label className="label">Logo *</label>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            />
            <div className="mt-1 text-xs text-slate-400">
              Un logo sur fond clair ou transparent rend le mieux.
            </div>
          </div>
          <div>
            <label className="label">Site web (optionnel)</label>
            <input
              className="input"
              value={siteWeb}
              onChange={(e) => setSiteWeb(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="label">Ordre d'affichage</label>
            <input
              type="number"
              className="input"
              value={ordre}
              onChange={(e) => setOrdre(e.target.value)}
            />
          </div>
        </div>
        {create.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(create.error as any)?.response?.data?.message ?? "Erreur lors de l'ajout."}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={() => create.mutate()}
            disabled={!nom || !logo || create.isPending}
            className="btn-primary"
          >
            {create.isPending ? 'Envoi…' : 'Ajouter le partenaire'}
          </button>
        </div>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {data.map((p) => (
          <div key={p.id} className="card text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
              <img src={p.logoUrl} alt={p.nom} className="h-16 w-16 object-contain" />
            </div>
            <div className="mt-3 font-bold text-slate-800">{p.nom}</div>
            {p.siteWeb && (
              <a
                href={p.siteWeb}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs text-brand-600 hover:underline"
              >
                {p.siteWeb}
              </a>
            )}
            <button
              onClick={() => { if (confirm(`Retirer ${p.nom} des partenaires ?`)) del.mutate(p.id); }}
              className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
            >
              🗑️ Supprimer
            </button>
          </div>
        ))}
      </div>

      {data.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">
          Aucun partenaire pour le moment.
        </div>
      )}
    </div>
  );
}
