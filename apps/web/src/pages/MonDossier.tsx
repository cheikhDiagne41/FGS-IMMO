import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';
import PaiementModal from '../components/PaiementModal';

interface Echeance {
  id: string; numero: number; type: string; libelle: string;
  montantDu: number; montantPaye: number; statut: string; dateEcheance: string;
}
interface Paiement {
  id: string; reference: string; montant: number; methode: string;
  statut: string; datePaiement: string; facture?: { id: string; numero: string } | null;
}
interface Dossier {
  id: string; numeroDossier: string; montantTotal: number; montantPaye: number;
  soldeRestant: number; progression: number; statut: string;
  cooperative: { nom: string; site: { nom: string } };
  echeances: Echeance[];
  paiements: Paiement[];
  terrain?: { numeroParcelle: string; statut: string } | null;
}

const badge: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700', EN_COURS: 'bg-brand-50 text-brand-700',
  COMPLETE: 'bg-brand-50 text-brand-700', ATTRIBUE: 'bg-brand-600 text-white',
  PAYEE: 'bg-brand-50 text-brand-700', PARTIELLE: 'bg-amber-50 text-amber-700',
  EN_RETARD: 'bg-rose-50 text-rose-600', VALIDE: 'bg-brand-50 text-brand-700',
  ANNULE: 'bg-rose-50 text-rose-600', REMBOURSE: 'bg-slate-200 text-slate-600',
};

async function telechargerFacture(id: string, numero: string) {
  const res = await api.get(`/factures/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.download = `${numero}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function telechargerCertificat(adhesionId: string, dossier: string) {
  const res = await api.get(`/attributions/${adhesionId}/certificat`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.download = `CERT-${dossier}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MonDossier() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [pay, setPay] = useState(false);
  const [flash, setFlash] = useState('');

  const { data: d, isLoading } = useQuery<Dossier>({
    queryKey: ['mon-dossier', id],
    queryFn: async () => (await api.get(`/adhesions/${id}`)).data,
  });

  if (isLoading || !d)
    return <div className="p-10 text-center text-slate-400">Chargement…</div>;

  const prochaine = d.echeances.find((e) =>
    ['EN_ATTENTE', 'EN_RETARD', 'PARTIELLE'].includes(e.statut),
  );
  const enAttente = d.statut === 'EN_ATTENTE';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-slate-600">Mon espace</Link>
        <span>›</span>
        <span className="text-slate-700">Dossier {d.numeroDossier}</span>
      </div>

      {flash && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">⏳ {flash}</div>
      )}

      {/* En-tête dossier */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">Dossier {d.numeroDossier}</div>
            <h1 className="text-2xl font-bold text-slate-800">{d.cooperative.nom}</h1>
            <div className="text-sm text-slate-500">🏘️ {d.cooperative.site.nom}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge[d.statut] ?? 'bg-slate-100'}`}>{d.statut}</span>
        </div>

        {enAttente ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            Votre demande est en attente de validation. Votre échéancier et le
            paiement seront disponibles dès qu'un gestionnaire l'aura validée.
          </div>
        ) : (
          <>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                <span>Progression des paiements</span>
                <span className="font-bold text-brand-700">{d.progression}%</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${d.progression}%` }} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">Montant total</div><div className="font-bold">{formatFCFA(d.montantTotal)}</div></div>
              <div className="rounded-xl bg-brand-50 p-3"><div className="text-xs text-brand-600">Déjà payé</div><div className="font-bold text-brand-700">{formatFCFA(d.montantPaye)}</div></div>
              <div className="rounded-xl bg-amber-50 p-3"><div className="text-xs text-amber-600">Reste à payer</div><div className="font-bold text-amber-700">{formatFCFA(d.soldeRestant)}</div></div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-400">Prochaine échéance</div>
                <div className="font-bold text-slate-800">{prochaine ? formatFCFA(Number(prochaine.montantDu) - Number(prochaine.montantPaye)) : 'À jour ✓'}</div>
              </div>
            </div>
            {d.soldeRestant > 0 && (
              <button onClick={() => setPay(true)} className="btn-primary mt-4">Payer une échéance</button>
            )}
          </>
        )}
      </div>

      {/* Terrain attribué */}
      {d.terrain && (
        <div className="card flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏡</span>
            <div>
              <div className="text-xs text-brand-100">Terrain</div>
              <div className="font-bold">Parcelle N° {d.terrain.numeroParcelle} — {d.terrain.statut}</div>
            </div>
          </div>
          {d.terrain.statut === 'VENDU' && (
            <button onClick={() => telechargerCertificat(d.id, d.numeroDossier)}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30">📜 Certificat</button>
          )}
        </div>
      )}

      {!enAttente && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Mes paiements & factures */}
          <div className="card">
            <h3 className="mb-3 font-semibold text-slate-700">Mes paiements & factures</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-slate-400">
                  <th className="p-2">Date</th><th className="p-2">Mode</th><th className="p-2 text-right">Montant</th><th className="p-2">Statut</th><th className="p-2">Facture</th>
                </tr></thead>
                <tbody>
                  {d.paiements.map((p) => (
                    <tr key={p.id} className="border-t border-slate-50">
                      <td className="p-2 text-slate-500">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                      <td className="p-2">{p.methode.replace('_', ' ')}</td>
                      <td className="p-2 text-right font-semibold">{formatFCFA(Number(p.montant))}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge[p.statut]}`}>{p.statut}</span></td>
                      <td className="p-2">{p.facture ? <button onClick={() => telechargerFacture(p.facture!.id, p.facture!.numero)} className="text-brand-600 underline">📄 {p.facture.numero}</button> : <span className="text-slate-300">—</span>}</td>
                    </tr>
                  ))}
                  {d.paiements.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">Aucun paiement pour l'instant.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mon échéancier */}
          <div className="card">
            <h3 className="mb-3 font-semibold text-slate-700">Mon échéancier</h3>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {d.echeances.map((e) => (
                    <tr key={e.id} className="border-t border-slate-50">
                      <td className="p-2 text-slate-600">{e.libelle}</td>
                      <td className="p-2 text-slate-400">{new Date(e.dateEcheance).toLocaleDateString('fr-FR')}</td>
                      <td className="p-2 text-right font-medium">{formatFCFA(Number(e.montantDu))}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge[e.statut]}`}>{e.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {pay && (
        <PaiementModal
          adhesionId={d.id}
          montantSuggere={prochaine ? Number(prochaine.montantDu) - Number(prochaine.montantPaye) : 0}
          echeanceLibelle={prochaine?.libelle}
          libelle={`${d.cooperative.nom} — ${prochaine?.libelle ?? 'Paiement'}`}
          onClose={() => setPay(false)}
          onSuccess={() => { setPay(false); setFlash('Paiement enregistré — en attente de validation par nos services.'); qc.invalidateQueries({ queryKey: ['mon-dossier', id] }); }}
        />
      )}
    </div>
  );
}
