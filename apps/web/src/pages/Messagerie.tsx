import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Msg { id: string; emetteur: 'PROSPECT' | 'VENDEUR' | 'ADMIN'; contenu: string; createdAt: string }
interface Conv {
  id: string;
  prospectNom: string;
  prospectTelephone?: string;
  prospectEmail?: string;
  updatedAt: string;
  vendeur: { id: string; nom: string; suspendu: boolean };
  terrain?: { id: string; numeroParcelle: string; titre?: string } | null;
  messages: Msg[];
}

const emetteurLabel: Record<string, string> = {
  PROSPECT: 'Prospect', VENDEUR: 'Vendeur', ADMIN: 'Administration',
};

export default function Messagerie() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selId, setSelId] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const isVendeur = user?.role === 'VENDEUR';

  const { data: convs = [], isLoading } = useQuery<Conv[]>({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get('/messages/conversations')).data,
  });

  const sel = convs.find((c) => c.id === selId) ?? convs[0];

  const repondre = useMutation({
    mutationFn: async () =>
      (await api.post(`/messages/conversations/${sel!.id}/repondre`, { contenu: texte })).data,
    onSuccess: () => {
      setTexte('');
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const suspendu = isVendeur && sel?.vendeur.suspendu;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Messagerie</h1>
        <p className="text-sm text-slate-500">
          {isVendeur
            ? 'Vos échanges avec les prospects intéressés par vos annonces.'
            : 'Supervisez tous les échanges. Vous pouvez répondre au nom d\'un vendeur suspendu.'}
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Liste des conversations */}
        <div className="card max-h-[70vh] space-y-1 overflow-y-auto p-2">
          {convs.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">Aucun message.</div>
          )}
          {convs.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => setSelId(c.id)}
                className={`block w-full rounded-xl p-3 text-left transition ${
                  sel?.id === c.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{c.prospectNom}</span>
                  {c.vendeur.suspendu && (
                    <span className="rounded bg-rose-50 px-1.5 text-[10px] font-bold text-rose-600">suspendu</span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {c.terrain ? `Parcelle ${c.terrain.numeroParcelle} · ` : ''}{last?.contenu}
                </div>
                {!isVendeur && (
                  <div className="text-[10px] text-slate-400">Vendeur : {c.vendeur.nom}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Fil de discussion */}
        <div className="card flex max-h-[70vh] flex-col lg:col-span-2">
          {!sel ? (
            <div className="flex flex-1 items-center justify-center text-slate-400">
              Sélectionnez une conversation
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 pb-3">
                <div className="font-bold text-slate-800">{sel.prospectNom}</div>
                <div className="text-xs text-slate-400">
                  {[sel.prospectTelephone, sel.prospectEmail].filter(Boolean).join(' · ')}
                  {sel.terrain ? ` — Parcelle ${sel.terrain.numeroParcelle}` : ''}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {sel.messages.map((m) => {
                  const mine = m.emetteur !== 'PROSPECT';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        m.emetteur === 'PROSPECT' ? 'bg-slate-100 text-slate-800'
                          : m.emetteur === 'ADMIN' ? 'bg-slate-800 text-white'
                          : 'bg-brand-600 text-white'
                      }`}>
                        <div className="text-[10px] opacity-70">{emetteurLabel[m.emetteur]}</div>
                        {m.contenu}
                      </div>
                    </div>
                  );
                })}
              </div>

              {suspendu ? (
                <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  Votre compte est suspendu : l'administration gère vos échanges pour le moment.
                </div>
              ) : (
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <input
                    className="input flex-1"
                    placeholder="Votre réponse…"
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && texte.trim()) repondre.mutate(); }}
                  />
                  <button
                    onClick={() => repondre.mutate()}
                    className="btn-primary"
                    disabled={!texte.trim() || repondre.isPending}
                  >
                    Envoyer
                  </button>
                </div>
              )}
              {repondre.isError && (
                <div className="mt-2 text-xs text-rose-600">
                  {(repondre.error as any)?.response?.data?.message ?? 'Envoi impossible.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
