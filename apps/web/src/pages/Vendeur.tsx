import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Vendeur {
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
}

const champs: { key: keyof Vendeur; label: string; wide?: boolean }[] = [
  { key: 'nom', label: 'Nom commercial' },
  { key: 'raisonSociale', label: 'Raison sociale' },
  { key: 'slogan', label: 'Slogan', wide: true },
  { key: 'adresse', label: 'Adresse', wide: true },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'email', label: 'Email' },
  { key: 'siteWeb', label: 'Site web' },
  { key: 'responsable', label: 'Responsable' },
  { key: 'ninea', label: 'NINEA' },
  { key: 'rccm', label: 'RCCM' },
];

export default function VendeurPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Vendeur>({ nom: '' });
  const [saved, setSaved] = useState(false);

  const { data } = useQuery<Vendeur>({
    queryKey: ['vendeur'],
    queryFn: async () => (await api.get('/vendeur')).data,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => (await api.put('/vendeur', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendeur'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (k: keyof Vendeur, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Vendeur / Société</h1>
        <p className="text-sm text-slate-500">
          Ces informations apparaissent sur les fiches de terrain, les factures et
          les certificats d'attribution.
        </p>
      </div>

      {saved && (
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          ✓ Informations du vendeur enregistrées.
        </div>
      )}

      <div className="card max-w-3xl">
        <div className="grid grid-cols-2 gap-4">
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
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => save.mutate()}
            className="btn-primary"
            disabled={save.isPending || !form.nom}
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
