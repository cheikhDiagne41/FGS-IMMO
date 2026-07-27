import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function MessageVendeurForm({ terrainId }: { terrainId: string }) {
  const [f, setF] = useState({ nom: '', telephone: '', contenu: '' });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const envoyer = useMutation({
    mutationFn: async () =>
      (await api.post(`/public/terrains/${terrainId}/message`, f)).data,
  });

  if (envoyer.isSuccess) {
    return (
      <div className="mt-4 rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
        ✓ Votre message a été envoyé au vendeur. Il vous recontactera.
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        💬 Message au vendeur
      </div>
      <div className="space-y-2">
        <input className="input" placeholder="Votre nom *" value={f.nom}
          onChange={(e) => set('nom', e.target.value)} />
        <input className="input" placeholder="Votre téléphone" value={f.telephone}
          onChange={(e) => set('telephone', e.target.value)} />
        <textarea className="input min-h-[70px]" placeholder="Votre message *" value={f.contenu}
          onChange={(e) => set('contenu', e.target.value)} />
        {envoyer.isError && (
          <div className="text-xs text-rose-600">
            {(envoyer.error as any)?.response?.data?.message ?? 'Envoi impossible.'}
          </div>
        )}
        <button
          onClick={() => envoyer.mutate()}
          className="btn-primary w-full"
          disabled={!f.nom.trim() || !f.contenu.trim() || envoyer.isPending}
        >
          {envoyer.isPending ? 'Envoi…' : 'Envoyer le message'}
        </button>
      </div>
    </div>
  );
}
