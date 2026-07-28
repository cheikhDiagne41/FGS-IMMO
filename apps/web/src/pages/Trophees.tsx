import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Trophee {
  id: string;
  titre: string;
  description?: string;
  imageUrl: string;
  createdAt: string;
}

export default function TropheesPage() {
  const qc = useQueryClient();
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data = [], isLoading } = useQuery<Trophee[]>({
    queryKey: ['trophees'],
    queryFn: async () => (await api.get('/trophees')).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('titre', titre);
      if (description) fd.append('description', description);
      if (file) fd.append('image', file);
      return (await api.post('/trophees', fd)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trophees'] });
      setTitre('');
      setDescription('');
      setFile(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/trophees/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trophees'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Trophées</h1>
        <p className="text-sm text-slate-500">
          Distinctions affichées sur la page d'accueil du site (carte « Nos trophées »).
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold text-slate-800">＋ Ajouter un trophée</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Titre *</label>
            <input
              className="input"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="ex : Meilleur promoteur immobilier 2025"
            />
          </div>
          <div>
            <label className="label">Image *</label>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input min-h-[70px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Remis par… / à l'occasion de…"
            />
          </div>
        </div>
        {create.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(create.error as any)?.response?.data?.message ?? 'Erreur lors de l\'ajout.'}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={() => create.mutate()}
            disabled={!titre || !file || create.isPending}
            className="btn-primary"
          >
            {create.isPending ? 'Envoi…' : 'Ajouter le trophée'}
          </button>
        </div>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((t) => (
          <div key={t.id} className="card overflow-hidden p-0">
            <img src={t.imageUrl} alt={t.titre} className="h-40 w-full object-cover" />
            <div className="p-4">
              <div className="font-bold text-slate-800">{t.titre}</div>
              {t.description && (
                <div className="mt-1 text-sm text-slate-500">{t.description}</div>
              )}
              <button
                onClick={() => { if (confirm(`Supprimer le trophée « ${t.titre} » ?`)) del.mutate(t.id); }}
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
          Aucun trophée ajouté pour le moment.
        </div>
      )}
    </div>
  );
}
