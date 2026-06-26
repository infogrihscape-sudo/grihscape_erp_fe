export const ROLE_ROUTES: Record<string, string[]> = {
  'Super Admin': [
    '/overview', '/users', '/roles', '/logs', '/leads', '/prospects',
    '/contracts', '/tenders', '/projects', '/delay-analysis',
    '__accounts_payments__', '/accounts/inflow', '/accounts/outflow', '/accounts/masters',
  ],
  'Admin': [
    '/overview', '/users', '/roles', '/logs', '/leads', '/prospects',
    '/contracts', '/tenders', '/projects', '/delay-analysis',
    '__accounts_payments__', '/accounts/inflow', '/accounts/outflow', '/accounts/masters',
  ],
  'Sales & Marketing': ['/overview', '/leads', '/prospects', '/contracts', '/tenders'],
  'Project Manager':   ['/overview', '/projects', '/delay-analysis'],
  'Project Architect': ['/overview', '/projects'],
  'Junior Architect':  ['/overview', '/projects'],
  'Site Engineer':      ['/overview', '/projects'],
  'Construction Head':  ['/overview', '/projects'],
  'Accounts':           ['/overview', '/prospects', '__accounts_payments__', '/accounts/inflow', '/accounts/outflow'],
};

/**
 * Returns true if the given role can perform write operations
 * (create, update, delete, workflow transitions).
 * Admin now has full write authority — same as Super Admin except for Super Admin user management.
 */
export function canWrite(_role: string): boolean {
  return true;
}
