import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import MapView, { MapPoint } from '../../components/MapView';

interface Societe {
  nom: string;
  raisonSociale?: string;
  slogan?: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  latitude?: number | null;
  longitude?: number | null;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

const reseaux = [
  { key: 'facebook' as const, label: 'Facebook', icon: '📘', cls: 'bg-[#1877F2] hover:bg-[#1466d1]' },
  { key: 'instagram' as const, label: 'Instagram', icon: '📷', cls: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] hover:opacity-90' },
  { key: 'tiktok' as const, label: 'TikTok', icon: '🎵', cls: 'bg-black hover:bg-slate-800' },
];

export default function PublicApropos() {
  const { data: s, isLoading } = useQuery<Societe>({
    queryKey: ['public-societe'],
    queryFn: async () => (await api.get('/public/societe')).data,
  });

  if (isLoading || !s) return <div className="p-10 text-center text-slate-400">Chargement…</div>;

  const points: MapPoint[] = s.latitude && s.longitude
    ? [{ id: 'bureau', lat: s.latitude, lng: s.longitude, label: s.raisonSociale ?? s.nom, sub: s.adresse }]
    : [];
  const liens = reseaux.filter((r) => s[r.key]);

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Qui sommes-nous</span>
        <h1 className="h-display text-3xl md:text-4xl">À propos de nous</h1>
        {s.slogan && <p className="mt-2 text-lg text-slate-500">{s.slogan}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="card">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              {s.raisonSociale ?? s.nom}
            </h3>
            <p className="text-slate-600">
              {s.description ?? "Vente de terrains, sites viabilisés et coopératives d'habitat au Sénégal."}
            </p>
          </div>

          <div className="card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Nous contacter</h3>
            {s.adresse && <div className="flex items-center gap-2 text-slate-700"><span>📍</span> {s.adresse}</div>}
            {s.telephone && (
              <div className="flex items-center gap-2 text-slate-700">
                <span>📞</span>
                <a href={`tel:${s.telephone.replace(/\s/g, '')}`} className="hover:text-brand-700">{s.telephone}</a>
              </div>
            )}
            {s.email && (
              <div className="flex items-center gap-2 text-slate-700">
                <span>✉️</span>
                <a href={`mailto:${s.email}`} className="hover:text-brand-700">{s.email}</a>
              </div>
            )}
            {s.siteWeb && (
              <div className="flex items-center gap-2 text-slate-700">
                <span>🌐</span>
                <span>{s.siteWeb}</span>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Suivez-nous</h3>
            {liens.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {liens.map((r) => (
                  <a
                    key={r.key}
                    href={s[r.key]}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 rounded-full px-5 py-3 font-bold text-white shadow-lg transition ${r.cls}`}
                  >
                    <span className="text-lg">{r.icon}</span> {r.label}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Réseaux sociaux à venir.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Notre bureau — venez nous rencontrer
            </h3>
            {points.length > 0 ? (
              <MapView points={points} height={420} />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-xl bg-slate-50 text-center text-sm text-slate-400">
                Localisation du bureau à venir.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
