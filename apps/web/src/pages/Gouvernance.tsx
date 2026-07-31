import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Membre {
  id: string;
  nom: string;
  poste: string;
  biographie?: string;
  photoUrl?: string;
  ordre: number;
}

export default function GouvernancePage() {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [poste, setPoste] = useState('');
  const [biographie, setBiographie] = useState('');
  const [ordre, setOrdre] = useState('0');
  const [photo, setPhoto] = useState<File | null>(null);

  const { data = [], isLoading } = useQuery<Membre[]>({
    queryKey: ['gouvernance'],
    queryFn: async () => (await api.get('/gouvernance')).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('nom', nom);
      fd.append('poste', poste);
      if (biographie) fd.append('biographie', biographie);
      fd.append('ordre', ordre || '0');
      if (photo) fd.append('photo', photo);
      return (await api.post('/gouvernance', fd)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gouvernance'] });
      setNom('');
      setPoste('');
      setBiographie('');
      setOrdre('0');
      setPhoto(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/gouvernance/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gouvernance'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gouvernance</h1>
        <p className="text-sm text-slate-500">
          Membres de l'équipe dirigeante affichés sur la page « Notre équipe » du site.
          Le premier de la liste est mis en avant.
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold text-slate-800">＋ Ajouter un membre</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Nom complet *</label>
            <input
              className="input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex : Cheikh Diagne"
            />
          </div>
          <div>
            <label className="label">Poste *</label>
            <input
              className="input"
              value={poste}
              onChange={(e) => setPoste(e.target.value)}
              placeholder="ex : Directeur Général"
            />
          </div>
          <div>
            <label className="label">Photo</label>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
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
            <div className="mt-1 text-xs text-slate-400">
              0 en premier — le membre en tête est mis en avant sur la page.
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label">Biographie</label>
            <textarea
              className="input min-h-[80px]"
              value={biographie}
              onChange={(e) => setBiographie(e.target.value)}
              placeholder="Parcours, responsabilités…"
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
            disabled={!nom || !poste || create.isPending}
            className="btn-primary"
          >
            {create.isPending ? 'Envoi…' : 'Ajouter le membre'}
          </button>
        </div>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((m, i) => (
          <div key={m.id} className="card overflow-hidden p-0">
            {m.photoUrl ? (
              <img src={m.photoUrl} alt={m.nom} className="h-56 w-full object-cover object-top" />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-brand-50 text-4xl font-black text-brand-300">
                {m.nom?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800">{m.nom}</div>
                  <div className="text-sm text-brand-700">{m.poste}</div>
                </div>
                {i === 0 && (
                  <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[10px] font-bold text-gold-600">
                    À la une
                  </span>
                )}
              </div>
              {m.biographie && (
                <div className="mt-2 line-clamp-3 text-sm text-slate-500">{m.biographie}</div>
              )}
              <button
                onClick={() => { if (confirm(`Retirer ${m.nom} de la gouvernance ?`)) del.mutate(m.id); }}
                className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {data.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">
          Aucun membre pour le moment.
        </div>
      )}
    </div>
  );
}
