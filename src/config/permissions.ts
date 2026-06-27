export const ROLE_ROUTES: Record<string, string[]> = {
  'Super Admin': [
    '/overview', '/users', '/roles', '/logs', '/leads', '/prospects',
    '/contracts', '/tenders', '/projects', '/delay-analysis', '/labour',
    '__accounts_payments__', '/accounts/inflow', '/accounts/outflow', '/accounts/construction-payments', '/accounts/masters',
  ],
  'Admin': [
    '/overview', '/users', '/roles', '/logs', '/leads', '/prospects',
    '/contracts', '/tenders', '/projects', '/delay-analysis', '/labour',
    '__accounts_payments__', '/accounts/inflow', '/accounts/outflow', '/accounts/construction-payments', '/accounts/masters',
  ],
  'Sales & Marketing': ['/overview', '/leads', '/prospects', '/contracts', '/tenders'],
  'Project Manager':   ['/overview', '/projects', '/delay-analysis', '/labour'],
  'Project Architect': ['/overview', '/projects'],
  'Junior Architect':  ['/overview', '/projects'],
  'Site Engineer':      ['/overview', '/projects', '/prospects', '/labour'],
  'Construction Head':  ['/overview', '/projects', '/delay-analysis', '/labour'],
  'Accounts':           ['/overview', '/prospects', '__accounts_payments__', '/accounts/inflow', '/accounts/outflow', '/accounts/construction-payments'],
};

const WRITE_ROLES = new Set(['Super Admin', 'Admin', 'Sales & Marketing', 'Accounts']);

/**
 * Returns true if the given role can perform write operations
 * (create, update, delete, workflow transitions) in management screens.
 * Fine-grained module checks (e.g. construction tasks) are handled inline per page.
 */
export function canWrite(role: string): boolean {
  return WRITE_ROLES.has(role);
}
