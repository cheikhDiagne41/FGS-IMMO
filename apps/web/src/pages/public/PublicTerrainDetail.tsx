import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../../lib/api';
import MapView, { MapPoint } from '../../components/MapView';
import MessageVendeurForm from '../../components/MessageVendeurForm';

interface Media { id: string; url: string; mediaType: 'IMAGE' | 'VIDEO' }
interface Terrain {
  id: string; numeroParcelle: string; reference: string; titre?: string;
  description?: string; document?: string; enVedette: boolean;
  superficie: number; prix: number | null; type: string; statut: string;
  latitude: number | null; longitude: number | null;
  site: { id: string; nom: string; commune?: string; region?: string; adresse?: string; type: string };
  images: Media[];
  vendeur: { nom: string; telephone?: string };
}

const badge: Record<string, { label: string; cls: string }> = {
  DISPONIBLE: { label: 'Disponible', cls: 'bg-brand-50 text-brand-700' },
  RESERVE: { label: 'Réservé', cls: 'bg-amber-50 text-amber-700' },
  VENDU: { label: 'Vendu', cls: 'bg-slate-200 text-slate-600' },
};

export default function PublicTerrainDetail() {
  const { id } = useParams();
  const [idx, setIdx] = useState(0);
  const { data: t, isLoading } = useQuery<Terrain>({
    queryKey: ['public-terrain', id],
    queryFn: async () => (await api.get(`/public/terrains/${id}`)).data,
  });

  if (isLoading || !t)
    return <div className="p-10 text-center text-slate-400">Chargement…</div>;

  const media = t.images;
  const current = media[idx];
  const b = badge[t.statut];
  const tel = (t.vendeur.telephone ?? '').replace(/\s/g, '');
  const points: MapPoint[] = t.latitude && t.longitude
    ? [{ id: t.id, lat: t.latitude, lng: t.longitude, label: t.titre ?? `Parcelle ${t.numeroParcelle}`, sub: t.site.nom, statut: t.statut }]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-slate-600">Accueil</Link><span>›</span>
        <Link to="/terrains" className="hover:text-slate-600">Terrains</Link><span>›</span>
        <span className="text-slate-700">{t.site.nom}</span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex flex-col gap-4 lg:w-5/12">
          <div className="card p-3">
            <div className="relative h-72 overflow-hidden rounded-xl bg-slate-100">
              {current
                ? (current.mediaType === 'VIDEO'
                    ? <video src={current.url} controls className="h-full w-full object-cover" />
                    : <img src={current.url} alt="" className="h-full w-full object-cover" />)
                : <div className="flex h-full items-center justify-center text-6xl">🗺️</div>}
              {media.length > 1 && (
                <>
                  <button onClick={() => setIdx((i) => (i - 1 + media.length) % media.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow">‹</button>
                  <button onClick={() => setIdx((i) => (i + 1) % media.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow">›</button>
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">{idx + 1}/{media.length}</div>
                </>
              )}
            </div>
            {media.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {media.map((m, i) => (
                  <button key={m.id} onClick={() => setIdx(i)}
                    className={`h-14 w-16 flex-shrink-0 overflow-hidden rounded-lg ring-2 ${i === idx ? 'ring-brand-500' : 'ring-transparent'}`}>
                    {m.mediaType === 'VIDEO'
                      ? <div className="flex h-full items-center justify-center bg-slate-800 text-white">▶</div>
                      : <img src={m.url} alt="" className="h-full w-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card flex-1">
            <h3 className="mb-2 text-xs font-bold uppercase text-slate-400">Description</h3>
            <p className="text-sm text-slate-600">
              {t.description ?? 'Aucune description fournie pour cette parcelle.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:w-4/12">
          <div className="card flex flex-1 flex-col space-y-4 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${b.cls}`}>{b.label}</span>
                {t.enVedette && <span className="rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600">★ En vedette</span>}
              </div>
              <span className="font-mono text-xs text-slate-400">{t.reference}</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">{t.titre ?? `Parcelle N° ${t.numeroParcelle}`}</h1>
              <div className="mt-1 text-sm text-slate-500">📍 {[t.site.adresse, t.site.commune, t.site.region].filter(Boolean).join(', ') || t.site.nom}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-400">Superficie</div><div className="font-bold">{Number(t.superficie)} m²</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-400">Document</div><div className="font-bold">{t.document ?? '—'}</div></div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Prix total</div>
              <div className="text-3xl font-extrabold text-slate-800">{t.prix ? formatFCFA(Number(t.prix)) : 'Sur demande'}</div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{t.vendeur.nom?.[0] ?? 'V'}</div>
                <div>
                  <div className="font-bold text-slate-800">{t.vendeur.nom}</div>
                  <div className="text-xs text-slate-400">Vendeur{t.vendeur.telephone ? ` · ${t.vendeur.telephone}` : ''}</div>
                </div>
              </div>
              {tel && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a href={`tel:${tel}`} className="flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">📞 Appel</a>
                  <a href={`sms:${tel}`} className="flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">💬 SMS</a>
                  <a href={`https://wa.me/${tel.replace('+', '')}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">💬 WhatsApp</a>
                </div>
              )}
              <MessageVendeurForm terrainId={t.id} />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:w-3/12">
          <div className="card flex flex-1 flex-col p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Localisation</div>
            <div className="min-h-[300px] flex-1">
              {points.length > 0
                ? <MapView points={points} height="100%" />
                : <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-center text-sm text-slate-400">GPS non renseigné</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
