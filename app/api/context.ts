import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { verifyToken } from "./lib/jwt";
import { getDb } from "./queries/connection";
import { users, roles, universities } from "@db/schema";
import { eq } from "drizzle-orm";

// All permissions that admin gets by default
export const ALL_PERMISSIONS = [
  "users.view", "users.create", "users.edit", "users.delete",
  "roles.view", "roles.create", "roles.edit", "roles.delete",
  "colleges.view", "colleges.create", "colleges.edit", "colleges.delete",
  "courses.view", "courses.create", "courses.edit", "courses.delete",
  "subjects.view", "subjects.create", "subjects.edit", "subjects.delete",
  "students.view", "students.create", "students.edit", "students.delete",
  "universities.view", "universities.create", "universities.edit", "universities.delete",
  "reports.view", "reports.export",
  "activity_logs.view",
  "settings.view", "settings.edit",
];

// Default permissions for staff if no role assigned
export const DEFAULT_STAFF_PERMISSIONS = [
  "colleges.view",
  "courses.view",
  "subjects.view",
  "students.view", "students.create", "students.edit",
  "reports.view",
];

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User & { universityName?: string | null; universityCode?: string | null };
  userPermissions: string[];
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders, userPermissions: [] };
  try {
    const authHeader = opts.req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = verifyToken(token) as { userId: number; role: string; roleId?: number } | null;
      if (payload) {
        try {
          const db = getDb();
          const rows = await db
            .select({
              user: users,
              universityName: universities.universityName,
              universityCode: universities.universityCode,
            })
            .from(users)
            .leftJoin(universities, eq(users.universityId, universities.id))
            .where(eq(users.id, payload.userId))
            .limit(1);
          const row = rows.at(0);
          if (row && row.user && row.user.isActive) {
            ctx.user = {
              ...row.user,
              universityName: row.universityName,
              universityCode: row.universityCode,
            };

            const user = ctx.user;

            // ─── Load permissions based on role ───
            if (user.role === "admin") {
              // Admin gets all permissions
              ctx.userPermissions = ALL_PERMISSIONS;
            } else if (user.role === "staff") {
              // Staff gets permissions from their assigned custom role
              // We use payload.roleId if available (from token), else try matching by userId
              const roleId = payload.roleId;
              if (roleId) {
                const roleRows = await db
                  .select()
                  .from(roles)
                  .where(eq(roles.id, roleId))
                  .limit(1);
                const role = roleRows.at(0);
                if (role && role.isActive && role.permissions) {
                  try {
                    const perms = JSON.parse(role.permissions);
                    ctx.userPermissions = Array.isArray(perms) ? perms : DEFAULT_STAFF_PERMISSIONS;
                  } catch {
                    ctx.userPermissions = DEFAULT_STAFF_PERMISSIONS;
                  }
                } else {
                  ctx.userPermissions = DEFAULT_STAFF_PERMISSIONS;
                }
              } else {
                ctx.userPermissions = DEFAULT_STAFF_PERMISSIONS;
              }
            } else if (user.role === "student") {
              // Students have very limited permissions (own data only)
              ctx.userPermissions = ["students.view", "students.edit"];
            }
          }
        } catch (dbError) {
          // If DB is unavailable in local dev, allow known test tokens to map to fake users
          if (payload.userId === 1 && payload.role === "admin") {
            ctx.user = { id: 1, userId: "ADMIN001", name: "System Admin", email: "kumar712003@gmail.com", role: "admin", mobile: "8052797334", password: "", isActive: true, avatar: null, collegeId: null, universityId: null, universityName: null, universityCode: null } as any;
            ctx.userPermissions = ALL_PERMISSIONS;
          } else if (payload.userId === 999 && payload.role === "student") {
            ctx.user = { id: 999, userId: "STU123465", name: "Student User", email: "student123465@example.com", role: "student", mobile: "9876543210", password: "", isActive: true, avatar: null, collegeId: null, universityId: 1, universityName: "Rajasthan University", universityCode: "RU" } as any;
            ctx.userPermissions = ["students.view", "students.edit"];
          }
          // otherwise leave ctx.user undefined
        }
      }
    }
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
