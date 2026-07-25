import { Role } from '../context/AuthContext';

export interface NavItem {
  label: string;
  path: string;
}

export const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
  ],
  GESTIONNAIRE: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
  ],
  COMPTABLE: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
  ],
  CLIENT: [
    { label: 'Mon espace', path: '/' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
  ],
};
