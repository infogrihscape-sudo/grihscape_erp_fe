export const ROLE_ROUTES: Record<string, string[]> = {
  SUPER_ADMIN: ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts'],
  ADMIN: ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts'],
  SALES: ['/overview', '/leads', '/prospects', '/contracts'],
  PROJECT_MANAGER: ['/overview'],
  PROJECT_ARCHITECT: ['/overview'],
  JUNIOR_ARCHITECT: ['/overview'],
};
