import { useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";

// All available permissions in the system
export const PERMISSIONS = {
  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  // Roles
  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",
  // Colleges
  COLLEGES_VIEW: "colleges.view",
  COLLEGES_CREATE: "colleges.create",
  COLLEGES_EDIT: "colleges.edit",
  COLLEGES_DELETE: "colleges.delete",
  // Courses
  COURSES_VIEW: "courses.view",
  COURSES_CREATE: "courses.create",
  COURSES_EDIT: "courses.edit",
  COURSES_DELETE: "courses.delete",
  // Subjects
  SUBJECTS_VIEW: "subjects.view",
  SUBJECTS_CREATE: "subjects.create",
  SUBJECTS_EDIT: "subjects.edit",
  SUBJECTS_DELETE: "subjects.delete",
  // Students
  STUDENTS_VIEW: "students.view",
  STUDENTS_CREATE: "students.create",
  STUDENTS_EDIT: "students.edit",
  STUDENTS_DELETE: "students.delete",
  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  // Activity Logs
  ACTIVITY_LOGS_VIEW: "activity_logs.view",
  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function usePermissions() {
  const { user } = useAuth();

  const permissions: string[] = useMemo(
    () => (user as any)?.permissions ?? [],
    [user],
  );

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isStudent = user?.role === "student";

  const hasPermission = useCallback(
    (permission: Permission | string): boolean => {
      // Admin always has all permissions
      if (isAdmin) return true;
      // Students have very limited access — handled separately
      // Staff checks against assigned permissions
      return permissions.includes(permission);
    },
    [isAdmin, permissions],
  );

  const hasAnyPermission = useCallback(
    (...perms: (Permission | string)[]): boolean => {
      return perms.some((p) => hasPermission(p));
    },
    [hasPermission],
  );

  const hasAllPermissions = useCallback(
    (...perms: (Permission | string)[]): boolean => {
      return perms.every((p) => hasPermission(p));
    },
    [hasPermission],
  );

  return useMemo(
    () => ({
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdmin,
      isStaff,
      isStudent,
    }),
    [permissions, hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, isStaff, isStudent],
  );
}
