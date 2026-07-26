import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import MapView, { MapPoint } from '../../components/MapView';

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

export default function Carte() {
  const { data = [], isLoading } = useQuery<MapTerrain[]>({
    queryKey: ['public-map'],
    queryFn: async () => (await api.get('/public/map')).data,
  });

  const points: MapPoint[] = data.map((t) => ({
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Carte des terrains</h1>
        <p className="text-sm text-slate-500">
          Localisez les parcelles et leur emplacement. Cliquez sur un point pour voir la fiche.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-brand-600" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-gold-500" /> Réservé</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-slate-500" /> Vendu</span>
      </div>

      {isLoading ? (
        <div className="card text-center text-slate-400">Chargement de la carte…</div>
      ) : (
        <MapView points={points} height={560} />
      )}
      {!isLoading && points.length === 0 && (
        <div className="card text-center text-slate-400">
          Aucun terrain géolocalisé pour le moment.
        </div>
      )}
    </div>
  );
}
