import { unlinkSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

/**
 * Le type MIME est déclaré par le client : il est falsifiable.
 * On valide donc aussi l'extension réelle du fichier, sans quoi un
 * document HTML/SVG piégé peut être déposé puis exécuté dans le
 * navigateur des visiteurs (XSS stocké).
 */
const EXT_IMAGES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const EXT_VIDEOS = ['.mp4', '.webm', '.mov', '.m4v'];

const verifier = (
  file: { mimetype: string; originalname: string },
  prefixes: string[],
  extensions: string[],
  message: string,
  cb: (err: Error | null, ok: boolean) => void,
) => {
  const ext = extname(file.originalname || '').toLowerCase();
  const mimeOk = prefixes.some((p) => file.mimetype.startsWith(p));
  const extOk = extensions.includes(ext);
  if (mimeOk && extOk) return cb(null, true);
  cb(new BadRequestException(message), false);
};

/** N'accepte que de véritables fichiers image. */
export const imageFileFilter = (
  _req: any,
  file: { mimetype: string; originalname: string },
  cb: (err: Error | null, ok: boolean) => void,
) =>
  verifier(
    file,
    ['image/'],
    EXT_IMAGES,
    `Format d'image non autorisé. Formats acceptés : ${EXT_IMAGES.join(', ')}.`,
    cb,
  );

/** N'accepte que des images ou des vidéos. */
export const mediaFileFilter = (
  _req: any,
  file: { mimetype: string; originalname: string },
  cb: (err: Error | null, ok: boolean) => void,
) =>
  verifier(
    file,
    ['image/', 'video/'],
    [...EXT_IMAGES, ...EXT_VIDEOS],
    `Format non autorisé. Formats acceptés : ${[...EXT_IMAGES, ...EXT_VIDEOS].join(', ')}.`,
    cb,
  );

/** N'accepte que des vidéos. */
export const videoFileFilter = (
  _req: any,
  file: { mimetype: string; originalname: string },
  cb: (err: Error | null, ok: boolean) => void,
) =>
  verifier(
    file,
    ['video/'],
    EXT_VIDEOS,
    `Format vidéo non autorisé. Formats acceptés : ${EXT_VIDEOS.join(', ')}.`,
    cb,
  );

/**
 * Supprime les fichiers déjà écrits par multer quand la requête est refusée
 * (droits insuffisants), pour ne pas laisser de fichiers orphelins sur disque.
 */
export const supprimerFichiers = (
  dossier: string,
  files?: Array<{ filename: string }>,
) => {
  for (const f of files ?? []) {
    try {
      unlinkSync(join(dossier, f.filename));
    } catch {
      // fichier déjà absent : rien à faire
    }
  }
};
