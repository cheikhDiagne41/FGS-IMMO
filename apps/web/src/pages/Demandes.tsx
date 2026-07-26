import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatFCFA } from '../lib/api';

interface Doc { id: string; type: string; url: string; nom: string }
interface Demande {
  id: string;
  numeroDossier: string;
  montantTotal: number;
  pieceType?: string;
  pieceNumero?: string;
  createdAt: string;
  client: { nom: string; prenom: string; telephone: string; email?: string };
  cooperative: { nom: string; site: { nom: string } };
  documents: Doc[];
}

export default function Demandes() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<Demande[]>({
    queryKey: ['demandes'],
    queryFn: async () => (await api.get('/adhesions/demandes')).data,
  });

  const action = useMutation({
    mutationFn: async ({ id, verb }: { id: string; verb: 'valider' | 'rejeter' }) =>
      (await api.post(`/adhesions/${id}/${verb}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandes'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Demandes d'adhésion</h1>
        <p className="text-sm text-slate-500">
          Vérifiez les pièces d'identité puis validez pour affecter le dossier au client.
        </p>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      {!isLoading && data.length === 0 && (
        <div className="card text-center text-slate-400">
          Aucune demande en attente. 🎉
        </div>
      )}

      <div className="space-y-4">
        {data.map((d) => (
          <div key={d.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">
                  {d.numeroDossier} · {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  {d.client.prenom} {d.client.nom}
                </h3>
                <div className="text-sm text-slate-500">
                  {d.cooperative.nom} — {d.cooperative.site.nom}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  📞 {d.client.telephone}
                  {d.client.email ? ` · ${d.client.email}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Montant total</div>
                <div className="font-bold text-brand-700">{formatFCFA(d.montantTotal)}</div>
              </div>
            </div>

            {/* Pièce d'identité */}
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-700">
                Pièce : {d.pieceType ?? '—'}
                {d.pieceNumero ? ` · N° ${d.pieceNumero}` : ''}
              </div>
              <div className="flex flex-wrap gap-3">
                {d.documents.length === 0 && (
                  <span className="text-xs text-slate-400">Aucune pièce jointe.</span>
                )}
                {d.documents.map((doc) => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="block">
                    <img src={doc.url} alt={doc.nom} className="h-28 w-40 rounded-lg object-cover ring-1 ring-slate-200" />
                    <div className="mt-1 text-center text-[11px] text-slate-500">{doc.nom}</div>
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => action.mutate({ id: d.id, verb: 'valider' })}
                disabled={action.isPending}
                className="btn-primary"
              >
                ✓ Valider et affecter le dossier
              </button>
              <button
                onClick={() => {
                  if (confirm('Rejeter cette demande ?'))
                    action.mutate({ id: d.id, verb: 'rejeter' });
                }}
                disabled={action.isPending}
                className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
              >
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
