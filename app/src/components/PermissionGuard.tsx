import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  /** The permission required to see children */
  permission?: Permission | string;
  /** Multiple permissions — user must have ANY of these */
  anyOf?: (Permission | string)[];
  /** Multiple permissions — user must have ALL of these */
  allOf?: (Permission | string)[];
  /** What to render when permission is denied (default: null) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on user permissions.
 * Admin always sees everything.
 *
 * Usage:
 *   <PermissionGuard permission="colleges.create">
 *     <Button>Add College</Button>
 *   </PermissionGuard>
 *
 *   <PermissionGuard anyOf={["colleges.edit", "colleges.delete"]} fallback={<span>No access</span>}>
 *     ...
 *   </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let allowed = true;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (anyOf && anyOf.length > 0) {
    allowed = hasAnyPermission(...anyOf);
  } else if (allOf && allOf.length > 0) {
    allowed = hasAllPermissions(...allOf);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
