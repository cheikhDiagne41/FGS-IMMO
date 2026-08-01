import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Partenaire {
  id: string;
  nom: string;
  logoUrl: string;
  siteWeb?: string;
}

/** Section « Nos partenaires » : logos configurés depuis l'administration. */
export default function Partenaires() {
  const { data = [] } = useQuery<Partenaire[]>({
    queryKey: ['public-partenaires'],
    queryFn: async () => (await api.get('/public/partenaires')).data,
  });

  if (data.length === 0) return null;

  return (
    <section className="bleed bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        {/* Titre en pastille, encadré de deux filets */}
        <div className="flex items-center justify-center gap-4">
          <span className="hidden h-px w-16 bg-white/25 sm:block" />
          <h2 className="rounded-full bg-gradient-to-r from-brand-500 to-gold-500 px-8 py-3 text-2xl font-black text-white shadow-lg">
            Nos partenaires
          </h2>
          <span className="hidden h-px w-16 bg-white/25 sm:block" />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
          {data.map((p) => {
            const pastille = (
              <div
                className="flex h-32 w-32 items-center justify-center rounded-full bg-white p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                title={p.nom}
              >
                <img
                  src={p.logoUrl}
                  alt={p.nom}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            );
            return p.siteWeb ? (
              <a key={p.id} href={p.siteWeb} target="_blank" rel="noreferrer" aria-label={p.nom}>
                {pastille}
              </a>
            ) : (
              <div key={p.id}>{pastille}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
