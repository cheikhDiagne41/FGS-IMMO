import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';

interface AdhesionRow {
  id: string;
  numeroDossier: string;
  montantTotal: number;
  montantPaye: number;
  soldeRestant: number;
  progression: number;
  statut: string;
  client: { nom: string; prenom: string };
  cooperative: { id: string; numero: string; nom: string; site: { nom: string } };
}

interface Echeance {
  id: string; numero: number; type: string; libelle: string;
  montantDu: number; montantPaye: number; statut: string; dateEcheance: string;
}
interface Paiement {
  id: string; reference: string; montant: number; methode: string;
  statut: string; datePaiement: string; facture?: { id: string; numero: string } | null;
}
interface DossierDetail {
  id: string; numeroDossier: string; montantTotal: number; montantPaye: number;
  soldeRestant: number; progression: number; statut: string;
  client: { nom: string; prenom: string; telephone: string };
  cooperative: { nom: string; cotisationMensuelle: number; site: { nom: string } };
  echeances: Echeance[];
  paiements: Paiement[];
}

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const statutBadge: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700',
  EN_COURS: 'bg-brand-50 text-brand-700',
  COMPLETE: 'bg-brand-50 text-brand-700',
  ATTRIBUE: 'bg-brand-600 text-white',
  ANNULEE: 'bg-rose-50 text-rose-600',
  PAYEE: 'bg-brand-50 text-brand-700',
  EN_RETARD: 'bg-rose-50 text-rose-600',
  PARTIELLE: 'bg-amber-50 text-amber-700',
  VALIDE: 'bg-brand-50 text-brand-700',
  ANNULE: 'bg-rose-50 text-rose-600',
  REMBOURSE: 'bg-slate-200 text-slate-600',
};

