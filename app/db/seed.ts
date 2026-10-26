import { getDb } from "../api/queries/connection";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // Hash password for admin
  const adminPassword = await bcrypt.hash("Rahul@8052", 10);

  // Seed default admin user
  await db.insert(schema.users).values([
    {
      userId: "ADMIN001",
      name: "System Admin",
      nameHi: "सिस्टम एडमिन",
      email: "kumar712003@gmail.com",
      mobile: "8052797334",
      password: adminPassword,
      role: "admin",
      isActive: true,
    },
  ]);

  // Seed colleges
  const [college1] = await db.insert(schema.colleges).values([
    {
      collegeName: "Rajasthan University",
      collegeNameHi: "राजस्थान विश्वविद्यालय",
      collegeCode: "RU001",
      address: "Jaipur, Rajasthan",
      description: "Premier university in Rajasthan",
    },
    {
      collegeName: "Delhi University",
      collegeNameHi: "दिल्ली विश्वविद्यालय",
      collegeCode: "DU001",
      address: "Delhi",
      description: "Central university in Delhi",
    },
    {
      collegeName: "Mumbai University",
      collegeNameHi: "मुंबई विश्वविद्यालय",
      collegeCode: "MU001",
      address: "Mumbai, Maharashtra",
      description: "State university in Maharashtra",
    },
  ]);

  // Seed courses
  await db.insert(schema.courses).values([
    { courseName: "Bachelor of Arts", courseNameHi: "बैचलर ऑफ आर्ट्स", courseCode: "BA", collegeId: college1.insertId },
    { courseName: "Bachelor of Science", courseNameHi: "बैचलर ऑफ साइंस", courseCode: "BSC", collegeId: college1.insertId },
    { courseName: "Master of Arts", courseNameHi: "मास्टर ऑफ आर्ट्स", courseCode: "MA", collegeId: college1.insertId },
    { courseName: "Master of Science", courseNameHi: "मास्टर ऑफ साइंस", courseCode: "MSC", collegeId: college1.insertId },
  ]);

  // Seed subjects
  await db.insert(schema.subjects).values([
    { subjectName: "English Literature", subjectNameHi: "अंग्रेजी साहित्य", courseType: "honors", courseId: college1.insertId, collegeId: college1.insertId },
    { subjectName: "Hindi Literature", subjectNameHi: "हिंदी साहित्य", courseType: "honors", courseId: college1.insertId, collegeId: college1.insertId },
    { subjectName: "Mathematics", subjectNameHi: "गणित", courseType: "honors", courseId: college1.insertId + 1, collegeId: college1.insertId },
    { subjectName: "Physics", subjectNameHi: "भौतिक विज्ञान", courseType: "masters", courseId: college1.insertId + 3, collegeId: college1.insertId },
    { subjectName: "Chemistry", subjectNameHi: "रसायन विज्ञान", courseType: "masters", courseId: college1.insertId + 3, collegeId: college1.insertId },
  ]);

  // Seed roles
  await db.insert(schema.roles).values([
    {
      roleName: "System Administrator",
      shortName: "SYS_ADMIN",
      description: "Full system access",
      permissions: JSON.stringify(["all"]),
    },
    {
      roleName: "College Staff",
      shortName: "STAFF",
      description: "Limited college management access",
      permissions: JSON.stringify(["students.view", "students.edit", "reports.view"]),
    },
    {
      roleName: "Student",
      shortName: "STUDENT",
      description: "Student access - view and edit own profile",
      permissions: JSON.stringify(["profile.view", "profile.edit"]),
    },
  ]);

  // Seed default registered student users and student records
  const studentPassword = await bcrypt.hash("Student@123", 10);
  const [studentUser1] = await db.insert(schema.users).values({
    userId: "STU0001",
    name: "Demo Student",
    nameHi: "डेमो छात्र",
    email: "student@example.com",
    mobile: "9999999999",
    password: studentPassword,
    role: "student",
    isActive: true,
    collegeId: college1.insertId,
  });

  // Seed student with user-provided credentials
  const customStudentPassword = await bcrypt.hash("Rahil@8052", 10);
  const [studentUser2] = await db.insert(schema.users).values({
    userId: "STU123465",
    name: "Student User",
    nameHi: "छात्र उपयोगकर्ता",
    email: "student123465@example.com",
    mobile: "9876543210",
    password: customStudentPassword,
    role: "student",
    isActive: true,
    collegeId: college1.insertId,
  });

  const studentCourse = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.courseCode, "BA"))
    .limit(1);

  await db.insert(schema.students).values([
    {
      userId: studentUser1.insertId,
      rollNumber: "S12345",
      enrollmentNumber: "E12345",
      collegeId: college1.insertId,
      courseId: studentCourse[0]?.id ?? college1.insertId,
      courseType: "honors",
      name: "Demo Student",
      gender: "male",
      category: "regular",
    },
    {
      userId: studentUser2.insertId,
      rollNumber: "123465",
      enrollmentNumber: "2345678",
      collegeId: college1.insertId,
      courseId: studentCourse[0]?.id ?? college1.insertId,
      courseType: "honors",
      name: "Student User",
      gender: "male",
      category: "regular",
    }
  ]);

  console.log("Database seeded successfully!");
  console.log("Admin Login: ADMIN001 / Rahul@8052");
  console.log("Student Login 1: STU0001 / Student@123");
  console.log("Student Login 2 (Your Student): STU123465 / Rahil@8052 (Roll: 123465, Enrollment: 2345678)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
