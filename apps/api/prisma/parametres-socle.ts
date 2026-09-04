/**
 * Catalogue des paramètres du socle.
 *
 * Ces réglages sont créés au démarrage s'ils manquent, jamais écrasés :
 * une valeur changée par l'administrateur est conservée. Pour brancher une
 * fonctionnalité future, ajoutez une entrée ici — l'écran de configuration
 * l'affichera automatiquement selon son type.
 */
import { PrismaClient, TypeParametre } from '@prisma/client';

export interface ParametreSocle {
  cle: string;
  valeur: string;
  type: TypeParametre;
  libelle: string;
  description?: string;
  groupe: string;
  public?: boolean;
  ordre: number;
}

export const PARAMETRES_SOCLE: ParametreSocle[] = [
  // ---------- Général ----------
  {
    cle: 'site_nom',
    valeur: 'FGS_IMMO',
    type: TypeParametre.TEXTE,
    libelle: 'Nom affiché du site',
    groupe: 'Général',
    public: true,
    ordre: 1,
  },
  {
    cle: 'devise',
    valeur: 'FCFA',
    type: TypeParametre.TEXTE,
    libelle: 'Devise',
    description: 'Symbole affiché après les montants.',
    groupe: 'Général',
    public: true,
    ordre: 2,
  },
  {
    cle: 'contact_whatsapp',
    valeur: '',
    type: TypeParametre.TEXTE,
    libelle: 'Numéro WhatsApp de contact',
    description: 'Format international, ex. 221771234567.',
    groupe: 'Général',
    public: true,
    ordre: 3,
  },

  // ---------- Fonctionnalités ----------
  {
    cle: 'inscription_publique',
    valeur: 'true',
    type: TypeParametre.BOOLEEN,
    libelle: 'Inscription des visiteurs',
    description:
      "Quand c'est coupé, seuls l'administrateur et l'import peuvent créer des comptes clients.",
    groupe: 'Fonctionnalités',
    public: true,
    ordre: 1,
  },
  {
    cle: 'messagerie_active',
    valeur: 'true',
    type: TypeParametre.BOOLEEN,
    libelle: 'Messagerie avec les prospects',
    groupe: 'Fonctionnalités',
    public: true,
    ordre: 2,
  },
  {
    cle: 'demande_visite_active',
    valeur: 'true',
    type: TypeParametre.BOOLEEN,
    libelle: 'Demandes de visite de terrain',
    groupe: 'Fonctionnalités',
    public: true,
    ordre: 3,
  },
  {
    cle: 'mode_maintenance',
    valeur: 'false',
    type: TypeParametre.BOOLEEN,
    libelle: 'Mode maintenance',
    description:
      'Affiche un message aux visiteurs et bloque les inscriptions. Les comptes internes continuent de fonctionner.',
    groupe: 'Fonctionnalités',
    public: true,
    ordre: 4,
  },

  // ---------- Métier ----------
  {
    cle: 'reservation_duree_jours',
    valeur: '7',
    type: TypeParametre.NOMBRE,
    libelle: "Durée d'une réservation (jours)",
    description: 'Au-delà, la parcelle réservée redevient disponible.',
    groupe: 'Métier',
    ordre: 1,
  },
  {
    cle: 'relance_retard_jours',
    valeur: '5',
    type: TypeParametre.NOMBRE,
    libelle: 'Relance après un retard de paiement (jours)',
    groupe: 'Métier',
    ordre: 2,
  },
  {
    cle: 'penalite_retard_pourcent',
    valeur: '0',
    type: TypeParametre.NOMBRE,
    libelle: 'Pénalité de retard (%)',
    description: 'Appliquée sur la mensualité en retard. 0 = aucune pénalité.',
    groupe: 'Métier',
    ordre: 3,
  },
  {
    cle: 'moyens_paiement',
    valeur: 'ESPECES,WAVE,ORANGE_MONEY,VIREMENT,CHEQUE',
    type: TypeParametre.LISTE,
    libelle: 'Moyens de paiement acceptés',
    description: 'Séparés par des virgules.',
    groupe: 'Métier',
    public: true,
    ordre: 4,
  },
];

/** Crée les paramètres manquants sans jamais écraser une valeur existante. */
export async function installerParametresSocle(prisma: PrismaClient) {
  let ajoutes = 0;
  for (const p of PARAMETRES_SOCLE) {
    const existant = await prisma.parametre.findUnique({ where: { cle: p.cle } });
    if (existant) {
      // On rafraîchit le libellé et l'aide, jamais la valeur choisie.
      await prisma.parametre.update({
        where: { cle: p.cle },
        data: {
          libelle: p.libelle,
          description: p.description ?? null,
          groupe: p.groupe,
          ordre: p.ordre,
          systeme: true,
        },
      });
      continue;
    }
    await prisma.parametre.create({ data: { ...p, systeme: true } });
    ajoutes++;
  }
  return ajoutes;
}
