import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Vendeur {
  id: string;
  nom: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  whatsapp?: string;
}

type Cle = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube' | 'twitter' | 'whatsapp';

const RESEAUX: {
  cle: Cle;
  label: string;
  icone: string;
  exemple: string;
  couleur: string;
}[] = [
  { cle: 'facebook', label: 'Facebook', icone: '📘', exemple: 'https://facebook.com/votrepage', couleur: 'bg-[#1877F2]' },
  { cle: 'instagram', label: 'Instagram', icone: '📷', exemple: 'https://instagram.com/votrecompte', couleur: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]' },
  { cle: 'tiktok', label: 'TikTok', icone: '🎵', exemple: 'https://tiktok.com/@votrecompte', couleur: 'bg-black' },
  { cle: 'youtube', label: 'YouTube', icone: '▶️', exemple: 'https://youtube.com/@votrechaine', couleur: 'bg-[#FF0000]' },
  { cle: 'linkedin', label: 'LinkedIn', icone: '💼', exemple: 'https://linkedin.com/company/votresociete', couleur: 'bg-[#0A66C2]' },
  { cle: 'twitter', label: 'X (Twitter)', icone: '✖️', exemple: 'https://x.com/votrecompte', couleur: 'bg-black' },
  { cle: 'whatsapp', label: 'WhatsApp', icone: '💬', exemple: 'https://wa.me/221770000000', couleur: 'bg-[#25D366]' },
];

export default function ReseauxSociauxPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<Cle, string>>({
    facebook: '', instagram: '', tiktok: '', linkedin: '', youtube: '', twitter: '', whatsapp: '',
  });
  const [enregistre, setEnregistre] = useState(false);

  // Le premier vendeur enregistré représente la société
  const { data: societe, isLoading } = useQuery<Vendeur>({
    queryKey: ['vendeurs', 'societe'],
    queryFn: async () => (await api.get('/vendeur')).data[0],
  });

  useEffect(() => {
    if (!societe) return;
    setForm({
      facebook: societe.facebook ?? '',
      instagram: societe.instagram ?? '',
      tiktok: societe.tiktok ?? '',
      linkedin: societe.linkedin ?? '',
      youtube: societe.youtube ?? '',
      twitter: societe.twitter ?? '',
      whatsapp: societe.whatsapp ?? '',
    });
  }, [societe]);

  const save = useMutation({
    mutationFn: async () => (await api.put(`/vendeur/${societe!.id}`, form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendeurs'] });
      qc.invalidateQueries({ queryKey: ['public-societe'] });
      setEnregistre(true);
      setTimeout(() => setEnregistre(false), 3000);
    },
  });

  const set = (cle: Cle, valeur: string) => setForm((f) => ({ ...f, [cle]: valeur }));
  const actifs = RESEAUX.filter((r) => form[r.cle]?.trim());

  if (isLoading) return <div className="p-10 text-center text-slate-400">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Réseaux sociaux</h1>
        <p className="text-sm text-slate-500">
          Ces liens apparaissent en bas de chaque page du site et sur « À propos ».
          Un réseau laissé vide n'est tout simplement pas affiché.
        </p>
      </div>

      <div className="card space-y-4">
        {RESEAUX.map((r) => (
          <div key={r.cle} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-44 flex-shrink-0 items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${r.couleur}`}
              >
                {r.icone}
              </span>
              <span className="font-semibold text-slate-700">{r.label}</span>
            </div>
            <input
              className="input flex-1"
              value={form[r.cle]}
              onChange={(e) => set(r.cle, e.target.value)}
              placeholder={r.exemple}
            />
            {form[r.cle]?.trim() && (
              <a
                href={form[r.cle]}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost flex-shrink-0 text-xs"
                title="Ouvrir le lien pour vérifier"
              >
                Tester ↗
              </a>
            )}
          </div>
        ))}

        {save.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(save.error as any)?.response?.data?.message ?? "Erreur lors de l'enregistrement."}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-sm text-slate-500">
            {actifs.length > 0
              ? `${actifs.length} réseau(x) affiché(s) sur le site : ${actifs.map((r) => r.label).join(', ')}`
              : 'Aucun réseau affiché pour le moment.'}
          </div>
          <div className="flex items-center gap-3">
            {enregistre && (
              <span className="text-sm font-semibold text-brand-700">✓ Enregistré</span>
            )}
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !societe}
              className="btn-primary"
            >
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-slate-50 text-sm text-slate-500">
        <b className="text-slate-700">Conseil :</b> collez l'adresse complète de la page,
        telle qu'elle apparaît dans votre navigateur. Pour WhatsApp, utilisez le format{' '}
        <code className="rounded bg-white px-1">https://wa.me/221XXXXXXXXX</code> avec
        l'indicatif du pays et sans espaces.
      </div>
    </div>
  );
}
