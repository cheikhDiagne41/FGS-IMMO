import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Normalise un nom de région (sans accents) — doit rester aligné avec l'API */
const slugRegion = (nom: string) =>
  nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');

export interface RegionStats {
  region: string;
  slug: string;
  nbSites: number;
  nbTerrains: number;
  nbCooperatives: number;
  sites: { id: string; nom: string; commune: string | null; type: string }[];
}

export default function CarteRegions({
  regions,
  selection,
  onSelect,
}: {
  regions: RegionStats[];
  selection: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const [geo, setGeo] = useState<any>(null);

  useEffect(() => {
    fetch('/senegal-regions.geojson')
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const parSlug = useMemo(
    () => new Map(regions.map((r) => [r.slug, r])),
    [regions],
  );

  const style = (feature: any): PathOptions => {
    const slug = slugRegion(feature.properties.shapeName);
    const stats = parSlug.get(slug);
    const actif = !!stats;
    const selectionnee = selection === slug;
    return {
      color: selectionnee ? '#1e4d8c' : '#ffffff',
      weight: selectionnee ? 3 : 1.5,
      fillColor: actif ? '#1e4d8c' : '#cbd5e1',
      fillOpacity: selectionnee ? 0.75 : actif ? 0.45 : 0.2,
    };
  };

  const onEachFeature = (feature: any, layer: Layer) => {
    const nom = feature.properties.shapeName;
    const slug = slugRegion(nom);
    const stats = parSlug.get(slug);

    layer.bindTooltip(
      stats
        ? `<b>${stats.region}</b><br/>${stats.nbTerrains} terrain(s) · ${stats.nbSites} site(s)`
        : `<b>${nom}</b><br/>Aucun bien pour le moment`,
      { sticky: true },
    );

    layer.on({
      click: () => onSelect(stats ? slug : null),
      mouseover: (e: any) => e.target.setStyle({ fillOpacity: 0.7 }),
      mouseout: (e: any) => e.target.setStyle(style(feature)),
    });
  };

  if (!geo) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
        Chargement de la carte du Sénégal…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <MapContainer
        center={[14.4974, -14.4524]}
        zoom={7}
        style={{ height: 520, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={`${selection ?? 'none'}-${regions.length}`}
          data={geo}
          style={style}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  );
}
