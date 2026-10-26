import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  timestamp,
  int,
  bigint,
  boolean,
  date,
  longtext,
} from "drizzle-orm/mysql-core";

// ─── Universities (Multi-tenant University details) ───
export const universities = mysqlTable("universities", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  universityName: varchar("university_name", { length: 255 }).notNull(),
  universityNameHi: varchar("university_name_hi", { length: 255 }),
  universityCode: varchar("university_code", { length: 50 }).notNull().unique(),
  logoUrl: text("logo_url"),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type University = typeof universities.$inferSelect;
export type InsertUniversity = typeof universities.$inferInsert;

// ─── Users (ERP system users - Admin, Staff, Student) ───
export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: varchar("userId", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nameHi: varchar("name_hi", { length: 255 }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  mobile: varchar("mobile", { length: 20 }),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "staff", "student"]).default("student").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  dob: date("dob"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  collegeId: bigint("college_id", { mode: "number", unsigned: true }),
  universityId: bigint("university_id", { mode: "number", unsigned: true }),
  avatar: text("avatar"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── OTP Records (for email/mobile verification) ───
export const otpRecords = mysqlTable("otp_records", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }),
  mobile: varchar("mobile", { length: 20 }),
  otp: varchar("otp", { length: 10 }).notNull(),
  purpose: mysqlEnum("purpose", ["login", "forgot_password", "final_submit", "registration"]).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
});

export type OtpRecord = typeof otpRecords.$inferSelect;

// ─── Roles (Custom roles with permissions) ───
export const roles = mysqlTable("roles", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  roleName: varchar("role_name", { length: 100 }).notNull(),
  shortName: varchar("short_name", { length: 50 }).notNull(),
  description: text("description"),
  permissions: text("permissions"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ─── Colleges ───
export const colleges = mysqlTable("colleges", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  universityId: bigint("university_id", { mode: "number", unsigned: true }),
  collegeName: varchar("college_name", { length: 255 }).notNull(),
  collegeNameHi: varchar("college_name_hi", { length: 255 }),
  collegeCode: varchar("college_code", { length: 50 }).notNull().unique(),
  address: text("address"),
  contactEmail: varchar("contact_email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  website: varchar("website", { length: 255 }),
  establishedYear: int("established_year"),
  accreditation: varchar("accreditation", { length: 255 }),
  affiliation: varchar("affiliation", { length: 255 }),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pincode: varchar("pincode", { length: 20 }),
  principalName: varchar("principal_name", { length: 255 }),
  totalStudents: int("total_students"),
  campusArea: varchar("campus_area", { length: 100 }),
  landArea: varchar("land_area", { length: 100 }),
  motto: varchar("motto", { length: 255 }),
  logoUrl: text("logo_url"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type College = typeof colleges.$inferSelect;
export type InsertCollege = typeof colleges.$inferInsert;

// ─── Courses ───
export const courses = mysqlTable("courses", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  courseName: varchar("course_name", { length: 255 }).notNull(),
  courseNameHi: varchar("course_name_hi", { length: 255 }),
  courseCode: varchar("course_code", { length: 50 }),
  collegeId: bigint("college_id", { mode: "number", unsigned: true }).notNull(),
  durationYears: int("duration_years"),
  durationMonths: int("duration_months"),
  credits: int("credits"),
  level: varchar("level", { length: 100 }),
  seats: int("seats"),
  fee: int("fee"),
  eligibility: text("eligibility"),
  syllabusUrl: text("syllabus_url"),
  coordinatorName: varchar("coordinator_name", { length: 255 }),
  coordinatorEmail: varchar("coordinator_email", { length: 320 }),
  isProfessional: boolean("is_professional"),
  intakePerYear: int("intake_per_year"),
  mode: varchar("mode", { length: 50 }),
  campus: varchar("campus", { length: 255 }),
  remarks: text("remarks"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

// ─── Subjects ───
export const subjects = mysqlTable("subjects", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  subjectName: varchar("subject_name", { length: 255 }).notNull(),
  subjectNameHi: varchar("subject_name_hi", { length: 255 }),
  courseType: mysqlEnum("course_type", ["honors", "masters"]).notNull(),
  courseId: bigint("course_id", { mode: "number", unsigned: true }).notNull(),
  collegeId: bigint("college_id", { mode: "number", unsigned: true }).notNull(),
  subjectCode: varchar("subject_code", { length: 100 }),
  credits: int("credits"),
  semester: int("semester"),
  theoryMarks: int("theory_marks"),
  practicalMarks: int("practical_marks"),
  totalMarks: int("total_marks"),
  isElective: boolean("is_elective"),
  prerequisites: text("prerequisites"),
  learningOutcomes: text("learning_outcomes"),
  syllabusUrl: text("syllabus_url"),
  referenceBooks: text("reference_books"),
  labRequired: boolean("lab_required"),
  hoursPerWeek: int("hours_per_week"),
  assessmentMethod: varchar("assessment_method", { length: 100 }),
  remarks: text("remarks"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;

// ─── Students ───
export const students = mysqlTable("students", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  universityId: bigint("university_id", { mode: "number", unsigned: true }),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  rollNumber: varchar("roll_number", { length: 100 }).notNull().unique(),
  enrollmentNumber: varchar("enrollment_number", { length: 100 }).notNull().unique(),
  collegeId: bigint("college_id", { mode: "number", unsigned: true }).notNull(),
  courseId: bigint("course_id", { mode: "number", unsigned: true }).notNull(),
  subjectId: bigint("subject_id", { mode: "number", unsigned: true }),
  courseType: mysqlEnum("course_type", ["honors", "masters"]),
  name: varchar("name", { length: 255 }).notNull(),
  nameHi: varchar("name_hi", { length: 255 }),
  fatherName: varchar("father_name", { length: 255 }),
  fatherNameHi: varchar("father_name_hi", { length: 255 }),
  motherName: varchar("mother_name", { length: 255 }),
  motherNameHi: varchar("mother_name_hi", { length: 255 }),
  gender: mysqlEnum("gender", ["male", "female", "other"]).notNull(),
  category: mysqlEnum("category", ["regular", "private", "ex", "back"]).notNull(),
  division: varchar("division", { length: 100 }),
  passingYear: int("passing_year"),
  passingMonth: varchar("passing_month", { length: 50 }),
  photoUrl: longtext("photo_url"),
  marksheetUrl: longtext("marksheet_url"),
  applicationLetterUrl: longtext("application_letter_url"),
  signatureData: longtext("signature_data"),
  password: varchar("password", { length: 255 }),
  isFinalSubmitted: boolean("is_final_submitted").default(false).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  canReedit: boolean("can_reedit").default(false).notNull(),
  verificationStatus: mysqlEnum("verification_status", ["draft", "submitted", "approved", "rejected"]).default("draft").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// ─── Activity Logs ───
export const activityLogs = mysqlTable("activity_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  userName: varchar("user_name", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: bigint("entity_id", { mode: "number", unsigned: true }),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
