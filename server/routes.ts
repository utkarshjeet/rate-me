import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { extractStudentsFromExcel } from "./excelParser";
import multer from "multer";
import { z } from "zod";
import {
  insertStudentSchema,
  insertRoomSchema,
  insertRoomAssignmentSchema,
  insertQuestionSchema,
  insertRatingSchema,
} from "@shared/schema";

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Helper to validate ID params
const validateId = (id: string) => {
  const parsed = parseInt(id);
  if (isNaN(parsed)) {
    throw new Error("Invalid ID format");
  }
  return parsed;
};

// Helper to check if a request is authenticated
const isAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized: Please login first" });
};

// Helper to check if a request is from an admin
const isAdmin = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated() && req.user && (req.user as any).isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // STUDENT ROUTES
  
  // Get all students (admin only)
  app.get("/api/students", isAdmin, async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.status(200).json(students);
    } catch (error) {
      console.error("Error getting students:", error);
      res.status(500).json({ message: "Failed to get students" });
    }
  });

  // Create a new student (admin only)
  app.post("/api/students", isAdmin, async (req, res) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      
      // Check if student number or email already exists
      const existingByNumber = await storage.getStudentByNumber(validatedData.studentNumber);
      const existingByEmail = await storage.getStudentByEmail(validatedData.email);
      
      if (existingByNumber) {
        return res.status(400).json({ message: "Student number already exists" });
      }
      
      if (existingByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const newStudent = await storage.createStudent(validatedData);
      res.status(201).json(newStudent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating student:", error);
        res.status(500).json({ message: "Failed to create student" });
      }
    }
  });

  // Import students from Excel (admin only)
  app.post("/api/students/import", isAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileBuffer = req.file.buffer;
      const students = extractStudentsFromExcel(fileBuffer);
      
      if (students.length === 0) {
        return res.status(400).json({ message: "No valid student data found in file" });
      }
      
      const results = {
        total: students.length,
        imported: 0,
        skipped: 0,
      };
      
      for (const student of students) {
        try {
          // Check if student number or email already exists
          const existingByNumber = await storage.getStudentByNumber(student.studentNumber);
          const existingByEmail = await storage.getStudentByEmail(student.email);
          
          if (existingByNumber || existingByEmail) {
            results.skipped++;
            continue;
          }
          
          await storage.createStudent(student);
          results.imported++;
        } catch (err) {
          results.skipped++;
        }
      }
      
      res.status(200).json(results);
    } catch (error) {
      console.error("Error importing students:", error);
      res.status(500).json({ message: "Failed to import students" });
    }
  });

  // Reset student registration (admin only)
  app.post("/api/students/:id/reset", isAdmin, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const student = await storage.resetStudentRegistration(id);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.status(200).json(student);
    } catch (error) {
      console.error("Error resetting student:", error);
      res.status(500).json({ message: "Failed to reset student registration" });
    }
  });

  // Delete a student (admin only)
  app.delete("/api/students/:id", isAdmin, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const success = await storage.deleteStudent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // ROOM ROUTES
  
  // Get all rooms
  app.get("/api/rooms", isAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getRooms();
      
      // Enhance rooms with student count
      const roomsWithCounts = await Promise.all(
        rooms.map(async (room) => {
          const students = await storage.getStudentsInRoom(room.id);
          return {
            ...room,
            studentCount: students.length,
          };
        })
      );
      
      res.status(200).json(roomsWithCounts);
    } catch (error) {
      console.error("Error getting rooms:", error);
      res.status(500).json({ message: "Failed to get rooms" });
    }
  });

  // Create a new room (admin only)
  app.post("/api/rooms", isAdmin, async (req, res) => {
    try {
      const validatedData = insertRoomSchema.parse(req.body);
      const newRoom = await storage.createRoom(validatedData);
      res.status(201).json(newRoom);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating room:", error);
        res.status(500).json({ message: "Failed to create room" });
      }
    }
  });

  // Update a room (admin only)
  app.put("/api/rooms/:id", isAdmin, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const validatedData = insertRoomSchema.parse(req.body);
      
      const updatedRoom = await storage.updateRoom(id, validatedData);
      
      if (!updatedRoom) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.status(200).json(updatedRoom);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating room:", error);
        res.status(500).json({ message: "Failed to update room" });
      }
    }
  });

  // Delete a room (admin only)
  app.delete("/api/rooms/:id", isAdmin, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const success = await storage.deleteRoom(id);
      
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Get students in a room
  app.get("/api/rooms/:id/students", isAuthenticated, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const students = await storage.getStudentsInRoom(id);
      res.status(200).json(students);
    } catch (error) {
      console.error("Error getting room students:", error);
      res.status(500).json({ message: "Failed to get students in room" });
    }
  });

  // Add a student to a room (admin only)
  app.post("/api/rooms/:roomId/students/:studentId", isAdmin, async (req, res) => {
    try {
      const roomId = validateId(req.params.roomId);
      const studentId = validateId(req.params.studentId);
      
      // Verify both room and student exist
      const room = await storage.getRoom(roomId);
      const student = await storage.getStudent(studentId);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const assignment = await storage.assignStudentToRoom({
        roomId,
        studentId,
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning student to room:", error);
      res.status(500).json({ message: "Failed to assign student to room" });
    }
  });

  // Remove a student from a room (admin only)
  app.delete("/api/rooms/:roomId/students/:studentId", isAdmin, async (req, res) => {
    try {
      const roomId = validateId(req.params.roomId);
      const studentId = validateId(req.params.studentId);
      
      const success = await storage.removeStudentFromRoom(roomId, studentId);
      
      if (!success) {
        return res.status(404).json({ message: "Room assignment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing student from room:", error);
      res.status(500).json({ message: "Failed to remove student from room" });
    }
  });

  // QUESTION ROUTES
  
  // Get all questions
  app.get("/api/questions", isAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      
      // Enhance questions with room name
      const enhancedQuestions = await Promise.all(
        questions.map(async (question) => {
          const room = await storage.getRoom(question.roomId);
          return {
            ...question,
            roomName: room ? room.roomName : "Unknown Room",
          };
        })
      );
      
      res.status(200).json(enhancedQuestions);
    } catch (error) {
      console.error("Error getting questions:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  // Get questions for a room
  app.get("/api/rooms/:id/questions", isAuthenticated, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const questions = await storage.getRoomQuestions(id);
      res.status(200).json(questions);
    } catch (error) {
      console.error("Error getting room questions:", error);
      res.status(500).json({ message: "Failed to get questions for room" });
    }
  });

  // Create a new question (admin only)
  app.post("/api/questions", isAdmin, async (req, res) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      
      // Verify room exists
      const room = await storage.getRoom(validatedData.roomId);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const newQuestion = await storage.createQuestion(validatedData);
      res.status(201).json(newQuestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating question:", error);
        res.status(500).json({ message: "Failed to create question" });
      }
    }
  });

  // Update a question (admin only)
  app.put("/api/questions/:id", isAdmin, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const validatedData = insertQuestionSchema.parse(req.body);
      
      // Verify room exists
      const room = await storage.getRoom(validatedData.roomId);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const updatedQuestion = await storage.updateQuestion(id, validatedData);
      
      if (!updatedQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.status(200).json(updatedQuestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating question:", error);
        res.status(500).json({ message: "Failed to update question" });
      }
    }
  });

  // Delete a question (admin only)
  app.delete("/api/questions/:id", isAdmin, async (req, res) => {
    try {
      const id = validateId(req.params.id);
      const success = await storage.deleteQuestion(id);
      
      if (!success) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // RATING ROUTES
  
  // Submit a rating
  app.post("/api/ratings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.studentNumber) {
        return res.status(403).json({ message: "Only students can submit ratings" });
      }
      
      const validatedData = insertRatingSchema.parse(req.body);
      validatedData.raterId = user.id; // Set raterId to the current user's ID
      
      // Check if user has already rated this student for this question
      const existingRating = await storage.getRatingByStudentAndQuestion(
        validatedData.studentId,
        validatedData.questionId,
        user.id
      );
      
      if (existingRating) {
        // Update existing rating instead of creating a new one
        const updatedRating = await storage.updateRating(existingRating.id, {
          rank: validatedData.rank,
        });
        return res.status(200).json(updatedRating);
      }
      
      const newRating = await storage.createRating(validatedData);
      res.status(201).json(newRating);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error submitting rating:", error);
        res.status(500).json({ message: "Failed to submit rating" });
      }
    }
  });

  // LEADERBOARD ROUTES
  
  // Get leaderboard for a room
  app.get("/api/rooms/:id/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const roomId = validateId(req.params.id);
      const questionId = req.query.questionId ? validateId(req.query.questionId as string) : undefined;
      
      const leaderboard = await storage.getLeaderboard(roomId, questionId);
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
