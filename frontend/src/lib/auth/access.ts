import type { Role } from '../api/types';
import { navigationByRole } from './session';

export const canVisitPath = (role: Role, path: string): boolean => {
  const allowed = navigationByRole[role];
  if (allowed.includes(path)) return true;
  if (path.startsWith('/patients/')) return allowed.includes('/patients');
  if (path.startsWith('/reports/')) return allowed.includes('/reports/operational') && path === '/reports/operational';
  return false;
};

export const roleHome = (role: Role): string => role === 'Patient' ? '/' : '/';
