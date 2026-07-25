import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function SiteFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    code: '',
    nom: '',
    region: '',
    departement: '',
    commune: '',
    adresse: '',
    latitude: '',
    longitude: '',
    superficie: '',
    nbParcelles: '',
    prixReference: '',
    description: '',
    statut: 'DISPONIBLE',
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = { code: f.code, nom: f.nom, statut: f.statut };
      for (const k of ['region', 'departement', 'commune', 'adresse', 'description'])
        if ((f as any)[k]) payload[k] = (f as any)[k];
      for (const k of ['latitude', 'longitude', 'superficie', 'nbParcelles', 'prixReference'])
        if ((f as any)[k]) payload[k] = Number((f as any)[k]);
      return (await api.post('/sites', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">Nouveau site</h3>
        <p className="mb-4 text-sm text-slate-500">
          Renseignez les informations du site immobilier.
        </p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Code *" v={f.code} on={(v) => set('code', v)} placeholder="DKR-002" />
          <Field label="Nom *" v={f.nom} on={(v) => set('nom', v)} wide />
          <Field label="Région" v={f.region} on={(v) => set('region', v)} />
          <Field label="Département" v={f.departement} on={(v) => set('departement', v)} />
          <Field label="Commune" v={f.commune} on={(v) => set('commune', v)} />
          <Field label="Adresse" v={f.adresse} on={(v) => set('adresse', v)} />
          <Field label="Latitude" v={f.latitude} on={(v) => set('latitude', v)} type="number" placeholder="14.71" />
          <Field label="Longitude" v={f.longitude} on={(v) => set('longitude', v)} type="number" placeholder="-17.18" />
          <Field label="Superficie (m²)" v={f.superficie} on={(v) => set('superficie', v)} type="number" />
          <Field label="Nb parcelles" v={f.nbParcelles} on={(v) => set('nbParcelles', v)} type="number" placeholder="100" />
          <Field label="Prix référence" v={f.prixReference} on={(v) => set('prixReference', v)} type="number" />
          <div>
            <label className="label">Statut</label>
            <select className="input" value={f.statut} onChange={(e) => set('statut', e.target.value)}>
              <option value="DISPONIBLE">Disponible</option>
              <option value="EN_COMMERCIALISATION">En commercialisation</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
          </div>
        </div>

        {create.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(create.error as any)?.response?.data?.message ?? 'Erreur'}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button
            onClick={() => create.mutate()}
            className="btn-primary"
            disabled={!f.code || !f.nom || create.isPending}
          >
            {create.isPending ? 'Création…' : 'Créer le site'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  v,
  on,
  type = 'text',
  placeholder,
  wide,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        value={v}
        placeholder={placeholder}
        onChange={(e) => on(e.target.value)}
      />
    </div>
  );
}
