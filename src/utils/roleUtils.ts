// src/utils/roleUtils.ts
export function getUserRole(user: any): string {
  if (!Array.isArray(user?.roles) || user.roles.length === 0) return 'guest';
  const firstRole = user.roles[0];
  const roleValue =
    typeof firstRole === 'string'
      ? firstRole
      : firstRole?.name || firstRole?.role || 'guest';
  return roleValue.toLowerCase();
}
