import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../../lib/api';

interface Terrain {
  id: string; numeroParcelle: string; titre?: string; prix: number | null;
  statut: string; enVedette?: boolean; superficie: number;
  site: { nom: string; commune?: string }; images?: { url: string }[];
}
interface Site {
  id: string; nom: string; commune?: string; region?: string; type?: string;
  photos?: { url: string }[]; _count: { cooperatives: number; terrains: number };
}

function TerrainCard({ t }: { t: Terrain }) {
  return (
    <Link to={`/terrains/${t.id}`} className="group block">
      <div className="zoom relative aspect-[4/3] rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-100">
        {t.images?.[0] ? (
          <img src={t.images[0].url} alt="" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🗺️</div>
        )}
        {t.enVedette && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold text-white shadow">★ Vedette</span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-brand-700 shadow">
          {t.statut}
        </span>
      </div>
      <div className="mt-3">
        <div className="font-bold text-slate-900 group-hover:text-brand-700">
          {t.titre ?? `Parcelle N° ${t.numeroParcelle}`}
        </div>
        <div className="text-sm text-slate-500">📍 {t.site.nom}{t.site.commune ? ` · ${t.site.commune}` : ''}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">{Number(t.superficie)} m²</span>
          <span className="font-extrabold text-brand-700">{t.prix ? formatFCFA(Number(t.prix)) : 'Sur demande'}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PublicHome() {
  const { data: terrains = [] } = useQuery<Terrain[]>({
    queryKey: ['public-terrains'],
    queryFn: async () => (await api.get('/public/terrains')).data,
  });
  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['public-sites'],
    queryFn: async () => (await api.get('/public/sites')).data,
  });

  const vedettes = terrains.filter((t) => t.enVedette);
  const heroImg =
    vedettes[0]?.images?.[0]?.url ?? terrains.find((t) => t.images?.[0])?.images?.[0]?.url;
  const enAvant = (vedettes.length ? vedettes : terrains).slice(0, 3);
  const recents = terrains.slice(0, 8);

  const heroImages = vedettes
    .filter((t) => t.images?.[0])
    .slice(0, 4)
    .map((t) => t.images![0].url);
  const heroSlides: { type: 'video' | 'image'; src: string }[] = [
    { type: 'video', src: '/hero.mp4' },
    ...heroImages.map((src) => ({ type: 'image' as const, src })),
  ];
  const [heroIdx, setHeroIdx] = useState(0);
  const heroSlide = heroSlides[heroIdx] ?? heroSlides[0];

  return (
    <div>
      {/* HERO — vidéo de fond + boutons Sites / Terrains */}
      <section className="bleed -mt-6 relative flex min-h-[88vh] flex-col overflow-hidden bg-brand-950 px-4 pb-6 pt-14 sm:px-8">
        {/* Média de fond (carrousel vidéo + photos vedettes) */}
        {heroSlide.type === 'video' ? (
          <video
            key={heroSlide.src}
            autoPlay
            loop
            muted
            playsInline
            poster={heroImg}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={heroSlide.src} type="video/mp4" />
          </video>
        ) : (
          <img key={heroSlide.src} src={heroSlide.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-950/45 to-brand-950/55" />

        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setHeroIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-2xl text-white backdrop-blur transition hover:bg-white/30 sm:left-6"
              aria-label="Précédent"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setHeroIdx((i) => (i + 1) % heroSlides.length)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-2xl text-white backdrop-blur transition hover:bg-white/30 sm:right-6"
              aria-label="Suivant"
            >
              ›
            </button>
            <div className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHeroIdx(i)}
                  className={`h-2 w-2 rounded-full transition ${i === heroIdx ? 'bg-white' : 'bg-white/40'}`}
                  aria-label={`Aller au média ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Contenu centré */}
        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-end pb-10 px-2 text-center text-white">
          <div className="w-full overflow-hidden">
            <div className="marquee-track">
              <h1 className="whitespace-nowrap pr-16 text-4xl font-black leading-[1.05] tracking-tight drop-shadow sm:text-6xl md:text-7xl">
                Devenez propriétaire de votre terrain
              </h1>
              <h1 aria-hidden="true" className="whitespace-nowrap pr-16 text-4xl font-black leading-[1.05] tracking-tight drop-shadow sm:text-6xl md:text-7xl">
                Devenez propriétaire de votre terrain
              </h1>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/inscription" className="rounded-xl bg-gold-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-gold-600">
              Créer un compte
            </Link>
            <Link to="/carte" className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/20">
              🗺️ Voir la carte
            </Link>
          </div>
        </div>

        {/* Boutons latéraux (façon SONACOS) */}
        <div className="relative mt-4 flex items-center justify-between">
          <Link
            to="/sites"
            className="group flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-brand-700"
          >
            <span className="transition group-hover:-translate-x-1">←</span> NOS SITES
          </Link>
          <Link
            to="/terrains"
            className="group flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-brand-700"
          >
            NOS TERRAINS <span className="transition group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </section>

      {/* POURQUOI */}
      <section className="section mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Nos fondamentaux</span>
          <h2 className="h-display text-3xl md:text-5xl">
            Une façon simple et sûre d'accéder à la propriété
          </h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            ['🏘️', 'Coopératives d\'habitat', 'Adhérez et payez votre terrain par mensualités, à votre rythme, avec un échéancier clair.'],
            ['💳', 'Paiement mobile', 'Réglez votre acompte et vos cotisations par Wave ou Orange Money, en toute simplicité.'],
            ['📜', 'Titres & certificats', 'Factures, attribution de parcelle et certificat officiel générés automatiquement.'],
          ].map(([icon, titre, txt]) => (
            <div key={titre} className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl">{icon}</div>
              <h3 className="text-xl font-bold text-slate-900">{titre}</h3>
              <p className="mt-2 text-slate-500">{txt}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EN VEDETTE */}
      {enAvant.length > 0 && (
        <section className="section bleed bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="eyebrow">Sélection</span>
                <h2 className="h-display text-3xl md:text-5xl">Terrains à la une</h2>
              </div>
              <Link to="/terrains" className="hidden font-bold text-brand-700 hover:underline md:block">Tout voir →</Link>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {enAvant.map((t) => <TerrainCard key={t.id} t={t} />)}
            </div>
          </div>
        </section>
      )}

      {/* SITES */}
      {sites.length > 0 && (
        <section className="section mx-auto max-w-7xl px-6">
          <span className="eyebrow">Nos implantations</span>
          <h2 className="h-display text-3xl md:text-5xl">Des sites viabilisés au Sénégal</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {sites.slice(0, 3).map((s) => (
              <Link key={s.id} to={`/sites/${s.id}`} className="group block">
                <div className="zoom relative h-64 rounded-2xl bg-slate-100 shadow-sm">
                  {s.photos?.[0] ? <img src={s.photos[0].url} alt="" /> : <div className="flex h-full items-center justify-center text-5xl">🏘️</div>}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-xl font-bold">{s.nom}</div>
                    <div className="text-sm text-white/80">{[s.commune, s.region].filter(Boolean).join(', ')}</div>
                    <div className="mt-1 text-xs text-white/70">{s._count.terrains} parcelles · {s._count.cooperatives} coopérative(s)</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bleed bg-gradient-to-br from-brand-700 to-brand-900">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center text-white">
          <h2 className="text-3xl font-extrabold md:text-5xl">Prêt à devenir propriétaire ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-50/90">
            Créez votre compte en quelques minutes et rejoignez une coopérative
            ou achetez votre parcelle directement.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/inscription" className="rounded-xl bg-gold-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-gold-600">Créer un compte</Link>
            <Link to="/terrains" className="rounded-xl border border-white/40 px-8 py-3 font-bold text-white transition hover:bg-white/10">Parcourir les terrains</Link>
          </div>
        </div>
      </section>

      {/* RECENTS */}
      <section className="section mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between">
          <h2 className="h-display text-2xl md:text-4xl">Terrains récents</h2>
          <Link to="/terrains" className="font-bold text-brand-700 hover:underline">Tout voir →</Link>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {recents.map((t) => <TerrainCard key={t.id} t={t} />)}
        </div>
      </section>
    </div>
  );
}
