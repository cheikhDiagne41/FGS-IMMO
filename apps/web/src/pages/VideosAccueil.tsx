import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface VideoAccueil {
  id: string;
  titre?: string;
  videoUrl: string;
  createdAt: string;
}

export default function VideosAccueilPage() {
  const qc = useQueryClient();
  const [titre, setTitre] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data = [], isLoading } = useQuery<VideoAccueil[]>({
    queryKey: ['videos-accueil'],
    queryFn: async () => (await api.get('/videos-accueil')).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (titre) fd.append('titre', titre);
      if (file) fd.append('video', file);
      return (await api.post('/videos-accueil', fd)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos-accueil'] });
      setTitre('');
      setFile(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/videos-accueil/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['videos-accueil'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Vidéos d'accueil</h1>
        <p className="text-sm text-slate-500">
          Vidéos affichées dans le carrousel du hero de la page d'accueil, au même titre que les photos des terrains vedettes.
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold text-slate-800">＋ Ajouter une vidéo</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Titre (optionnel)</label>
            <input
              className="input"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="ex : Visite du site de Diamniadio"
            />
          </div>
          <div>
            <label className="label">Fichier vidéo *</label>
            <input
              type="file"
              accept="video/*"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
            disabled={!file || create.isPending}
            className="btn-primary"
          >
            {create.isPending ? 'Envoi…' : 'Ajouter la vidéo'}
          </button>
        </div>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((v) => (
          <div key={v.id} className="card overflow-hidden p-0">
            <video src={v.videoUrl} controls className="h-40 w-full bg-black object-cover" />
            <div className="p-4">
              <div className="font-bold text-slate-800">{v.titre ?? 'Sans titre'}</div>
              <button
                onClick={() => { if (confirm('Supprimer cette vidéo ?')) del.mutate(v.id); }}
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
          Aucune vidéo ajoutée pour le moment — la vidéo par défaut du hero reste affichée.
        </div>
      )}
    </div>
  );
}
