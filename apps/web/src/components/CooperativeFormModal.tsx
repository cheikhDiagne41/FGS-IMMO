import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface SiteOpt { id: string; nom: string; code: string; type: string }

export default function CooperativeFormModal({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial?: any;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const str = (v: any) => (v === null || v === undefined ? '' : String(v));
  const [f, setF] = useState({
    numero: str(initial?.numero),
    nom: str(initial?.nom),
    siteId: str(initial?.site?.id ?? initial?.siteId),
    nbMaxAdherents: str(initial?.nbMaxAdherents),
    montantAcompte: str(initial?.montantAcompte),
    cotisationMensuelle: str(initial?.cotisationMensuelle),
    nbMensualites: str(initial?.nbMensualites),
    fraisAdhesion: str(initial?.fraisAdhesion),
    responsable: str(initial?.responsable),
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const { data: sites = [] } = useQuery<SiteOpt[]>({
    queryKey: ['sites'],
    queryFn: async () => (await api.get('/sites')).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        numero: f.numero,
        nom: f.nom,
        siteId: f.siteId,
        nbMaxAdherents: Number(f.nbMaxAdherents),
        montantAcompte: Number(f.montantAcompte),
        cotisationMensuelle: Number(f.cotisationMensuelle),
        nbMensualites: Number(f.nbMensualites),
      };
      payload.fraisAdhesion = f.fraisAdhesion ? Number(f.fraisAdhesion) : 0;
      payload.responsable = f.responsable || undefined;
      return isEdit
        ? (await api.patch(`/cooperatives/${initial.id}`, payload)).data
        : (await api.post('/cooperatives', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cooperatives'] });
      onClose();
    },
  });

  const valide =
    f.numero && f.nom && f.siteId && f.nbMaxAdherents &&
    f.montantAcompte && f.cotisationMensuelle && f.nbMensualites;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">
          {isEdit ? 'Modifier la coopérative' : 'Nouvelle coopérative'}
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Rattachez une coopérative à un site et définissez ses modalités.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Site *</label>
            <select className="input" value={f.siteId}
              onChange={(e) => set('siteId', e.target.value)}>
              <option value="">— Choisir un site —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <Field label="Numéro *" v={f.numero} on={(v) => set('numero', v)} placeholder="COOP-002" />
          <Field label="Nom *" v={f.nom} on={(v) => set('nom', v)} placeholder="Coopérative …" />
          <Field label="Acompte obligatoire *" v={f.montantAcompte} on={(v) => set('montantAcompte', v)} type="number" placeholder="2000000" />
          <Field label="Cotisation mensuelle *" v={f.cotisationMensuelle} on={(v) => set('cotisationMensuelle', v)} type="number" placeholder="250000" />
          <Field label="Nombre de mois *" v={f.nbMensualites} on={(v) => set('nbMensualites', v)} type="number" placeholder="48" />
          <Field label="Nb max adhérents *" v={f.nbMaxAdherents} on={(v) => set('nbMaxAdherents', v)} type="number" placeholder="100" />
          <Field label="Frais d'adhésion" v={f.fraisAdhesion} on={(v) => set('fraisAdhesion', v)} type="number" placeholder="25000" />
          <Field label="Responsable" v={f.responsable} on={(v) => set('responsable', v)} placeholder="Nom du responsable" />
        </div>

        {create.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(create.error as any)?.response?.data?.message ?? 'Erreur'}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => create.mutate()} className="btn-primary" disabled={!valide || create.isPending}>
            {create.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la coopérative'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, on, type = 'text', placeholder }: {
  label: string; v: string; on: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={v} placeholder={placeholder}
        onChange={(e) => on(e.target.value)} />
    </div>
  );
}
