import { 
  Student, InsertStudent, 
  Room, InsertRoom, 
  RoomAssignment, InsertRoomAssignment,
  Question, InsertQuestion,
  Rating, InsertRating,
  User, InsertUser,
  LeaderboardEntry
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // Session store for authentication
  sessionStore: session.SessionStore;

  // Student operations
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByNumber(studentNumber: string): Promise<Student | undefined>;
  getStudentByEmail(email: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  resetStudentRegistration(id: number): Promise<Student | undefined>;
  
  // Admin/User operations
  getUserByUsername(username: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Room operations
  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, data: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;
  
  // Room assignment operations
  getRoomAssignments(): Promise<RoomAssignment[]>;
  getStudentsInRoom(roomId: number): Promise<Student[]>;
  assignStudentToRoom(roomAssignment: InsertRoomAssignment): Promise<RoomAssignment>;
  removeStudentFromRoom(roomId: number, studentId: number): Promise<boolean>;
  getStudentRoom(studentId: number): Promise<Room | undefined>;
  
  // Question operations
  getQuestions(): Promise<Question[]>;
  getRoomQuestions(roomId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, data: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<boolean>;
  
  // Rating operations
  getRatings(): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
  getRatingByStudentAndQuestion(studentId: number, questionId: number, raterId: number): Promise<Rating | undefined>;
  updateRating(id: number, data: Partial<Rating>): Promise<Rating | undefined>;
  getQuestionRatings(questionId: number): Promise<Rating[]>;
  getRoomRatings(roomId: number): Promise<Rating[]>;
  
  // Leaderboard operations
  getLeaderboard(roomId: number, questionId?: number): Promise<LeaderboardEntry[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private students: Map<number, Student>;
  private users: Map<number, User>;
  private rooms: Map<number, Room>;
  private roomAssignments: Map<number, RoomAssignment>;
  private questions: Map<number, Question>;
  private ratings: Map<number, Rating>;
  sessionStore: session.SessionStore;
  
  private studentCounter: number;
  private userCounter: number;
  private roomCounter: number;
  private roomAssignmentCounter: number;
  private questionCounter: number;
  private ratingCounter: number;

  constructor() {
    this.students = new Map();
    this.users = new Map();
    this.rooms = new Map();
    this.roomAssignments = new Map();
    this.questions = new Map();
    this.ratings = new Map();
    
    this.studentCounter = 1;
    this.userCounter = 1;
    this.roomCounter = 1;
    this.roomAssignmentCounter = 1;
    this.questionCounter = 1;
    this.ratingCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create a default admin user with unhashed password
    // The password will be hashed when the user logs in via comparePasswords
    const adminUser: User = {
      id: 1,
      username: "admin",
      password: "adminpassword",
      isAdmin: true
    };
    
    this.users.set(adminUser.id, adminUser);
    console.log("Default admin user created successfully");
  }

  // Student operations
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByNumber(studentNumber: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.studentNumber === studentNumber
    );
  }

  async getStudentByEmail(email: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.email === email
    );
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.studentCounter++;
    const now = new Date();
    const newStudent: Student = { 
      ...student, 
      id, 
      isRegistered: false,
      createdAt: now 
    };
    
    this.students.set(id, newStudent);
    return newStudent;
  }

  async updateStudent(id: number, data: Partial<Student>): Promise<Student | undefined> {
    const student = this.students.get(id);
    
    if (!student) {
      return undefined;
    }
    
    const updatedStudent = { ...student, ...data };
    this.students.set(id, updatedStudent);
    
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    // Delete student from room assignments first
    const assignments = Array.from(this.roomAssignments.values())
      .filter(assignment => assignment.studentId === id);
      
    for (const assignment of assignments) {
      this.roomAssignments.delete(assignment.id);
    }
    
    return this.students.delete(id);
  }

  async resetStudentRegistration(id: number): Promise<Student | undefined> {
    const student = this.students.get(id);
    
    if (!student) {
      return undefined;
    }
    
    const updatedStudent = { ...student, isRegistered: false };
    this.students.set(id, updatedStudent);
    
    return updatedStudent;
  }

  // Admin/User operations
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userCounter++;
    const newUser: User = { ...user, id, isAdmin: user.isAdmin || false };
    
    this.users.set(id, newUser);
    return newUser;
  }

  // Room operations
  async getRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const id = this.roomCounter++;
    const now = new Date();
    const newRoom: Room = { ...room, id, createdAt: now };
    
    this.rooms.set(id, newRoom);
    return newRoom;
  }

  async updateRoom(id: number, data: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    
    if (!room) {
      return undefined;
    }
    
    const updatedRoom = { ...room, ...data };
    this.rooms.set(id, updatedRoom);
    
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<boolean> {
    // Delete associated assignments, questions, and ratings first
    const assignments = Array.from(this.roomAssignments.values())
      .filter(assignment => assignment.roomId === id);
      
    for (const assignment of assignments) {
      this.roomAssignments.delete(assignment.id);
    }
    
    const questions = Array.from(this.questions.values())
      .filter(question => question.roomId === id);
      
    for (const question of questions) {
      // Delete ratings for this question
      const questionRatings = Array.from(this.ratings.values())
        .filter(rating => rating.questionId === question.id);
        
      for (const rating of questionRatings) {
        this.ratings.delete(rating.id);
      }
      
      this.questions.delete(question.id);
    }
    
    return this.rooms.delete(id);
  }

  // Room assignment operations
  async getRoomAssignments(): Promise<RoomAssignment[]> {
    return Array.from(this.roomAssignments.values());
  }

  async getStudentsInRoom(roomId: number): Promise<Student[]> {
    const assignments = Array.from(this.roomAssignments.values())
      .filter(assignment => assignment.roomId === roomId);
      
    const studentIds = assignments.map(assignment => assignment.studentId);
    
    return Array.from(this.students.values())
      .filter(student => studentIds.includes(student.id));
  }

  async assignStudentToRoom(roomAssignment: InsertRoomAssignment): Promise<RoomAssignment> {
    // First remove student from other rooms if assigned
    const existingAssignments = Array.from(this.roomAssignments.values())
      .filter(assignment => assignment.studentId === roomAssignment.studentId);
      
    for (const assignment of existingAssignments) {
      this.roomAssignments.delete(assignment.id);
    }
    
    const id = this.roomAssignmentCounter++;
    const now = new Date();
    const newAssignment: RoomAssignment = { 
      ...roomAssignment, 
      id, 
      assignedAt: now 
    };
    
    this.roomAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async removeStudentFromRoom(roomId: number, studentId: number): Promise<boolean> {
    const assignment = Array.from(this.roomAssignments.values())
      .find(a => a.roomId === roomId && a.studentId === studentId);
      
    if (!assignment) {
      return false;
    }
    
    return this.roomAssignments.delete(assignment.id);
  }

  async getStudentRoom(studentId: number): Promise<Room | undefined> {
    const assignment = Array.from(this.roomAssignments.values())
      .find(a => a.studentId === studentId);
      
    if (!assignment) {
      return undefined;
    }
    
    return this.rooms.get(assignment.roomId);
  }

  // Question operations
  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }

  async getRoomQuestions(roomId: number): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter(question => question.roomId === roomId);
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.questionCounter++;
    const now = new Date();
    const newQuestion: Question = { ...question, id, createdAt: now };
    
    this.questions.set(id, newQuestion);
    return newQuestion;
  }

  async updateQuestion(id: number, data: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    
    if (!question) {
      return undefined;
    }
    
    const updatedQuestion = { ...question, ...data };
    this.questions.set(id, updatedQuestion);
    
    return updatedQuestion;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    // Delete associated ratings first
    const ratings = Array.from(this.ratings.values())
      .filter(rating => rating.questionId === id);
      
    for (const rating of ratings) {
      this.ratings.delete(rating.id);
    }
    
    return this.questions.delete(id);
  }

  // Rating operations
  async getRatings(): Promise<Rating[]> {
    return Array.from(this.ratings.values());
  }

  async createRating(rating: InsertRating): Promise<Rating> {
    const id = this.ratingCounter++;
    const now = new Date();
    const newRating: Rating = { ...rating, id, createdAt: now };
    
    this.ratings.set(id, newRating);
    return newRating;
  }

  async getRatingByStudentAndQuestion(studentId: number, questionId: number, raterId: number): Promise<Rating | undefined> {
    return Array.from(this.ratings.values())
      .find(rating => 
        rating.studentId === studentId && 
        rating.questionId === questionId &&
        rating.raterId === raterId
      );
  }

  async updateRating(id: number, data: Partial<Rating>): Promise<Rating | undefined> {
    const rating = this.ratings.get(id);
    
    if (!rating) {
      return undefined;
    }
    
    const updatedRating = { ...rating, ...data };
    this.ratings.set(id, updatedRating);
    
    return updatedRating;
  }

  async getQuestionRatings(questionId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values())
      .filter(rating => rating.questionId === questionId);
  }

  async getRoomRatings(roomId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values())
      .filter(rating => rating.roomId === roomId);
  }

  // Leaderboard operations
  async getLeaderboard(roomId: number, questionId?: number): Promise<LeaderboardEntry[]> {
    let filteredRatings: Rating[];
    
    if (questionId) {
      // Get ratings for specific room and question
      filteredRatings = Array.from(this.ratings.values())
        .filter(rating => rating.roomId === roomId && rating.questionId === questionId);
    } else {
      // Get all ratings for this room
      filteredRatings = Array.from(this.ratings.values())
        .filter(rating => rating.roomId === roomId);
    }
    
    // Group ratings by student
    const studentRatings = new Map<number, number[]>();
    
    for (const rating of filteredRatings) {
      const ratings = studentRatings.get(rating.studentId) || [];
      ratings.push(rating.rank);
      studentRatings.set(rating.studentId, ratings);
    }
    
    // Calculate scores for each student
    const studentScores: Array<{
      studentId: number;
      totalRating: number;
      averageRating: number;
    }> = [];
    
    for (const [studentId, ratings] of studentRatings.entries()) {
      const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
      const averageRating = totalRating / ratings.length;
      
      studentScores.push({
        studentId,
        totalRating,
        averageRating,
      });
    }
    
    // Sort by average rating (descending)
    studentScores.sort((a, b) => b.averageRating - a.averageRating);
    
    // Create leaderboard entries
    const leaderboard: LeaderboardEntry[] = [];
    
    for (let i = 0; i < studentScores.length; i++) {
      const score = studentScores[i];
      const student = this.students.get(score.studentId);
      
      if (student) {
        leaderboard.push({
          rank: i + 1,
          student,
          totalRating: score.totalRating,
          averageRating: score.averageRating,
        });
      }
    }
    
    return leaderboard;
  }
}

// Export a single instance for the application
export const storage = new MemStorage();
