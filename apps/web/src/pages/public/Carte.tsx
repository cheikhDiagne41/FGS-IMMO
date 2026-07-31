import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../../lib/api';
import MapView, { MapPoint } from '../../components/MapView';
import CarteRegions, { RegionStats } from '../../components/CarteRegions';

interface MapTerrain {
  id: string;
  numeroParcelle: string;
  titre?: string;
  prix: number | null;
  statut: string;
  latitude: number;
  longitude: number;
  site: { nom: string };
}

function Chiffre({ valeur, label, icone }: { valeur: number; label: string; icone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-2xl font-extrabold text-brand-700">{valeur}</div>
      <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
        <span>{icone}</span> {label}
      </div>
    </div>
  );
}

export default function Carte() {
  const [vue, setVue] = useState<'regions' | 'parcelles'>('regions');
  const [selection, setSelection] = useState<string | null>(null);

  const { data: regions = [], isLoading: chargeRegions } = useQuery<RegionStats[]>({
    queryKey: ['public-regions'],
    queryFn: async () => (await api.get('/public/regions')).data,
  });
  const { data: terrains = [], isLoading: chargeTerrains } = useQuery<MapTerrain[]>({
    queryKey: ['public-map'],
    queryFn: async () => (await api.get('/public/map')).data,
  });

  const region = regions.find((r) => r.slug === selection) ?? null;

  const points: MapPoint[] = terrains.map((t) => ({
    id: t.id,
    lat: t.latitude,
    lng: t.longitude,
    label: t.titre ?? `Parcelle N° ${t.numeroParcelle}`,
    sub: t.site.nom,
    statut: t.statut,
    prix: t.prix,
    href: `/terrains/${t.id}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Nos implantations</span>
          <h1 className="h-display text-3xl md:text-4xl">Carte du Sénégal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cliquez sur une région pour voir ses terrains, sites et coopératives.
          </p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {([['regions', 'Par région'], ['parcelles', 'Parcelles']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                vue === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {vue === 'regions' ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {chargeRegions ? (
              <div className="flex h-[520px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
                Chargement…
              </div>
            ) : (
              <CarteRegions regions={regions} selection={selection} onSelect={setSelection} />
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="card">
              {region ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold uppercase text-brand-700">{region.region}</h2>
                    <p className="text-sm text-slate-500">Nos biens dans cette région</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Chiffre valeur={region.nbTerrains} label="Terrains" icone="🗺️" />
                    <Chiffre valeur={region.nbSites} label="Sites" icone="🏘️" />
                    <Chiffre valeur={region.nbCooperatives} label="Coop." icone="👥" />
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Sites de la région
                    </h3>
                    <div className="space-y-2">
                      {region.sites.map((s) => (
                        <Link
                          key={s.id}
                          to={`/sites/${s.id}`}
                          className="block rounded-xl bg-slate-50 p-3 transition hover:bg-brand-50"
                        >
                          <div className="font-bold text-slate-800">{s.nom}</div>
                          <div className="text-xs text-slate-500">
                            {s.commune ?? '—'} ·{' '}
                            {s.type === 'COOPERATIVE' ? 'Coopérative' : 'Vente directe'}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link to="/terrains" className="btn-primary flex-1 text-center">
                      Voir les terrains
                    </Link>
                    <button onClick={() => setSelection(null)} className="btn-ghost">
                      Effacer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Nos régions</h2>
                    <p className="text-sm text-slate-500">
                      Sélectionnez une région sur la carte, ou choisissez-la dans la liste.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {regions.map((r) => (
                      <button
                        key={r.slug}
                        onClick={() => setSelection(r.slug)}
                        className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left transition hover:bg-brand-50"
                      >
                        <span className="font-bold text-slate-800">{r.region}</span>
                        <span className="text-xs text-slate-500">
                          {r.nbTerrains} terrain(s) · {r.nbSites} site(s)
                        </span>
                      </button>
                    ))}
                    {regions.length === 0 && (
                      <div className="text-sm text-slate-400">Aucune région renseignée.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-brand-600" /> Disponible</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-gold-500" /> Réservé</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-slate-500" /> Vendu</span>
          </div>
          {chargeTerrains ? (
            <div className="card text-center text-slate-400">Chargement de la carte…</div>
          ) : (
            <MapView points={points} height={560} />
          )}
          {!chargeTerrains && points.length === 0 && (
            <div className="card text-center text-slate-400">
              Aucun terrain géolocalisé pour le moment.
            </div>
          )}
        </>
      )}
    </div>
  );
}
