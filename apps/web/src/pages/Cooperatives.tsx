import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Cooperative {
  id: string;
  numero: string;
  nom: string;
  montantAcompte: number;
  cotisationMensuelle: number;
  nbMensualites: number;
  nbMaxAdherents: number;
  responsable?: string;
  statut: string;
  site: { nom: string; code: string };
  _count: { adhesions: number };
}

interface Preview {
  cooperativeId: string;
  site: string;
  cooperative: string;
  fraisAdhesion: number;
  montantAcompte: number;
  cotisationMensuelle: number;
  nbMensualites: number;
  montantTotal: number;
  placesRestantes: number;
  complete: boolean;
}

function AdhesionModal({
  preview,
  onClose,
  onConfirm,
  loading,
  error,
}: {
  preview: Preview;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  error?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">
          Rejoindre la coopérative
        </h3>
        <p className="text-sm text-slate-500">{preview.cooperative}</p>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <Row label="Site" value={preview.site} />
          {preview.fraisAdhesion > 0 && (
            <Row label="Frais d'adhésion" value={formatFCFA(preview.fraisAdhesion)} />
          )}
          <Row label="Acompte obligatoire" value={formatFCFA(preview.montantAcompte)} />
          <Row
            label="Cotisation mensuelle"
            value={`${formatFCFA(preview.cotisationMensuelle)} × ${preview.nbMensualites}`}
          />
          <div className="my-2 border-t border-slate-200" />
          <Row
            label="Montant total à payer"
            value={formatFCFA(preview.montantTotal)}
            strong
          />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          En validant, votre dossier, votre échéancier ({preview.nbMensualites + 2}{' '}
          échéances) et votre compte coopérateur seront créés automatiquement.
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary flex-1"
            disabled={loading || preview.complete}
          >
            {loading ? 'Validation…' : 'Valider mon adhésion'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span
        className={strong ? 'font-bold text-brand-700' : 'font-medium text-slate-800'}
      >
        {value}
      </span>
    </div>
  );
}

export default function Cooperatives() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [success, setSuccess] = useState<string>('');

  const { data: coops = [], isLoading } = useQuery<Cooperative[]>({
    queryKey: ['cooperatives'],
    queryFn: async () => (await api.get('/cooperatives')).data,
  });

  const previewMut = useMutation({
    mutationFn: async (cooperativeId: string) =>
      (await api.post('/adhesions/preview', { cooperativeId })).data,
    onSuccess: (data) => setPreview(data),
  });

  const joinMut = useMutation({
    mutationFn: async (cooperativeId: string) =>
      (await api.post('/adhesions', { cooperativeId })).data,
    onSuccess: (data) => {
      setPreview(null);
      setSuccess(`Adhésion validée — dossier ${data.numeroDossier} créé.`);
      qc.invalidateQueries({ queryKey: ['cooperatives'] });
      qc.invalidateQueries({ queryKey: ['client-dashboard'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Coopératives</h1>
        <p className="text-sm text-slate-500">
          {user?.role === 'CLIENT'
            ? 'Choisissez une coopérative pour lancer votre adhésion.'
            : "Gestion des coopératives d'habitat (rattachées à un site)."}
        </p>
      </div>

      {success && (
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          ✓ {success}
        </div>
      )}

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coops.map((c) => {
          const places = c.nbMaxAdherents - c._count.adhesions;
          const complete = places <= 0;
          return (
            <div key={c.id} className="card flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">
                    {c.numero}
                  </div>
                  <h3 className="font-bold text-slate-800">{c.nom}</h3>
                  <div className="text-sm text-slate-500">🏘️ {c.site.nom}</div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    complete
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-brand-50 text-brand-700'
                  }`}
                >
                  {complete ? 'Complète' : `${places} places`}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[11px] text-slate-400">Acompte</div>
                  <div className="font-semibold text-slate-700">
                    {formatFCFA(c.montantAcompte)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[11px] text-slate-400">Mensualité</div>
                  <div className="font-semibold text-slate-700">
                    {formatFCFA(c.cotisationMensuelle)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {c.nbMensualites} mensualités · Responsable : {c.responsable ?? '—'}
              </div>

              {user?.role === 'CLIENT' && (
                <button
                  onClick={() => {
                    setSuccess('');
                    previewMut.mutate(c.id);
                  }}
                  className="btn-primary mt-4"
                  disabled={complete || previewMut.isPending}
                >
                  {complete ? 'Complète' : 'Rejoindre'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {coops.length === 0 && !isLoading && (
        <div className="card text-center text-slate-500">
          Aucune coopérative pour l'instant.
        </div>
      )}

      {preview && (
        <AdhesionModal
          preview={preview}
          loading={joinMut.isPending}
          error={
            (joinMut.error as any)?.response?.data?.message ?? undefined
          }
          onClose={() => setPreview(null)}
          onConfirm={() => joinMut.mutate(preview.cooperativeId)}
        />
      )}
    </div>
  );
}
