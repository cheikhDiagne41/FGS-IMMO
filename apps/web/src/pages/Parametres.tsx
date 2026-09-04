import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type TypeParametre = 'TEXTE' | 'NOMBRE' | 'BOOLEEN' | 'LISTE';

interface Parametre {
  cle: string;
  valeur: string;
  type: TypeParametre;
  libelle: string;
  description?: string | null;
  groupe: string;
  public: boolean;
  systeme: boolean;
  ordre: number;
}

const TYPES: { valeur: TypeParametre; label: string; aide: string }[] = [
  { valeur: 'TEXTE', label: 'Texte', aide: 'Une valeur libre' },
  { valeur: 'NOMBRE', label: 'Nombre', aide: 'Durée, seuil, pourcentage…' },
  { valeur: 'BOOLEEN', label: 'Interrupteur', aide: 'Activé ou coupé' },
  { valeur: 'LISTE', label: 'Liste', aide: 'Valeurs séparées par des virgules' },
];

/** Une ligne de réglage : l'affichage s'adapte au type du paramètre. */
function LigneParametre({ p }: { p: Parametre }) {
  const qc = useQueryClient();
  const [valeur, setValeur] = useState(p.valeur);
  const [erreur, setErreur] = useState('');

  // La valeur peut changer ailleurs (autre onglet, rechargement)
  useEffect(() => setValeur(p.valeur), [p.valeur]);

  const enregistrer = useMutation({
    mutationFn: async (v: string) =>
      (await api.patch(`/parametres/${p.cle}`, { valeur: v })).data,
    onSuccess: () => {
      setErreur('');
      qc.invalidateQueries({ queryKey: ['parametres'] });
    },
    onError: (e: any) => {
      setValeur(p.valeur);
      setErreur(e?.response?.data?.message ?? 'Enregistrement impossible.');
    },
  });

  const supprimer = useMutation({
    mutationFn: async () => (await api.delete(`/parametres/${p.cle}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parametres'] }),
    onError: (e: any) => setErreur(e?.response?.data?.message ?? 'Suppression impossible.'),
  });

  const modifie = valeur !== p.valeur;
  const actif = p.valeur === 'true';

  return (
    <div className="flex flex-wrap items-start gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800">{p.libelle}</span>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
            {p.cle}
          </code>
          {p.public && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
              visible sur le site
            </span>
          )}
        </div>
        {p.description && (
          <p className="mt-0.5 text-xs text-slate-500">{p.description}</p>
        )}
        {erreur && <p className="mt-1 text-xs text-rose-600">{erreur}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {p.type === 'BOOLEEN' ? (
          <button
            onClick={() => enregistrer.mutate(actif ? 'false' : 'true')}
            disabled={enregistrer.isPending}
            className={`relative h-7 w-14 rounded-full transition ${
              actif ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
            aria-label={actif ? 'Désactiver' : 'Activer'}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                actif ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        ) : (
          <>
            <input
              className="input w-56"
              type={p.type === 'NOMBRE' ? 'number' : 'text'}
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              placeholder={p.type === 'LISTE' ? 'valeur1, valeur2' : ''}
            />
            <button
              onClick={() => enregistrer.mutate(valeur)}
              disabled={!modifie || enregistrer.isPending}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-30"
            >
              {enregistrer.isPending ? '…' : 'Enregistrer'}
            </button>
          </>
        )}

        {!p.systeme && (
          <button
            onClick={() => {
              if (confirm(`Supprimer le paramètre « ${p.libelle} » ?`)) supprimer.mutate();
            }}
            className="rounded-lg px-2 py-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
            title="Supprimer ce paramètre"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

/** Ajout d'un paramètre : c'est par ici qu'on branche une future fonctionnalité. */
function FormulaireAjout({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    libelle: '',
    cle: '',
    valeur: '',
    type: 'TEXTE' as TypeParametre,
    groupe: 'Fonctionnalités',
    description: '',
    public: false,
  });
  const [erreur, setErreur] = useState('');
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  // La clé technique se déduit de l'intitulé tant qu'on ne l'a pas touchée
  const [cleManuelle, setCleManuelle] = useState(false);
  const cleAuto = f.libelle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const cle = cleManuelle ? f.cle : cleAuto;

  const creer = useMutation({
    mutationFn: async () =>
      (
        await api.post('/parametres', {
          ...f,
          cle,
          valeur: f.type === 'BOOLEEN' ? f.valeur || 'false' : f.valeur,
          description: f.description || undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parametres'] });
      onClose();
    },
    onError: (e: any) =>
      setErreur(
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(' · ')
          : e?.response?.data?.message ?? 'Création impossible.',
      ),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-800">＋ Nouveau paramètre</h3>
        <p className="mt-1 text-sm text-slate-500">
          Un réglage supplémentaire, disponible immédiatement pour une
          fonctionnalité à venir.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Intitulé *</label>
            <input
              className="input"
              value={f.libelle}
              onChange={(e) => set('libelle', e.target.value)}
              placeholder="ex : Paiement en ligne par carte"
            />
          </div>

          <div>
            <label className="label">Clé technique *</label>
            <input
              className="input font-mono text-sm"
              value={cle}
              onChange={(e) => {
                setCleManuelle(true);
                set('cle', e.target.value);
              }}
              placeholder="paiement_carte"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              C'est le nom utilisé dans le code pour lire ce réglage.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type *</label>
              <select
                className="input"
                value={f.type}
                onChange={(e) => {
                  const t = e.target.value as TypeParametre;
                  set('type', t);
                  set('valeur', t === 'BOOLEEN' ? 'false' : '');
                }}
              >
                {TYPES.map((t) => (
                  <option key={t.valeur} value={t.valeur}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                {TYPES.find((t) => t.valeur === f.type)?.aide}
              </p>
            </div>
            <div>
              <label className="label">Groupe</label>
              <input
                className="input"
                value={f.groupe}
                onChange={(e) => set('groupe', e.target.value)}
                placeholder="Fonctionnalités"
              />
            </div>
          </div>

          <div>
            <label className="label">Valeur de départ *</label>
            {f.type === 'BOOLEEN' ? (
              <select
                className="input"
                value={f.valeur || 'false'}
                onChange={(e) => set('valeur', e.target.value)}
              >
                <option value="false">Coupé</option>
                <option value="true">Activé</option>
              </select>
            ) : (
              <input
                className="input"
                type={f.type === 'NOMBRE' ? 'number' : 'text'}
                value={f.valeur}
                onChange={(e) => set('valeur', e.target.value)}
                placeholder={f.type === 'LISTE' ? 'valeur1, valeur2' : ''}
              />
            )}
          </div>

          <div>
            <label className="label">Aide affichée (facultatif)</label>
            <input
              className="input"
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="À quoi sert ce réglage ?"
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={f.public}
              onChange={(e) => set('public', e.target.checked)}
            />
            Lisible par le site vitrine (sans être connecté)
          </label>
        </div>

        {erreur && (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {erreur}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Annuler
          </button>
          <button
            onClick={() => creer.mutate()}
            disabled={!f.libelle || !cle || (f.type !== 'BOOLEEN' && !f.valeur) || creer.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {creer.isPending ? 'Création…' : 'Créer le paramètre'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParametresPage() {
  const [ajout, setAjout] = useState(false);

  const { data = [], isLoading } = useQuery<Parametre[]>({
    queryKey: ['parametres'],
    queryFn: async () => (await api.get('/parametres')).data,
  });

  const groupes = [...new Set(data.map((p) => p.groupe))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
          <p className="text-sm text-slate-500">
            Réglages de la plateforme et interrupteurs de fonctionnalités. Toute
            modification s'applique immédiatement.
          </p>
        </div>
        <button onClick={() => setAjout(true)} className="btn-primary">
          ＋ Nouveau paramètre
        </button>
      </div>

      {isLoading && <div className="text-slate-400">Chargement…</div>}

      {groupes.map((g) => (
        <div key={g} className="card p-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-bold text-slate-700">{g}</h2>
          </div>
          {data
            .filter((p) => p.groupe === g)
            .map((p) => (
              <LigneParametre key={p.cle} p={p} />
            ))}
        </div>
      ))}

      {!isLoading && data.length === 0 && (
        <div className="card text-center text-slate-500">Aucun paramètre.</div>
      )}

      {ajout && <FormulaireAjout onClose={() => setAjout(false)} />}
    </div>
  );
}
