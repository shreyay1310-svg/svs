import { z } from "zod";
import { createRouter, adminQuery, authedQuery, permissionQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { students, colleges, courses, subjects, users, otpRecords } from "@db/schema";
import { eq, and, sql, or, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";
import bcrypt from 'bcryptjs';

export const studentRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        search: z.string().optional(),
        collegeId: z.number().optional(),
        courseId: z.number().optional(),
        subjectId: z.number().optional(),
        category: z.enum(["regular", "private", "ex", "back"]).optional(),
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
          sql`${students.rollNumber} LIKE ${`%${input.search}%`} OR ${students.name} LIKE ${`%${input.search}%`}`,
        );
      }
      if (input?.collegeId) conditions.push(eq(students.collegeId, input.collegeId));
      if (input?.courseId) conditions.push(eq(students.courseId, input.courseId));
      if (input?.subjectId) conditions.push(eq(students.subjectId, input.subjectId));
      if (input?.category) conditions.push(eq(students.category, input.category));

      if (ctx.user.role === "student") {
        conditions.push(eq(students.userId, ctx.user.id));
      } else if (ctx.user.universityId !== null && ctx.user.universityId !== undefined) {
        conditions.push(eq(colleges.universityId, ctx.user.universityId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select({
          id: students.id,
          userId: students.userId,
          rollNumber: students.rollNumber,
          enrollmentNumber: students.enrollmentNumber,
          collegeId: students.collegeId,
          courseId: students.courseId,
          subjectId: students.subjectId,
          courseType: students.courseType,
          name: students.name,
          nameHi: students.nameHi,
          fatherName: students.fatherName,
          motherName: students.motherName,
          gender: students.gender,
          category: students.category,
          division: students.division,
          passingYear: students.passingYear,
          passingMonth: students.passingMonth,
          photoUrl: students.photoUrl,
          marksheetUrl: students.marksheetUrl,
          applicationLetterUrl: students.applicationLetterUrl,
          signatureData: students.signatureData,
          isFinalSubmitted: students.isFinalSubmitted,
          isLocked: students.isLocked,
          canReedit: students.canReedit,
          verificationStatus: students.verificationStatus,
          rejectionReason: students.rejectionReason,
          createdAt: students.createdAt,
          updatedAt: students.updatedAt,
          collegeName: colleges.collegeName,
          courseName: courses.courseName,
          subjectName: subjects.subjectName,
          userEmail: users.email,
          userMobile: users.mobile,
          universityId: students.universityId,
        })
        .from(students)
        .leftJoin(colleges, eq(students.collegeId, colleges.id))
        .leftJoin(courses, eq(students.courseId, courses.id))
        .leftJoin(subjects, eq(students.subjectId, subjects.id))
        .leftJoin(users, eq(students.userId, users.id))
        .where(where)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .leftJoin(colleges, eq(students.collegeId, colleges.id))
        .where(where);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: students.id,
          userId: students.userId,
          rollNumber: students.rollNumber,
          enrollmentNumber: students.enrollmentNumber,
          collegeId: students.collegeId,
          courseId: students.courseId,
          subjectId: students.subjectId,
          courseType: students.courseType,
          name: students.name,
          nameHi: students.nameHi,
          fatherName: students.fatherName,
          fatherNameHi: students.fatherNameHi,
          motherName: students.motherName,
          motherNameHi: students.motherNameHi,
          gender: students.gender,
          category: students.category,
          division: students.division,
          passingYear: students.passingYear,
          passingMonth: students.passingMonth,
          photoUrl: students.photoUrl,
          marksheetUrl: students.marksheetUrl,
          applicationLetterUrl: students.applicationLetterUrl,
          signatureData: students.signatureData,
          isFinalSubmitted: students.isFinalSubmitted,
          isLocked: students.isLocked,
          canReedit: students.canReedit,
          verificationStatus: students.verificationStatus,
          rejectionReason: students.rejectionReason,
          createdAt: students.createdAt,
          updatedAt: students.updatedAt,
          collegeName: colleges.collegeName,
          collegeNameHi: colleges.collegeNameHi,
          collegeCode: colleges.collegeCode,
          courseName: courses.courseName,
          subjectName: subjects.subjectName,
          userEmail: users.email,
          userMobile: users.mobile,
          universityId: students.universityId,
        })
        .from(students)
        .leftJoin(colleges, eq(students.collegeId, colleges.id))
        .leftJoin(courses, eq(students.courseId, courses.id))
        .leftJoin(subjects, eq(students.subjectId, subjects.id))
        .leftJoin(users, eq(students.userId, users.id))
        .where(eq(students.id, input.id))
        .limit(1);

      const student = rows.at(0);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.role === "student" && student.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return student;
    }),

  create: adminQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        enrollmentNumber: z.string().min(1),
        collegeId: z.number(),
        courseId: z.number(),
        subjectId: z.number().optional(),
        courseType: z.enum(["honors", "masters"]).optional(),
        name: z.string().min(1),
        nameHi: z.string().optional(),
        fatherName: z.string().optional(),
        fatherNameHi: z.string().optional(),
        motherName: z.string().optional(),
        motherNameHi: z.string().optional(),
        gender: z.enum(["male", "female", "other"]),
        category: z.enum(["regular", "private", "ex", "back"]),
        division: z.string().optional(),
        passingYear: z.number().optional(),
        passingMonth: z.string().optional(),
        universityId: z.number().optional(),
        photoUrl: z.string().optional(),
        marksheetUrl: z.string().optional(),
        applicationLetterUrl: z.string().optional(),
        signatureData: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const universityId = ctx.user.universityId ?? input.universityId ?? null;
      
      // Create a user account for the student with auto-generated credentials
      const userId = `STU${input.rollNumber}`;
      const studentEmail = `student.${input.rollNumber}@university.local`;

      // Check if student already exists
      const existingStudent = await db
        .select()
        .from(students)
        .where(eq(students.rollNumber, input.rollNumber))
        .limit(1);
      if (existingStudent.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Student with Roll Number '${input.rollNumber}' already exists.` });
      }

      // Check if user account already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);
      if (existingUser.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `A user account for Roll Number '${input.rollNumber}' already exists.` });
      }

      const tempPassword = input.enrollmentNumber; // Use enrollment number as initial password
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      try {
        // Create user account
        const [userResult] = await db.insert(users).values({
          userId,
          name: input.name,
          email: studentEmail,
          password: hashedPassword,
          role: 'student',
          collegeId: input.collegeId,
          universityId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        const userId_numeric = userResult.insertId;
        
        // Build explicit insert object for student record
        const insertData: Record<string, unknown> = {
          userId: userId_numeric,
          universityId,
          rollNumber: input.rollNumber,
          enrollmentNumber: input.enrollmentNumber,
          collegeId: input.collegeId,
          courseId: input.courseId,
          subjectId: input.subjectId ?? null,
          courseType: input.courseType ?? null,
          name: input.name,
          nameHi: input.nameHi ?? null,
          fatherName: input.fatherName ?? null,
          fatherNameHi: input.fatherNameHi ?? null,
          motherName: input.motherName ?? null,
          motherNameHi: input.motherNameHi ?? null,
          gender: input.gender,
          category: input.category,
          division: input.division ?? null,
          passingYear: input.passingYear ?? null,
          passingMonth: input.passingMonth ?? null,
          photoUrl: input.photoUrl ?? null,
          marksheetUrl: input.marksheetUrl ?? null,
          applicationLetterUrl: input.applicationLetterUrl ?? null,
          signatureData: input.signatureData ?? null,
        };

        console.log('student.create insertData:', insertData);

        const [result] = await db.insert(students).values(insertData as any);

        await logActivity({
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.userId,
          action: "STUDENT_CREATED",
          entityType: "student",
          entityId: result.insertId,
          details: `Created student ${input.name} (Roll: ${input.rollNumber})`,
        });

        return { id: result.insertId, ...input, studentUserId: userId, studentEmail };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create student: ${error?.message || 'Unknown error'}`,
        });
      }
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        nameHi: z.string().optional(),
        fatherName: z.string().optional(),
        fatherNameHi: z.string().optional(),
        motherName: z.string().optional(),
        motherNameHi: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        category: z.enum(["regular", "private", "ex", "back"]).optional(),
        division: z.string().optional(),
        passingYear: z.number().optional(),
        passingMonth: z.string().optional(),
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        universityId: z.number().optional(),
        photoUrl: z.string().optional(),
        marksheetUrl: z.string().optional(),
        applicationLetterUrl: z.string().optional(),
        signatureData: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, email, mobile, ...rawData } = input;
      const data: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawData)) {
        if (value !== undefined) data[key] = value;
      }
 
      if (ctx.user.role === "student") {
        const rows = await db
          .select()
          .from(students)
          .where(eq(students.id, id))
          .limit(1);
        const student = rows.at(0);
        if (!student || student.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (student.isLocked && !student.canReedit) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Form is locked" });
        }
      }
 
      if (Object.keys(data).length > 0) {
        await db.update(students).set(data).where(eq(students.id, id));
      }

      // Synchronize contact info to linked user
      if (email !== undefined || mobile !== undefined) {
        const studentRows = await db
          .select()
          .from(students)
          .where(eq(students.id, id))
          .limit(1);
        const student = studentRows.at(0);
        if (student && student.userId) {
          const userUpdates: Record<string, any> = {};
          if (email !== undefined) userUpdates.email = email.toLowerCase();
          if (mobile !== undefined) userUpdates.mobile = mobile;

          await db
            .update(users)
            .set(userUpdates)
            .where(eq(users.id, student.userId));
        }
      }
 
      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "STUDENT_UPDATED",
        entityType: "student",
        entityId: id,
        details: `Updated student ID ${id}`,
      });
 
      return { success: true };
    }),

  uploadDocument: authedQuery
    .input(
      z.object({
        id: z.number(),
        photoUrl: z.string().optional(),
        marksheetUrl: z.string().optional(),
        applicationLetterUrl: z.string().optional(),
        signatureData: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;

      if (ctx.user.role === "student") {
        const rows = await db.select().from(students).where(eq(students.id, id)).limit(1);
        const student = rows.at(0);
        if (!student || student.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      await db.update(students).set(data).where(eq(students.id, id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "STUDENT_DOCUMENT_UPLOADED",
        entityType: "student",
        entityId: id,
        details: `Document uploaded for student ID ${id}`,
      });

      return { success: true };
    }),

  finalSubmit: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(students)
        .where(eq(students.id, input.id))
        .limit(1);
      const student = rows.at(0);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.role === "student" && student.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (!student.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Linked user account not found" });
      }

      // Require that the student has verified OTPs for both email and mobile
      const userRows = await db.select().from(users).where(eq(users.id, student.userId!)).limit(1);
      const user = userRows.at(0);

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Linked user account not found" });

      const email = user.email ?? undefined;
      const mobile = user.mobile ?? undefined;

      const emailOtpCondition = email ? and(eq(otpRecords.email, email), eq(otpRecords.purpose, "final_submit"), eq(otpRecords.isUsed, true)) : null;
      const mobileOtpCondition = mobile ? and(eq(otpRecords.mobile, mobile), eq(otpRecords.purpose, "final_submit"), eq(otpRecords.isUsed, true)) : null;

      const otpConditions = [] as any[];
      if (emailOtpCondition) otpConditions.push(emailOtpCondition);
      if (mobileOtpCondition) otpConditions.push(mobileOtpCondition);

      if (otpConditions.length > 0) {
        const otpRows = await db
          .select()
          .from(otpRecords)
          .where(or(...otpConditions))
          .limit(10);

        if (email && mobile) {
          const emailUsed = otpRows.some((r: any) => r.email === email && r.isUsed);
          const mobileUsed = otpRows.some((r: any) => r.mobile === mobile && r.isUsed);
          if (!emailUsed || !mobileUsed) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Please verify OTP sent to both your email and mobile before final submission" });
          }
        } else if (email) {
          const emailUsed = otpRows.some((r: any) => r.email === email && r.isUsed);
          if (!emailUsed) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Please verify OTP sent to your email before final submission" });
          }
        } else if (mobile) {
          const mobileUsed = otpRows.some((r: any) => r.mobile === mobile && r.isUsed);
          if (!mobileUsed) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Please verify OTP sent to your mobile before final submission" });
          }
        }
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No email or mobile found for verification. Please update your contact details." });
      }

      await db
        .update(students)
        .set({ 
          isFinalSubmitted: true, 
          isLocked: true, 
          canReedit: false,
          verificationStatus: "submitted",
          rejectionReason: null,
        })
        .where(eq(students.id, input.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "STUDENT_FINAL_SUBMIT",
        entityType: "student",
        entityId: input.id,
        details: `Student ${student.name} (Roll: ${student.rollNumber}) submitted final form`,
      });

      return { success: true };
    }),

  approveProfile: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "student") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = getDb();
      const rows = await db.select().from(students).where(eq(students.id, input.id)).limit(1);
      const student = rows.at(0);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(students)
        .set({
          isLocked: true,
          isFinalSubmitted: true,
          canReedit: false,
          verificationStatus: "approved",
          rejectionReason: null,
        })
        .where(eq(students.id, input.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "STUDENT_APPROVED",
        entityType: "student",
        entityId: input.id,
        details: `Approved student ${student.name} profile`,
      });

      return { success: true };
    }),

  rejectProfile: authedQuery
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "student") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = getDb();
      const rows = await db.select().from(students).where(eq(students.id, input.id)).limit(1);
      const student = rows.at(0);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(students)
        .set({
          isLocked: false,
          isFinalSubmitted: false,
          canReedit: true,
          verificationStatus: "rejected",
          rejectionReason: input.reason,
        })
        .where(eq(students.id, input.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "STUDENT_REJECTED",
        entityType: "student",
        entityId: input.id,
        details: `Rejected student ${student.name} profile. Reason: ${input.reason}`,
      });

      return { success: true };
    }),

  allowReedit: permissionQuery("students.edit")
    .input(
      z.object({
        id: z.number(),
        emailOtp: z.string().length(6).optional(),
        mobileOtp: z.string().length(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      
      const email = ctx.user.email ?? undefined;
      const mobile = ctx.user.mobile ?? undefined;
      
      if (email && !input.emailOtp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email OTP is required for verification" });
      }
      if (mobile && !input.mobileOtp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mobile OTP is required for verification" });
      }
      
      if (email && input.emailOtp) {
        const emailRows = await db
          .select()
          .from(otpRecords)
          .where(
            and(
              eq(otpRecords.email, email),
              eq(otpRecords.otp, input.emailOtp),
              eq(otpRecords.purpose, "final_submit"),
              eq(otpRecords.isUsed, false),
              gte(otpRecords.expiresAt, new Date()),
            )
          )
          .limit(1);
        if (!emailRows.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired email OTP" });
        }
        await db.update(otpRecords).set({ isUsed: true }).where(eq(otpRecords.id, emailRows[0].id));
      }
      
      if (mobile && input.mobileOtp) {
        const mobileRows = await db
          .select()
          .from(otpRecords)
          .where(
            and(
              eq(otpRecords.mobile, mobile),
              eq(otpRecords.otp, input.mobileOtp),
              eq(otpRecords.purpose, "final_submit"),
              eq(otpRecords.isUsed, false),
              gte(otpRecords.expiresAt, new Date()),
            )
          )
          .limit(1);
        if (!mobileRows.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired mobile OTP" });
        }
        await db.update(otpRecords).set({ isUsed: true }).where(eq(otpRecords.id, mobileRows[0].id));
      }

      await db
        .update(students)
        .set({ isLocked: false, canReedit: true, isFinalSubmitted: false })
        .where(eq(students.id, input.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "STUDENT_REEDIT_ALLOWED",
        entityType: "student",
        entityId: input.id,
        details: `Staff allowed re-edit for student ID ${input.id} after OTP verification`,
      });

      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      
      const rows = await db.select().from(students).where(eq(students.id, input.id)).limit(1);
      const student = rows.at(0);
      if (student && student.userId) {
        await db.delete(users).where(eq(users.id, student.userId));
      }
      
      await db.delete(students).where(eq(students.id, input.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "STUDENT_DELETED",
        entityType: "student",
        entityId: input.id,
        details: `Deleted student ID ${input.id}`,
      });

      return { success: true };
    }),
});
