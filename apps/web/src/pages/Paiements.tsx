import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';

interface Paiement {
  id: string;
  reference: string;
  montant: number;
  methode: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'ANNULE' | 'REMBOURSE';
  datePaiement: string;
  refTransaction?: string;
  /** Absente pour un achat direct : le client et le terrain sont alors fournis à part */
  adhesion?: {
    numeroDossier: string;
    client: { nom: string; prenom: string };
    cooperative: { nom: string };
  } | null;
  client?: { nom: string; prenom: string } | null;
  terrain?: { numeroParcelle: string } | null;
  facture?: { id: string; numero: string } | null;
}

const statutStyle: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700',
  VALIDE: 'bg-brand-50 text-brand-700',
  ANNULE: 'bg-rose-50 text-rose-600',
  REMBOURSE: 'bg-slate-200 text-slate-600',
};

const PAR_PAGE = 50;

export default function Paiements() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState('');
  const [nbAffiches, setNbAffiches] = useState(PAR_PAGE);

  // Revenir au début quand le filtre change
  useEffect(() => setNbAffiches(PAR_PAGE), [filtre]);

  // Chargement par tranches : la table entière serait trop lourde
  const { data, isLoading, isFetching } = useQuery<{ items: Paiement[]; total: number }>({
    queryKey: ['paiements', filtre, nbAffiches],
    queryFn: async () => {
      const p = new URLSearchParams({ take: String(nbAffiches) });
      if (filtre) p.set('statut', filtre);
      return (await api.get(`/paiements?${p}`)).data;
    },
    placeholderData: (prec) => prec,
  });

  const paiements = data?.items ?? [];
  const total = data?.total ?? 0;

  const action = useMutation({
    mutationFn: async ({ id, verb }: { id: string; verb: string }) =>
      (await api.post(`/paiements/${id}/${verb}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paiements'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Paiements</h1>
          <p className="text-sm text-slate-500">
            Suivi et gestion des encaissements
          </p>
        </div>
        <select
          className="input max-w-xs"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="VALIDE">Validés</option>
          <option value="ANNULE">Annulés</option>
          <option value="REMBOURSE">Remboursés</option>
        </select>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
              <th className="p-3">Référence</th>
              <th className="p-3">Client</th>
              <th className="p-3">Dossier</th>
              <th className="p-3">Mode</th>
              <th className="p-3 text-right">Montant</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Facture</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paiements.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="p-3 font-mono text-xs text-slate-500">
                  {p.reference.slice(0, 18)}
                </td>
                <td className="p-3 font-medium text-slate-700">
                  {(() => {
                    const c = p.adhesion?.client ?? p.client;
                    return c ? `${c.prenom} ${c.nom}` : '—';
                  })()}
                </td>
                <td className="p-3 text-slate-500">
                  {p.adhesion?.numeroDossier ??
                    (p.terrain ? `Achat direct · parcelle ${p.terrain.numeroParcelle}` : 'Achat direct')}
                </td>
                <td className="p-3 text-slate-600">
                  {p.methode.replace('_', ' ')}
                </td>
                <td className="p-3 text-right font-bold text-slate-800">
                  {formatFCFA(Number(p.montant))}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statutStyle[p.statut]}`}
                  >
                    {p.statut.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {p.facture?.numero ?? '—'}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {p.statut === 'EN_ATTENTE' && (
                      <button
                        onClick={() =>
                          action.mutate({ id: p.id, verb: 'confirmer' })
                        }
                        className="rounded-md bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-700"
                      >
                        Confirmer
                      </button>
                    )}
                    {p.statut === 'VALIDE' && (
                      <>
                        <button
                          onClick={() =>
                            action.mutate({ id: p.id, verb: 'rembourser' })
                          }
                          className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
                        >
                          Rembourser
                        </button>
                        <button
                          onClick={() =>
                            action.mutate({ id: p.id, verb: 'annuler' })
                          }
                          className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    {(p.statut === 'ANNULE' || p.statut === 'REMBOURSE') && (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paiements.length === 0 && !isLoading && (
          <div className="p-8 text-center text-slate-400">Aucun paiement.</div>
        )}
      </div>

      {paiements.length < total && (
        <div className="flex justify-center">
          <button
            onClick={() => setNbAffiches((n) => n + PAR_PAGE)}
            disabled={isFetching}
            className="btn-primary"
          >
            {isFetching ? 'Chargement…' : `Voir plus (${total - paiements.length} restant(s))`}
          </button>
        </div>
      )}
    </div>
  );
}
