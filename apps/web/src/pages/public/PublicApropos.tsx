import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import MapView, { MapPoint } from '../../components/MapView';
import { HORAIRES } from '../../lib/horaires';

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
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  whatsapp?: string;
}
interface Stats { nbTerrains: number; nbClients: number; nbRegions: number }
interface Trophee { id: string; titre: string; description?: string; imageUrl: string }

const reseaux = [
  { key: 'facebook' as const, label: 'Facebook', icon: '📘', cls: 'bg-[#1877F2] hover:bg-[#1466d1]' },
  { key: 'instagram' as const, label: 'Instagram', icon: '📷', cls: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] hover:opacity-90' },
  { key: 'tiktok' as const, label: 'TikTok', icon: '🎵', cls: 'bg-black hover:bg-slate-800' },
  { key: 'youtube' as const, label: 'YouTube', icon: '▶️', cls: 'bg-[#FF0000] hover:bg-[#d40000]' },
  { key: 'linkedin' as const, label: 'LinkedIn', icon: '💼', cls: 'bg-[#0A66C2] hover:bg-[#08529b]' },
  { key: 'twitter' as const, label: 'X (Twitter)', icon: '✖️', cls: 'bg-black hover:bg-slate-800' },
  { key: 'whatsapp' as const, label: 'WhatsApp', icon: '💬', cls: 'bg-[#25D366] hover:bg-[#1da851]' },
];

const fondamentaux = [
  ['🏘️', "Coopératives d'habitat", "Adhérez et payez votre terrain par mensualités, à votre rythme, avec un échéancier clair."],
  ['💳', 'Paiement mobile', 'Réglez votre acompte et vos cotisations par Wave ou Orange Money, en toute simplicité.'],
  ['📜', 'Titres & certificats', 'Factures, attribution de parcelle et certificat officiel générés automatiquement.'],
];

