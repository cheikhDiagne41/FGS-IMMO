import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Vendeur {
  id: string;
  nom: string;
  raisonSociale?: string;
  slogan?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  ninea?: string;
  rccm?: string;
  responsable?: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  suspendu?: boolean;
  userId?: string | null;
  motDePasse?: string;
}

const champs: { key: keyof Vendeur; label: string; wide?: boolean }[] = [
  { key: 'nom', label: 'Nom commercial' },
  { key: 'raisonSociale', label: 'Raison sociale' },
  { key: 'slogan', label: 'Slogan', wide: true },
  { key: 'adresse', label: 'Adresse (bureau)', wide: true },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'email', label: 'Email' },
  { key: 'siteWeb', label: 'Site web' },
  { key: 'responsable', label: 'Responsable' },
  { key: 'ninea', label: 'NINEA' },
  { key: 'rccm', label: 'RCCM' },
  { key: 'latitude', label: 'Latitude (bureau)' },
  { key: 'longitude', label: 'Longitude (bureau)' },
  { key: 'facebook', label: 'Facebook (lien)' },
  { key: 'instagram', label: 'Instagram (lien)' },
  { key: 'tiktok', label: 'TikTok (lien)' },
];

function VendeurForm({
  initial,
  onClose,
}: {
  initial: Partial<Vendeur> | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Vendeur>>(initial ?? { nom: '' });
  const set = (k: keyof Vendeur, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const isEdit = !!initial?.id;

  const save = useMutation({
    mutationFn: async () => {
      const { id, ...data } = form as any;
      return isEdit
        ? (await api.put(`/vendeur/${initial!.id}`, data)).data
        : (await api.post('/vendeur', data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendeurs'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">
          {isEdit ? 'Modifier le vendeur' : 'Nouveau vendeur'}
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {champs.map((c) => (
            <div key={c.key} className={c.wide ? 'col-span-2' : ''}>
              <label className="label">{c.label}</label>
              <input
                className="input"
                value={(form[c.key] as string) ?? ''}
                onChange={(e) => set(c.key, e.target.value)}
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">
              Mot de passe {isEdit ? '(laisser vide pour ne pas changer)' : 'du compte vendeur'}
            </label>
            <input
              type="password"
              className="input"
              value={form.motDePasse ?? ''}
              onChange={(e) => set('motDePasse', e.target.value)}
              placeholder="Crée un accès de connexion pour ce vendeur (via son email)"
            />
            <div className="mt-1 text-xs text-slate-400">
              Le vendeur se connectera avec son <b>email</b> et ce mot de passe pour répondre aux messages.
            </div>
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input min-h-[70px]"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>
        {save.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(save.error as any)?.response?.data?.message ?? 'Erreur'}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => save.mutate()} className="btn-primary" disabled={save.isPending || !form.nom}>
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendeurPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Vendeur> | null | undefined>(undefined);

  const { data = [], isLoading } = useQuery<Vendeur[]>({
    queryKey: ['vendeurs'],
    queryFn: async () => (await api.get('/vendeur')).data,
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/vendeur/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendeurs'] }),
  });

  const suspend = useMutation({
    mutationFn: async ({ id, suspendu }: { id: string; suspendu: boolean }) =>
      (await api.put(`/vendeur/${id}/suspendre`, { suspendu })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendeurs'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vendeurs</h1>
          <p className="text-sm text-slate-500">
            Le 1er vendeur (société) figure sur les factures et certificats.
          </p>
        </div>
        <button onClick={() => setEditing(null)} className="btn-primary">＋ Nouveau vendeur</button>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((v, i) => (
          <div key={v.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {v.nom?.[0] ?? 'V'}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{v.raisonSociale ?? v.nom}</div>
                  <div className="text-xs text-slate-400">{v.nom}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {i === 0 && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">Société</span>
                )}
                {v.suspendu && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">Suspendu</span>
                )}
                {v.userId && !v.suspendu && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Compte actif</span>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              {v.telephone && <div>📞 {v.telephone}</div>}
              {v.email && <div>✉️ {v.email}</div>}
              {v.adresse && <div>📍 {v.adresse}</div>}
              {(v.ninea || v.rccm) && (
                <div className="text-xs text-slate-400">
                  {v.ninea ? `NINEA ${v.ninea}` : ''}{v.ninea && v.rccm ? ' · ' : ''}{v.rccm ? `RCCM ${v.rccm}` : ''}
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setEditing(v)} className="btn-ghost text-xs">✏️ Modifier</button>
              {i !== 0 && (
                v.suspendu ? (
                  <button
                    onClick={() => suspend.mutate({ id: v.id, suspendu: false })}
                    className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    ✓ Réactiver
                  </button>
                ) : (
                  <button
                    onClick={() => { if (confirm(`Suspendre ${v.nom} ? L'admin gérera ses échanges.`)) suspend.mutate({ id: v.id, suspendu: true }); }}
                    className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    ⏸️ Suspendre
                  </button>
                )
              )}
              {i !== 0 && (
                <button
                  onClick={() => { if (confirm(`Supprimer ${v.nom} ?`)) del.mutate(v.id); }}
                  className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  🗑️ Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing !== undefined && (
        <VendeurForm initial={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}
