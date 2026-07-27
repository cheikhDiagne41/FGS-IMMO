import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../../lib/api';

interface Coop {
  id: string; numero: string; nom: string; montantAcompte: number;
  cotisationMensuelle: number; nbMensualites: number; nbMaxAdherents: number;
  responsable?: string; site: { id: string; nom: string; commune?: string };
  _count: { adhesions: number };
}

export default function PublicCooperatives() {
  const { data = [], isLoading } = useQuery<Coop[]>({
    queryKey: ['public-cooperatives'],
    queryFn: async () => (await api.get('/public/cooperatives')).data,
  });

  return (
    <div className="space-y-8 py-4">
      <div>
        <span className="eyebrow">Habitat</span>
        <h1 className="h-display text-3xl md:text-5xl">Coopératives d'habitat</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Rejoignez une coopérative pour accéder à un terrain par mensualités.{' '}
          <Link to="/inscription" className="font-semibold text-brand-600">Créez votre compte</Link> pour adhérer.
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((c) => {
          const places = c.nbMaxAdherents - c._count.adhesions;
          return (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">{c.numero}</div>
                  <div className="font-bold text-slate-800">{c.nom}</div>
                  <Link to={`/sites/${c.site.id}`} className="text-sm text-brand-600 hover:underline">
                    🏘️ {c.site.nom}
                  </Link>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${places <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700'}`}>
                  {places <= 0 ? 'Complète' : `${places} places`}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-[10px] text-slate-400">Acompte</div><div className="font-bold">{formatFCFA(Number(c.montantAcompte))}</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-[10px] text-slate-400">Mensualité</div><div className="font-bold">{formatFCFA(Number(c.cotisationMensuelle))}</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-[10px] text-slate-400">Durée</div><div className="font-bold">{c.nbMensualites} mois</div></div>
              </div>
              {c.responsable && <div className="mt-2 text-xs text-slate-400">Responsable : {c.responsable}</div>}
            </div>
          );
        })}
      </div>
      {!isLoading && data.length === 0 && (
        <div className="card text-center text-slate-400">Aucune coopérative publiée.</div>
      )}
    </div>
  );
}
