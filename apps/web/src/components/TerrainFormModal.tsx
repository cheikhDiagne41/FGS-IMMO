import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface SiteOpt {
  id: string;
  nom: string;
  code: string;
}
interface VendeurOpt { id: string; nom: string; raisonSociale?: string }

export default function TerrainFormModal({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial?: any;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [f, setF] = useState({
    numeroParcelle: initial?.numeroParcelle ?? '',
    siteId: initial?.site?.id ?? initial?.siteId ?? '',
    superficie: String(initial?.superficie ?? '300'),
    prix: initial?.prix != null ? String(initial.prix) : '',
    type: initial?.type ?? 'HABITATION',
    latitude: initial?.latitude != null ? String(initial.latitude) : '',
    longitude: initial?.longitude != null ? String(initial.longitude) : '',
    statut: initial?.statut ?? 'DISPONIBLE',
    titre: initial?.titre ?? '',
    document: initial?.document ?? '',
    description: initial?.description ?? '',
    vendeurNom: initial?.vendeurNom ?? '',
    vendeurTelephone: initial?.vendeurTelephone ?? '',
    vendeurId: initial?.vendeurId ?? '',
    enVedette: initial?.enVedette ?? false,
  });
  const set = (k: string, v: string | boolean) =>
    setF((s) => ({ ...s, [k]: v }));
  const fileInput = useRef<HTMLInputElement>(null);
  const [medias, setMedias] = useState<File[]>([]);

  const { data: sites = [] } = useQuery<SiteOpt[]>({
    queryKey: ['sites'],
    queryFn: async () => (await api.get('/sites')).data,
  });
  const { data: vendeurs = [] } = useQuery<VendeurOpt[]>({
    queryKey: ['vendeurs'],
    queryFn: async () => (await api.get('/vendeur')).data,
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
      for (const k of ['titre', 'document', 'description', 'vendeurNom', 'vendeurTelephone', 'vendeurId'])
        if ((f as any)[k]) payload[k] = (f as any)[k];
      payload.enVedette = f.enVedette;
      const terrain = isEdit
        ? (await api.patch(`/terrains/${initial.id}`, payload)).data
        : (await api.post('/terrains', payload)).data;
      // Upload des médias sélectionnés
      if (medias.length > 0) {
        const fd = new FormData();
        medias.forEach((file) => fd.append('files', file));
        await api.post(`/terrains/${terrain.id}/media`, fd);
      }
      return terrain;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terrains'] });
      qc.invalidateQueries({ queryKey: ['terrain'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">
          {isEdit ? 'Modifier le terrain' : 'Nouveau terrain'}
        </h3>
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
          <div className="col-span-2">
            <label className="label">Titre de l'annonce</label>
            <input className="input" value={f.titre}
              onChange={(e) => set('titre', e.target.value)}
              placeholder="ex : Grand terrain à Diamniadio" />
          </div>
          <div>
            <label className="label">Document</label>
            <input className="input" value={f.document}
              onChange={(e) => set('document', e.target.value)}
              placeholder="Délibération, Titre foncier…" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={f.enVedette}
                onChange={(e) => set('enVedette', e.target.checked)} />
              ★ En vedette
            </label>
          </div>
          <div>
            <label className="label">Vendeur (nom)</label>
            <input className="input" value={f.vendeurNom}
              onChange={(e) => set('vendeurNom', e.target.value)}
              placeholder="ex : Fatou Sow" />
          </div>
          <div>
            <label className="label">Vendeur (téléphone)</label>
            <input className="input" value={f.vendeurTelephone}
              onChange={(e) => set('vendeurTelephone', e.target.value)}
              placeholder="+221 77 000 00 06" />
          </div>
          <div className="col-span-2">
            <label className="label">Compte vendeur (messagerie)</label>
            <select className="input" value={f.vendeurId}
              onChange={(e) => set('vendeurId', e.target.value)}>
              <option value="">— Vendeur par défaut (société) —</option>
              {vendeurs.map((v) => (
                <option key={v.id} value={v.id}>{v.raisonSociale ?? v.nom}</option>
              ))}
            </select>
            <div className="mt-1 text-xs text-slate-400">
              Les messages des visiteurs sur cette annonce iront à ce vendeur.
            </div>
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input min-h-[70px]" value={f.description}
              onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>

        {/* Photos & vidéos */}
        <div className="mt-3">
          <label className="label">Photos & vidéos</label>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) =>
              setMedias((prev) => [...prev, ...Array.from(e.target.files ?? [])])
            }
          />
          <div className="flex flex-wrap gap-2">
            {medias.map((m, i) => (
              <div key={i} className="relative">
                {m.type.startsWith('video') ? (
                  <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-slate-800 text-white">▶</div>
                ) : (
                  <img src={URL.createObjectURL(m)} alt="" className="h-16 w-20 rounded-lg object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setMedias((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-16 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-2xl text-slate-400 hover:border-brand-400"
            >
              +
            </button>
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
            {create.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le terrain'}
          </button>
        </div>
      </div>
    </div>
  );
}
