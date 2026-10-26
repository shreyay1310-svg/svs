import { relations } from "drizzle-orm";
import {
  users,
  colleges,
  courses,
  subjects,
  students,
} from "./schema";

export const usersRelations = relations(users, ({ one }) => ({
  college: one(colleges, {
    fields: [users.collegeId],
    references: [colleges.id],
  }),
  student: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
}));

export const collegesRelations = relations(colleges, ({ many }) => ({
  courses: many(courses),
  subjects: many(subjects),
  students: many(students),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  college: one(colleges, {
    fields: [courses.collegeId],
    references: [colleges.id],
  }),
  subjects: many(subjects),
  students: many(students),
}));

export const subjectsRelations = relations(subjects, ({ one }) => ({
  course: one(courses, {
    fields: [subjects.courseId],
    references: [courses.id],
  }),
  college: one(colleges, {
    fields: [subjects.collegeId],
    references: [colleges.id],
  }),
}));

export const studentsRelations = relations(students, ({ one }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  college: one(colleges, {
    fields: [students.collegeId],
    references: [colleges.id],
  }),
  course: one(courses, {
    fields: [students.courseId],
    references: [courses.id],
  }),
  subject: one(subjects, {
    fields: [students.subjectId],
    references: [subjects.id],
  }),
}));