export default function PublicApropos() {
  const { data: s, isLoading } = useQuery<Societe>({
    queryKey: ['public-societe'],
    queryFn: async () => (await api.get('/public/societe')).data,
  });
  const { data: stats } = useQuery<Stats>({
    queryKey: ['public-stats'],
    queryFn: async () => (await api.get('/public/stats')).data,
  });
  const { data: trophees = [] } = useQuery<Trophee[]>({
    queryKey: ['public-trophees'],
    queryFn: async () => (await api.get('/public/trophees')).data,
  });

  if (isLoading || !s) return <div className="p-10 text-center text-slate-400">Chargement…</div>;

  const points: MapPoint[] = s.latitude && s.longitude
    ? [{ id: 'bureau', lat: s.latitude, lng: s.longitude, label: s.raisonSociale ?? s.nom, sub: s.adresse }]
    : [];
  const liens = reseaux.filter((r) => s[r.key]);

  return (
    <div className="space-y-16 pb-6">
      {/* BANNIÈRE */}
      <section className="bleed -mt-6 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-14">
        <div className="mx-auto max-w-7xl text-white">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 rounded-full bg-gold-500 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-gold-600"
          >
            <span>←</span> Retour à l'accueil
          </Link>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
            Qui sommes-nous
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
            À propos de {s.nom}
          </h1>
          {s.slogan && <p className="mt-4 max-w-2xl text-lg text-white/80">{s.slogan}</p>}
        </div>
      </section>

      {/* PRÉSENTATION */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:grid-cols-2">
        <div>
          <span className="eyebrow">Notre mission</span>
          <h2 className="h-display text-3xl md:text-4xl">
            Rendre la propriété foncière accessible au Sénégal
          </h2>
          <p className="mt-4 text-slate-600">
            {s.description ??
              "Nous accompagnons les familles dans l'acquisition de leur terrain : vente directe, sites viabilisés et coopératives d'habitat, avec un suivi transparent de chaque parcelle et de chaque paiement."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/terrains" className="btn-primary">Voir nos terrains</Link>
            <Link to="/carte" className="btn-ghost">🗺️ Nos implantations</Link>
          </div>
        </div>
        <div className="zoom aspect-[4/3] overflow-hidden rounded-2xl bg-brand-50 shadow-sm ring-1 ring-slate-100">
          <img src="/logo-fgs.jpeg" alt={s.nom} className="h-full w-full object-contain p-8" />
        </div>
      </section>

      {/* CHIFFRES CLÉS + QUALITÉ */}
      <section className="bleed bg-gradient-to-br from-brand-600 via-brand-700 to-gold-600 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center text-white">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
              Notre engagement
            </span>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">FGS en quelques chiffres</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['🗺️', `+${stats?.nbTerrains ?? 0}`, 'Terrains'],
              ['🧑‍🤝‍🧑', `+${stats?.nbClients ?? 0}`, 'Clients accompagnés'],
              ['📍', `${stats?.nbRegions ?? 0}+`, 'Régions du Sénégal'],
            ].map(([icone, chiffre, label], i) => (
              <div
                key={label}
                style={{ animationDelay: `${i * 120}ms` }}
                className="stat-card rounded-2xl bg-white/15 p-6 text-white ring-1 ring-white/20 backdrop-blur"
              >
                <div className="text-4xl font-black">{chiffre}</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/90">
                  <span className="icon-float">{icone}</span> {label}
                </div>
              </div>
            ))}
            <div
              style={{ animationDelay: '360ms' }}
              className="stat-card flex items-center gap-4 rounded-2xl bg-brand-950 p-6 text-white ring-1 ring-white/10"
            >
              <span className="text-5xl">🏆</span>
              <div>
                <div className="text-lg font-black leading-tight">
                  {trophees[0]?.titre ?? 'Nos trophées'}
                </div>
                <div className="text-sm text-white/70">
                  {trophees[0]?.description ?? 'Reconnue pour la qualité de ses réalisations'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NOS FONDAMENTAUX */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Nos fondamentaux</span>
          <h2 className="h-display text-3xl md:text-4xl">Ce qui guide notre travail</h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {fondamentaux.map(([icone, titre, texte]) => (
            <div
              key={titre}
              className="group rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl">
                {icone}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{titre}</h3>
              <p className="mt-2 text-slate-500">{texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NOS TROPHÉES */}
      {trophees.length > 0 && (
        <section className="bleed bg-white px-6 py-14">
          <div className="mx-auto max-w-7xl">
            <span className="eyebrow">Distinctions</span>
            <h2 className="h-display text-3xl md:text-4xl">Nos trophées</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {trophees.map((t) => (
                <div key={t.id} className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
                  <img src={t.imageUrl} alt={t.titre} className="h-40 w-full object-cover" />
                  <div className="p-4">
                    <div className="font-bold text-slate-800">{t.titre}</div>
                    {t.description && (
                      <div className="mt-1 text-sm text-slate-500">{t.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* NOUS RENCONTRER */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Nous rencontrer</span>
          <h2 className="h-display text-3xl md:text-4xl">Venez nous voir au bureau</h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="card space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {s.raisonSociale ?? s.nom}
              </h3>
              {s.adresse && (
                <div className="flex items-start gap-3 text-slate-700">
                  <span className="text-lg">📍</span> <span>{s.adresse}</span>
                </div>
              )}
              {s.telephone && (
                <a
                  href={`tel:${s.telephone.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 text-slate-700 hover:text-brand-700"
                >
                  <span className="text-lg">📞</span> {s.telephone}
                </a>
              )}
              {s.email && (
                <a
                  href={`mailto:${s.email}`}
                  className="flex items-center gap-3 text-slate-700 hover:text-brand-700"
                >
                  <span className="text-lg">✉️</span> {s.email}
                </a>
              )}
              {s.siteWeb && (
                <div className="flex items-center gap-3 text-slate-700">
                  <span className="text-lg">🌐</span> {s.siteWeb}
                </div>
              )}
              <div className="flex items-start gap-3 border-t border-slate-100 pt-3 text-slate-700">
                <span className="text-lg">🕒</span>
                <span>
                  {HORAIRES.map((c) => (
                    <span key={c.label} className="block">
                      {c.label} : {c.affichage}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Suivez-nous
              </h3>
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

          <div className="lg:col-span-7">
            <div className="card p-3">
              {points.length > 0 ? (
                <MapView points={points} height={460} />
              ) : (
                <div className="flex h-[460px] items-center justify-center rounded-xl bg-slate-50 text-center text-sm text-slate-400">
                  Localisation du bureau à venir.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
