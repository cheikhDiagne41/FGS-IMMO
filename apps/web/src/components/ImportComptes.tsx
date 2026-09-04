import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ExcelJS from 'exceljs';
import { api } from '../lib/api';

type Role = 'CLIENT' | 'VENDEUR' | 'GESTIONNAIRE' | 'COMPTABLE';

interface Ligne {
  email: string;
  role: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  societe?: string;
  motDePasse?: string;
}

interface Rapport {
  total: number;
  crees: { email: string; role: string; nom: string; motDePasseTemporaire: string | null }[];
  ignores: { ligne: number; email: string; motif: string }[];
}

const ROLES_VALIDES: Role[] = ['CLIENT', 'VENDEUR', 'GESTIONNAIRE', 'COMPTABLE'];

const COLONNES = [
  { cle: 'email', titre: 'email', largeur: 30 },
  { cle: 'role', titre: 'role', largeur: 16 },
  { cle: 'prenom', titre: 'prenom', largeur: 16 },
  { cle: 'nom', titre: 'nom', largeur: 16 },
  { cle: 'telephone', titre: 'telephone', largeur: 16 },
  { cle: 'societe', titre: 'societe', largeur: 26 },
  { cle: 'motDePasse', titre: 'motDePasse', largeur: 18 },
];

const EXEMPLES = [
  ['awa.diop@exemple.sn', 'CLIENT', 'Awa', 'Diop', '771234567', '', ''],
  ['moussa.fall@exemple.sn', 'VENDEUR', 'Moussa', 'Fall', '772345678', 'Agence Fall Immobilier', ''],
  ['fatou.sow@fgsimmo.sn', 'GESTIONNAIRE', 'Fatou', 'Sow', '773456789', '', ''],
  ['ibrahima.ba@fgsimmo.sn', 'COMPTABLE', 'Ibrahima', 'Ba', '774567890', '', ''],
];

