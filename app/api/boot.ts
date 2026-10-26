import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import bcrypt from "bcryptjs";
import { signToken } from "./lib/jwt";
import { users, colleges, courses, students } from "../db/schema";

import { eq, and } from "drizzle-orm";
import { serve } from "@hono/node-server";
import { serveStaticFiles } from "./lib/vite";
import { createServer as createHttpServer } from "node:http";

const app = new Hono<{ Bindings: HttpBindings }>();

app.onError((err, c) => {
  console.error("Unhandled server error:", err);
  return c.json({
    error: {
      message: err.message || "Internal Server Error",
    }
  }, 500);
});

app.get("/api/view-file", async (c) => {
  const type = c.req.query("type");
  const studentId = parseInt(c.req.query("studentId") || "0");
  
  if (!studentId || !type) {
    return c.text("Missing parameters", 400);
  }

  const db = getDb();
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows.at(0);
  if (!student) {
    return c.text("Student not found", 404);
  }

  let dataUrl: string | null = null;
  if (type === "photo") dataUrl = student.photoUrl;
  else if (type === "marksheet") dataUrl = student.marksheetUrl;
  else if (type === "application") dataUrl = student.applicationLetterUrl;
  else if (type === "signature") dataUrl = student.signatureData;

  if (!dataUrl) {
    return c.text("File not uploaded", 404);
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return c.text("Invalid file format stored", 400);
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");

  c.header("Content-Type", mimeType);
  c.header("Content-Disposition", `inline; filename="${type}_student_${studentId}"`);
  return c.body(buffer);
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
const trpcHandler = async (c: any) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
};
app.all("/api/trpc", trpcHandler);
app.all("/api/trpc/*", trpcHandler);

// Seed endpoint - temporary for setup
app.get("/api/seed", async (c) => {
  try {
    const db = getDb();

    // Insert college
    const collegeInsert = await db.insert(colleges).values({
      collegeName: "Rajasthan University",
      collegeNameHi: "राजस्थान विश्वविद्यालय",
      collegeCode: "RU001",
      address: "Jaipur, Rajasthan",
      description: "Premier university in Rajasthan",
      isActive: true,
    });

    const collegeId = collegeInsert[0]?.insertId || 1;

    // Insert admin
    const hashedAdminPassword = await bcrypt.hash("Rahul@8052", 10);
    await db.insert(users).values({
      userId: "ADMIN001",
      name: "System Admin",
      nameHi: "सिस्टम एडमिन",
      email: "admin@example.com",
      mobile: "8052797334",
      password: hashedAdminPassword,
      role: "admin",
      isActive: true,
      collegeId: collegeId,
    });

    // Insert course
    const courseInsert = await db.insert(courses).values({
      courseName: "Bachelor of Arts",
      courseNameHi: "बैचलर ऑफ आर्ट्स",
      courseCode: "BA",
      collegeId: collegeId,
      isActive: true,
    });

    const courseId = courseInsert[0]?.insertId || 1;

    // Insert student user
    const hashedStudentPassword = await bcrypt.hash("Rahil@8052", 10);
    const studentUserInsert = await db.insert(users).values({
      userId: "STU123465",
      name: "Student User",
      nameHi: "छात्र उपयोगकर्ता",
      email: "student@example.com",
      mobile: "9876543210",
      password: hashedStudentPassword,
      role: "student",
      isActive: true,
      collegeId: collegeId,
    });

    const studentUserId = studentUserInsert[0]?.insertId || 2;

    // Insert student record
    await db.insert(students).values({
      userId: studentUserId,
      rollNumber: "123465",
      enrollmentNumber: "2345678",
      collegeId: collegeId,
      courseId: courseId,
      courseType: "honors",
      name: "Student User",
      nameHi: "छात्र उपयोगकर्ता",
      gender: "male",
      category: "regular",
    });

    return c.json({ success: true, message: "Database seeded successfully!", credentials: { admin: { userId: "ADMIN001", password: "Rahul@8052", role: "admin" }, student: { userId: "STU123465", rollNumber: "123465", enrollmentNumber: "2345678", password: "Rahil@8052", role: "student" } } });
  } catch (error) {
    console.error("Seed error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get("/api/db-check", async (c) => {
  try {
    const db = getDb();
    const allUsers = await db.select().from(users).limit(50);
    const allStudents = await db.select().from(students).limit(50);
    
    // Simulate query for user ID 3
    const simulatedUser = allUsers.find(u => u.id === 3);
    let simulatedQueryResults: any[] = [];
    let queryError = null;
    
    if (simulatedUser) {
      try {
        const conditions = [];
        conditions.push(eq(students.userId, simulatedUser.id));
        if (simulatedUser.universityId !== null && simulatedUser.universityId !== undefined) {
          conditions.push(eq(colleges.universityId, simulatedUser.universityId));
        }
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        
        simulatedQueryResults = await db
          .select({
            id: students.id,
            rollNumber: students.rollNumber,
            name: students.name,
            collegeName: colleges.collegeName,
          })
          .from(students)
          .leftJoin(colleges, eq(students.collegeId, colleges.id))
          .where(where);
      } catch (err: any) {
        queryError = err.message;
      }
    }
    
    return c.json({
      success: true,
      usersCount: allUsers.length,
      studentsCount: allStudents.length,
      simulatedUser,
      simulatedQueryResults,
      queryError,
      users: allUsers.map(u => ({ id: u.id, userId: u.userId, name: u.name, role: u.role, mobile: u.mobile, email: u.email, universityId: u.universityId })),
      students: allStudents.map(s => ({ id: s.id, userId: s.userId, rollNumber: s.rollNumber, name: s.name, collegeId: s.collegeId, courseId: s.courseId, universityId: s.universityId })),
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Dev-only: quick login endpoint to bypass DB when it's unavailable
app.post("/api/dev-login", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, password, role } = body || {};
    // Known test credentials
    if (userId === "ADMIN001" && password === "Rahul@8052" && role === "admin") {
      const token = signToken({ userId: 1, role: "admin", email: "kumar712003@gmail.com" });
      return c.json({ token });
    }
    if (userId === "STU123465" || body?.rollNumber === "123465") {
      const token = signToken({ userId: 999, role: "student", email: "student123465@example.com" });
      return c.json({ token });
    }
    return c.json({ error: "Invalid dev credentials" }, 401);
  } catch (err) {
    console.error("/api/dev-login error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

const isDirectRun = typeof require !== "undefined" && typeof module !== "undefined" && require.main === module;

if (env.isProduction || isDirectRun) {
  serveStaticFiles(app);

  const portEnv = process.env.PORT || "3000";
  const port = /^\d+$/.test(portEnv) ? parseInt(portEnv) : portEnv;

  const createServerOption = (serverOptions: any, requestListener?: any) => {
    return createHttpServer(serverOptions || {}, (req: any, res: any) => {
      // Restore original URL for IIS/iisnode URL rewrite
      const originalUrl = req.headers["x-original-url"] || req.headers["x-rewrite-url"];
      if (originalUrl) {
        req.url = originalUrl;
      }
      requestListener?.(req, res);
    });
  };

  serve({ fetch: app.fetch, port: port as any, createServer: createServerOption as any }, () => {
    console.log(`Server running on ${typeof port === "number" ? `http://localhost:${port}/` : `pipe ${port}`}`);
  });
}
