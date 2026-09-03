import { useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Aperçu d'une pièce jointe d'un dossier (CNI…).
 * Ces fichiers ne sont pas accessibles par une simple URL : on les récupère
 * avec le jeton de session, puis on les affiche depuis la mémoire du
 * navigateur. Rien n'est laissé en accès libre.
 */
export default function PieceJointe({ id, nom }: { id: string; nom: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let annule = false;
    api
      .get(`/documents/${id}/fichier`, { responseType: 'blob' })
      .then((r) => {
        if (annule) return;
        url = URL.createObjectURL(r.data);
        setSrc(url);
      })
      .catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (erreur) {
    return (
      <div className="flex h-28 w-40 items-center justify-center rounded-lg bg-slate-50 text-[11px] text-slate-400 ring-1 ring-slate-200">
        Pièce indisponible
      </div>
    );
  }

  return (
    <div className="block">
      {src ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img
            src={src}
            alt={nom}
            className="h-28 w-40 rounded-lg object-cover ring-1 ring-slate-200"
          />
        </a>
      ) : (
        <div className="h-28 w-40 animate-pulse rounded-lg bg-slate-100 ring-1 ring-slate-200" />
      )}
      <div className="mt-1 text-center text-[11px] text-slate-500">{nom}</div>
    </div>
  );
}
