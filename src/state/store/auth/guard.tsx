import { useGetAccount } from '@/modules/profile/hooks/use-account';
import { useAuthStore } from '.';
import { useEffect } from 'react';
import { getUserRoles } from '@/hooks/use-user-roles';

export const Guard = ({ children }: { children: React.ReactNode }) => {
  const { data, isSuccess } = useGetAccount();
  const { setUser, isAuthenticated } = useAuthStore();
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isSuccess) return;
    if (!data) {
      setUser(null);
      return;
    }

    // In `GetAccount`, roles can be nested under memberships[].roles.
    // Normalize here so `useIsProtected({ roles: ['admin'] })` works reliably.
    const membershipRoles = getUserRoles(data);
    const roles = membershipRoles.length > 0 ? membershipRoles : data.roles;

    const membershipPermissions =
      data.memberships?.flatMap((m) => m.permissions ?? [])?.filter(Boolean) ?? [];
    const permissions =
      membershipPermissions.length > 0 ? [...new Set(membershipPermissions)] : data.permissions;

    setUser({ ...data, roles, permissions });
  }, [data, isAuthenticated, isSuccess, setUser]);

  return <>{children}</>;
};
