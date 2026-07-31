import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Vignette : image, ou 1re image de la vidéo (avec bouton lecture) */
function Vignette({ media, classe }: { media?: ActuMedia; classe: string }) {
  const [erreur, setErreur] = useState(false);

  if (!media || erreur) {
    return (
      <div className={`${classe} flex items-center justify-center bg-slate-100 text-4xl`}>
        {media?.mediaType === 'VIDEO' ? '🎬' : '📰'}
      </div>
    );
  }

  if (media.mediaType === 'VIDEO') {
    return (
      <div className={`${classe} relative bg-slate-900`}>
        {/* #t=0.1 force le navigateur à afficher une image du début de la vidéo */}
        <video
          src={`${media.url}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          onError={() => setErreur(true)}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 text-2xl text-white backdrop-blur transition group-hover:bg-white/50">
            ▶
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={media.url}
      alt=""
      onError={() => setErreur(true)}
      className={`${classe} object-cover`}
    />
  );
}

function Badge({ media }: { media?: ActuMedia }) {
  const estVideo = media?.mediaType === 'VIDEO';
  return (
    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-700 shadow">
      {estVideo ? 'Vidéo' : 'Photo'}
    </span>
  );
}

/** Fiche détaillée ouverte au clic (galerie + description complète) */
function ActualiteModal({ a, onClose }: { a: Actualite; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [sonBloque, setSonBloque] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = a.medias[idx];

  /**
   * Lance la lecture avec le son. Les navigateurs interdisent la lecture
   * automatique sonore hors geste utilisateur : en cas de refus on démarre
   * en sourdine et on propose un bouton pour activer le son.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || current?.mediaType !== 'VIDEO') return;
    setSonBloque(false);
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {
      v.muted = true;
      setSonBloque(true);
      v.play().catch(() => undefined);
    });
  }, [current]);

  const activerSon = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    setSonBloque(false);
    v.play().catch(() => undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {current && (
          <div className="relative h-80 bg-slate-900">
            {current.mediaType === 'VIDEO' ? (
              <>
                <video
                  ref={videoRef}
                  key={current.id}
                  src={current.url}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
                {sonBloque && (
                  <button
                    onClick={activerSon}
                    className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-5 py-2 text-sm font-bold text-brand-700 shadow-lg"
                  >
                    🔊 Activer le son
                  </button>
                )}
              </>
            ) : (
              <img src={current.url} alt="" className="h-full w-full object-contain" />
            )}
            {a.medias.length > 1 && (
              <>
                <button
                  onClick={() => setIdx((i) => (i - 1 + a.medias.length) % a.medias.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow"
                >
                  ‹
                </button>
                <button
                  onClick={() => setIdx((i) => (i + 1) % a.medias.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow"
                >
                  ›
                </button>
                <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
                  {idx + 1}/{a.medias.length}
                </div>
              </>
            )}
          </div>
        )}
        <div className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {formatDate(a.createdAt)}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-800">{a.titre}</h2>
          {a.description && <p className="mt-3 whitespace-pre-line text-slate-600">{a.description}</p>}
          <div className="mt-5 flex justify-end">
            <button onClick={onClose} className="btn-ghost">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicActualites() {
  const [ouverte, setOuverte] = useState<Actualite | null>(null);

  const { data = [], isLoading } = useQuery<Actualite[]>({
    queryKey: ['public-actualites'],
    queryFn: async () => (await api.get('/public/actualites')).data,
  });

  const une = data[0];
  const autres = data.slice(1);

  return (
    <div className="space-y-10">
      {/* BANNIÈRE */}
      <section className="bleed -mt-6 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-14">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div className="text-white">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-2 rounded-full bg-gold-500 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-gold-600"
            >
              <span>←</span> Retour à l'accueil
            </Link>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
              Actualités
            </div>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              Toutes les actualités de FGS_IMMO
            </h1>
            <p className="mt-4 max-w-lg text-white/80">
              Suivez les visites de terrain, l'avancement des chantiers et les
              temps forts de la vie de l'entreprise.
            </p>
          </div>

          {/* À la une */}
          {une && (
            <button
              onClick={() => setOuverte(une)}
              className="group rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/20 backdrop-blur transition hover:bg-white/15"
            >
              <div className="flex gap-4">
                <div className="w-32 flex-shrink-0 overflow-hidden rounded-xl">
                  <Vignette media={une.medias[0]} classe="h-32 w-32" />
                </div>
                <div className="min-w-0 flex-1 text-white">
                  <div className="flex items-center gap-3">
                    <Badge media={une.medias[0]} />
                    <span className="text-sm text-white/80">{formatDate(une.createdAt)}</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-white/10 p-3 font-bold leading-snug">
                    {une.titre}
                  </div>
                  {une.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/75">{une.description}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700">
                      Lire <span className="transition group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* GRILLE */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        {isLoading && <div className="text-slate-400">Chargement…</div>}

        {data.length === 0 && !isLoading && (
          <div className="card text-center text-slate-500">
            Aucune actualité publiée pour le moment.
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {autres.map((a) => (
            <button
              key={a.id}
              onClick={() => setOuverte(a)}
              className="group block text-left"
            >
              <div className="zoom relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
                <Vignette media={a.medias[0]} classe="h-full w-full" />
                <span className="absolute left-3 top-3">
                  <Badge media={a.medias[0]} />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {formatDate(a.createdAt)}
                </div>
                <div className="mt-1 font-bold text-slate-900 group-hover:text-brand-700">
                  {a.titre}
                </div>
                {a.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {ouverte && <ActualiteModal a={ouverte} onClose={() => setOuverte(null)} />}
    </div>
  );
}
