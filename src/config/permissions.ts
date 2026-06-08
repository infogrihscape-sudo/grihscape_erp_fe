export const ROLE_ROUTES: Record<string, string[]> = {
  SUPER_ADMIN: ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders'],
  ADMIN:       ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders'],
  SALES:       ['/overview', '/prospects', '/leads', '/contracts', '/tenders'],
  ACCOUNTS:    ['/contracts', '/prospects'],
};
