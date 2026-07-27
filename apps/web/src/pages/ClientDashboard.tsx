import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, formatFCFA } from '../lib/api';
import PaiementModal from '../components/PaiementModal';

async function telechargerCertificat(adhesionId: string, dossier: string) {
  const res = await api.get(`/attributions/${adhesionId}/certificat`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.download = `CERT-${dossier}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface AdhesionDashboard {
  adhesionId: string;
  numeroDossier: string;
  site: string;
  cooperative: string;
  montantTotal: number;
  montantPaye: number;
  soldeRestant: number;
  progression: number;
  statut: string;
  terrain: { numeroParcelle: string; statut: string } | null;
  prochaineEcheance: {
    libelle: string;
    montant: number;
    date: string;
    enRetard: boolean;
  } | null;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
        <span>Paiements réalisés</span>
        <span className="font-bold text-brand-700">{value}%</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [payFor, setPayFor] = useState<AdhesionDashboard | null>(null);
  const [flash, setFlash] = useState('');

  const { data: adhesions = [], isLoading } = useQuery<AdhesionDashboard[]>({
    queryKey: ['client-dashboard'],
    queryFn: async () => (await api.get('/dashboard/client')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mon espace</h1>
        <p className="text-sm text-slate-500">
          Suivi de vos adhésions et paiements
        </p>
      </div>

      {flash && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          ⏳ Paiement enregistré — en attente de validation par nos services. Il
          sera pris en compte (et votre facture générée) dès sa confirmation.
        </div>
      )}

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      {!isLoading && adhesions.length === 0 && (
        <div className="card text-center">
          <p className="text-slate-600">
            Vous n'avez pas encore rejoint de coopérative.
          </p>
          <button className="btn-primary mt-4">Rejoindre une coopérative</button>
        </div>
      )}

      {adhesions.map((a) =>
        a.statut === 'EN_ATTENTE' ? (
          <div
            key={a.adhesionId}
            className="card border-2 border-amber-200 bg-amber-50/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-amber-500">
                  Demande {a.numeroDossier}
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  {a.cooperative}
                </h3>
                <div className="text-sm text-slate-500">Site : {a.site}</div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                ⏳ En attente de validation
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Votre demande d'adhésion et vos pièces ont bien été reçues. Un
              gestionnaire doit la valider : votre dossier, votre échéancier et le
              paiement de l'acompte apparaîtront ici une fois la demande validée.
            </p>
          </div>
        ) : (
        <div key={a.adhesionId} className="card space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">
                Dossier {a.numeroDossier}
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {a.cooperative}
              </h3>
              <div className="text-sm text-slate-500">Site : {a.site}</div>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {a.statut}
            </span>
          </div>

          <ProgressBar value={a.progression} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Montant total</div>
              <div className="font-bold text-slate-800">
                {formatFCFA(a.montantTotal)}
              </div>
            </div>
            <div className="rounded-xl bg-brand-50 p-3">
              <div className="text-xs text-brand-600">Déjà payé</div>
              <div className="font-bold text-brand-700">
                {formatFCFA(a.montantPaye)}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-xs text-amber-600">Reste à payer</div>
              <div className="font-bold text-amber-700">
                {formatFCFA(a.soldeRestant)}
              </div>
            </div>
            <div
              className={`rounded-xl p-3 ${
                a.prochaineEcheance?.enRetard ? 'bg-rose-50' : 'bg-slate-50'
              }`}
            >
              <div className="text-xs text-slate-400">Prochaine échéance</div>
              {a.prochaineEcheance ? (
                <div
                  className={`font-bold ${
                    a.prochaineEcheance.enRetard
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {formatFCFA(a.prochaineEcheance.montant)}
                  <div className="text-[11px] font-normal">
                    {new Date(a.prochaineEcheance.date).toLocaleDateString('fr-FR')}
                    {a.prochaineEcheance.enRetard && ' • En retard'}
                  </div>
                </div>
              ) : (
                <div className="font-bold text-brand-700">À jour ✓</div>
              )}
            </div>
          </div>

          {a.terrain && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 p-3 text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏡</span>
                <div>
                  <div className="text-xs text-brand-100">Terrain attribué</div>
                  <div className="font-bold">
                    Parcelle {a.terrain.numeroParcelle} — {a.terrain.statut}
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  telechargerCertificat(a.adhesionId, a.numeroDossier)
                }
                className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30"
              >
                📜 Certificat d'attribution
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              className="btn-primary"
              onClick={() => setPayFor(a)}
              disabled={a.soldeRestant <= 0}
            >
              {a.soldeRestant <= 0 ? 'Soldé ✓' : 'Payer une échéance'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => navigate(`/mon-dossier/${a.adhesionId}`)}
            >
              📂 Voir mon dossier
            </button>
            <button className="btn-ghost" onClick={() => navigate('/factures')}>
              Mes factures
            </button>
          </div>
        </div>
        ),
      )}

      {payFor && (
        <PaiementModal
          adhesionId={payFor.adhesionId}
          montantSuggere={payFor.prochaineEcheance?.montant ?? 0}
          libelle={`${payFor.cooperative} — ${
            payFor.prochaineEcheance?.libelle ?? 'Paiement'
          }`}
          onClose={() => setPayFor(null)}
          onSuccess={() => {
            setPayFor(null);
            setFlash('pending');
          }}
        />
      )}
    </div>
  );
}
