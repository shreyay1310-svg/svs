import { z } from "zod";
import bcrypt from "bcryptjs";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { otpRecords, users, students } from "@db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { signToken } from "./lib/jwt";
import { logActivity } from "./lib/activity";
import { TRPCError } from "@trpc/server";
import { sendOTP } from "./lib/sms";
import { sendEmailOTP } from "./lib/email";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const authRouter = createRouter({
  // ─── Login with User ID + Password ───
  login: publicQuery
    .input(
      z.object({
        userId: z.string().min(1),
        password: z.string().min(1),
        role: z.enum(["admin", "staff", "student"]),
      }),
    )
    .mutation(async ({ input }) => {
      const normalizedUserId = input.userId ? input.userId.trim().toLowerCase() : "";
      const isAdminMatch =
        input.role === "admin" &&
        (normalizedUserId === "admin001" || normalizedUserId === "admin") &&
        (input.password === "Rahul@8052" || input.password === "admin" || input.password === "admin123");

      const isStudentMatch =
        input.role === "student" &&
        (normalizedUserId === "stu123465" || normalizedUserId === "123465" || normalizedUserId === "student") &&
        (input.password === "Rahil@8052" || input.password === "student" || input.password === "123465");

      try {
        const db = getDb();
        let user: any = undefined;

        if (input.role === "student") {
          // Check if input.userId matches student roll number
          const studentRows = await db
            .select()
            .from(students)
            .where(eq(students.rollNumber, input.userId))
            .limit(1);
          const student = studentRows.at(0);
          if (student && student.userId) {
            const userRows = await db
              .select()
              .from(users)
              .where(and(eq(users.id, student.userId), eq(users.role, "student")))
              .limit(1);
            user = userRows.at(0);
          }

          if (!user) {
            // Check by email, mobile, or userId
            const userRows = await db
              .select()
              .from(users)
              .where(
                and(
                  eq(users.role, "student"),
                  or(
                    eq(users.userId, input.userId),
                    eq(users.email, input.userId),
                    eq(users.mobile, input.userId)
                  )
                )
              )
              .limit(1);
            user = userRows.at(0);
          }
        } else {
          // Admin or staff login
          const rows = await db
            .select()
            .from(users)
            .where(and(eq(users.userId, input.userId), eq(users.role, input.role)))
            .limit(1);
          user = rows.at(0);
        }

        if (!user) {
          if (isAdminMatch) {
            const fakeUser = { id: 1, userId: "ADMIN001", name: "System Admin", email: "kumar712003@gmail.com", role: "admin", mobile: "8052797334", avatar: null, collegeId: null };
            const token = signToken({ userId: fakeUser.id, role: fakeUser.role, email: fakeUser.email });
            return { token, user: fakeUser };
          }
          if (isStudentMatch) {
            const fakeUser = { id: 999, userId: "STU123465", name: "Student User", email: "student123465@example.com", role: "student", mobile: "9876543210", avatar: null, collegeId: null };
            const token = signToken({ userId: fakeUser.id, role: fakeUser.role, email: fakeUser.email });
            return { token, user: fakeUser };
          }
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        if (!user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Account is deactivated" });
        }

        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) {
          if (isAdminMatch) {
            const fakeUser = { id: 1, userId: "ADMIN001", name: "System Admin", email: "kumar712003@gmail.com", role: "admin", mobile: "8052797334", avatar: null, collegeId: null };
            const token = signToken({ userId: fakeUser.id, role: fakeUser.role, email: fakeUser.email });
            return { token, user: fakeUser };
          }
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await db.insert(otpRecords).values({
          email: user.email,
          mobile: user.mobile,
          otp,
          purpose: "login",
          expiresAt,
        });

        // Obscure details
        const mobile = user.mobile || "";
        const obscuredMobile = mobile.length >= 4
          ? "*".repeat(mobile.length - 4) + mobile.slice(-4)
          : mobile;

        const email = user.email || "";
        const obscuredEmail = email.length >= 6
          ? email.slice(0, 3) + "*".repeat(email.indexOf("@") - 3) + email.slice(email.indexOf("@"))
          : email;

        // Send OTP
        const name = user.name || "User";
        let emailSent = false;
        let smsSent = false;

        if (user.email) {
          try {
            emailSent = await sendEmailOTP(user.email, otp, name);
          } catch (e) {
            console.error("Failed to send email OTP:", e);
          }
        }

        if (user.mobile) {
          try {
            smsSent = await sendOTP(user.mobile, otp, name);
          } catch (e) {
            console.error("Failed to send SMS OTP:", e);
          }
        }

        if (!emailSent && !smsSent) {
          console.log(`[OTP-Development] OTP for ${user.email || user.mobile}: ${otp}`);
        }

        return {
          otpRequired: true,
          mobileMask: obscuredMobile || null,
          emailMask: obscuredEmail || null,
          userId: user.userId,
          token: "",
          user: null,
        };
      } catch (error: any) {
        console.error("Login error:", error);
        // If DB is offline or error occurs, allow known credentials to login immediately
        if (isAdminMatch) {
          const fakeUser = { id: 1, userId: "ADMIN001", name: "System Admin", email: "kumar712003@gmail.com", role: "admin", mobile: "8052797334", avatar: null, collegeId: null };
          const token = signToken({ userId: fakeUser.id, role: fakeUser.role, email: fakeUser.email });
          console.log("Fallback login (forced): returning fake admin user");
          return { token, user: fakeUser };
        }
        if (isStudentMatch) {
          const fakeUser = { id: 999, userId: "STU123465", name: "Student User", email: "student123465@example.com", role: "student", mobile: "9876543210", avatar: null, collegeId: null };
          const token = signToken({ userId: fakeUser.id, role: fakeUser.role, email: fakeUser.email });
          console.log("Fallback login (forced): returning fake student user");
          return { token, user: fakeUser };
        }
        // Not a fallback match -> check nested DB error and return generic failure
        const nested = (error && (error.cause && (error.cause.code || error.cause.message))) ? `${error.cause.code || error.cause.message}` : "";
        const msg = [error && (error.code || error.message), nested].filter(Boolean).join(" | ");
        if (msg.includes("ER_ACCESS_DENIED_ERROR") || msg.includes("Access denied") || msg.includes("ECONNREFUSED")) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed. Please ensure MySQL is running, or use admin / Rahul@8052." });
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login failed" });
      }
    }),

  // ─── Verify Login OTP ───
  verifyLoginOtp: publicQuery
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["admin", "staff", "student"]),
        otp: z.string().length(6),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDb();
        let user: any = undefined;

        if (input.role === "student") {
          // Check if input.userId matches student roll number
          const studentRows = await db
            .select()
            .from(students)
            .where(eq(students.rollNumber, input.userId))
            .limit(1);
          const student = studentRows.at(0);
          if (student && student.userId) {
            const userRows = await db
              .select()
              .from(users)
              .where(and(eq(users.id, student.userId), eq(users.role, "student")))
              .limit(1);
            user = userRows.at(0);
          }

          if (!user) {
            // Check by email, mobile, or userId
            const userRows = await db
              .select()
              .from(users)
              .where(
                and(
                  eq(users.role, "student"),
                  or(
                    eq(users.userId, input.userId),
                    eq(users.email, input.userId),
                    eq(users.mobile, input.userId)
                  )
                )
              )
              .limit(1);
            user = userRows.at(0);
          }
        } else {
          // Admin or staff login
          const rows = await db
            .select()
            .from(users)
            .where(and(eq(users.userId, input.userId), eq(users.role, input.role)))
            .limit(1);
          user = rows.at(0);
        }

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        if (!user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Account is deactivated" });
        }

        // Verify OTP in database (Master OTP for development: "123456")
        if (input.otp !== "123456") {
          const conditions = [
            eq(otpRecords.otp, input.otp),
            eq(otpRecords.purpose, "login"),
            eq(otpRecords.isUsed, false),
            gte(otpRecords.expiresAt, new Date()),
          ];
          
          const andConditions = [];
          if (user.email) andConditions.push(eq(otpRecords.email, user.email));
          if (user.mobile) andConditions.push(eq(otpRecords.mobile, user.mobile));

          const rows = await db
            .select()
            .from(otpRecords)
            .where(and(...conditions, or(...andConditions)))
            .limit(1);

          const record = rows.at(0);
          if (!record) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
          }

          // Mark OTP as used
          await db
            .update(otpRecords)
            .set({ isUsed: true })
            .where(eq(otpRecords.id, record.id));
        }

        // Login success: sign token
        const token = signToken({ userId: user.id, role: user.role, email: user.email });

        // Update last sign in
        await db
          .update(users)
          .set({ lastSignInAt: new Date() })
          .where(eq(users.id, user.id));

        // Log activity
        await logActivity({
          userId: user.id,
          userName: user.name ?? user.userId,
          action: "LOGIN",
          details: `User logged in via OTP Verification as ${input.role}`,
          ipAddress: ctx.req.headers.get("x-forwarded-for") || undefined,
        });

        return {
          token,
          user: {
            id: user.id,
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            mobile: user.mobile,
            avatar: user.avatar,
            collegeId: user.collegeId,
          },
        };
      } catch (error: any) {
        console.error("OTP Verification login error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "OTP Verification failed" });
      }
    }),

  // ─── Student Login via OTP (after OTP verified) ───
  studentLoginOtp: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDb();
        const studentRows = await db
          .select()
          .from(students)
          .where(eq(students.rollNumber, input.rollNumber))
          .limit(1);
        const student = studentRows.at(0);

        if (!student) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        }

        const userRows = await db
          .select()
          .from(users)
          .where(eq(users.id, student.userId!))
          .limit(1);
        const user = userRows.at(0);

        if (!user || !user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Account is deactivated" });
        }

        const token = signToken({ userId: user.id, role: user.role, email: user.email });

        // Log activity
        await logActivity({
          userId: user.id,
          userName: user.name ?? user.userId,
          action: "LOGIN",
          details: `Student logged in via Roll Number + OTP`,
          ipAddress: ctx.req.headers.get("x-forwarded-for") || undefined,
        });

        return {
          token,
          user: {
            id: user.id,
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            mobile: user.mobile,
            avatar: user.avatar,
            collegeId: user.collegeId,
          },
        };
      } catch (error: any) {
        console.error('studentLoginOtp error:', error);
        const nested = (error && (error.cause && (error.cause.code || error.cause.message))) ? `${error.cause.code || error.cause.message}` : '';
        const msg = [error && (error.code || error.message), nested].filter(Boolean).join(' | ');
          if (input.rollNumber === '123465') {
            const fakeUser = { id: 999, userId: 'STU123465', name: 'Student User', email: 'student123465@example.com', role: 'student', mobile: '9876543210', avatar: null, collegeId: null };
            const token = signToken({ userId: fakeUser.id, role: fakeUser.role, email: fakeUser.email });
            console.log('Fallback login (forced): returning fake student user for roll 123465');
            await logActivity({ userId: fakeUser.id, userName: fakeUser.name, action: 'LOGIN', details: 'Student logged in via Roll Number (fallback)' });
            return { token, user: fakeUser };
          }
          if (msg.includes("ER_ACCESS_DENIED_ERROR") || msg.includes("Access denied")) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Student login failed (DB unavailable)" });
        }
        throw error;
      }
    }),

  // ─── Student Login via Roll Number + Password ───
  studentLoginPassword: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDb();
        const studentRows = await db
          .select()
          .from(students)
          .where(eq(students.rollNumber, input.rollNumber))
          .limit(1);
        const student = studentRows.at(0);

        if (!student) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        }

        const userRows = await db
          .select()
          .from(users)
          .where(eq(users.id, student.userId!))
          .limit(1);
        const user = userRows.at(0);

        if (!user || !user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Account is deactivated" });
        }

        // Verify password
        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }

        // Update last sign in
        await db
          .update(users)
          .set({ lastSignInAt: new Date() })
          .where(eq(users.id, user.id));

        const token = signToken({ userId: user.id, role: user.role, email: user.email });

        // Log activity
        await logActivity({
          userId: user.id,
          userName: user.name ?? user.userId,
          action: "LOGIN",
          details: `Student logged in via Roll Number + Password`,
          ipAddress: ctx.req.headers.get("x-forwarded-for") || undefined,
        });

        return {
          token,
          user: {
            id: user.id,
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            mobile: user.mobile,
            avatar: user.avatar,
            collegeId: user.collegeId,
          },
        };
      } catch (error: any) {
        console.error('studentLoginPassword error:', error);
        const nested = (error && (error.cause && (error.cause.code || error.cause.message))) ? `${error.cause.code || error.cause.message}` : '';
        const msg = [error && (error.code || error.message), nested].filter(Boolean).join(' | ');
        
        // Fallback for demo/testing
        if (input.rollNumber === '123465' && input.password === 'Rahil@8052') {
          const fakeUser = { id: 999, userId: 'STU123465', name: 'Student User', email: 'student123465@example.com', role: 'student', mobile: '9876543210', avatar: null, collegeId: null };
          const token = signToken({ userId: fakeUser.id, role: fakeUser.role, email: fakeUser.email });
          console.log('Fallback login (forced): returning fake student user for roll 123465');
          await logActivity({ userId: fakeUser.id, userName: fakeUser.name, action: 'LOGIN', details: 'Student logged in via Roll Number + Password (fallback)' });
          return { token, user: fakeUser };
        }
        
        if (msg.includes("ER_ACCESS_DENIED_ERROR") || msg.includes("Access denied")) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Student login failed (DB unavailable)" });
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login failed" });
      }
    }),

  verifyStudentRecord: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        enrollmentNumber: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const db = getDb();
        const studentRows = await db
          .select()
          .from(students)
          .where(
            and(
              eq(students.rollNumber, input.rollNumber),
              eq(students.enrollmentNumber, input.enrollmentNumber),
            ),
          )
          .limit(1);
        const student = studentRows.at(0);
        if (!student) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found" });
        }

        const userRows = await db
          .select()
          .from(users)
          .where(eq(users.id, student.userId!))
          .limit(1);
        const user = userRows.at(0);

        return {
          registered: !!(user?.password),
          studentName: student.name ?? "",
          studentId: student.id,
          email: user?.email ?? "",
          mobile: user?.mobile ?? "",
        };
      } catch (error: any) {
        console.error("verifyStudentRecord error:", error);
        const nested = (error && (error.cause && (error.cause.code || error.cause.message))) ? `${error.cause.code || error.cause.message}` : '';
        const msg = [error && (error.code || error.message), nested].filter(Boolean).join(' | ');
        
        // Fallback: if provided roll/enrollment match known test students, return fallback data
        if (input.rollNumber === '123465' && input.enrollmentNumber === '2345678') {
          return { registered: true, studentName: 'Student User', studentId: 999 };
        }
        
        // Test student fallback for demo
        if (input.rollNumber === '12' && input.enrollmentNumber === '123') {
          return { registered: false, studentName: 'Test Student', studentId: 999 };
        }
        
        if (msg.includes('ER_ACCESS_DENIED_ERROR') || msg.includes('Access denied')) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to verify student record. Please try again later." });
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to verify student record. Please try again later.",
        });
      }
    }),

  // ─── Register Student ───
  register: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        enrollmentNumber: z.string().min(1),
        name: z.string().min(1),
        mobile: z.string().min(10),
        email: z.string().email(),
        password: z.string().min(6),
        emailOTP: z.string().length(6),
        mobileOTP: z.string().length(6),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if student exists with roll number and enrollment number
      const existingStudent = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.rollNumber, input.rollNumber),
            eq(students.enrollmentNumber, input.enrollmentNumber),
          ),
        )
        .limit(1);

      if (!existingStudent.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No record found with the provided Roll Number and Enrollment Number. Please contact admin.",
        });
      }

      const student = existingStudent[0];

      // Verify email OTP (check for registration purpose)
      const emailOtpRows = await db
        .select()
        .from(otpRecords)
        .where(
          and(
            eq(otpRecords.email, input.email),
            eq(otpRecords.otp, input.emailOTP),
            eq(otpRecords.purpose, "registration"),
            eq(otpRecords.isUsed, false),
            gte(otpRecords.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!emailOtpRows.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired email OTP" });
      }

      // Verify mobile OTP (check for registration purpose)
      const mobileOtpRows = await db
        .select()
        .from(otpRecords)
        .where(
          and(
            eq(otpRecords.mobile, input.mobile),
            eq(otpRecords.otp, input.mobileOTP),
            eq(otpRecords.purpose, "registration"),
            eq(otpRecords.isUsed, false),
            gte(otpRecords.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!mobileOtpRows.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired mobile OTP" });
      }

      await db
        .update(otpRecords)
        .set({ isUsed: true })
        .where(eq(otpRecords.id, emailOtpRows[0].id));

      await db
        .update(otpRecords)
        .set({ isUsed: true })
        .where(eq(otpRecords.id, mobileOtpRows[0].id));

      // Check if user already registered with this roll number's mobile
      const existingUserByMobile = await db
        .select()
        .from(users)
        .where(eq(users.mobile, input.mobile))
        .limit(1);

      if (existingUserByMobile.length && existingUserByMobile[0].password) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This mobile number is already registered. Please login instead.",
        });
      }

      // Check if user already registered with this email
      const existingUserByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUserByEmail.length && existingUserByEmail[0].password) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email is already registered. Please login instead.",
        });
      }

      // Check if student already has a linked user account
      if (student.userId) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.id, student.userId))
          .limit(1);
        if (existingUser.length && existingUser[0].password && existingUser[0].password !== "") {
          throw new TRPCError({ code: "CONFLICT", message: "Student already registered. Please login." });
        }
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user account
      const [result] = await db.insert(users).values({
        userId: `STU${String(student.id).padStart(4, "0")}`,
        name: input.name,
        email: input.email,
        mobile: input.mobile,
        password: hashedPassword,
        role: "student",
        isActive: true,
        collegeId: student.collegeId,
      });

      // Update student record with userId
      await db
        .update(students)
        .set({ userId: result.insertId })
        .where(eq(students.id, student.id));

      const token = signToken({ userId: result.insertId, role: "student", email: input.email });

      // Log activity
      await logActivity({
        userId: result.insertId,
        userName: input.name,
        action: "STUDENT_REGISTERED",
        details: `Student registered with Roll: ${input.rollNumber}, Enrollment: ${input.enrollmentNumber}`,
      });

      return {
        success: true,
        message: "Registration successful! You are now logged in.",
        token,
        user: {
          id: result.insertId,
          userId: `STU${String(student.id).padStart(4, "0")}`,
          name: input.name,
          email: input.email,
          role: "student",
          mobile: input.mobile,
          collegeId: student.collegeId,
        },
      };
    }),

  // ─── Check Registration Status ───
  checkRegistration: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        mobile: z.string().min(10),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();

      // Find student by roll number
      const studentRows = await db
        .select()
        .from(students)
        .where(eq(students.rollNumber, input.rollNumber))
        .limit(1);
      const student = studentRows.at(0);

      if (!student) {
        return { exists: false, message: "No student found with this Roll Number" };
      }

      // Check if mobile matches any registered user
      const userByMobile = await db
        .select()
        .from(users)
        .where(eq(users.mobile, input.mobile))
        .limit(1);

      if (userByMobile.length && userByMobile[0].password) {
        return { exists: true, registered: true, message: "Already registered. Please login.", studentName: student.name };
      }

      // Check if student has a linked user
      if (student.userId) {
        const linkedUser = await db
          .select()
          .from(users)
          .where(eq(users.id, student.userId))
          .limit(1);
        if (linkedUser.length && linkedUser[0].password) {
          return { exists: true, registered: true, message: "Already registered. Please login.", studentName: student.name };
        }
      }

      return { exists: true, registered: false, message: "Please register.", studentName: student.name };
    }),

  // ─── Forgot Password ───
  forgotPassword: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        newPassword: z.string().min(6),
        otp: z.string().length(6),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      
      // Verify OTP first
      const otpRowsVerify = await db
        .select()
        .from(otpRecords)
        .where(
          and(
            eq(otpRecords.email, input.email.toLowerCase()),
            eq(otpRecords.otp, input.otp),
            eq(otpRecords.purpose, "forgot_password"),
            eq(otpRecords.isUsed, false),
            gte(otpRecords.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!otpRowsVerify.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
      }

      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      const user = userRows.at(0);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Mark OTP as used
      await db
        .update(otpRecords)
        .set({ isUsed: true })
        .where(eq(otpRecords.id, otpRowsVerify[0].id));

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      await logActivity({
        userId: user.id,
        userName: user.name ?? user.userId,
        action: "PASSWORD_RESET",
        details: "Password reset via forgot password with OTP verification",
      });

      return { success: true, message: "Password reset successful" };
    }),

  studentForgotPasswordSendOtp: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        enrollmentNumber: z.string().min(1),
        email: z.string().email().optional(),
        mobile: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Demo roll number fallback
      if (input.rollNumber === "12") {
        console.log(`[Demo] Forgot password OTP sent for roll 12`);
        return { success: true, message: "OTP sent successfully" };
      }

      const studentRows = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.rollNumber, input.rollNumber),
            eq(students.enrollmentNumber, input.enrollmentNumber),
          ),
        )
        .limit(1);
      const student = studentRows.at(0);
      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found" });
      }

      if (!student.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Student is not registered yet" });
      }

      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, student.userId))
        .limit(1);
      const user = userRows.at(0);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User account not found" });
      }

      const email = input.email?.trim().toLowerCase();
      const mobile = input.mobile?.trim().replace(/[^\d+]/g, "");

      if (!email && !mobile) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email or mobile number is required" });
      }

      if (email && user.email.toLowerCase() !== email) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email does not match our records" });
      }

      if (mobile && user.mobile?.replace(/[^\d+]/g, "") !== mobile) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Mobile number does not match our records" });
      }

      // Generate separate OTPs
      const emailOtp = email ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      const mobileOtp = mobile ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const { sendEmailOTP } = await import("./lib/email");
      const { sendOTP } = await import("./lib/sms");

      if (emailOtp && email) {
        await db.insert(otpRecords).values({
          email,
          mobile: null,
          otp: emailOtp,
          purpose: "forgot_password",
          expiresAt,
        });
        const sent = await sendEmailOTP(email, emailOtp, user.name ?? "Student");
        if (!sent) {
          console.log(`[Forgot-OTP-Email] OTP for ${email}: ${emailOtp}`);
        }
      }

      if (mobileOtp && mobile) {
        await db.insert(otpRecords).values({
          email: null,
          mobile,
          otp: mobileOtp,
          purpose: "forgot_password",
          expiresAt,
        });
        const sent = await sendOTP(mobile, mobileOtp, user.name ?? "Student");
        if (!sent) {
          console.log(`[Forgot-OTP-SMS] OTP for ${mobile}: ${mobileOtp}`);
        }
      }

      return {
        success: true,
        message: `OTP sent successfully to your ${email ? "Email" : ""}${email && mobile ? " and " : ""}${mobile ? "Mobile" : ""}`,
        hasEmail: !!email,
        hasMobile: !!mobile,
      };
    }),

  studentForgotPasswordReset: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        enrollmentNumber: z.string().min(1),
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        emailOtp: z.string().length(6).optional(),
        mobileOtp: z.string().length(6).optional(),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Demo roll number fallback
      if (input.rollNumber === "12") {
        return { success: true, message: "Password reset successful" };
      }

      const studentRows = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.rollNumber, input.rollNumber),
            eq(students.enrollmentNumber, input.enrollmentNumber),
          ),
        )
        .limit(1);
      const student = studentRows.at(0);
      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found" });
      }

      if (!student.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Student is not registered yet" });
      }

      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, student.userId))
        .limit(1);
      const user = userRows.at(0);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User account not found" });
      }

      const email = input.email?.trim().toLowerCase();
      const mobile = input.mobile?.trim().replace(/[^\d+]/g, "");

      if (email && input.emailOtp) {
        const emailRows = await db
          .select()
          .from(otpRecords)
          .where(
            and(
              eq(otpRecords.email, email),
              eq(otpRecords.otp, input.emailOtp),
              eq(otpRecords.purpose, "forgot_password"),
              eq(otpRecords.isUsed, false),
              gte(otpRecords.expiresAt, new Date()),
            ),
          )
          .limit(1);

        if (!emailRows.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired email OTP" });
        }

        await db
          .update(otpRecords)
          .set({ isUsed: true })
          .where(eq(otpRecords.id, emailRows[0].id));
      }

      if (mobile && input.mobileOtp) {
        const mobileRows = await db
          .select()
          .from(otpRecords)
          .where(
            and(
              eq(otpRecords.mobile, mobile),
              eq(otpRecords.otp, input.mobileOtp),
              eq(otpRecords.purpose, "forgot_password"),
              eq(otpRecords.isUsed, false),
              gte(otpRecords.expiresAt, new Date()),
            ),
          )
          .limit(1);

        if (!mobileRows.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired mobile OTP" });
        }

        await db
          .update(otpRecords)
          .set({ isUsed: true })
          .where(eq(otpRecords.id, mobileRows[0].id));
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      await db
        .update(students)
        .set({ password: hashedPassword })
        .where(eq(students.id, student.id));

      await logActivity({
        userId: user.id,
        userName: user.name ?? user.userId,
        action: "PASSWORD_RESET",
        details: "Student password reset successfully via forgot password OTP verification",
      });

      return { success: true, message: "Password reset successful" };
    }),

  // ─── Get Current User (with permissions) ───
  me: authedQuery.query((opts) => {
    return {
      ...opts.ctx.user,
      permissions: opts.ctx.userPermissions,
    };
  }),

  // ─── Logout (for activity tracking) ───
  logout: authedQuery.mutation(async ({ ctx }) => {
    await logActivity({
      userId: ctx.user.id,
      userName: ctx.user.name ?? ctx.user.userId,
      action: "LOGOUT",
      details: "User logged out",
    });
    return { success: true };
  }),

  // ─── Change Password ───
  changePassword: authedQuery
    .input(
      z.object({
        oldPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const valid = await bcrypt.compare(input.oldPassword, ctx.user.password);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid old password" });
      }
      const hashed = await bcrypt.hash(input.newPassword, 10);
      await db
        .update(users)
        .set({ password: hashed })
        .where(eq(users.id, ctx.user.id));

      await logActivity({
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.userId,
        action: "PASSWORD_CHANGED",
        details: "User changed password",
      });

      return { success: true };
    }),

  // ─── Set Student Password (after OTP verification) ───
  setStudentPassword: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        password: z.string().min(6),
        email: z.string().email(),
        mobile: z.string().min(10),
        emailOtp: z.string().length(6),
        mobileOtp: z.string().length(6),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDb();

        // Test/fallback data for demo roll number
        if (input.rollNumber === "12") {
          console.log(`[Demo] Test student password set: ${input.password}`);
          await logActivity({
            userId: 999,
            userName: "Test Student",
            action: "STUDENT_PASSWORD_SET",
            details: `Test student set password after OTP verification`,
            ipAddress: ctx.req.headers.get("x-forwarded-for") || undefined,
          });
          return {
            success: true,
            message: "Password set successfully. You can now login with your Roll Number and Password.",
          };
        }

        // Find student by roll number
        const studentRows = await db
          .select()
          .from(students)
          .where(eq(students.rollNumber, input.rollNumber))
          .limit(1);
        const student = studentRows.at(0);

        if (!student) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        }

        // Verify Email OTP (registration purpose)
        const emailOtpRows = await db
          .select()
          .from(otpRecords)
          .where(
            and(
              eq(otpRecords.email, input.email.toLowerCase()),
              eq(otpRecords.otp, input.emailOtp),
              eq(otpRecords.purpose, "registration"),
              eq(otpRecords.isUsed, false),
              gte(otpRecords.expiresAt, new Date()),
            ),
          )
          .limit(1);

        if (!emailOtpRows.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired email OTP" });
        }

        // Verify Mobile OTP (registration purpose)
        const mobileOtpRows = await db
          .select()
          .from(otpRecords)
          .where(
            and(
              eq(otpRecords.mobile, input.mobile.replace(/[^\d+]/g, "")),
              eq(otpRecords.otp, input.mobileOtp),
              eq(otpRecords.purpose, "registration"),
              eq(otpRecords.isUsed, false),
              gte(otpRecords.expiresAt, new Date()),
            ),
          )
          .limit(1);

        if (!mobileOtpRows.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired mobile OTP" });
        }

        // Mark OTPs as used
        await db
          .update(otpRecords)
          .set({ isUsed: true })
          .where(eq(otpRecords.id, emailOtpRows[0].id));

        await db
          .update(otpRecords)
          .set({ isUsed: true })
          .where(eq(otpRecords.id, mobileOtpRows[0].id));

        // Hash the password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        let userId = student.userId;
        if (!userId) {
          // Create new user account for student
          const [newUser] = await db.insert(users).values({
            userId: `STU${student.rollNumber}`,
            name: student.name,
            email: input.email.toLowerCase(),
            mobile: input.mobile,
            password: hashedPassword,
            role: "student",
            isActive: true,
            collegeId: student.collegeId,
          });
          userId = newUser.insertId;
          await db
            .update(students)
            .set({ userId })
            .where(eq(students.id, student.id));
        } else {
          // Update existing user account
          await db
            .update(users)
            .set({
              email: input.email.toLowerCase(),
              mobile: input.mobile,
              password: hashedPassword,
              isActive: true,
            })
            .where(eq(users.id, userId));
        }

        // Also update student password for double compatibility
        await db
          .update(students)
          .set({ password: hashedPassword })
          .where(eq(students.id, student.id));

        // Log activity
        await logActivity({
          userId: Number(userId) || student.id,
          userName: student.name,
          action: "STUDENT_PASSWORD_SET",
          details: `Student set password after OTP verification`,
          ipAddress: ctx.req.headers.get("x-forwarded-for") || undefined,
        });

        return {
          success: true,
          message: "Password set successfully. You can now login with your credentials.",
        };
      } catch (error) {
        console.error("setStudentPassword error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to set password" });
      }
    }),

  // ─── Student Login with Roll Number + Password (after password is set) ───
  studentLoginWithPassword: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDb();

        // Find student by roll number
        const studentRows = await db
          .select()
          .from(students)
          .where(eq(students.rollNumber, input.rollNumber))
          .limit(1);
        const student = studentRows.at(0);

        if (!student) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        }

        // Check if password is set
        if (!student.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Password not set. Please use OTP login first to set password.",
          });
        }

        // Verify password
        const passwordValid = await bcrypt.compare(input.password, student.password);
        if (!passwordValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }

        // Get user details (if student has linked user account)
        let userId = student.userId;
        let userEmail = "";
        let userName = student.name;
        let userMobile = "";

        if (student.userId) {
          const userRows = await db
            .select()
            .from(users)
            .where(eq(users.id, student.userId!))
            .limit(1);
          if (userRows.length) {
            userEmail = userRows[0].email;
            userName = userRows[0].name ?? student.name;
            userMobile = userRows[0].mobile ?? "";
          }
        } else {
          userId = 0;
        }

        // Create a temporary token for the student (using student data)
        const token = signToken({
          userId: Number(userId) || student.id,
          role: "student",
          email: userEmail || "student@example.com",
        });

        // Log activity
        await logActivity({
          userId: Number(userId) || student.id,
          userName: userName,
          action: "LOGIN",
          details: `Student logged in via Roll Number + Password`,
          ipAddress: ctx.req.headers.get("x-forwarded-for") || undefined,
        });

        return {
          token,
          user: {
            id: Number(userId) || student.id,
            userId: student.rollNumber,
            name: student.name,
            email: userEmail || "student@example.com",
            role: "student",
            mobile: userMobile,
            avatar: null,
            collegeId: student.collegeId,
          },
        };
      } catch (error: any) {
        console.error("studentLoginWithPassword error:", error);
        const nested = (error && (error.cause && (error.cause.code || error.cause.message))) ? `${error.cause.code || error.cause.message}` : "";
        const msg = [error && (error.code || error.message), nested].filter(Boolean).join(" | ");

        if (msg.includes("ER_ACCESS_DENIED_ERROR") || msg.includes("Access denied")) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login failed (DB unavailable)" });
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login failed" });
      }
    }),

  setupStudentPasswordDirect: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        enrollmentNumber: z.string().min(1),
        email: z.string().email(),
        mobile: z.string().min(10),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDb();

        // 1. Find student by roll and enrollment number
        const studentRows = await db
          .select()
          .from(students)
          .where(
            and(
              eq(students.rollNumber, input.rollNumber),
              eq(students.enrollmentNumber, input.enrollmentNumber),
            ),
          )
          .limit(1);
        const student = studentRows.at(0);

        if (!student) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found" });
        }

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        let userId = student.userId;
        if (!userId) {
          // Create new user account for student
          const [newUser] = await db.insert(users).values({
            userId: `STU${student.rollNumber}`,
            name: student.name,
            email: input.email.toLowerCase(),
            mobile: input.mobile,
            password: hashedPassword,
            role: "student",
            isActive: true,
            collegeId: student.collegeId,
          });
          userId = newUser.insertId;
          await db
            .update(students)
            .set({ userId })
            .where(eq(students.id, student.id));
        } else {
          // Update/Overwrite existing user account
          await db
            .update(users)
            .set({
              email: input.email.toLowerCase(),
              mobile: input.mobile,
              password: hashedPassword,
              isActive: true,
            })
            .where(eq(users.id, userId));
        }

        // Also update student password field
        await db
          .update(students)
          .set({ password: hashedPassword })
          .where(eq(students.id, student.id));

        // Log activity
        await logActivity({
          userId: Number(userId) || student.id,
          userName: student.name,
          action: "STUDENT_PASSWORD_SET",
          details: `Student configured email, mobile, and password direct`,
          ipAddress: ctx.req.headers.get("x-forwarded-for") || undefined,
        });

        return {
          success: true,
          message: "Student login credentials configured successfully!",
        };
      } catch (error: any) {
        console.error("setupStudentPasswordDirect error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to configure login credentials" });
      }
    }),
});
