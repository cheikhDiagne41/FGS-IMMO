import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';

interface Props {
  adhesionId: string;
  montantSuggere: number;
  libelle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const methodes = [
  { value: 'WAVE', label: 'Wave', color: '#1dc4ff', emoji: '🌊' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', color: '#ff7900', emoji: '🟠' },
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

  const payer = useMutation({
    mutationFn: async () =>
      (
        await api.post('/paiements', {
          adhesionId,
          montant,
          methode,
          refTransaction: `${methode}-${Date.now()}`,
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
          via {methodes.find((m) => m.value === methode)?.label}.
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
