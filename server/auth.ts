import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { Student, User } from "@shared/schema";

declare global {
  namespace Express {
    // Define the User interface for authentication
    interface User {
      id: number;
      username: string;
      password: string;
      isAdmin: boolean;
    }
    
    interface Request {
      student?: Student; // Students have a separate auth flow
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Check if the password is hashed (contains a salt part)
  if (stored.includes('.')) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // If password is not hashed yet (direct comparison for default admin)
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "session-secret-must-be-provided-in-prod",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Admin auth strategy (username/password)
  passport.use("local", new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    } catch (err) {
      return done(err);
    }
  }));

  // Student auth strategy (by student number + email)
  passport.use("student", new LocalStrategy({
    usernameField: 'studentNumber',
    passwordField: 'email', // We use email as the "password" field
    passReqToCallback: true
  }, async (req, studentNumber, email, done) => {
    try {
      const student = await storage.getStudentByNumber(studentNumber);
      
      if (!student) {
        return done(null, false, { message: "Student not found" });
      }
      
      if (student.email !== email) {
        return done(null, false, { message: "Invalid email address" });
      }
      
      if (student.isRegistered) {
        return done(null, false, { message: "Student already registered" });
      }
      
      // Check if name matches (case insensitive)
      const providedName = req.body.name;
      if (!providedName || providedName.toLowerCase() !== student.name.toLowerCase()) {
        return done(null, false, { message: "Invalid name" });
      }
      
      // Mark student as registered
      await storage.updateStudent(student.id, { isRegistered: true });
      
      req.student = student;
      return done(null, student);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    if (user.studentNumber) {
      // For student login
      done(null, { type: 'student', id: user.id });
    } else {
      // For admin login
      done(null, { type: 'admin', id: user.id });
    }
  });
  
  passport.deserializeUser(async (data: { type: string, id: number }, done) => {
    try {
      if (data.type === 'student') {
        const student = await storage.getStudent(data.id);
        done(null, student);
      } else {
        const user = await storage.getUser(data.id);
        done(null, user);
      }
    } catch (err) {
      done(err);
    }
  });

  // Admin login route
  app.post("/api/admin/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as User;
    if (!user.isAdmin) {
      req.logout((err) => {
        if (err) return res.status(500).json({ message: "Error during logout" });
        res.status(403).json({ message: "Not authorized as admin" });
      });
      return;
    }
    res.status(200).json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
  });

  // Student login route
  app.post("/api/student/login", (req, res, next) => {
    passport.authenticate("student", (err, student, info) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!student) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(student, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        return res.status(200).json({ 
          id: student.id, 
          name: student.name, 
          studentNumber: student.studentNumber, 
          email: student.email 
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as any;
    if (user.studentNumber) {
      // Student is logged in
      return res.json({ 
        type: 'student',
        id: user.id, 
        name: user.name, 
        studentNumber: user.studentNumber, 
        email: user.email 
      });
    } else {
      // Admin is logged in
      return res.json({ 
        type: 'admin',
        id: user.id, 
        username: user.username, 
        isAdmin: user.isAdmin 
      });
    }
  });
}
