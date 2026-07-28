import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ActuMedia { id: string; url: string; mediaType: 'IMAGE' | 'VIDEO' }
interface Actualite {
  id: string;
  titre: string;
  description?: string;
  createdAt: string;
  medias: ActuMedia[];
}

function ActualiteCard({ a }: { a: Actualite }) {
  const [idx, setIdx] = useState(0);
  const current = a.medias[idx];

  return (
    <div className="card overflow-hidden p-0">
      {current && (
        <div className="relative h-64 bg-slate-100">
          {current.mediaType === 'VIDEO'
            ? <video src={current.url} controls className="h-full w-full object-cover" />
            : <img src={current.url} alt="" className="h-full w-full object-cover" />}
          {a.medias.length > 1 && (
            <>
              <button onClick={() => setIdx((i) => (i - 1 + a.medias.length) % a.medias.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow">‹</button>
              <button onClick={() => setIdx((i) => (i + 1) % a.medias.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow">›</button>
              <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
                {idx + 1}/{a.medias.length}
              </div>
            </>
          )}
        </div>
      )}
      <div className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <h3 className="mt-1 text-xl font-bold text-slate-800">{a.titre}</h3>
        {a.description && <p className="mt-2 text-sm text-slate-600">{a.description}</p>}
      </div>
    </div>
  );
}

export default function PublicActualites() {
  const { data = [], isLoading } = useQuery<Actualite[]>({
    queryKey: ['public-actualites'],
    queryFn: async () => (await api.get('/public/actualites')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Suivi des visites</span>
        <h1 className="h-display text-3xl md:text-4xl">Actualités</h1>
        <p className="mt-2 text-slate-500">
          Les visites, avancées de chantier et événements de la semaine sur nos sites.
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.map((a) => <ActualiteCard key={a.id} a={a} />)}
      </div>

      {data.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">
          Aucune actualité publiée pour le moment.
        </div>
      )}
    </div>
  );
}
