import { authRouter } from "./auth-router";
import { otpRouter } from "./otp-router";
import { collegeRouter } from "./college-router";
import { courseRouter } from "./course-router";
import { subjectRouter } from "./subject-router";
import { userRouter } from "./user-router";
import { roleRouter } from "./role-router";
import { studentRouter } from "./student-router";
import { reportRouter } from "./report-router";
import { activityRouter } from "./activity-router";
import { universityRouter } from "./university-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  otp: otpRouter,
  college: collegeRouter,
  course: courseRouter,
  subject: subjectRouter,
  user: userRouter,
  role: roleRouter,
  student: studentRouter,
  report: reportRouter,
  activity: activityRouter,
  university: universityRouter,
});

export type AppRouter = typeof appRouter;
