import { z } from "zod";
import { createRouter, authedQuery, permissionQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subjects, courses, colleges } from "@db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const subjectRouter = createRouter({
  list: permissionQuery("subjects.view")
    .input(
      z.object({
        search: z.string().optional(),
        courseId: z.number().optional(),
        collegeId: z.number().optional(),
        courseType: z.enum(["honors", "masters"]).optional(),
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
      if (input?.search) conditions.push(like(subjects.subjectName, `%${input.search}%`));
      if (input?.courseId) conditions.push(eq(subjects.courseId, input.courseId));
      if (input?.collegeId) conditions.push(eq(subjects.collegeId, input.collegeId));
      if (input?.courseType) conditions.push(eq(subjects.courseType, input.courseType));
      if (input?.isActive !== undefined) conditions.push(eq(subjects.isActive, input.isActive));
      if (ctx.user.universityId !== null && ctx.user.universityId !== undefined) {
        conditions.push(eq(colleges.universityId, ctx.user.universityId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select({
          id: subjects.id,
          subjectName: subjects.subjectName,
          subjectNameHi: subjects.subjectNameHi,
          courseType: subjects.courseType,
          courseId: subjects.courseId,
          collegeId: subjects.collegeId,
          subjectCode: subjects.subjectCode,
          credits: subjects.credits,
          semester: subjects.semester,
          theoryMarks: subjects.theoryMarks,
          practicalMarks: subjects.practicalMarks,
          totalMarks: subjects.totalMarks,
          isElective: subjects.isElective,
          prerequisites: subjects.prerequisites,
          learningOutcomes: subjects.learningOutcomes,
          syllabusUrl: subjects.syllabusUrl,
          referenceBooks: subjects.referenceBooks,
          labRequired: subjects.labRequired,
          hoursPerWeek: subjects.hoursPerWeek,
          assessmentMethod: subjects.assessmentMethod,
          remarks: subjects.remarks,
          description: subjects.description,
          isActive: subjects.isActive,
          createdAt: subjects.createdAt,
          updatedAt: subjects.updatedAt,
          courseName: courses.courseName,
          collegeName: colleges.collegeName,
        })
        .from(subjects)
        .leftJoin(courses, eq(subjects.courseId, courses.id))
        .leftJoin(colleges, eq(subjects.collegeId, colleges.id))
        .where(where)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(subjects)
        .leftJoin(colleges, eq(subjects.collegeId, colleges.id))
        .where(where);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(subjects).where(eq(subjects.id, input.id)).limit(1);
      const subject = rows.at(0);
      if (!subject) throw new TRPCError({ code: "NOT_FOUND" });
      return subject;
    }),

  create: permissionQuery("subjects.create")
    .input(
      z.object({
        subjectName: z.string().min(1),
        subjectNameHi: z.string().optional(),
        courseType: z.enum(["honors", "masters"]),
        courseId: z.number(),
        collegeId: z.number(),
        subjectCode: z.string().optional(),
        credits: z.number().optional(),
        semester: z.number().optional(),
        theoryMarks: z.number().optional(),
        practicalMarks: z.number().optional(),
        totalMarks: z.number().optional(),
        isElective: z.boolean().optional(),
        prerequisites: z.string().optional(),
        learningOutcomes: z.string().optional(),
        syllabusUrl: z.string().optional(),
        referenceBooks: z.string().optional(),
        labRequired: z.boolean().optional(),
        hoursPerWeek: z.number().optional(),
        assessmentMethod: z.string().optional(),
        remarks: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(subjects).values(input);
      return { id: result.insertId, ...input };
    }),

  update: permissionQuery("subjects.edit")
    .input(
      z.object({
        id: z.number(),
        subjectName: z.string().min(1).optional(),
        subjectNameHi: z.string().optional(),
        courseType: z.enum(["honors", "masters"]).optional(),
        courseId: z.number().optional(),
        collegeId: z.number().optional(),
        subjectCode: z.string().optional(),
        credits: z.number().optional(),
        semester: z.number().optional(),
        theoryMarks: z.number().optional(),
        practicalMarks: z.number().optional(),
        totalMarks: z.number().optional(),
        isElective: z.boolean().optional(),
        prerequisites: z.string().optional(),
        learningOutcomes: z.string().optional(),
        syllabusUrl: z.string().optional(),
        referenceBooks: z.string().optional(),
        labRequired: z.boolean().optional(),
        hoursPerWeek: z.number().optional(),
        assessmentMethod: z.string().optional(),
        remarks: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(subjects).set(data).where(eq(subjects.id, id));
      return { success: true };
    }),

  delete: permissionQuery("subjects.delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(subjects).where(eq(subjects.id, input.id));
      return { success: true };
    }),

  toggleActive: permissionQuery("subjects.edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(subjects).where(eq(subjects.id, input.id)).limit(1);
      const subject = rows.at(0);
      if (!subject) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(subjects).set({ isActive: !subject.isActive }).where(eq(subjects.id, input.id));
      return { success: true, isActive: !subject.isActive };
    }),
});
