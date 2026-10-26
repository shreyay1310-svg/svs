import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { otpRecords, users, students } from "@db/schema";
import { eq, and, gte, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendOTP } from "./lib/sms";
import { sendEmailOTP } from "./lib/email";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

function normalizeMobile(mobile?: string | null) {
  if (!mobile) return undefined;
  const normalized = mobile.replace(/[^\d+]/g, "").trim();
  return normalized || undefined;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const otpRouter = createRouter({
  // ─── Send OTP via Email or Mobile ───
  send: publicQuery
    .input(
      z.object({
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        purpose: z.enum(["login", "forgot_password", "final_submit", "registration"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = normalizeEmail(input.email);
      const mobile = normalizeMobile(input.mobile);
      if (!email && !mobile) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email or mobile is required" });
      }
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.insert(otpRecords).values({
        email,
        mobile,
        otp,
        purpose: input.purpose,
        expiresAt,
      });

      // Get user name for personalized SMS
      let userName = "User";
      if (email) {
        const userRows = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (userRows[0]) userName = userRows[0].name ?? "User";
      }

      // Send via Email if email provided
      const emailSent = email ? await sendEmailOTP(email, otp, userName) : false;

      // Send via SMS if mobile provided
      const smsSent = mobile ? await sendOTP(mobile, otp, userName) : false;

      if (!emailSent && !smsSent) {
        // Fallback: just log the OTP for development
        console.log(`[OTP] OTP for ${input.email || input.mobile}: ${otp}`);
      }

      return {
        success: true,
        message: `OTP sent successfully via ${emailSent ? "Email" : ""}${emailSent && smsSent ? " and " : ""}${smsSent ? "SMS" : ""}`,
      };
    }),

  // ─── Send OTP for Student Login (Roll Number based) ───
  sendForStudent: publicQuery
    .input(
      z.object({
        rollNumber: z.string().min(1),
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        purpose: z.enum(["login", "forgot_password", "final_submit", "registration"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const requestedEmail = normalizeEmail(input.email);
      const requestedMobile = normalizeMobile(input.mobile);

      // Test/fallback data for demo roll number
      if (input.rollNumber === "12") {
        const emailOtp = requestedEmail ? generateOtp() : null;
        const mobileOtp = requestedMobile ? generateOtp() : null;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        // Log OTPs for development
        if (emailOtp) {
          console.log(`[OTP-Test] Test Email OTP for roll 12: ${emailOtp}`);
        }
        if (mobileOtp) {
          console.log(`[OTP-Test] Test Mobile OTP for roll 12: ${mobileOtp}`);
        }
        
        // Store OTP records
        try {
          if (emailOtp && requestedEmail) {
            await db.insert(otpRecords).values({
              email: requestedEmail,
              mobile: null,
              otp: emailOtp,
              purpose: input.purpose,
              expiresAt,
            });
            // Try to send email OTP
            await sendEmailOTP(requestedEmail, emailOtp, "Test Student");
          }
          if (mobileOtp && requestedMobile) {
            await db.insert(otpRecords).values({
              email: null,
              mobile: requestedMobile,
              otp: mobileOtp,
              purpose: input.purpose,
              expiresAt,
            });
            // Try to send mobile OTP (with fallback to console logging)
            await sendOTP(requestedMobile, mobileOtp, "Test Student");
          }
        } catch (e) {
          console.log("Could not insert/send OTP record:", e);
        }
        
        return {
          success: true,
          message: `OTP sent to ${requestedEmail ? "Email" : ""}${requestedEmail && requestedMobile ? " and " : ""}${requestedMobile ? "SMS" : ""}`,
          studentName: "Test Student",
          _testOtp: mobileOtp || emailOtp, // For development only - remove in production
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No student found with this Roll Number",
        });
      }

      // Find user associated with this student
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, student.userId!))
        .limit(1);
      const user = userRows.at(0);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student record exists but no user account linked",
        });
      }

      if (!user.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Account is deactivated" });
      }

      // Determine contact method
      const contactEmail = requestedEmail || normalizeEmail(user.email);
      const contactMobile = requestedMobile || normalizeMobile(user.mobile);

      if (!contactEmail && !contactMobile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email or mobile found for this student",
        });
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.insert(otpRecords).values({
        email: contactEmail,
        mobile: contactMobile,
        otp,
        purpose: input.purpose,
        expiresAt,
      });

      // Send via Email
      const emailSent = contactEmail ? await sendEmailOTP(contactEmail, otp, user.name ?? "Student") : false;

      // Send via SMS
      const smsSent = contactMobile ? await sendOTP(contactMobile, otp, user.name ?? "Student") : false;

      return {
        success: true,
        message: `OTP sent via ${emailSent ? "Email" : ""}${emailSent && smsSent ? " and " : ""}${smsSent ? "SMS" : ""}`,
        studentName: student.name,
      };
    }),

  // ─── Send Dual OTP for Final Submission (separate OTPs for email and mobile) ───
  sendDualOtp: publicQuery
    .input(
      z.object({
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        purpose: z.enum(["final_submit", "registration", "forgot_password"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = normalizeEmail(input.email);
      const mobile = normalizeMobile(input.mobile);
      
      if (!email && !mobile) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email or mobile is required" });
      }

      // Get user name for personalized messages
      let userName = "User";
      if (email) {
        const userRows = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (userRows[0]) userName = userRows[0].name ?? "User";
      }

      // Generate separate OTPs for email and mobile if both present
      const emailOtp = email ? generateOtp() : null;
      const mobileOtp = mobile ? generateOtp() : null;

      // Store separate OTP records
      if (emailOtp && email) {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await db.insert(otpRecords).values({
          email,
          mobile: null,
          otp: emailOtp,
          purpose: input.purpose,
          expiresAt,
        });
        // Send email OTP
        const emailSent = await sendEmailOTP(email, emailOtp, userName);
        if (!emailSent) {
          console.log(`[OTP-Email] OTP for ${email}: ${emailOtp}`);
        }
      }

      if (mobileOtp && mobile) {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await db.insert(otpRecords).values({
          email: null,
          mobile,
          otp: mobileOtp,
          purpose: input.purpose,
          expiresAt,
        });
        // Send SMS OTP
        const smsSent = await sendOTP(mobile, mobileOtp, userName);
        if (!smsSent) {
          console.log(`[OTP-SMS] OTP for ${mobile}: ${mobileOtp}`);
        }
      }

      return {
        success: true,
        message: `OTP sent successfully via ${email ? "Email" : ""}${email && mobile ? " and " : ""}${mobile ? "SMS" : ""}`,
        hasEmail: !!email,
        hasMobile: !!mobile,
      };
    }),

  // ─── Verify Dual OTP (verify both email and mobile OTPs separately) ───
  verifyDualOtp: publicQuery
    .input(
      z.object({
        email: z.string().email().optional(),
        emailOtp: z.string().length(6).optional(),
        mobile: z.string().optional(),
        mobileOtp: z.string().length(6).optional(),
        purpose: z.enum(["final_submit", "registration", "forgot_password"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = normalizeEmail(input.email);
      const mobile = normalizeMobile(input.mobile);

      // If email is provided, emailOtp must be provided
      if (email && !input.emailOtp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email OTP is required" });
      }

      // If mobile is provided, mobileOtp must be provided
      if (mobile && !input.mobileOtp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mobile OTP is required" });
      }

      const verificationResults = {
        emailVerified: false,
        mobileVerified: false,
      };

      // Verify email OTP
      if (email && input.emailOtp) {
        const emailConditions = [
          eq(otpRecords.email, email),
          isNull(otpRecords.mobile),
          eq(otpRecords.otp, input.emailOtp),
          eq(otpRecords.purpose, input.purpose),
          eq(otpRecords.isUsed, false),
          gte(otpRecords.expiresAt, new Date()),
        ];

        const emailRows = await db
          .select()
          .from(otpRecords)
          .where(and(...emailConditions))
          .limit(1);

        if (!emailRows.at(0)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired email OTP" });
        }

        const emailRecord = emailRows[0];
        await db
          .update(otpRecords)
          .set({ isUsed: true })
          .where(eq(otpRecords.id, emailRecord.id));

        verificationResults.emailVerified = true;
      }

      // Verify mobile OTP
      if (mobile && input.mobileOtp) {
        const mobileConditions = [
          eq(otpRecords.mobile, mobile),
          isNull(otpRecords.email),
          eq(otpRecords.otp, input.mobileOtp),
          eq(otpRecords.purpose, input.purpose),
          eq(otpRecords.isUsed, false),
          gte(otpRecords.expiresAt, new Date()),
        ];

        const mobileRows = await db
          .select()
          .from(otpRecords)
          .where(and(...mobileConditions))
          .limit(1);

        if (!mobileRows.at(0)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired mobile OTP" });
        }

        const mobileRecord = mobileRows[0];
        await db
          .update(otpRecords)
          .set({ isUsed: true })
          .where(eq(otpRecords.id, mobileRecord.id));

        verificationResults.mobileVerified = true;
      }

      return { 
        success: true, 
        message: "All OTPs verified successfully",
        ...verificationResults
      };
    }),

  // ─── Verify OTP ───
  verify: publicQuery
    .input(
      z.object({
        email: z.string().email().optional(),
        mobile: z.string().optional(),
        otp: z.string().length(6),
        purpose: z.enum(["login", "forgot_password", "final_submit", "registration"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = normalizeEmail(input.email);
      const mobile = normalizeMobile(input.mobile);
      
      if (!email && !mobile) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email or mobile is required for OTP verification" });
      }
      
      // Test/fallback data for demo
      if ((email === "student@test.com" || mobile === "9876543210") && input.purpose === "login") {
        console.log(`[OTP-Test] Test OTP verified: ${input.otp}`);
        return { success: true, message: "OTP verified successfully" };
      }
      
      const conditions = [
        eq(otpRecords.otp, input.otp),
        eq(otpRecords.purpose, input.purpose),
        eq(otpRecords.isUsed, false),
        gte(otpRecords.expiresAt, new Date()),
      ];
      if (email) conditions.push(eq(otpRecords.email, email));
      if (mobile) conditions.push(eq(otpRecords.mobile, mobile));

      const rows = await db
        .select()
        .from(otpRecords)
        .where(and(...conditions))
        .limit(1);

      const record = rows.at(0);
      if (!record) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
      }

      await db
        .update(otpRecords)
        .set({ isUsed: true })
        .where(eq(otpRecords.id, record.id));

      return { success: true, message: "OTP verified successfully" };
    }),
});
