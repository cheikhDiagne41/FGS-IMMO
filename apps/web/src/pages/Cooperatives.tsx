import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import CooperativeFormModal from '../components/CooperativeFormModal';

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
  site: {
    id: string;
    nom: string;
    code: string;
    commune?: string;
    gerantNom?: string;
    gerantTelephone?: string;
  };
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

const pieceTypes = [
  { value: 'CNI', label: "CNI (recto + verso)" },
  { value: 'PASSEPORT', label: 'Passeport' },
  { value: 'EXTRAIT', label: 'Extrait de naissance' },
];

function FilePick({
  label, file, onPick,
}: { label: string; file: File | null; onPick: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      {file ? (
        <div className="relative">
          <img src={URL.createObjectURL(file)} alt="" className="h-24 w-full rounded-lg object-cover" />
          <button type="button" onClick={() => onPick(null)}
            className="absolute right-1 top-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">×</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-400 hover:border-brand-400">
          📷 Ajouter
        </button>
      )}
    </div>
  );
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
  onConfirm: (fd: FormData) => void;
  loading: boolean;
  error?: string;
}) {
  const [pieceType, setPieceType] = useState('CNI');
  const [pieceNumero, setPieceNumero] = useState('');
  const [recto, setRecto] = useState<File | null>(null);
  const [verso, setVerso] = useState<File | null>(null);

  const filesOk = pieceType === 'CNI' ? !!recto && !!verso : !!recto;
  const canSubmit = !preview.complete && !!pieceNumero && filesOk;

  const submit = () => {
    const fd = new FormData();
    fd.append('cooperativeId', preview.cooperativeId);
    fd.append('pieceType', pieceType);
    fd.append('pieceNumero', pieceNumero);
    if (recto) fd.append('recto', recto);
    if (verso && pieceType === 'CNI') fd.append('verso', verso);
    onConfirm(fd);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">Rejoindre la coopérative</h3>
        <p className="text-sm text-slate-500">{preview.cooperative}</p>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <Row label="Site" value={preview.site} />
          {preview.fraisAdhesion > 0 && (
            <Row label="Frais d'adhésion" value={formatFCFA(preview.fraisAdhesion)} />
          )}
          <Row label="Acompte obligatoire" value={formatFCFA(preview.montantAcompte)} />
          <Row label="Cotisation mensuelle"
            value={`${formatFCFA(preview.cotisationMensuelle)} × ${preview.nbMensualites}`} />
          <div className="my-2 border-t border-slate-200" />
          <Row label="Montant total à payer" value={formatFCFA(preview.montantTotal)} strong />
        </div>

        {/* Pièce d'identité */}
        <div className="mt-4 rounded-xl border-2 border-brand-100 bg-brand-50/40 p-4">
          <div className="text-sm font-bold text-brand-800">📎 Pièce d'identité à fournir</div>
          <div className="mb-2 text-xs text-slate-500">
            Choisissez votre pièce, saisissez le numéro et joignez la ou les photos.
          </div>
          <div className="grid grid-cols-3 gap-2">
            {pieceTypes.map((p) => (
              <button key={p.value} type="button"
                onClick={() => { setPieceType(p.value); setRecto(null); setVerso(null); }}
                className={`rounded-lg border-2 px-2 py-2 text-[11px] font-semibold ${pieceType === p.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>
                {p.value}
              </button>
            ))}
          </div>
          <input className="input mt-3" placeholder="Numéro de la pièce"
            value={pieceNumero} onChange={(e) => setPieceNumero(e.target.value)} />

          <div className={`mt-3 grid gap-2 ${pieceType === 'CNI' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <FilePick label={pieceType === 'CNI' ? 'Photo recto' : 'Photo de la pièce'} file={recto} onPick={setRecto} />
            {pieceType === 'CNI' && <FilePick label="Photo verso" file={verso} onPick={setVerso} />}
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          En validant, votre dossier, votre échéancier et votre compte coopérateur
          seront créés. Vos pièces sont jointes à votre dossier.
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
          <button onClick={submit} className="btn-primary flex-1" disabled={loading || !canSubmit}>
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
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GESTIONNAIRE';
  const [preview, setPreview] = useState<Preview | null>(null);
  const [success, setSuccess] = useState<string>('');
  const [showForm, setShowForm] = useState(false);

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
    mutationFn: async (fd: FormData) =>
      (await api.post('/adhesions/rejoindre', fd)).data,
    onSuccess: (data) => {
      setPreview(null);
      setSuccess(`Adhésion validée — dossier ${data.numeroDossier} créé.`);
      qc.invalidateQueries({ queryKey: ['cooperatives'] });
      qc.invalidateQueries({ queryKey: ['client-dashboard'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Coopératives</h1>
          <p className="text-sm text-slate-500">
            {user?.role === 'CLIENT'
              ? 'Choisissez une coopérative pour lancer votre adhésion.'
              : "Gestion des coopératives d'habitat (rattachées à un site)."}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            ＋ Nouvelle coopérative
          </button>
        )}
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
                  <Link to={`/sites/${c.site.id}`} className="text-sm text-brand-600 hover:underline">
                    🏘️ {c.site.nom}
                  </Link>
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
              {c.site.gerantNom && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {c.site.gerantNom[0]}
                  </span>
                  <span className="text-slate-600">
                    Gérant : <b>{c.site.gerantNom}</b>
                    {c.site.gerantTelephone ? ` · ${c.site.gerantTelephone}` : ''}
                  </span>
                </div>
              )}

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
              {user?.role !== 'CLIENT' && (
                <Link
                  to={`/dossiers?cooperative=${c.id}`}
                  className="btn-ghost mt-4 justify-center text-sm"
                >
                  📋 Registre d'encaissement ({c._count.adhesions})
                </Link>
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
          onConfirm={(fd) => joinMut.mutate(fd)}
        />
      )}

      {showForm && <CooperativeFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
