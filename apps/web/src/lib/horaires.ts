/**
 * Horaires d'ouverture du bureau, utilisés par le pied de page et la
 * page « À propos ». Modifier ici les met à jour aux deux endroits.
 * Heures en format 24h décimal (17.5 = 17h30).
 */
export interface Creneau {
  label: string;
  /** Jours concernés : 0 = dimanche … 6 = samedi */
  jours: number[];
  ouverture: number;
  fermeture: number;
  affichage: string;
}

export const HORAIRES: Creneau[] = [
  {
    label: 'Lun. – Ven.',
    jours: [1, 2, 3, 4, 5],
    ouverture: 8.5,
    fermeture: 17.5,
    affichage: '8h30 – 17h30',
  },
  {
    label: 'Samedi',
    jours: [6],
    ouverture: 9,
    fermeture: 13,
    affichage: '9h – 13h',
  },
];

/** Indique si le bureau est ouvert à l'instant présent. */
export function estOuvert(maintenant = new Date()): boolean {
  const jour = maintenant.getDay();
  const heure = maintenant.getHours() + maintenant.getMinutes() / 60;
  return HORAIRES.some(
    (c) => c.jours.includes(jour) && heure >= c.ouverture && heure < c.fermeture,
  );
}
