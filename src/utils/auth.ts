export function extractUserRole(user: any): string {
  try {
    const userData = user?.response?.user || user?.user || user;
    const roles = userData?.roles || [];
    if (!Array.isArray(roles) || roles.length === 0) return "guest";
    const primaryRole =
      typeof roles[0] === "string"
        ? roles[0]
        : roles[0]?.name || roles[0]?.role || "guest";
    return primaryRole.toLowerCase();
  } catch {
    return "guest";
  }
}
