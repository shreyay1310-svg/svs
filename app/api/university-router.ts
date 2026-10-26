import { z } from "zod";
import { createRouter, authedQuery, permissionQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { universities } from "@db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const universityRouter = createRouter({
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
      if (input?.search) {
        conditions.push(like(universities.universityName, `%${input.search}%`));
      }
      if (input?.isActive !== undefined) {
        conditions.push(eq(universities.isActive, input.isActive));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(universities)
        .where(where)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(universities)
        .where(where);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(universities)
        .where(eq(universities.id, input.id))
        .limit(1);
      const university = rows.at(0);
      if (!university) throw new TRPCError({ code: "NOT_FOUND" });
      return university;
    }),

  create: permissionQuery("universities.create")
    .input(
      z.object({
        universityName: z.string().min(1),
        universityNameHi: z.string().optional(),
        universityCode: z.string().min(1),
        address: z.string().optional(),
        logoUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const insertData = {
        universityName: input.universityName,
        universityNameHi: input.universityNameHi ?? null,
        universityCode: input.universityCode,
        address: input.address ?? null,
        logoUrl: input.logoUrl ?? null,
      } as any;
      const [result] = await db.insert(universities).values(insertData);
      return { id: result.insertId, ...insertData };
    }),

  update: permissionQuery("universities.edit")
    .input(
      z.object({
        id: z.number(),
        universityName: z.string().min(1).optional(),
        universityNameHi: z.string().optional(),
        universityCode: z.string().min(1).optional(),
        address: z.string().optional(),
        logoUrl: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(universities).set(data).where(eq(universities.id, id));
      return { success: true };
    }),

  delete: permissionQuery("universities.delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(universities).where(eq(universities.id, input.id));
      return { success: true };
    }),

  toggleActive: permissionQuery("universities.edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(universities)
        .where(eq(universities.id, input.id))
        .limit(1);
      const university = rows.at(0);
      if (!university) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(universities)
        .set({ isActive: !university.isActive })
        .where(eq(universities.id, input.id));
      return { success: true, isActive: !university.isActive };
    }),
});
