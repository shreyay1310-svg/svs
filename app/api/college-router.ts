import { z } from "zod";
import { createRouter, authedQuery, permissionQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { colleges, universities } from "@db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const collegeRouter = createRouter({
  list: permissionQuery("colleges.view")
    .input(
      z.object({
        search: z.string().optional(),
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
        conditions.push(like(colleges.collegeName, `%${input.search}%`));
      }
      if (input?.isActive !== undefined) {
        conditions.push(eq(colleges.isActive, input.isActive));
      }
      if (ctx.user.universityId !== null && ctx.user.universityId !== undefined) {
        conditions.push(eq(colleges.universityId, ctx.user.universityId));
      } else if (input?.universityId) {
        conditions.push(eq(colleges.universityId, input.universityId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select({
          id: colleges.id,
          collegeName: colleges.collegeName,
          collegeNameHi: colleges.collegeNameHi,
          collegeCode: colleges.collegeCode,
          address: colleges.address,
          contactEmail: colleges.contactEmail,
          phone: colleges.phone,
          website: colleges.website,
          establishedYear: colleges.establishedYear,
          accreditation: colleges.accreditation,
          affiliation: colleges.affiliation,
          state: colleges.state,
          district: colleges.district,
          pincode: colleges.pincode,
          principalName: colleges.principalName,
          totalStudents: colleges.totalStudents,
          campusArea: colleges.campusArea,
          landArea: colleges.landArea,
          motto: colleges.motto,
          logoUrl: colleges.logoUrl,
          description: colleges.description,
          isActive: colleges.isActive,
          universityId: colleges.universityId,
          universityName: universities.universityName,
          createdAt: colleges.createdAt,
          updatedAt: colleges.updatedAt,
        })
        .from(colleges)
        .leftJoin(universities, eq(colleges.universityId, universities.id))
        .where(where)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(colleges)
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
        .from(colleges)
        .where(eq(colleges.id, input.id))
        .limit(1);
      const college = rows.at(0);
      if (!college) throw new TRPCError({ code: "NOT_FOUND" });
      return college;
    }),

  create: permissionQuery("colleges.create")
    .input(
      z.object({
        collegeName: z.string().min(1),
        collegeNameHi: z.string().optional(),
        collegeCode: z.string().min(1),
        address: z.string().optional(),
        description: z.string().optional(),
        contactEmail: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        establishedYear: z.number().int().optional(),
        accreditation: z.string().optional(),
        affiliation: z.string().optional(),
        state: z.string().optional(),
        district: z.string().optional(),
        pincode: z.string().optional(),
        principalName: z.string().optional(),
        totalStudents: z.number().int().optional(),
        campusArea: z.string().optional(),
        landArea: z.string().optional(),
        motto: z.string().optional(),
        logoUrl: z.string().optional(),
        universityId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const insertData = {
        collegeName: input.collegeName,
        collegeNameHi: input.collegeNameHi ?? null,
        collegeCode: input.collegeCode,
        address: input.address ?? null,
        contactEmail: input.contactEmail ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        establishedYear: input.establishedYear ?? null,
        accreditation: input.accreditation ?? null,
        affiliation: input.affiliation ?? null,
        state: input.state ?? null,
        district: input.district ?? null,
        pincode: input.pincode ?? null,
        principalName: input.principalName ?? null,
        totalStudents: input.totalStudents ?? null,
        campusArea: input.campusArea ?? null,
        landArea: input.landArea ?? null,
        motto: input.motto ?? null,
        logoUrl: input.logoUrl ?? null,
        description: input.description ?? null,
        universityId: ctx.user.universityId ?? input.universityId ?? null,
      } as any;
      const [result] = await db.insert(colleges).values(insertData);
      return { id: result.insertId, ...insertData };
    }),

  update: permissionQuery("colleges.edit")
    .input(
      z.object({
        id: z.number(),
        collegeName: z.string().min(1).optional(),
        collegeNameHi: z.string().optional(),
        collegeCode: z.string().min(1).optional(),
        address: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        universityId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      if (ctx.user.universityId !== null && ctx.user.universityId !== undefined) {
        const rows = await db.select().from(colleges).where(eq(colleges.id, id)).limit(1);
        if (rows[0] && rows[0].universityId !== ctx.user.universityId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only update colleges inside your own university" });
        }
        delete data.universityId;
      }
      await db.update(colleges).set(data).where(eq(colleges.id, id));
      return { success: true };
    }),

  delete: permissionQuery("colleges.delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(colleges).where(eq(colleges.id, input.id));
      return { success: true };
    }),

  toggleActive: permissionQuery("colleges.edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(colleges)
        .where(eq(colleges.id, input.id))
        .limit(1);
      const college = rows.at(0);
      if (!college) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(colleges)
        .set({ isActive: !college.isActive })
        .where(eq(colleges.id, input.id));
      return { success: true, isActive: !college.isActive };
    }),
});
