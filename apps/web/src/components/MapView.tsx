import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatFCFA } from '../lib/api';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  statut?: string;
  prix?: number | null;
  href?: string;
}

const couleur: Record<string, string> = {
  DISPONIBLE: '#1e4d8c',
  RESERVE: '#e98b32',
  VENDU: '#64748b',
};

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      // un seul point (bureau, parcelle) : on zoome au niveau de la rue
      map.setView([points[0].lat, points[0].lng], 16);
    } else {
      const bounds = points.map((p) => [p.lat, p.lng]) as [number, number][];
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

export default function MapView({
  points,
  height = 480,
}: {
  points: MapPoint[];
  height?: number | string;
}) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200" style={{ height }}>
      <MapContainer
        center={[14.6928, -17.4467]}
        zoom={7}
        style={{ height, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={9}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: couleur[p.statut ?? 'DISPONIBLE'] ?? '#1e4d8c',
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-bold text-slate-800">{p.label}</div>
                {p.sub && <div className="text-xs text-slate-500">{p.sub}</div>}
                {p.prix != null && (
                  <div className="text-sm font-semibold text-brand-700">
                    {formatFCFA(Number(p.prix))}
                  </div>
                )}
                {p.statut && (
                  <div className="text-xs text-slate-400">{p.statut}</div>
                )}
                {p.href && (
                  <a href={p.href} className="text-xs font-semibold text-brand-600 underline">
                    Voir la fiche →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
