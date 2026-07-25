import { useQuery } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';

interface Facture {
  id: string;
  numero: string;
  dateEmission: string;
  montant: number;
  soldeRestant: number;
  statut: string;
  paiement: {
    methode: string;
    adhesion: { cooperative: { nom: string } };
  };
}

async function ouvrirPdf(id: string, numero: string) {
  const res = await api.get(`/factures/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.download = `${numero}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const statutStyle: Record<string, string> = {
  EMISE: 'bg-brand-50 text-brand-700',
  PAYEE: 'bg-brand-50 text-brand-700',
  ANNULEE: 'bg-rose-50 text-rose-600',
};

export default function MesFactures() {
  const { data: factures = [], isLoading } = useQuery<Facture[]>({
    queryKey: ['mes-factures'],
    queryFn: async () => (await api.get('/factures/mine')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mes factures</h1>
        <p className="text-sm text-slate-500">
          Toutes vos factures avec QR code et signature électronique
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
              <th className="p-4">Numéro</th>
              <th className="p-4">Date</th>
              <th className="p-4">Coopérative</th>
              <th className="p-4">Mode</th>
              <th className="p-4 text-right">Montant</th>
              <th className="p-4">Statut</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="p-4 font-semibold text-slate-700">{f.numero}</td>
                <td className="p-4 text-slate-500">
                  {new Date(f.dateEmission).toLocaleDateString('fr-FR')}
                </td>
                <td className="p-4 text-slate-600">
                  {f.paiement.adhesion.cooperative.nom}
                </td>
                <td className="p-4 text-slate-600">
                  {f.paiement.methode.replace('_', ' ')}
                </td>
                <td className="p-4 text-right font-bold text-brand-700">
                  {formatFCFA(Number(f.montant))}
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statutStyle[f.statut] ?? 'bg-slate-100'}`}
                  >
                    {f.statut}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => ouvrirPdf(f.id, f.numero)}
                    className="btn-ghost text-xs"
                  >
                    📄 PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {factures.length === 0 && !isLoading && (
          <div className="p-8 text-center text-slate-400">
            Aucune facture pour l'instant. Effectuez un paiement pour en générer une.
          </div>
        )}
      </div>
    </div>
  );
}
