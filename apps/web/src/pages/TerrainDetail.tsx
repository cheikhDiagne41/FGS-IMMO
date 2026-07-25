import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Media { id: string; url: string; mediaType: 'IMAGE' | 'VIDEO' }
interface Modalite {
  id: string; nom: string; montantAcompte: number;
  cotisationMensuelle: number; nbMensualites: number;
}
interface TerrainDetail {
  id: string; numeroParcelle: string; reference: string; titre?: string;
  description?: string; document?: string; enVedette: boolean;
  superficie: number; prix: number | null; type: string; statut: string;
  latitude: number | null; longitude: number | null;
  site: { id: string; nom: string; commune?: string; region?: string; adresse?: string; type: string };
  images: Media[];
  modalites: Modalite[];
  vendeur: { nom: string; telephone?: string; estAnnonce: boolean };
  favorisCount: number; isFavori: boolean;
}

const statutBadge: Record<string, { label: string; cls: string }> = {
  DISPONIBLE: { label: 'Disponible', cls: 'bg-brand-50 text-brand-700' },
  RESERVE: { label: 'Réservé', cls: 'bg-amber-50 text-amber-700' },
  VENDU: { label: 'Vendu', cls: 'bg-slate-200 text-slate-600' },
};

function AchatDirectModal({
  terrain, onClose, onDone,
}: { terrain: TerrainDetail; onClose: () => void; onDone: () => void }) {
  const [methode, setMethode] = useState('WAVE');
  const buy = useMutation({
    mutationFn: async () =>
      (await api.post(`/paiements/achat-direct/${terrain.id}`, {
        montant: terrain.prix ?? 0, methode, refTransaction: `${methode}-${Date.now()}`,
      })).data,
    onSuccess: onDone,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800">Acheter cette parcelle</h3>
        <p className="text-sm text-slate-500">
          Parcelle N° {terrain.numeroParcelle} — paiement unique, sans acompte ni mensualité.
        </p>
        <div className="my-4 rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xs text-slate-400">Prix total</div>
          <div className="text-2xl font-extrabold text-brand-700">
            {terrain.prix ? formatFCFA(terrain.prix) : '—'}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['WAVE', '🌊 Wave'], ['ORANGE_MONEY', '🟠 Orange Money']].map(([v, l]) => (
            <button key={v} onClick={() => setMethode(v)}
              className={`rounded-xl border-2 p-3 text-sm font-semibold ${methode === v ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
              {l}
            </button>
          ))}
        </div>
        {buy.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(buy.error as any)?.response?.data?.message ?? 'Achat impossible.'}
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
          <button onClick={() => buy.mutate()} className="btn-primary flex-1" disabled={buy.isPending}>
            {buy.isPending ? 'Traitement…' : 'Confirmer l\'achat'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TerrainDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [buying, setBuying] = useState(false);
  const [flash, setFlash] = useState('');
  const [message, setMessage] = useState('');
  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GESTIONNAIRE';

  const { data: t, isLoading } = useQuery<TerrainDetail>({
    queryKey: ['terrain', id],
    queryFn: async () => (await api.get(`/terrains/${id}`)).data,
  });

  const fav = useMutation({
    mutationFn: async () => (await api.post(`/terrains/${id}/favori`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['terrain', id] }),
  });
  const visite = useMutation({
    mutationFn: async () => (await api.post(`/terrains/${id}/visite`, { message })).data,
    onSuccess: () => { setFlash('Votre demande a été transmise au vendeur.'); setMessage(''); },
  });
  const uploadMedia = useMutation({
    mutationFn: async (files: FileList) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      return (await api.post(`/terrains/${id}/media`, fd)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['terrain', id] }),
  });

  if (isLoading || !t)
    return <div className="p-10 text-center text-slate-400">Chargement…</div>;

  const badge = statutBadge[t.statut];
  const media = t.images;
  const current = media[idx];
  const bbox = t.latitude && t.longitude
    ? `${t.longitude - 0.01},${t.latitude - 0.01},${t.longitude + 0.01},${t.latitude + 0.01}` : null;
  const isCoop = t.site.type === 'COOPERATIVE';
  const dispo = t.statut === 'DISPONIBLE';
  const tel = (t.vendeur.telephone ?? '').replace(/\s/g, '');

  return (
    <div className="space-y-4">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-slate-600">Accueil</Link>
        <span>›</span>
        <Link to="/terrains" className="hover:text-slate-600">Terrains</Link>
        <span>›</span>
        <span className="text-slate-700">{t.site.nom}</span>
      </div>

      {flash && (
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">✓ {flash}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Colonne gauche : médias + description */}
        <div className="space-y-4 lg:col-span-5">
          <div className="card p-3">
            <div className="relative overflow-hidden rounded-xl bg-slate-100">
              {current ? (
                current.mediaType === 'VIDEO' ? (
                  <video src={current.url} controls className="h-72 w-full object-cover" />
                ) : (
                  <img src={current.url} alt="" className="h-72 w-full object-cover" />
                )
              ) : (
                <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-6xl">🗺️</div>
              )}
              {media.length > 1 && (
                <>
                  <button onClick={() => setIdx((i) => (i - 1 + media.length) % media.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow hover:bg-white">‹</button>
                  <button onClick={() => setIdx((i) => (i + 1) % media.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 shadow hover:bg-white">›</button>
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
                    {idx + 1}/{media.length}
                  </div>
                </>
              )}
            </div>
            {/* Miniatures */}
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {media.map((m, i) => (
                <button key={m.id} onClick={() => setIdx(i)}
                  className={`h-14 w-16 flex-shrink-0 overflow-hidden rounded-lg ring-2 ${i === idx ? 'ring-brand-500' : 'ring-transparent'}`}>
                  {m.mediaType === 'VIDEO'
                    ? <div className="flex h-full items-center justify-center bg-slate-800 text-white">▶</div>
                    : <img src={m.url} alt="" className="h-full w-full object-cover" />}
                </button>
              ))}
              {isAdmin && (
                <label className="flex h-14 w-16 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xl text-slate-400 hover:border-brand-400">
                  +
                  <input type="file" accept="image/*,video/*" multiple className="hidden"
                    onChange={(e) => e.target.files && uploadMedia.mutate(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Description</h3>
            <p className="text-sm text-slate-600">
              {t.description ?? 'Aucune description fournie pour cette parcelle.'}
            </p>
          </div>
        </div>

        {/* Colonne centrale : infos & actions */}
        <div className="lg:col-span-4">
          <div className="card space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                {t.enVedette && (
                  <span className="rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600">★ En vedette</span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-400">{t.reference}</span>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">
                {t.titre ?? `Parcelle N° ${t.numeroParcelle}`}
              </h1>
              <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <span>📍</span>
                {[t.site.adresse, t.site.commune, t.site.region].filter(Boolean).join(', ') || t.site.nom}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase text-slate-400">Superficie</div>
                <div className="font-bold text-slate-800">{Number(t.superficie)} m²</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase text-slate-400">Document</div>
                <div className="font-bold text-slate-800">{t.document ?? '—'}</div>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase text-slate-400">Prix total</div>
                <div className="text-3xl font-extrabold text-slate-800">
                  {t.prix ? formatFCFA(t.prix) : 'Sur demande'}
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-700">
                <span>▦</span> Passeport
              </div>
            </div>

            {/* Action principale */}
            {dispo && isClient && t.site.type === 'VENTE_DIRECTE' && (
              <button onClick={() => setBuying(true)} className="btn-primary w-full">
                Acheter cette parcelle
              </button>
            )}
            {dispo && isClient && isCoop && (
              <Link to="/cooperatives" className="btn-primary w-full text-center">
                Rejoindre la coopérative
              </Link>
            )}
            {(!dispo || !isClient) && (
              <button disabled className="btn w-full cursor-not-allowed bg-slate-100 text-slate-400">
                {dispo ? 'Réservé aux clients' : 'Indisponible'}
              </button>
            )}

            {isClient && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => fav.mutate()} className="btn-ghost">
                  {t.isFavori ? '❤️ Favori' : '🤍 Favori'}
                </button>
                <button
                  onClick={() => document.getElementById('msg-vendeur')?.focus()}
                  className="btn-ghost">📅 Visite</button>
              </div>
            )}

            {/* Carte vendeur */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {t.vendeur.nom?.[0] ?? 'V'}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{t.vendeur.nom}</div>
                  <div className="text-xs text-slate-400">
                    Vendeur{t.vendeur.telephone ? ` · ${t.vendeur.telephone}` : ''}
                  </div>
                </div>
              </div>
              {tel && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a href={`tel:${tel}`} className="btn-ghost justify-center text-xs">📞 Appel</a>
                  <a href={`sms:${tel}`} className="btn-ghost justify-center text-xs">💬 SMS</a>
                  <a href={`https://wa.me/${tel.replace('+', '')}`} target="_blank" rel="noreferrer"
                    className="justify-center rounded-lg bg-brand-600 px-2 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700">
                    WhatsApp
                  </a>
                </div>
              )}
              {isClient && (
                <div className="mt-2 flex gap-2">
                  <input id="msg-vendeur" value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message au vendeur…" className="input flex-1" />
                  <button onClick={() => visite.mutate()} disabled={visite.isPending}
                    className="rounded-lg bg-brand-600 px-3 text-white hover:bg-brand-700">➤</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite : localisation */}
        <div className="lg:col-span-3">
          <div className="card p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Localisation</div>
            {bbox ? (
              <iframe title="Carte" className="h-[420px] w-full rounded-xl border border-slate-200"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${t.latitude},${t.longitude}`} />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-xl bg-slate-50 text-center text-sm text-slate-400">
                Coordonnées GPS<br />non renseignées
              </div>
            )}
          </div>
        </div>
      </div>

      {buying && t.prix !== null && (
        <AchatDirectModal
          terrain={t}
          onClose={() => setBuying(false)}
          onDone={() => {
            setBuying(false);
            setFlash('Achat confirmé ! Votre facture est disponible dans « Mes factures ».');
            qc.invalidateQueries({ queryKey: ['terrain', id] });
            qc.invalidateQueries({ queryKey: ['terrains'] });
            setTimeout(() => navigate('/factures'), 1500);
          }}
        />
      )}
    </div>
  );
}
