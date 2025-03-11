import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentNumber: text("student_number").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isRegistered: boolean("is_registered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// Users table for admin authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isAdmin: true,
});

export const loginSchema = z.object({
  studentNumber: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Rooms table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomName: text("room_name").notNull(),
  branch: text("branch").notNull(),
  section: text("section").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

// RoomAssignments table
export const roomAssignments = pgTable("room_assignments", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  studentId: integer("student_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const insertRoomAssignmentSchema = createInsertSchema(roomAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertRoomAssignment = z.infer<typeof insertRoomAssignmentSchema>;
export type RoomAssignment = typeof roomAssignments.$inferSelect;

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  questionText: text("question_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// Ratings table
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  questionId: integer("question_id").notNull(),
  studentId: integer("student_id").notNull(),
  raterId: integer("rater_id").notNull(), // ID of the student providing the rating
  rank: integer("rank").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

// Extended types for frontend use
export type StudentWithRoom = Student & { roomName?: string };
export type RoomWithDetails = Room & { 
  studentCount: number;
  questions?: Question[];
};
export type QuestionWithRoom = Question & { roomName: string };
export type LeaderboardEntry = {
  rank: number;
  student: Student;
  totalRating: number;
  averageRating: number;
};
