export const ROLE_ROUTES: Record<string, string[]> = {
  'Super Admin':       ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders', '/projects'],
  'Admin':             ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders', '/projects'],
  'Sales & Marketing': ['/overview', '/prospects', '/leads', '/contracts', '/tenders'],
  'Project Manager':   ['/overview', '/projects'],
  'Project Architect': ['/overview', '/projects'],
  'Junior Architect':  ['/overview', '/projects'],
  'Site Engineer':     ['/overview', '/projects'],
  'Accounts':          ['/contracts', '/prospects'],
};
