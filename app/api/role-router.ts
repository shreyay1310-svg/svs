import { z } from "zod";
import { createRouter, adminQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { roles } from "@db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const roleRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (input?.search) conditions.push(like(roles.roleName, `%${input.search}%`));
      if (input?.isActive !== undefined) conditions.push(eq(roles.isActive, input.isActive));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(roles)
        .where(where)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(roles)
        .where(where);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(roles).where(eq(roles.id, input.id)).limit(1);
      const role = rows.at(0);
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      return role;
    }),

  create: adminQuery
    .input(
      z.object({
        roleName: z.string().min(1),
        shortName: z.string().min(1),
        description: z.string().optional(),
        permissions: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const permissionsStr = JSON.stringify(input.permissions ?? []);
      const [result] = await db.insert(roles).values({
        roleName: input.roleName,
        shortName: input.shortName,
        description: input.description,
        permissions: permissionsStr,
      });
      return { id: result.insertId, ...input };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        roleName: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
        description: z.string().optional(),
        permissions: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, permissions, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (permissions !== undefined) {
        updateData.permissions = JSON.stringify(permissions);
      }
      await db.update(roles).set(updateData).where(eq(roles.id, id));
      return { success: true };
    }),

  toggleActive: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(roles).where(eq(roles.id, input.id)).limit(1);
      const role = rows.at(0);
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(roles).set({ isActive: !role.isActive }).where(eq(roles.id, input.id));
      return { success: true, isActive: !role.isActive };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(roles).where(eq(roles.id, input.id));
      return { success: true };
    }),
});
