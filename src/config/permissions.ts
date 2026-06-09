export const ROLE_ROUTES: Record<string, string[]> = {
  'Super Admin':       ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders'],
  'Admin':             ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders'],
  'Sales & Marketing': ['/overview', '/prospects', '/leads', '/contracts', '/tenders'],
  'Project Manager':   ['/overview', '/prospects', '/contracts', '/tenders'],
  'Project Architect': ['/overview', '/prospects', '/contracts'],
  'Accounts':          ['/contracts', '/prospects'],
};
