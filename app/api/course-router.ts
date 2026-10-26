import { z } from "zod";
import { createRouter, authedQuery, permissionQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { courses, colleges } from "@db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const courseRouter = createRouter({
  list: permissionQuery("courses.view")
    .input(
      z.object({
        search: z.string().optional(),
        collegeId: z.number().optional(),
        isActive: z.boolean().optional(),
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
      if (input?.search) conditions.push(like(courses.courseName, `%${input.search}%`));
      if (input?.collegeId) conditions.push(eq(courses.collegeId, input.collegeId));
      if (input?.isActive !== undefined) conditions.push(eq(courses.isActive, input.isActive));
      if (ctx.user.universityId !== null && ctx.user.universityId !== undefined) {
        conditions.push(eq(colleges.universityId, ctx.user.universityId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select({
          id: courses.id,
          courseName: courses.courseName,
          courseNameHi: courses.courseNameHi,
          courseCode: courses.courseCode,
          collegeId: courses.collegeId,
          durationYears: courses.durationYears,
          durationMonths: courses.durationMonths,
          credits: courses.credits,
          level: courses.level,
          seats: courses.seats,
          fee: courses.fee,
          eligibility: courses.eligibility,
          syllabusUrl: courses.syllabusUrl,
          coordinatorName: courses.coordinatorName,
          coordinatorEmail: courses.coordinatorEmail,
          isProfessional: courses.isProfessional,
          intakePerYear: courses.intakePerYear,
          mode: courses.mode,
          campus: courses.campus,
          remarks: courses.remarks,
          description: courses.description,
          isActive: courses.isActive,
          createdAt: courses.createdAt,
          updatedAt: courses.updatedAt,
          collegeName: colleges.collegeName,
        })
        .from(courses)
        .leftJoin(colleges, eq(courses.collegeId, colleges.id))
        .where(where)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(courses)
        .leftJoin(colleges, eq(courses.collegeId, colleges.id))
        .where(where);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(courses)
        .where(eq(courses.id, input.id))
        .limit(1);
      const course = rows.at(0);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  create: permissionQuery("courses.create")
    .input(
      z.object({
        courseName: z.string().min(1),
        courseNameHi: z.string().optional(),
        courseCode: z.string().optional(),
        collegeId: z.number(),
        durationYears: z.number().optional(),
        durationMonths: z.number().optional(),
        credits: z.number().optional(),
        level: z.string().optional(),
        seats: z.number().optional(),
        fee: z.number().optional(),
        eligibility: z.string().optional(),
        syllabusUrl: z.string().optional(),
        coordinatorName: z.string().optional(),
        coordinatorEmail: z.string().optional(),
        isProfessional: z.boolean().optional(),
        intakePerYear: z.number().optional(),
        mode: z.string().optional(),
        campus: z.string().optional(),
        remarks: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(courses).values(input);
      return { id: result.insertId, ...input };
    }),

  update: permissionQuery("courses.edit")
    .input(
      z.object({
        id: z.number(),
        courseName: z.string().min(1).optional(),
        courseNameHi: z.string().optional(),
        courseCode: z.string().optional(),
        collegeId: z.number().optional(),
        durationYears: z.number().optional(),
        durationMonths: z.number().optional(),
        credits: z.number().optional(),
        level: z.string().optional(),
        seats: z.number().optional(),
        fee: z.number().optional(),
        eligibility: z.string().optional(),
        syllabusUrl: z.string().optional(),
        coordinatorName: z.string().optional(),
        coordinatorEmail: z.string().optional(),
        isProfessional: z.boolean().optional(),
        intakePerYear: z.number().optional(),
        mode: z.string().optional(),
        campus: z.string().optional(),
        remarks: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(courses).set(data).where(eq(courses.id, id));
      return { success: true };
    }),

  delete: permissionQuery("courses.delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(courses).where(eq(courses.id, input.id));
      return { success: true };
    }),

  toggleActive: permissionQuery("courses.edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(courses).where(eq(courses.id, input.id)).limit(1);
      const course = rows.at(0);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(courses).set({ isActive: !course.isActive }).where(eq(courses.id, input.id));
      return { success: true, isActive: !course.isActive };
    }),
});
