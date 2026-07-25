import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface SiteOpt {
  id: string;
  nom: string;
  code: string;
}

export default function TerrainFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    numeroParcelle: '',
    siteId: '',
    superficie: '300',
    prix: '',
    type: 'HABITATION',
    latitude: '',
    longitude: '',
    statut: 'DISPONIBLE',
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const { data: sites = [] } = useQuery<SiteOpt[]>({
    queryKey: ['sites'],
    queryFn: async () => (await api.get('/sites')).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        numeroParcelle: f.numeroParcelle,
        siteId: f.siteId,
        superficie: Number(f.superficie),
        type: f.type,
        statut: f.statut,
      };
      if (f.prix) payload.prix = Number(f.prix);
      if (f.latitude) payload.latitude = Number(f.latitude);
      if (f.longitude) payload.longitude = Number(f.longitude);
      return (await api.post('/terrains', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terrains'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">Nouveau terrain</h3>
        <p className="mb-4 text-sm text-slate-500">
          Ajoutez une parcelle à un site. Vous pourrez ensuite ajouter photos et vidéos.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Site *</label>
            <select
              className="input"
              value={f.siteId}
              onChange={(e) => set('siteId', e.target.value)}
            >
              <option value="">— Choisir un site —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">N° parcelle *</label>
            <input
              className="input"
              value={f.numeroParcelle}
              onChange={(e) => set('numeroParcelle', e.target.value)}
              placeholder="ex : 12"
            />
          </div>
          <div>
            <label className="label">Superficie (m²) *</label>
            <input
              type="number"
              className="input"
              value={f.superficie}
              onChange={(e) => set('superficie', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Prix (FCFA)</label>
            <input
              type="number"
              className="input"
              value={f.prix}
              onChange={(e) => set('prix', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>
              <option value="HABITATION">Habitation</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="AGRICOLE">Agricole</option>
              <option value="MIXTE">Mixte</option>
            </select>
          </div>
          <div>
            <label className="label">Latitude</label>
            <input
              type="number"
              className="input"
              value={f.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="14.71"
            />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input
              type="number"
              className="input"
              value={f.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="-17.18"
            />
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
            disabled={!f.siteId || !f.numeroParcelle || create.isPending}
          >
            {create.isPending ? 'Création…' : 'Créer le terrain'}
          </button>
        </div>
      </div>
    </div>
  );
}
