import { Role } from '../context/AuthContext';

export interface NavItem {
  label: string;
  path: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const isNavGroup = (entry: NavEntry): entry is NavGroup =>
  Array.isArray((entry as NavGroup).items);

export const navByRole: Record<Role, NavEntry[]> = {
  ADMIN: [
    { label: 'Tableau de bord', path: '/' },
    {
      label: 'Suivi clients',
      items: [
        { label: 'Demandes', path: '/demandes' },
        { label: 'Dossiers', path: '/dossiers' },
        { label: 'Paiements', path: '/paiements' },
        { label: 'Rapports', path: '/rapports' },
      ],
    },
    {
      label: 'Gestion',
      items: [
        { label: 'Sites', path: '/sites' },
        { label: 'Coopératives', path: '/cooperatives' },
        { label: 'Terrains', path: '/terrains' },
        { label: 'Carte', path: '/carte' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { label: 'Messagerie', path: '/messagerie' },
        { label: 'Vendeur', path: '/vendeur' },
      ],
    },
    {
      label: 'Vitrine du site',
      items: [
        { label: 'Trophées', path: '/trophees' },
        { label: 'Vidéos accueil', path: '/videos-accueil' },
        { label: 'Actualités', path: '/actualites' },
        { label: 'Gouvernance', path: '/gouvernance' },
      ],
    },
  ],
  GESTIONNAIRE: [
    { label: 'Tableau de bord', path: '/' },
    {
      label: 'Suivi clients',
      items: [
        { label: 'Demandes', path: '/demandes' },
        { label: 'Dossiers', path: '/dossiers' },
        { label: 'Paiements', path: '/paiements' },
      ],
    },
    {
      label: 'Gestion',
      items: [
        { label: 'Sites', path: '/sites' },
        { label: 'Coopératives', path: '/cooperatives' },
        { label: 'Terrains', path: '/terrains' },
        { label: 'Carte', path: '/carte' },
      ],
    },
    { label: 'Messagerie', path: '/messagerie' },
    {
      label: 'Vitrine du site',
      items: [
        { label: 'Trophées', path: '/trophees' },
        { label: 'Vidéos accueil', path: '/videos-accueil' },
        { label: 'Actualités', path: '/actualites' },
        { label: 'Gouvernance', path: '/gouvernance' },
      ],
    },
  ],
  VENDEUR: [
    { label: 'Messagerie', path: '/' },
  ],
  COMPTABLE: [
    { label: 'Tableau de bord', path: '/' },
    {
      label: 'Suivi',
      items: [
        { label: 'Dossiers', path: '/dossiers' },
        { label: 'Paiements', path: '/paiements' },
        { label: 'Rapports', path: '/rapports' },
      ],
    },
    {
      label: 'Gestion',
      items: [
        { label: 'Coopératives', path: '/cooperatives' },
        { label: 'Terrains', path: '/terrains' },
        { label: 'Carte', path: '/carte' },
      ],
    },
  ],
  CLIENT: [
    { label: 'Mon espace', path: '/' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
    { label: 'Carte', path: '/carte' },
    { label: 'Mes factures', path: '/factures' },
  ],
};
