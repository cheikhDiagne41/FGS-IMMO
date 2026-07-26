import { useRef, useState } from 'react';
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
    type: 'COOPERATIVE',
    gerantNom: '',
    gerantTelephone: '',
    gerantEmail: '',
    // config coopérative
    coopMontantAcompte: '',
    coopCotisation: '',
    coopNbMensualites: '',
    coopFraisAdhesion: '',
    coopNbMaxAdherents: '',
    coopResponsable: '',
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const fileInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: f.code,
        nom: f.nom,
        statut: f.statut,
        type: f.type,
      };
      for (const k of ['region', 'departement', 'commune', 'adresse', 'description', 'gerantNom', 'gerantTelephone', 'gerantEmail'])
        if ((f as any)[k]) payload[k] = (f as any)[k];
      for (const k of ['latitude', 'longitude', 'superficie', 'nbParcelles', 'prixReference'])
        if ((f as any)[k]) payload[k] = Number((f as any)[k]);
      if (f.type === 'COOPERATIVE') {
        payload.cooperative = {
          nbMaxAdherents: Number(f.coopNbMaxAdherents || f.nbParcelles || 1),
          montantAcompte: Number(f.coopMontantAcompte || 0),
          cotisationMensuelle: Number(f.coopCotisation || 0),
          nbMensualites: Number(f.coopNbMensualites || 1),
          fraisAdhesion: Number(f.coopFraisAdhesion || 0),
          responsable: f.coopResponsable || undefined,
        };
      }
      const site = (await api.post('/sites', payload)).data;
      if (photos.length > 0) {
        const fd = new FormData();
        photos.forEach((p) => fd.append('files', p));
        await api.post(`/sites/${site.id}/media`, fd);
      }
      return site;
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

        {/* Type de site */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => set('type', 'COOPERATIVE')}
            className={`rounded-xl border-2 p-3 text-left text-sm transition ${
              f.type === 'COOPERATIVE'
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-800">🏘️ Coopérative</div>
            <div className="text-xs text-slate-500">
              Acompte + mensualités (adhésion & échéancier)
            </div>
          </button>
          <button
            type="button"
            onClick={() => set('type', 'VENTE_DIRECTE')}
            className={`rounded-xl border-2 p-3 text-left text-sm transition ${
              f.type === 'VENTE_DIRECTE'
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-800">🏷️ Vente directe</div>
            <div className="text-xs text-slate-500">
              Paiement unique, sans acompte ni mensualité
            </div>
          </button>
        </div>

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

        {/* Configuration coopérative */}
        {f.type === 'COOPERATIVE' && (
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <div className="mb-3 text-sm font-semibold text-brand-800">
              Configuration de la coopérative
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Field label="Acompte obligatoire *" v={f.coopMontantAcompte} on={(v) => set('coopMontantAcompte', v)} type="number" placeholder="2000000" />
              <Field label="Cotisation mensuelle *" v={f.coopCotisation} on={(v) => set('coopCotisation', v)} type="number" placeholder="250000" />
              <Field label="Nombre de mois *" v={f.coopNbMensualites} on={(v) => set('coopNbMensualites', v)} type="number" placeholder="48" />
              <Field label="Frais d'adhésion" v={f.coopFraisAdhesion} on={(v) => set('coopFraisAdhesion', v)} type="number" placeholder="25000" />
              <Field label="Nb max adhérents" v={f.coopNbMaxAdherents} on={(v) => set('coopNbMaxAdherents', v)} type="number" placeholder="ex : nb parcelles" />
              <Field label="Responsable (assigné à)" v={f.coopResponsable} on={(v) => set('coopResponsable', v)} placeholder="Nom du responsable" />
            </div>
          </div>
        )}

        {/* Gérant du site */}
        <div className="mt-4 rounded-xl border border-slate-100 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Gérant du site</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label="Nom du gérant" v={f.gerantNom} on={(v) => set('gerantNom', v)} placeholder="ex : Fatou Sow" />
            <Field label="Téléphone" v={f.gerantTelephone} on={(v) => set('gerantTelephone', v)} placeholder="+221 …" />
            <Field label="Email" v={f.gerantEmail} on={(v) => set('gerantEmail', v)} />
          </div>
        </div>

        {/* Photos du site */}
        <div className="mt-4">
          <label className="label">Photos du site</label>
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => setPhotos((p) => [...p, ...Array.from(e.target.files ?? [])])} />
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(p)} alt="" className="h-16 w-20 rounded-lg object-cover" />
                <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">×</button>
              </div>
            ))}
            <button type="button" onClick={() => fileInput.current?.click()}
              className="flex h-16 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-2xl text-slate-400 hover:border-brand-400">+</button>
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
