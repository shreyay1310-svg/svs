import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// ─── Base auth middleware ───
const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

// ─── Role middleware factory ───
function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

// ─── Permission middleware factory ───
// Admin always passes. Staff must have the specific permission.
function requirePermission(permission: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: ErrorMessages.unauthenticated,
      });
    }

    // Admin has all permissions
    if (ctx.user.role === "admin") {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    // Check if user has the required permission
    if (!ctx.userPermissions.includes(permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have permission to perform this action (requires: ${permission})`,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

// ─── Exported procedure builders ───
export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));

export const staffQuery = authedQuery.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "staff")) {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

// Permission-based procedure: admin always passes, staff needs specific permission
export const permissionQuery = (permission: string) =>
  authedQuery.use(requirePermission(permission));

// Convenience shortcuts for common permissions
export const canViewCollege = permissionQuery("colleges.view");
export const canManageCollege = permissionQuery("colleges.create");
export const canViewCourse = permissionQuery("courses.view");
export const canManageCourse = permissionQuery("courses.create");
export const canViewSubject = permissionQuery("subjects.view");
export const canManageSubject = permissionQuery("subjects.create");
export const canViewStudent = permissionQuery("students.view");
export const canManageStudent = permissionQuery("students.create");
export const canViewReport = permissionQuery("reports.view");
