import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ImportComptes, { PROFILS } from '../components/ImportComptes';
import type { RoleImportable } from '../components/ImportComptes';

type Role = 'ADMIN' | 'GESTIONNAIRE' | 'COMPTABLE' | 'VENDEUR' | 'CLIENT';

interface Utilisateur {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  client?: { nom: string; prenom: string; telephone: string } | null;
  vendeurProfil?: { nom: string; suspendu: boolean } | null;
  _count: { paiementsSaisis: number };
}

const ROLES: { valeur: Role; label: string; couleur: string }[] = [
  { valeur: 'ADMIN', label: 'Administrateur', couleur: 'bg-brand-50 text-brand-700' },
  { valeur: 'GESTIONNAIRE', label: 'Gestionnaire', couleur: 'bg-indigo-50 text-indigo-700' },
  { valeur: 'COMPTABLE', label: 'Comptable', couleur: 'bg-amber-50 text-amber-700' },
  { valeur: 'VENDEUR', label: 'Vendeur', couleur: 'bg-teal-50 text-teal-700' },
  { valeur: 'CLIENT', label: 'Client', couleur: 'bg-slate-100 text-slate-600' },
];

const infoRole = (r: Role) => ROLES.find((x) => x.valeur === r) ?? ROLES[4];

/** Formulaire de création d'un compte */
function FormulaireCreation({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    email: '', password: '', role: 'GESTIONNAIRE' as Role,
    nom: '', prenom: '', telephone: '',
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const creer = useMutation({
    mutationFn: async () => (await api.post('/users', f)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const estClient = f.role === 'CLIENT';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">＋ Nouveau compte</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Rôle *</label>
            <select className="input" value={f.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.valeur} value={r.valeur}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" value={f.email} onChange={(e) => set('email', e.target.value)}
              placeholder="prenom.nom@fgsimmo.sn" />
          </div>
          <div>
            <label className="label">Mot de passe *</label>
            <input type="password" className="input" value={f.password}
              onChange={(e) => set('password', e.target.value)} placeholder="8 caractères minimum" />
          </div>

          {estClient && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
              <div className="col-span-2 text-xs font-semibold text-slate-500">
                Informations du client
              </div>
              <div>
                <label className="label">Prénom *</label>
                <input className="input" value={f.prenom} onChange={(e) => set('prenom', e.target.value)} />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input className="input" value={f.nom} onChange={(e) => set('nom', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Téléphone *</label>
                <input className="input" value={f.telephone} onChange={(e) => set('telephone', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {creer.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(creer.error as any)?.response?.data?.message ?? 'Création impossible.'}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button
            onClick={() => creer.mutate()}
            disabled={!f.email || f.password.length < 8 || creer.isPending}
            className="btn-primary"
          >
            {creer.isPending ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Formulaire de modification d'un compte existant */
function FormulaireModification({ u, onClose }: { u: Utilisateur; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(u.email);
  const [role, setRole] = useState<Role>(u.role);
  const [password, setPassword] = useState('');

  const modifier = useMutation({
    mutationFn: async () => {
      const data: any = {};
      if (email !== u.email) data.email = email;
      if (role !== u.role) data.role = role;
      if (password) data.password = password;
      return (await api.patch(`/users/${u.id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">Modifier le compte</h3>
        <p className="mb-4 text-sm text-slate-500">{u.email}</p>

        <div className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Rôle</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={u.role === 'CLIENT'}
            >
              {ROLES.map((r) => (
                <option key={r.valeur} value={r.valeur}>{r.label}</option>
              ))}
            </select>
            {u.role === 'CLIENT' && (
              <div className="mt-1 text-xs text-slate-400">
                Le rôle d'un client ne peut pas changer : son dossier d'adhésion y est rattaché.
              </div>
            )}
          </div>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input type="password" className="input" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laisser vide pour ne pas le changer" />
          </div>
        </div>

        {modifier.isError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {(modifier.error as any)?.response?.data?.message ?? 'Modification impossible.'}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => modifier.mutate()} disabled={modifier.isPending} className="btn-primary">
            {modifier.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UtilisateursPage() {
  const qc = useQueryClient();
  const { user: connecte } = useAuth();
  const [creation, setCreation] = useState(false);
  const [importation, setImportation] = useState<RoleImportable | null>(null);
  const [modification, setModification] = useState<Utilisateur | null>(null);
  const [filtre, setFiltre] = useState<Role | ''>('');
  const [erreur, setErreur] = useState('');

  const { data = [], isLoading } = useQuery<Utilisateur[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const basculerActif = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch(`/users/${id}`, { isActive })).data,
    onSuccess: () => { setErreur(''); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => setErreur(e?.response?.data?.message ?? 'Opération impossible.'),
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => { setErreur(''); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => setErreur(e?.response?.data?.message ?? 'Suppression impossible.'),
  });

  const liste = filtre ? data.filter((u) => u.role === filtre) : data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Comptes utilisateurs</h1>
          <p className="text-sm text-slate-500">
            Tous les accès à la plateforme : administrateurs, gestionnaires, comptables,
            vendeurs et clients.
          </p>
        </div>
        <button onClick={() => setCreation(true)} className="btn-primary">＋ Nouveau compte</button>
      </div>

      {/* Un import par type de compte : le fichier n'a pas à porter le rôle */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
        <span className="text-sm font-semibold text-slate-500">
          ⬆️ Importer depuis Excel :
        </span>
        {(['CLIENT', 'VENDEUR', 'GESTIONNAIRE', 'COMPTABLE'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setImportation(r)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset transition hover:brightness-95 ${infoRole(r).couleur} ring-slate-200`}
          >
            {PROFILS[r].pluriel.charAt(0).toUpperCase() + PROFILS[r].pluriel.slice(1)}
          </button>
        ))}
      </div>

      {erreur && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltre('')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            filtre === '' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tous ({data.length})
        </button>
        {ROLES.map((r) => {
          const n = data.filter((u) => u.role === r.valeur).length;
          if (n === 0) return null;
          return (
            <button
              key={r.valeur}
              onClick={() => setFiltre(r.valeur)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filtre === r.valeur ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.label} ({n})
            </button>
          );
        })}
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
              <th className="p-3">Compte</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">État</th>
              <th className="p-3">Dernière connexion</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((u) => {
              const r = infoRole(u.role);
              const soiMeme = u.id === connecte?.id;
              return (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-medium text-slate-800">{u.email}</div>
                    <div className="text-xs text-slate-400">
                      {u.client
                        ? `${u.client.prenom} ${u.client.nom} · ${u.client.telephone}`
                        : u.vendeurProfil
                          ? `${u.vendeurProfil.nom}${u.vendeurProfil.suspendu ? ' · suspendu' : ''}`
                          : '—'}
                      {soiMeme && <span className="ml-2 font-bold text-brand-600">(vous)</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.couleur}`}>
                      {r.label}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      u.isActive ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {u.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR')
                      : 'jamais'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setModification(u)}
                        className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        ✏️ Modifier
                      </button>
                      {!soiMeme && (
                        <>
                          <button
                            onClick={() => basculerActif.mutate({ id: u.id, isActive: !u.isActive })}
                            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                              u.isActive
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                            }`}
                          >
                            {u.isActive ? '⏸️ Désactiver' : '✓ Réactiver'}
                          </button>
                          <button
                            onClick={() => {
                              const avertissement = u.client
                                ? `\n\nATTENTION : le dossier client de ${u.client.prenom} ${u.client.nom} sera également supprimé.`
                                : u.vendeurProfil
                                  ? `\n\nLa fiche vendeur « ${u.vendeurProfil.nom} » sera conservée, mais sans accès.`
                                  : '';
                              if (confirm(`Supprimer définitivement le compte ${u.email} ?${avertissement}`)) {
                                supprimer.mutate(u.id);
                              }
                            }}
                            className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                          >
                            🗑️ Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isLoading && liste.length === 0 && (
        <div className="card text-center text-slate-500">Aucun compte pour ce filtre.</div>
      )}

      <div className="card bg-slate-50 text-sm text-slate-500">
        <b className="text-slate-700">À savoir :</b> le dernier administrateur actif ne peut être
        ni supprimé, ni désactivé, ni rétrogradé — cela vous verrouillerait hors de la
        plateforme. Supprimer un compte conserve son historique comptable (paiements saisis,
        journal d'activité), simplement détaché.
      </div>

      {importation && (
        // la clé repart de zéro à chaque changement de type de compte
        <ImportComptes
          key={importation}
          role={importation}
          onClose={() => setImportation(null)}
        />
      )}
      {creation && <FormulaireCreation onClose={() => setCreation(false)} />}
      {modification && (
        <FormulaireModification u={modification} onClose={() => setModification(null)} />
      )}
    </div>
  );
}
