import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { HORAIRES, estOuvert } from '../lib/horaires';
import IconeReseau, { RESEAUX } from './IconesReseaux';

interface Societe {
  nom: string;
  raisonSociale?: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  whatsapp?: string;
}

const liens = [
  [
    { label: 'Accueil', to: '/' },
    { label: 'Terrains', to: '/terrains' },
    { label: 'Sites', to: '/sites' },
    { label: 'Coopératives', to: '/cooperatives' },
  ],
  [
    { label: 'À propos', to: '/a-propos' },
    { label: 'Gouvernance', to: '/gouvernance' },
    { label: 'Actualités', to: '/actualites' },
    { label: 'Carte', to: '/carte' },
  ],
];


export default function Footer() {
  const { data: s } = useQuery<Societe>({
    queryKey: ['public-societe'],
    queryFn: async () => (await api.get('/public/societe')).data,
  });

  const ouvert = estOuvert();
  const reseauxActifs = RESEAUX.filter((r) => s?.[r.cle]);

  return (
    <footer className="bleed bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Identité */}
          <div>
            <div className="inline-flex items-center rounded-lg bg-white p-2">
              <img src="/logo-fgs.jpeg" alt={s?.nom ?? 'FGS_IMMO'} className="h-10 w-auto" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/70">
              {s?.description ??
                "FGS_IMMO accompagne les familles sénégalaises dans l'accès à la propriété : vente de terrains, sites viabilisés et coopératives d'habitat, avec un suivi transparent de chaque parcelle et de chaque paiement."}
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-lg font-bold text-brand-200">Liens rapides</h3>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {liens.flat().map((l) => (
                <Link
                  key={l.to + l.label}
                  to={l.to}
                  className="flex items-center gap-2 text-sm text-white/80 transition hover:text-white"
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-300" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold text-brand-200">Nous contacter</h3>
            <div className="mt-5 space-y-4 text-sm">
              {s?.telephone && (
                <a
                  href={`tel:${s.telephone.replace(/\s/g, '')}`}
                  className="flex items-start gap-3 text-white/80 transition hover:text-white"
                >
                  <span className="text-brand-300">📞</span> {s.telephone}
                </a>
              )}
              {s?.email && (
                <a
                  href={`mailto:${s.email}`}
                  className="flex items-start gap-3 break-all text-white/80 transition hover:text-white"
                >
                  <span className="text-brand-300">✉️</span> {s.email}
                </a>
              )}
              {s?.adresse && (
                <div className="flex items-start gap-3 text-white/80">
                  <span className="text-brand-300">📍</span> {s.adresse}
                </div>
              )}
            </div>
          </div>

          {/* Horaires */}
          <div>
            <h3 className="text-lg font-bold text-brand-200">Ouverture</h3>
            <div className="mt-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              {HORAIRES.map((c, i) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/70">{c.label}</span>
                    <span className="font-bold">{c.affichage}</span>
                  </div>
                  {i < HORAIRES.length - 1 && <hr className="my-3 border-white/10" />}
                </div>
              ))}
              <div
                className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                  ouvert ? 'bg-green-500/15 text-green-300' : 'bg-rose-500/15 text-rose-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${ouvert ? 'bg-green-400' : 'bg-rose-400'}`} />
                {ouvert ? 'Actuellement ouvert' : 'Actuellement fermé'}
              </div>
            </div>
          </div>
        </div>

        {/* Réseaux sociaux */}
        {reseauxActifs.length > 0 && (
          <>
            <hr className="my-10 border-white/10" />
            <div className="flex justify-center gap-4">
              {reseauxActifs.map((r) => (
                <a
                  key={r.cle}
                  href={s?.[r.cle]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={r.label}
                  title={r.label}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-110 ${r.fond}`}
                >
                  <IconeReseau cle={r.cle} className="h-5 w-5" />
                </a>
              ))}
            </div>
          </>
        )}

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row">
          <div>
            {s?.raisonSociale ?? 'FGS_IMMO'} © {new Date().getFullYear()} — Vente de
            terrains &amp; coopératives d'habitat
          </div>
          <Link to="/inscription" className="font-semibold text-brand-200 hover:text-white">
            Créer un compte
          </Link>
        </div>
      </div>
    </footer>
  );
}
