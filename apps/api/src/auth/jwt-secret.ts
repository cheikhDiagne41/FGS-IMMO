/**
 * Secret de signature des jetons de connexion.
 *
 * Le repli est réservé au développement local. En production, démarrer avec
 * un secret connu publiquement (le code source est sur GitHub) permettrait à
 * n'importe qui de fabriquer un jeton administrateur : on refuse donc de
 * démarrer tant que JWT_SECRET n'est pas défini.
 */
const REPLI_DEV = 'fgs-immo-dev-secret';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      "JWT_SECRET n'est pas défini. Renseignez une valeur secrète et unique " +
        'dans les variables d\'environnement avant de démarrer en production.',
    );
  }

  return REPLI_DEV;
}
