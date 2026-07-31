import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Membre {
  id: string;
  nom: string;
  poste: string;
  biographie?: string;
  photoUrl?: string;
}

function Portrait({ m, classe }: { m: Membre; classe: string }) {
  if (m.photoUrl) {
    // object-top : garde le visage visible quand la photo est recadrée
    return <img src={m.photoUrl} alt={m.nom} className={`${classe} object-cover object-top`} />;
  }
  return (
    <div className={`${classe} flex items-center justify-center bg-brand-50 text-5xl font-black text-brand-300`}>
      {m.nom?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function PublicGouvernance() {
  const { data = [], isLoading } = useQuery<Membre[]>({
    queryKey: ['public-gouvernance'],
    queryFn: async () => (await api.get('/public/gouvernance')).data,
  });

  const [dirigeant, ...equipe] = data;

  return (
    <div className="space-y-14 pb-6">
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
            Gouvernance
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
            Notre équipe
          </h1>
          <p className="mt-4 max-w-2xl text-white/80">
            Les femmes et les hommes qui pilotent FGS_IMMO au quotidien et
            garantissent la qualité de nos projets immobiliers.
          </p>
        </div>
      </section>

      {isLoading && (
        <div className="mx-auto max-w-7xl px-6 text-slate-400">Chargement…</div>
      )}

      {!isLoading && data.length === 0 && (
        <div className="mx-auto max-w-7xl px-6">
          <div className="card text-center text-slate-500">
            L'équipe dirigeante sera présentée prochainement.
          </div>
        </div>
      )}

      {/* DIRIGEANT MIS EN AVANT */}
      {dirigeant && (
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:grid-cols-2">
          <div className="zoom mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
            <Portrait m={dirigeant} classe="h-full w-full" />
          </div>
          <div>
            <span className="eyebrow">Direction générale</span>
            <h2 className="h-display text-3xl md:text-4xl">{dirigeant.nom}</h2>
            <div className="mt-2 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-bold text-brand-700">
              {dirigeant.poste}
            </div>
            {dirigeant.biographie && (
              <p className="mt-4 whitespace-pre-line text-slate-600">{dirigeant.biographie}</p>
            )}
          </div>
        </section>
      )}

      {/* ÉQUIPE */}
      {equipe.length > 0 && (
        <section className="bleed bg-white px-6 py-14">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Comité de direction</span>
              <h2 className="h-display text-3xl md:text-4xl">Les responsables</h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {equipe.map((m) => (
                <div
                  key={m.id}
                  className="group overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="zoom aspect-[3/4] overflow-hidden">
                    <Portrait m={m} classe="h-full w-full" />
                  </div>
                  <div className="p-5">
                    <div className="text-lg font-bold text-slate-900">{m.nom}</div>
                    <div className="mt-1 text-sm font-semibold text-brand-700">{m.poste}</div>
                    {m.biographie && (
                      <p className="mt-2 line-clamp-3 text-sm text-slate-500">{m.biographie}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
