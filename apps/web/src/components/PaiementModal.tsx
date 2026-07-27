import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';

interface Props {
  adhesionId: string;
  montantSuggere: number;
  libelle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const methodes = [
  { value: 'WAVE', label: 'Wave', emoji: '🌊' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', emoji: '🟠' },
];

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function PaiementModal({
  adhesionId,
  montantSuggere,
  libelle,
  onClose,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [montant, setMontant] = useState(montantSuggere);
  const [methode, setMethode] = useState('WAVE');
  const [mois, setMois] = useState(new Date().getMonth());
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [touched, setTouched] = useState(false);

  // Historique de paiements du client (pour proposer le mois suivant le dernier réglé)
  const { data: paiements = [] } = useQuery<any[]>({
    queryKey: ['mes-paiements'],
    queryFn: async () => (await api.get('/paiements/mine')).data,
  });

  useEffect(() => {
    if (touched) return;
    // Dernier paiement « Cotisation <Mois> <Année> » de ce dossier
    const cotis = paiements
      .filter(
        (p) =>
          (p.adhesion?.id === adhesionId || p.adhesionId === adhesionId) &&
          p.statut === 'VALIDE' &&
          typeof p.commentaire === 'string' &&
          /Cotisation/i.test(p.commentaire),
      )
      .sort(
        (a, b) =>
          new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime(),
      );
    if (cotis[0]) {
      const m = MOIS.findIndex((x) =>
        cotis[0].commentaire.toLowerCase().includes(x.toLowerCase()),
      );
      const yMatch = cotis[0].commentaire.match(/(\d{4})/);
      const y = yMatch ? Number(yMatch[1]) : new Date().getFullYear();
      if (m >= 0) {
        // Mois suivant le dernier payé
        const next = m + 1;
        setMois(next % 12);
        setAnnee(next > 11 ? y + 1 : y);
      }
    }
  }, [paiements, adhesionId, touched]);

  const payer = useMutation({
    mutationFn: async () =>
      (
        await api.post('/paiements', {
          adhesionId,
          montant,
          methode,
          refTransaction: `${methode}-${Date.now()}`,
          commentaire: `Cotisation ${MOIS[mois]} ${annee}`,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-dashboard'] });
      qc.invalidateQueries({ queryKey: ['mes-factures'] });
      qc.invalidateQueries({ queryKey: ['mes-paiements'] });
      onSuccess();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">Effectuer un paiement</h3>
        {libelle && <p className="text-sm text-slate-500">{libelle}</p>}

        {/* Mois à régler (proposé automatiquement, modifiable) */}
        <label className="label mt-4">Mois à régler</label>
        <div className="flex gap-2">
          <select
            className="input"
            value={mois}
            onChange={(e) => { setTouched(true); setMois(Number(e.target.value)); }}
          >
            {MOIS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            className="input w-28"
            value={annee}
            onChange={(e) => { setTouched(true); setAnnee(Number(e.target.value)); }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Proposé automatiquement d'après votre dernier paiement — vous pouvez le changer.
        </div>

        <label className="label mt-4">Montant (FCFA)</label>
        <input
          type="number"
          className="input"
          value={montant}
          onChange={(e) => setMontant(Number(e.target.value))}
        />

        <label className="label mt-4">Moyen de paiement</label>
        <div className="grid grid-cols-2 gap-3">
          {methodes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethode(m.value)}
              className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition ${
                methode === m.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Vous allez payer <b className="text-brand-700">{formatFCFA(montant)}</b>{' '}
          (<b>Cotisation {MOIS[mois]} {annee}</b>) via{' '}
          {methodes.find((m) => m.value === methode)?.label}.
          <div className="mt-1 text-xs text-slate-400">
            (Paiement simulé — les API Wave / Orange Money seront branchées avec vos clés.)
          </div>
        </div>

        {payer.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(payer.error as any)?.response?.data?.message ?? 'Paiement échoué.'}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">
            Annuler
          </button>
          <button
            onClick={() => payer.mutate()}
            className="btn-primary flex-1"
            disabled={payer.isPending || montant <= 0}
          >
            {payer.isPending ? 'Traitement…' : 'Confirmer le paiement'}
          </button>
        </div>
      </div>
    </div>
  );
}
