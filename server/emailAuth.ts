import { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, profiles, photos } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    }
  }
}

export function getSession() {
  const sessionTtlSeconds = 7 * 24 * 60 * 60; // 1 week in seconds
  const sessionTtlMs = sessionTtlSeconds * 1000; // 1 week in milliseconds
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtlSeconds, // connect-pg-simple expects seconds
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtlMs, // cookie maxAge expects milliseconds
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, ageConfirmed } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          ageConfirmed: ageConfirmed ? "true" : "false",
          ageConfirmedAt: ageConfirmed ? new Date() : null,
        })
        .returning();

      (req.session as any).userId = newUser.id;
      (req.session as any).user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Registration failed" });
        }
        res.status(201).json({
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password, ageConfirmed } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update age confirmation if provided and not already confirmed
      if (ageConfirmed && user.ageConfirmed !== "true") {
        await db.update(users)
          .set({ 
            ageConfirmed: "true", 
            ageConfirmedAt: new Date() 
          })
          .where(eq(users.id, user.id));
      }

      (req.session as any).userId = user.id;
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          ageConfirmed: ageConfirmed || user.ageConfirmed === "true",
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout endpoint - support both GET and POST for flexibility
  const handleLogout = (req: any, res: any) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  };
  
  app.post("/api/logout", handleLogout);
  app.get("/api/logout", handleLogout);

  // Get current user with profile and photos
  app.get("/api/user", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Fetch profile data
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    
    // Fetch photos
    const userPhotos = await db.select().from(photos).where(eq(photos.userId, userId));

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.firstName,
      profileImageUrl: user.profileImageUrl,
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      location: user.location,
      createdAt: user.createdAt,
      ageConfirmed: user.ageConfirmed === "true",
      ageConfirmedAt: user.ageConfirmedAt,
      profile: profile || null,
      photos: userPhotos,
      // Also expose profile fields at top level for convenience
      bio: profile?.bio,
      age: profile?.age,
      gender: profile?.gender,
      preference: profile?.preference,
    });
  });

  // Confirm age for existing users
  app.post("/api/confirm-age", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    await db.update(users)
      .set({ 
        ageConfirmed: "true", 
        ageConfirmedAt: new Date() 
      })
      .where(eq(users.id, userId));

    res.json({ success: true });
  });

  // Middleware to check authentication
  app.use((req: any, res, next) => {
    const userId = (req.session as any)?.userId;
    if (userId) {
      req.isAuthenticated = () => true;
      req.user = (req.session as any).user;
    } else {
      req.isAuthenticated = () => false;
      req.user = undefined;
    }
    next();
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
