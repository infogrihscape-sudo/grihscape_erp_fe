export const ROLE_ROUTES: Record<string, string[]> = {
  'Super Admin':       ['/overview', '/users', '/roles', '/logs', '/leads', '/prospects', '/contracts', '/tenders', '/projects'],
  'Admin':             ['/overview', '/users', '/roles', '/logs', '/leads', '/prospects', '/contracts', '/tenders', '/projects'],
  'Sales & Marketing': ['/overview', '/leads', '/prospects', '/contracts', '/tenders'],
  'Project Manager':   ['/overview', '/projects'],
  'Project Architect': ['/overview', '/projects'],
  'Junior Architect':  ['/overview', '/projects'],
  'Site Engineer':     ['/overview', '/projects'],
  'Accounts':          ['/contracts', '/prospects'],
};

/** Roles restricted to read-only access — no create/edit/delete/workflow actions. */
const VIEW_ONLY_ROLES = new Set(['Admin']);

/**
 * Returns true if the given role can perform write operations
 * (create, update, delete, workflow transitions).
 * Admin is view-only; Super Admin and all other roles act per their own permissions.
 */
export function canWrite(role: string): boolean {
  return !VIEW_ONLY_ROLES.has(role);
}
