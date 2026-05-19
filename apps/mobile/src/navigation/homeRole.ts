export function usesCustomerHome(role: string | undefined | null): boolean {
  return role === 'customer' || role === undefined || role === null || role === '';
}

export function usesAdminHome(role: string | undefined | null): boolean {
  return role === 'admin';
}