/** Enregistre un classeur Excel sous le nom donné. */
async function enregistrerClasseur(classeur: ExcelJS.Workbook, nom: string) {
  const donnees = await classeur.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([donnees], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

/** Classeur modèle : en-tête figé, listes de rôles, quelques exemples. */
async function telechargerModele() {
  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet('Comptes');
  feuille.columns = COLONNES.map((c) => ({ header: c.titre, key: c.cle, width: c.largeur }));
  feuille.getRow(1).font = { bold: true };
  feuille.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E4D8C' },
  };
  feuille.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  feuille.views = [{ state: 'frozen', ySplit: 1 }];
  EXEMPLES.forEach((l) => feuille.addRow(l));
  // Liste déroulante des rôles autorisés sur la colonne « role »
  for (let i = 2; i <= 500; i++) {
    feuille.getCell(`B${i}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"CLIENT,VENDEUR,GESTIONNAIRE,COMPTABLE"'],
    };
  }
  await enregistrerClasseur(classeur, 'modele-import-comptes.xlsx');
}

/** Sépare une ligne CSV en respectant les guillemets. */
function decouper(ligne: string, sep: string) {
  const cases: string[] = [];
  let courant = '';
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') { courant += '"'; i++; }
      else dansGuillemets = !dansGuillemets;
    } else if (c === sep && !dansGuillemets) {
      cases.push(courant); courant = '';
    } else courant += c;
  }
  cases.push(courant);
  return cases.map((c) => c.trim());
}

/** Lit un CSV (séparateur ; ou ,) et le convertit en lignes exploitables. */
function lireCsv(texte: string): { lignes: Ligne[]; erreurEntete?: string } {
  const brut = texte.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (brut.length < 2) return { lignes: [], erreurEntete: 'Le fichier ne contient aucune ligne de données.' };

  const sep = (brut[0].match(/;/g) ?? []).length >= (brut[0].match(/,/g) ?? []).length ? ';' : ',';
  const entete = decouper(brut[0], sep).map((c) =>
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  );

  const idx = {
    email: entete.indexOf('email'),
    role: entete.indexOf('role'),
    prenom: entete.indexOf('prenom'),
    nom: entete.indexOf('nom'),
    telephone: entete.findIndex((c) => c === 'telephone' || c === 'tel'),
    societe: entete.findIndex((c) => c === 'societe' || c === 'agence'),
    motDePasse: entete.findIndex((c) => c === 'motdepasse' || c === 'mot de passe'),
  };
  if (idx.email === -1 || idx.role === -1) {
    return { lignes: [], erreurEntete: 'La première ligne doit contenir au moins les colonnes « email » et « role ».' };
  }

  const lignes = brut.slice(1).map((l) => {
    const c = decouper(l, sep);
    const val = (i: number) => (i >= 0 ? (c[i] ?? '').trim() : '');
    return {
      email: val(idx.email).toLowerCase(),
      role: val(idx.role).toUpperCase(),
      prenom: val(idx.prenom),
      nom: val(idx.nom),
      telephone: val(idx.telephone),
      societe: val(idx.societe),
      motDePasse: val(idx.motDePasse),
    };
  });
  return { lignes };
}

/** Normalise un intitulé de colonne : minuscules, sans accent ni espace. */
const cleColonne = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_]/g, '');

/** Lit la première feuille d'un classeur Excel. */
async function lireExcel(fichier: File): Promise<{ lignes: Ligne[]; erreurEntete?: string }> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(await fichier.arrayBuffer());
  const feuille = classeur.worksheets[0];
  if (!feuille || feuille.rowCount < 2) {
    return { lignes: [], erreurEntete: 'Le classeur ne contient aucune ligne de données.' };
  }

  const entete = (feuille.getRow(1).values as unknown[]).map(cleColonne);
  const pos = (...noms: string[]) => entete.findIndex((c) => noms.includes(c));
  const idx = {
    email: pos('email', 'adresseemail', 'mail'),
    role: pos('role', 'profil'),
    prenom: pos('prenom'),
    nom: pos('nom'),
    telephone: pos('telephone', 'tel', 'numero'),
    societe: pos('societe', 'agence', 'enseigne'),
    motDePasse: pos('motdepasse', 'password'),
  };
  if (idx.email === -1 || idx.role === -1) {
    return {
      lignes: [],
      erreurEntete:
        'La première ligne doit contenir au moins les colonnes « email » et « role ».',
    };
  }

  /** Une cellule peut contenir un texte, un nombre, une formule ou un lien. */
  const texte = (v: unknown): string => {
    if (v == null) return '';
    if (typeof v === 'object') {
      const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
      if (o.richText) return o.richText.map((r) => r.text).join('');
      if (o.text) return o.text;
      if (o.result != null) return String(o.result);
      return '';
    }
    return String(v);
  };

  const lignes: Ligne[] = [];
  feuille.eachRow((row, numero) => {
    if (numero === 1) return;
    const cases = row.values as unknown[];
    const val = (i: number) => (i >= 0 ? texte(cases[i]).trim() : '');
    const ligne = {
      email: val(idx.email).toLowerCase(),
      role: val(idx.role).toUpperCase(),
      prenom: val(idx.prenom),
      nom: val(idx.nom),
      telephone: val(idx.telephone),
      societe: val(idx.societe),
      motDePasse: val(idx.motDePasse),
    };
    // on ignore les lignes entièrement vides laissées en bas du tableau
    if (Object.values(ligne).some((v) => v !== '')) lignes.push(ligne);
  });
  return { lignes };
}

/** Contrôles faits avant l'envoi, pour montrer les erreurs tout de suite. */
function verifier(l: Ligne): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email)) return 'Email invalide';
  if (!ROLES_VALIDES.includes(l.role as Role)) return `Rôle « ${l.role || '—'} » non autorisé`;
  if (l.role === 'CLIENT' && (!l.nom || !l.prenom || !l.telephone))
    return 'Client : prénom, nom et téléphone requis';
  if (l.motDePasse && l.motDePasse.length < 8) return 'Mot de passe trop court (8 caractères min.)';
  return null;
}

export default function ImportComptes({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const champFichier = useRef<HTMLInputElement>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [erreur, setErreur] = useState('');
  const [nomFichier, setNomFichier] = useState('');
  const [rapport, setRapport] = useState<Rapport | null>(null);

  const valides = lignes.filter((l) => !verifier(l));
  const invalides = lignes.length - valides.length;

  const charger = async (fichier: File) => {
    setErreur('');
    setRapport(null);
    setNomFichier(fichier.name);
    setLignes([]);
    const estCsv = /[.]csv$/i.test(fichier.name);
    try {
      const { lignes: lues, erreurEntete } = estCsv
        ? lireCsv(await fichier.text())
        : await lireExcel(fichier);
      if (erreurEntete) { setErreur(erreurEntete); return; }
      if (lues.length === 0) { setErreur('Aucune ligne exploitable dans ce fichier.'); return; }
      setLignes(lues);
    } catch {
      setErreur(
        "Fichier illisible. Attendu : un classeur Excel (.xlsx) — enregistrez-le au format « Classeur Excel » si nécessaire.",
      );
    }
  };

  // On n'envoie que les champs réellement remplis : une colonne laissée vide
  // dans le fichier ne doit pas être transmise comme valeur vide.
  const nettoyer = (l: Ligne) =>
    Object.fromEntries(
      Object.entries(l).filter(([, v]) => typeof v === 'string' && v.trim() !== ''),
    );

  const importer = useMutation({
    mutationFn: async () =>
      (await api.post('/users/import', { comptes: valides.map(nettoyer) })).data as Rapport,
    onSuccess: (r) => {
      setRapport(r);
      setLignes([]);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) =>
      setErreur(
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(' · ')
          : e?.response?.data?.message ?? "L'import a échoué.",
      ),
  });

  const telechargerIdentifiants = async () => {
    if (!rapport) return;
    const classeur = new ExcelJS.Workbook();
    const feuille = classeur.addWorksheet('Identifiants');
    feuille.columns = [
      { header: 'nom', key: 'nom', width: 26 },
      { header: 'email', key: 'email', width: 32 },
      { header: 'role', key: 'role', width: 16 },
      { header: 'mot de passe', key: 'mdp', width: 18 },
    ];
    feuille.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    feuille.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E4D8C' } };
    rapport.crees.forEach((c) =>
      feuille.addRow({
        nom: c.nom,
        email: c.email,
        role: c.role,
        mdp: c.motDePasseTemporaire ?? '(defini dans le fichier)',
      }),
    );
    await enregistrerClasseur(
      classeur,
      `identifiants-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">⬆️ Importer des comptes</h3>
            <p className="text-sm text-slate-500">
              Depuis un fichier Excel : clients, vendeurs, gestionnaires et comptables —
              500 comptes maximum par fichier.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        {/* ---- RAPPORT ---- */}
        {rapport ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xl font-bold text-slate-800">{rapport.total}</div>
                <div className="text-[11px] text-slate-400">Lignes envoyées</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <div className="text-xl font-bold text-emerald-700">{rapport.crees.length}</div>
                <div className="text-[11px] text-emerald-600">Comptes créés</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <div className="text-xl font-bold text-amber-700">{rapport.ignores.length}</div>
                <div className="text-[11px] text-amber-600">Lignes ignorées</div>
              </div>
            </div>

            {rapport.crees.length > 0 && (
              <div className="rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                  <div className="text-sm font-bold text-slate-700">
                    Mots de passe temporaires — à transmettre puis à faire changer
                  </div>
                  <button onClick={telechargerIdentifiants} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                    ⬇️ Télécharger
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {rapport.crees.map((c) => (
                        <tr key={c.email} className="border-b border-slate-50 last:border-0">
                          <td className="p-2 text-slate-700">{c.nom}</td>
                          <td className="p-2 text-xs text-slate-500">{c.email}</td>
                          <td className="p-2 text-xs font-semibold text-slate-500">{c.role}</td>
                          <td className="p-2 text-right font-mono text-sm font-bold text-brand-700">
                            {c.motDePasseTemporaire ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
                  Ces mots de passe ne seront plus affichés après la fermeture de cette fenêtre.
                </div>
              </div>
            )}

            {rapport.ignores.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40">
                <div className="border-b border-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
                  Lignes non importées
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {rapport.ignores.map((i) => (
                    <div key={i.ligne} className="flex gap-3 border-b border-amber-100/60 px-4 py-1.5 text-xs last:border-0">
                      <span className="w-12 shrink-0 text-amber-500">L.{i.ligne}</span>
                      <span className="w-56 shrink-0 truncate text-slate-600">{i.email}</span>
                      <span className="text-amber-700">{i.motif}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => { setRapport(null); setNomFichier(''); }} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Importer un autre fichier
              </button>
              <button onClick={onClose} className="btn-primary">Terminer</button>
            </div>
          </div>
        ) : (
          <>
            {/* ---- CHOIX DU FICHIER ---- */}
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-700">Format attendu</div>
              <p className="mt-1 text-xs">
                Un classeur <b>Excel (.xlsx)</b> dont la première ligne donne les noms de
                colonnes : <b>email</b> et <b>role</b> obligatoires, puis <b>prenom</b>,{' '}
                <b>nom</b>, <b>telephone</b>, <b>societe</b> (nom commercial du vendeur) et{' '}
                <b>motDePasse</b>, facultatifs. Sans mot de passe, un mot de passe temporaire
                est généré pour chaque compte.
              </p>
              <button
                onClick={telechargerModele}
                className="mt-2 text-xs font-semibold text-brand-600 underline"
              >
                ⬇️ Télécharger un modèle
              </button>
            </div>

            <div className="mt-4">
              <input
                ref={champFichier}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && charger(e.target.files[0])}
              />
              <button
                onClick={() => champFichier.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-600"
              >
                {nomFichier
                  ? `📗 ${nomFichier} — choisir un autre fichier`
                  : '📗 Choisir un fichier Excel (.xlsx)'}
              </button>
            </div>

            {erreur && (
              <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</div>
            )}

            {/* ---- APERÇU ---- */}
            {lignes.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    {lignes.length} ligne{lignes.length > 1 ? 's' : ''} lue{lignes.length > 1 ? 's' : ''}
                  </span>
                  <span className={invalides ? 'text-amber-600' : 'text-emerald-600'}>
                    {valides.length} valide{valides.length > 1 ? 's' : ''}
                    {invalides > 0 && ` · ${invalides} à corriger`}
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase text-slate-400">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Rôle</th>
                        <th className="p-2">Identité</th>
                        <th className="p-2">Contrôle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l, i) => {
                        const pb = verifier(l);
                        return (
                          <tr key={i} className={`border-b border-slate-50 last:border-0 ${pb ? 'bg-rose-50/40' : ''}`}>
                            <td className="p-2 text-xs text-slate-400">{i + 1}</td>
                            <td className="p-2 text-slate-700">{l.email || '—'}</td>
                            <td className="p-2 text-xs font-semibold text-slate-500">{l.role || '—'}</td>
                            <td className="p-2 text-xs text-slate-500">
                              {[l.prenom, l.nom].filter(Boolean).join(' ') || l.societe || '—'}
                            </td>
                            <td className="p-2 text-xs">
                              {pb ? <span className="text-rose-600">✕ {pb}</span> : <span className="text-emerald-600">✓</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Annuler
              </button>
              <button
                onClick={() => importer.mutate()}
                disabled={valides.length === 0 || importer.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {importer.isPending
                  ? 'Import en cours…'
                  : `Importer ${valides.length} compte${valides.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
