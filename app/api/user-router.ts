import { z } from "zod";
import bcrypt from "bcryptjs";
import { createRouter, permissionQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, colleges, universities } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";

export const userRouter = createRouter({
  list: permissionQuery("users.view")
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(["admin", "staff", "student"]).optional(),
        isActive: z.boolean().optional(),
        universityId: z.number().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (input?.search) {
        conditions.push(
          sql`${users.name} LIKE ${`%${input.search}%`} OR ${users.userId} LIKE ${`%${input.search}%`}`,
        );
      }
      if (input?.role) conditions.push(eq(users.role, input.role));
      if (input?.isActive !== undefined) conditions.push(eq(users.isActive, input.isActive));
      if (ctx.user.universityId !== null && ctx.user.universityId !== undefined) {
        conditions.push(eq(users.universityId, ctx.user.universityId));
      } else if (input?.universityId) {
        conditions.push(eq(users.universityId, input.universityId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select({
          id: users.id,
          userId: users.userId,
          name: users.name,
          nameHi: users.nameHi,
          email: users.email,
          mobile: users.mobile,
          role: users.role,
          isActive: users.isActive,
          dob: users.dob,
          gender: users.gender,
          collegeId: users.collegeId,
          universityId: users.universityId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          collegeName: colleges.collegeName,
          universityName: universities.universityName,
        })
        .from(users)
        .leftJoin(colleges, eq(users.collegeId, colleges.id))
        .leftJoin(universities, eq(users.universityId, universities.id))
        .where(where)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(where);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: permissionQuery("users.view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      const user = rows.at(0);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  create: permissionQuery("users.create")
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().min(1),
        nameHi: z.string().optional(),
        email: z.string().email(),
        mobile: z.string().optional(),
        password: z.string().min(6),
        role: z.enum(["admin", "staff", "student"]),
        dob: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        collegeId: z.number().optional(),
        universityId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const dobDate = input.dob ? new Date(input.dob) : null;
      const [result] = await db.insert(users).values({
        userId: input.userId,
        name: input.name,
        nameHi: input.nameHi,
        email: input.email,
        mobile: input.mobile,
        password: hashedPassword,
        role: input.role,
        isActive: true,
        dob: dobDate,
        gender: input.gender,
        collegeId: input.collegeId,
        universityId: ctx.user.universityId ?? input.universityId ?? null,
      });

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "USER_CREATED",
        entityType: "user",
        entityId: result.insertId,
        details: `Created user ${input.userId} (${input.name}) with role ${input.role}`,
      });

      return { id: result.insertId, ...input, password: undefined };
    }),

  update: permissionQuery("users.edit")
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        nameHi: z.string().optional(),
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        role: z.enum(["admin", "staff", "student"]).optional(),
        dob: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        collegeId: z.number().optional(),
        universityId: z.number().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, dob, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (dob !== undefined) {
        updateData.dob = dob ? new Date(dob) : null;
      }
      if (ctx.user.universityId !== null && ctx.user.universityId !== undefined) {
        const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (rows[0] && rows[0].universityId !== ctx.user.universityId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only update users inside your own university" });
        }
        delete updateData.universityId;
      }
      await db.update(users).set(updateData).where(eq(users.id, id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "USER_UPDATED",
        entityType: "user",
        entityId: id,
        details: `Updated user ID ${id}`,
      });

      return { success: true };
    }),

  toggleActive: permissionQuery("users.edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      const user = rows.at(0);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const newActive = !user.isActive;
      await db.update(users).set({ isActive: newActive }).where(eq(users.id, input.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: newActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityType: "user",
        entityId: input.id,
        details: `${newActive ? "Activated" : "Deactivated"} user ${user.userId}`,
      });

      return { success: true, isActive: newActive };
    }),

  delete: permissionQuery("users.delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(users).where(eq(users.id, input.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "USER_DELETED",
        entityType: "user",
        entityId: input.id,
        details: `Deleted user ID ${input.id}`,
      });

      return { success: true };
    }),
});