async function telechargerFacture(id: string, numero: string) {
  const res = await api.get(`/factures/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.download = `${numero}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DossierModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [montant, setMontant] = useState('');
  const [methode, setMethode] = useState('ESPECES');
  const [mois, setMois] = useState(new Date().getMonth());
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [touched, setTouched] = useState(false);

  const { data: d } = useQuery<DossierDetail>({
    queryKey: ['dossier', id],
    queryFn: async () => (await api.get(`/adhesions/${id}`)).data,
  });

  // Pré-remplit le montant avec la mensualité de la coopérative (modifiable)
  useEffect(() => {
    if (d && !touched && !montant) {
      setMontant(String(Number(d.cooperative.cotisationMensuelle) || ''));
    }
  }, [d, touched, montant]);

  const prochaine = d?.echeances.find((e) =>
    ['EN_ATTENTE', 'EN_RETARD', 'PARTIELLE'].includes(e.statut),
  );
  const libelleEcheance = prochaine?.libelle;
  const commentairePaiement = libelleEcheance
    ? /cotisation mensuelle/i.test(libelleEcheance)
      ? `${libelleEcheance} — ${MOIS[mois]} ${annee}`
      : libelleEcheance
    : `Cotisation ${MOIS[mois]} ${annee}`;

  const encaisser = useMutation({
    mutationFn: async () =>
      (await api.post('/paiements/manuel', {
        adhesionId: id, montant: Number(montant), methode,
        commentaire: commentairePaiement,
      })).data,
    onSuccess: () => {
      setMontant('');
      setTouched(false);
      // Passe au mois suivant automatiquement
      setMois((m) => {
        if (m === 11) { setAnnee((a) => a + 1); return 0; }
        return m + 1;
      });
      qc.invalidateQueries({ queryKey: ['dossier', id] });
      qc.invalidateQueries({ queryKey: ['dossiers'] });
    },
  });

  const action = useMutation({
    mutationFn: async ({ pid, verb }: { pid: string; verb: string }) =>
      (await api.post(`/paiements/${pid}/${verb}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dossier', id] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {!d ? <div className="p-6 text-center text-slate-400">Chargement…</div> : (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">{d.numeroDossier}</div>
                <h2 className="text-xl font-bold text-slate-800">{d.client.prenom} {d.client.nom}</h2>
                <div className="text-sm text-slate-500">{d.cooperative.nom} — {d.cooperative.site.nom} · 📞 {d.client.telephone}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statutBadge[d.statut] ?? 'bg-slate-100'}`}>{d.statut}</span>
                <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">Total</div><div className="font-bold">{formatFCFA(d.montantTotal)}</div></div>
              <div className="rounded-xl bg-brand-50 p-3"><div className="text-xs text-brand-600">Payé</div><div className="font-bold text-brand-700">{formatFCFA(d.montantPaye)}</div></div>
              <div className="rounded-xl bg-amber-50 p-3"><div className="text-xs text-amber-600">Reste</div><div className="font-bold text-amber-700">{formatFCFA(d.soldeRestant)}</div></div>
            </div>

            {/* Encaissement guichet */}
            {d.statut !== 'EN_ATTENTE' && d.soldeRestant > 0 && (
              <div className="rounded-xl border-2 border-brand-100 bg-brand-50/40 p-4">
                <div className="mb-2 text-sm font-bold text-brand-800">💵 Encaisser un paiement (guichet)</div>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="label">Mois</label>
                    <select className="input" value={mois} onChange={(e) => setMois(Number(e.target.value))}>
                      {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Année</label>
                    <input type="number" className="input w-24" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label">Montant (mensualité)</label>
                    <input type="number" className="input" value={montant}
                      onChange={(e) => { setTouched(true); setMontant(e.target.value); }}
                      placeholder="Montant reçu" />
                  </div>
                  <div>
                    <label className="label">Moyen</label>
                    <select className="input" value={methode} onChange={(e) => setMethode(e.target.value)}>
                      <option value="ESPECES">Espèces</option>
                      <option value="VIREMENT">Virement</option>
                      <option value="CHEQUE">Chèque</option>
                      <option value="WAVE">Wave</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                    </select>
                  </div>
                  <button onClick={() => encaisser.mutate()} disabled={encaisser.isPending || !montant}
                    className="btn-primary">{encaisser.isPending ? '…' : 'Encaisser & facturer'}</button>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Montant pré-rempli avec la mensualité de la coopérative — modifiable librement.
                  Facture générée : « {commentairePaiement} ».
                </div>
                {encaisser.isError && (
                  <div className="mt-2 text-sm text-red-600">{(encaisser.error as any)?.response?.data?.message ?? 'Erreur'}</div>
                )}
              </div>
            )}

            {/* Paiements */}
            <div>
              <h3 className="mb-2 font-semibold text-slate-700">Paiements & factures</h3>
              <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                    <th className="p-2">Date</th><th className="p-2">Mode</th><th className="p-2 text-right">Montant</th><th className="p-2">Statut</th><th className="p-2">Facture</th><th className="p-2">Actions</th>
                  </tr></thead>
                  <tbody>
                    {d.paiements.map((p) => (
                      <tr key={p.id} className="border-t border-slate-50">
                        <td className="p-2 text-slate-500">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                        <td className="p-2">{p.methode.replace('_', ' ')}</td>
                        <td className="p-2 text-right font-semibold">{formatFCFA(Number(p.montant))}</td>
                        <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statutBadge[p.statut]}`}>{p.statut}</span></td>
                        <td className="p-2">
                          {p.facture
                            ? <button onClick={() => telechargerFacture(p.facture!.id, p.facture!.numero)} className="text-brand-600 underline">📄 {p.facture.numero}</button>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="p-2">
                          {p.statut === 'EN_ATTENTE' && (
                            <button onClick={() => action.mutate({ pid: p.id, verb: 'confirmer' })} className="rounded bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white">Confirmer</button>
                          )}
                          {p.statut === 'VALIDE' && (
                            <button onClick={() => action.mutate({ pid: p.id, verb: 'annuler' })} className="rounded bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">Annuler</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {d.paiements.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-400">Aucun paiement.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Échéancier */}
            <div>
              <h3 className="mb-2 font-semibold text-slate-700">Échéancier</h3>
              <div className="max-h-52 overflow-y-auto rounded-xl ring-1 ring-slate-100">
                <table className="w-full text-sm">
                  <tbody>
                    {d.echeances.map((e) => (
                      <tr key={e.id} className="border-t border-slate-50">
                        <td className="p-2 text-slate-600">{e.libelle}</td>
                        <td className="p-2 text-slate-400">{new Date(e.dateEcheance).toLocaleDateString('fr-FR')}</td>
                        <td className="p-2 text-right font-medium">{formatFCFA(Number(e.montantDu))}</td>
                        <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statutBadge[e.statut]}`}>{e.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dossiers() {
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [params, setParams] = useSearchParams();
  const coopId = params.get('cooperative') ?? '';

  const { data = [], isLoading } = useQuery<AdhesionRow[]>({
    queryKey: ['dossiers'],
    queryFn: async () => (await api.get('/adhesions')).data,
  });

  // Coopératives distinctes présentes dans les dossiers
  const coops = Array.from(
    new Map(data.map((a) => [a.cooperative.id, a.cooperative])).values(),
  );

  const filtered = data.filter((a) => {
    if (coopId && a.cooperative.id !== coopId) return false;
    const s = `${a.client.prenom} ${a.client.nom} ${a.numeroDossier} ${a.cooperative.nom}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  const totals = filtered.reduce(
    (t, a) => ({
      attendu: t.attendu + Number(a.montantTotal),
      encaisse: t.encaisse + Number(a.montantPaye),
      reste: t.reste + Number(a.soldeRestant),
    }),
    { attendu: 0, encaisse: 0, reste: 0 },
  );
  const coopSel = coops.find((c) => c.id === coopId);

  const setCoop = (id: string) => {
    if (id) params.set('cooperative', id);
    else params.delete('cooperative');
    setParams(params, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Registre d'encaissement
          </h1>
          <p className="text-sm text-slate-500">
            {coopSel
              ? `Coopérative ${coopSel.nom} — ${coopSel.site.nom}`
              : 'Sélectionnez une coopérative pour voir son registre d\'encaissement.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input max-w-xs" value={coopId} onChange={(e) => setCoop(e.target.value)}>
            <option value="">Toutes les coopératives</option>
            {coops.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <input className="input max-w-xs" placeholder="Rechercher un client, dossier…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* Totaux du registre (coopérative sélectionnée) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card"><div className="text-xs uppercase text-slate-400">Dossiers</div><div className="text-xl font-extrabold text-slate-800">{filtered.length}</div></div>
        <div className="card"><div className="text-xs uppercase text-slate-400">Total attendu</div><div className="text-xl font-extrabold text-slate-800">{formatFCFA(totals.attendu)}</div></div>
        <div className="card"><div className="text-xs uppercase text-brand-600">Encaissé</div><div className="text-xl font-extrabold text-brand-700">{formatFCFA(totals.encaisse)}</div></div>
        <div className="card"><div className="text-xs uppercase text-amber-600">Reste à encaisser</div><div className="text-xl font-extrabold text-amber-700">{formatFCFA(totals.reste)}</div></div>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
            <th className="p-3">Dossier</th><th className="p-3">Client</th><th className="p-3">Coopérative</th>
            <th className="p-3 text-right">Payé</th><th className="p-3 text-right">Reste</th><th className="p-3">Progression</th><th className="p-3">Statut</th>
          </tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} onClick={() => setSelected(a.id)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                <td className="p-3 font-semibold text-slate-700">{a.numeroDossier}</td>
                <td className="p-3">{a.client.prenom} {a.client.nom}</td>
                <td className="p-3 text-slate-500">{a.cooperative.nom}</td>
                <td className="p-3 text-right font-medium text-brand-700">{formatFCFA(Number(a.montantPaye))}</td>
                <td className="p-3 text-right text-amber-700">{formatFCFA(Number(a.soldeRestant))}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-brand-500" style={{ width: `${a.progression}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">{a.progression}%</span>
                  </div>
                </td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statutBadge[a.statut] ?? 'bg-slate-100'}`}>{a.statut}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && <div className="p-8 text-center text-slate-400">Aucun dossier.</div>}
      </div>

      {selected && <DossierModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
