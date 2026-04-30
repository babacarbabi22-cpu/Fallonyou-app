import { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendAdminAlert, sendVerificationEmail, sendPasswordResetEmail } from "./emailService";
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

  // Register endpoint — creates account and sends verification email (no session until verified)
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
        // If account exists but not verified, resend the email
        const existing = existingUser[0];
        if (existing.emailVerified !== 'true') {
          const token = crypto.randomBytes(32).toString("hex");
          const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await db.update(users)
            .set({ emailVerificationToken: token, emailVerificationTokenExpiry: expiry })
            .where(eq(users.id, existing.id));
          const baseUrl = process.env.NODE_ENV === "production" ? "https://fallonyou.app" : `${req.protocol}://${req.get("host")}`;
          sendVerificationEmail(existing.email!, existing.firstName || "", `${baseUrl}/verify-email?token=${token}`).catch(() => {});
          return res.status(201).json({ requiresVerification: true, email: existing.email });
        }
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          ageConfirmed: ageConfirmed ? "true" : "false",
          ageConfirmedAt: ageConfirmed ? new Date() : null,
          emailVerified: 'false',
          emailVerificationToken: verificationToken,
          emailVerificationTokenExpiry: verificationExpiry,
        })
        .returning();

      // Send verification email (fire-and-forget)
      const baseUrl = process.env.NODE_ENV === "production" ? "https://fallonyou.app" : `${req.protocol}://${req.get("host")}`;
      sendVerificationEmail(newUser.email!, newUser.firstName || "", `${baseUrl}/verify-email?token=${verificationToken}`).catch(() => {});
      sendAdminAlert({ type: 'new_user', data: { email: newUser.email || '', firstName: newUser.firstName || '', lastName: newUser.lastName || '' } }).catch(() => {});

      // Do NOT create a session — user must verify email first
      res.status(201).json({ requiresVerification: true, email: newUser.email });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Verify email endpoint — called when user clicks the link in their email
  app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query as { token: string };
    if (!token) return res.redirect("/?verified=error");

    try {
      const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
      if (!user || !user.emailVerificationTokenExpiry) return res.redirect("/?verified=invalid");
      if (new Date() > new Date(user.emailVerificationTokenExpiry)) return res.redirect("/?verified=expired");

      await db.update(users)
        .set({ emailVerified: 'true', emailVerificationToken: null, emailVerificationTokenExpiry: null })
        .where(eq(users.id, user.id));

      // Log user in immediately after verification
      (req.session as any).userId = user.id;
      (req.session as any).user = { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };

      req.session.save(() => res.redirect("/?verified=success"));
    } catch (e) {
      console.error("Email verification error:", e);
      res.redirect("/?verified=error");
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user) return res.json({ success: true }); // Don't leak existence
    if (user.emailVerified === 'true') return res.json({ success: true });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(users)
      .set({ emailVerificationToken: token, emailVerificationTokenExpiry: expiry })
      .where(eq(users.id, user.id));

    const baseUrl = process.env.NODE_ENV === "production" ? "https://fallonyou.app" : `${req.protocol}://${req.get("host")}`;
    sendVerificationEmail(user.email!, user.firstName || "", `${baseUrl}/verify-email?token=${token}`).catch(() => {});
    res.json({ success: true });
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

      // Block login only for new accounts explicitly created with emailVerified='false'
      // Existing users (emailVerified=null) are grandfathered in
      if (user.emailVerified === 'false') {
        return res.status(403).json({ error: "EMAIL_NOT_VERIFIED", email: user.email });
      }

      // Check if user is banned
      if (user.isBanned === 'true') {
        return res.status(403).json({ 
          error: "Account suspended", 
          reason: user.banReason || "Your account has been suspended" 
        });
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

    // Check if banned - return error for banned users
    if (user.isBanned === 'true') {
      return res.status(403).json({ 
        error: "Account suspended", 
        reason: user.banReason || "Your account has been suspended" 
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.firstName,
      profileImageUrl: user.profileImageUrl,
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
      location: user.location,
      createdAt: user.createdAt,
      ageConfirmed: user.ageConfirmed === "true",
      ageConfirmedAt: user.ageConfirmedAt,
      termsAcceptedAt: user.termsAcceptedAt,
      profile: profile || null,
      photos: userPhotos,
      // Also expose profile fields at top level for convenience
      bio: profile?.bio,
      age: profile?.age,
      gender: profile?.gender,
      preference: profile?.preference,
    });
  });

  // Forgot password — generate token and send reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

      // Always respond with success to prevent email enumeration
      if (!user || !user.password) {
        return res.json({ success: true });
      }

      // Generate secure token (expires in 1 hour)
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await db.update(users)
        .set({ passwordResetToken: token, passwordResetTokenExpiry: expiry })
        .where(eq(users.id, user.id));

      const baseUrl = process.env.NODE_ENV === "production"
        ? "https://fallonyou.app"
        : `${req.protocol}://${req.get("host")}`;
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(user.email!, user.firstName || "", resetLink);

      res.json({ success: true });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password — validate token and set new password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));

      if (!user || !user.passwordResetTokenExpiry) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }

      if (new Date() > new Date(user.passwordResetTokenExpiry)) {
        return res.status(400).json({ error: "Reset link has expired. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      res.json({ success: true });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Failed to reset password" });
    }
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

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const userId = (req.session as any)?.userId;
    if (userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user?.isBanned === 'true') {
        req.session.destroy(() => {});
        return res.status(403).json({ 
          message: "Account suspended", 
          reason: user.banReason || "Your account has been suspended" 
        });
      }
    }
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
