import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../../lib/api';
import MapView, { MapPoint } from '../../components/MapView';

interface Coop {
  id: string; numero: string; nom: string; montantAcompte: number;
  cotisationMensuelle: number; nbMensualites: number; responsable?: string;
  nbMaxAdherents: number; _count: { adhesions: number };
}
interface Parcelle {
  id: string; numeroParcelle: string; statut: string; prix: number | null;
  superficie: number; latitude: number | null; longitude: number | null;
}
interface Site {
  id: string; code: string; nom: string; region?: string; commune?: string;
  adresse?: string; description?: string; type: string;
  latitude: number | null; longitude: number | null;
  gerantNom?: string; gerantTelephone?: string; gerantEmail?: string;
  photos?: { id: string; url: string }[];
  cooperatives: Coop[];
  terrains: Parcelle[];
}

const badge: Record<string, string> = {
  DISPONIBLE: 'bg-brand-50 text-brand-700',
  RESERVE: 'bg-amber-50 text-amber-700',
  VENDU: 'bg-slate-200 text-slate-600',
};

export default function SiteDetail() {
  const { id } = useParams();
  const [photo, setPhoto] = useState(0);
  const { data: s, isLoading } = useQuery<Site>({
    queryKey: ['public-site', id],
    queryFn: async () => (await api.get(`/public/sites/${id}`)).data,
  });

  if (isLoading || !s)
    return <div className="p-10 text-center text-slate-400">Chargement…</div>;

  const points: MapPoint[] = s.terrains
    .filter((t) => t.latitude != null && t.longitude != null)
    .map((t) => ({
      id: t.id, lat: t.latitude!, lng: t.longitude!,
      label: `Parcelle N° ${t.numeroParcelle}`, sub: s.nom,
      statut: t.statut, prix: t.prix, href: `/terrains/${t.id}`,
    }));
  if (points.length === 0 && s.latitude && s.longitude) {
    points.push({ id: s.id, lat: s.latitude, lng: s.longitude, label: s.nom, sub: s.commune });
  }
  const gerant = s.gerantNom;
  const tel = (s.gerantTelephone ?? '').replace(/\s/g, '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-slate-600">Accueil</Link><span>›</span>
        <Link to="/sites" className="hover:text-slate-600">Sites</Link><span>›</span>
        <span className="text-slate-700">{s.nom}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Photos + description + parcelles */}
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-3">
            <div className="h-72 overflow-hidden rounded-xl bg-slate-100">
              {s.photos?.[photo]
                ? <img src={s.photos[photo].url} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-6xl">🏘️</div>}
            </div>
            {s.photos && s.photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {s.photos.map((p, i) => (
                  <button key={p.id} onClick={() => setPhoto(i)}
                    className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg ring-2 ${i === photo ? 'ring-brand-500' : 'ring-transparent'}`}>
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h1 className="text-2xl font-bold text-slate-800">{s.nom}</h1>
            <div className="text-sm text-slate-500">
              📍 {[s.adresse, s.commune, s.region].filter(Boolean).join(', ')}
            </div>
            {s.description && <p className="mt-3 text-sm text-slate-600">{s.description}</p>}
            <div className="mt-3 flex gap-4 text-sm">
              <span className="rounded-lg bg-slate-50 px-3 py-1">{s.terrains.length} parcelles</span>
              <span className="rounded-lg bg-slate-50 px-3 py-1">{s.cooperatives.length} coopérative(s)</span>
              <span className="rounded-lg bg-brand-50 px-3 py-1 font-semibold text-brand-700">
                {s.type === 'VENTE_DIRECTE' ? 'Vente directe' : 'Coopérative'}
              </span>
            </div>
          </div>

          {/* Parcelles */}
          <div className="card">
            <h3 className="mb-3 font-semibold text-slate-700">Parcelles du site</h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {s.terrains.map((t) => (
                <Link key={t.id} to={`/terrains/${t.id}`}
                  className={`rounded-lg px-2 py-2 text-center text-sm font-semibold ${badge[t.statut]}`}
                  title={`Parcelle ${t.numeroParcelle} — ${t.statut}`}>
                  {t.numeroParcelle}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Carte + gérant + modalités */}
        <div className="space-y-4">
          <div className="card p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Localisation</div>
            {points.length > 0
              ? <MapView points={points} height={260} />
              : <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">GPS non renseigné</div>}
          </div>

          {/* Gérant du site */}
          <div className="card">
            <h3 className="mb-2 font-semibold text-slate-700">Gérant du site</h3>
            {gerant ? (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                    {gerant[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{gerant}</div>
                    <div className="text-xs text-slate-400">
                      {s.gerantTelephone ?? ''}{s.gerantEmail ? ` · ${s.gerantEmail}` : ''}
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
              </div>
            ) : (
              <p className="text-sm text-slate-400">Gérant non renseigné.</p>
            )}
          </div>

          {s.cooperatives.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-semibold text-slate-700">Modalités (coopératives)</h3>
              {s.cooperatives.map((c) => (
                <div key={c.id} className="mb-2 rounded-xl border border-slate-100 p-3 text-sm">
                  <div className="font-semibold text-slate-800">{c.nom}</div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-center text-xs">
                    <div><div className="text-slate-400">Acompte</div><div className="font-bold">{formatFCFA(Number(c.montantAcompte))}</div></div>
                    <div><div className="text-slate-400">Mensualité</div><div className="font-bold">{formatFCFA(Number(c.cotisationMensuelle))}</div></div>
                    <div><div className="text-slate-400">Durée</div><div className="font-bold">{c.nbMensualites} mois</div></div>
                  </div>
                  {c.responsable && <div className="mt-1 text-xs text-slate-400">Responsable : {c.responsable}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
