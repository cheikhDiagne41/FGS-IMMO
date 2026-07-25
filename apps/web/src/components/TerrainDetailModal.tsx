import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Media {
  id: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
}
interface Modalite {
  id: string;
  nom: string;
  numero: string;
  montantAcompte: number;
  cotisationMensuelle: number;
  nbMensualites: number;
  fraisAdhesion: number;
  nbMaxAdherents: number;
  _count: { adhesions: number };
}
interface Vendeur {
  nom: string;
  raisonSociale?: string;
  slogan?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  ninea?: string;
  rccm?: string;
  responsable?: string;
}
interface TerrainDetail {
  id: string;
  numeroParcelle: string;
  superficie: number;
  prix: number | null;
  type: string;
  statut: string;
  latitude: number | null;
  longitude: number | null;
  site: { nom: string; commune?: string; region?: string };
  images: Media[];
  modalites: Modalite[];
  vendeur: Vendeur;
}

const statutStyle: Record<string, string> = {
  DISPONIBLE: 'bg-brand-50 text-brand-700',
  RESERVE: 'bg-amber-50 text-amber-700',
  VENDU: 'bg-slate-200 text-slate-600',
};

export default function TerrainDetailModal({
  terrainId,
  onClose,
}: {
  terrainId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GESTIONNAIRE';

  const { data: t, isLoading } = useQuery<TerrainDetail>({
    queryKey: ['terrain', terrainId],
    queryFn: async () => (await api.get(`/terrains/${terrainId}`)).data,
  });

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      return (await api.post(`/terrains/${terrainId}/media`, fd)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terrain', terrainId] });
      qc.invalidateQueries({ queryKey: ['terrains'] });
    },
  });

  const delMedia = useMutation({
    mutationFn: async (mediaId: string) =>
      (await api.delete(`/terrains/media/${mediaId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['terrain', terrainId] }),
  });

  const bbox = t?.latitude && t?.longitude
    ? `${t.longitude - 0.008},${t.latitude - 0.008},${t.longitude + 0.008},${t.latitude + 0.008}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !t ? (
          <div className="p-10 text-center text-slate-400">Chargement…</div>
        ) : (
          <div>
            {/* En-tête */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">
                  {t.site.nom}
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Parcelle N° {t.numeroParcelle}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${statutStyle[t.statut]}`}
                >
                  {t.statut}
                </span>
                <button
                  onClick={onClose}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-6 p-5">
              {/* Galerie médias */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700">
                    Photos & vidéos
                  </h3>
                  {isAdmin && (
                    <>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) =>
                          e.target.files && upload.mutate(e.target.files)
                        }
                      />
                      <button
                        onClick={() => fileInput.current?.click()}
                        className="btn-ghost text-xs"
                        disabled={upload.isPending}
                      >
                        {upload.isPending ? 'Envoi…' : '＋ Ajouter un média'}
                      </button>
                    </>
                  )}
                </div>
                {t.images.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-5xl">
                    🗺️
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {t.images.map((m) => (
                      <div key={m.id} className="group relative">
                        {m.mediaType === 'VIDEO' ? (
                          <video
                            src={m.url}
                            controls
                            className="h-32 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <img
                            src={m.url}
                            alt=""
                            className="h-32 w-full rounded-lg object-cover"
                          />
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => delMedia.mutate(m.id)}
                            className="absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 text-xs text-white group-hover:block"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Infos + localisation */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700">
                    Informations
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <Info label="Superficie" value={`${Number(t.superficie)} m²`} />
                    <Info label="Type" value={t.type} />
                    <Info
                      label="Prix"
                      value={t.prix ? formatFCFA(Number(t.prix)) : 'Sur demande'}
                    />
                    <Info
                      label="Localité"
                      value={[t.site.commune, t.site.region]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    />
                    <Info
                      label="Coordonnées GPS"
                      value={
                        t.latitude && t.longitude
                          ? `${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}`
                          : 'Non renseignées'
                      }
                    />
                  </dl>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-slate-700">
                    Localisation
                  </h3>
                  {bbox ? (
                    <div>
                      <iframe
                        title="Carte"
                        className="h-48 w-full rounded-lg border border-slate-200"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${t.latitude},${t.longitude}`}
                      />
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${t.latitude}&mlon=${t.longitude}#map=16/${t.latitude}/${t.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-brand-600 underline"
                      >
                        Ouvrir dans OpenStreetMap ↗
                      </a>
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
                      Coordonnées GPS non renseignées
                    </div>
                  )}
                </div>
              </div>

              {/* Modalités de paiement */}
              <div>
                <h3 className="mb-2 font-semibold text-slate-700">
                  Modalités de paiement
                </h3>
                {t.modalites.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    Aucune coopérative n'est rattachée à ce site.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {t.modalites.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-100 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-800">
                            {m.nom}{' '}
                            <span className="text-xs font-normal text-slate-400">
                              ({m.numero})
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {m._count.adhesions}/{m.nbMaxAdherents} adhérents
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                          <Modal label="Acompte" value={formatFCFA(Number(m.montantAcompte))} />
                          <Modal
                            label="Mensualité"
                            value={formatFCFA(Number(m.cotisationMensuelle))}
                          />
                          <Modal label="Durée" value={`${m.nbMensualites} mois`} />
                        </div>
                        <div className="mt-2 text-xs text-brand-700">
                          💡 Dès le versement de l'acompte, un numéro de parcelle
                          vous est réservé automatiquement.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vendeur */}
              <div>
                <h3 className="mb-2 font-semibold text-slate-700">Vendeur</h3>
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                      {t.vendeur.nom?.[0] ?? 'F'}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">
                        {t.vendeur.raisonSociale ?? t.vendeur.nom}
                      </div>
                      {t.vendeur.slogan && (
                        <div className="text-xs text-slate-500">
                          {t.vendeur.slogan}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {t.vendeur.adresse && (
                      <VInfo label="Adresse" value={t.vendeur.adresse} />
                    )}
                    {t.vendeur.telephone && (
                      <VInfo label="Téléphone" value={t.vendeur.telephone} />
                    )}
                    {t.vendeur.email && (
                      <VInfo label="Email" value={t.vendeur.email} />
                    )}
                    {t.vendeur.responsable && (
                      <VInfo label="Responsable" value={t.vendeur.responsable} />
                    )}
                    {t.vendeur.ninea && (
                      <VInfo label="NINEA" value={t.vendeur.ninea} />
                    )}
                    {t.vendeur.rccm && (
                      <VInfo label="RCCM" value={t.vendeur.rccm} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-400">{label} : </span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-50 pb-1">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
function Modal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="text-[10px] uppercase text-slate-400">{label}</div>
      <div className="text-xs font-bold text-slate-700">{value}</div>
    </div>
  );
}
