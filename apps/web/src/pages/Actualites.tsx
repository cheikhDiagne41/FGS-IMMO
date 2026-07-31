import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ActuMedia { id: string; url: string; mediaType: 'IMAGE' | 'VIDEO' }
interface Actualite {
  id: string;
  titre: string;
  description?: string;
  createdAt: string;
  medias: ActuMedia[];
}

function ActualiteForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [medias, setMedias] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: async () => {
      const actu = (await api.post('/actualites', { titre, description })).data;
      if (medias.length > 0) {
        const fd = new FormData();
        medias.forEach((f) => fd.append('files', f));
        await api.post(`/actualites/${actu.id}/media`, fd);
      }
      return actu;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actualites'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">＋ Nouvelle actualité</h3>
        <p className="mb-4 text-sm text-slate-500">
          Partagez les photos et vidéos des visites de la semaine avec une description.
        </p>

        <div className="space-y-3">
          <div>
            <label className="label">Titre *</label>
            <input
              className="input"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="ex : Visite du site de Diamniadio — semaine du 21 juillet"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[90px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails de la visite, avancement des travaux…"
            />
          </div>
          <div>
            <label className="label">Photos & vidéos</label>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => setMedias((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
            <div className="flex flex-wrap gap-2">
              {medias.map((m, i) => (
                <div key={i} className="relative">
                  {m.type.startsWith('video') ? (
                    <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-slate-800 text-white">▶</div>
                  ) : (
                    <img src={URL.createObjectURL(m)} alt="" className="h-16 w-20 rounded-lg object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedias((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-16 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-2xl text-slate-400 hover:border-brand-400"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {create.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(create.error as any)?.response?.data?.message ?? 'Erreur lors de la publication.'}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button
            onClick={() => create.mutate()}
            disabled={!titre || create.isPending}
            className="btn-primary"
          >
            {create.isPending ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActualitesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data = [], isLoading } = useQuery<Actualite[]>({
    queryKey: ['actualites'],
    queryFn: async () => (await api.get('/actualites')).data,
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/actualites/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actualites'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Actualités</h1>
          <p className="text-sm text-slate-500">
            Publiez les visites de la semaine (photos, vidéos, description) — visible par tous les visiteurs.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">＋ Nouvelle actualité</button>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="space-y-4">
        {data.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800">{a.titre}</div>
                <div className="text-xs text-slate-400">
                  {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <button
                onClick={() => { if (confirm(`Supprimer l'actualité « ${a.titre} » ?`)) del.mutate(a.id); }}
                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
              >
                🗑️ Supprimer
              </button>
            </div>
            {a.description && <p className="mt-2 text-sm text-slate-600">{a.description}</p>}
            {a.medias.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {a.medias.map((m) => (
                  m.mediaType === 'VIDEO' ? (
                    <video
                      key={m.id}
                      src={`${m.url}#t=0.1`}
                      controls
                      preload="metadata"
                      className="h-24 w-32 rounded-lg bg-slate-900 object-cover"
                    />
                  ) : (
                    <img key={m.id} src={m.url} alt="" className="h-24 w-32 rounded-lg object-cover" />
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">
          Aucune actualité publiée pour le moment.
        </div>
      )}

      {showForm && <ActualiteForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
