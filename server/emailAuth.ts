import { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { apiLimiter } from "./requestLimits";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendAdminAlert, sendVerificationEmail, sendPasswordResetEmail, isConfigured } from "./emailService";
import { createPasswordRecoveryHandlers, passwordRecoveryRepository, newRecoveryToken } from "./passwordRecovery";
import { communicationLocale, requestCommunicationLocale } from "@shared/communication-locale";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@shared/notification-preferences";
import { db } from "./db";
import { users, profiles, photos } from "@shared/schema";
import { eq } from "drizzle-orm";
import { CURRENT_TERMS_VERSION } from "@shared/terms";
import { currentProfileColumns, currentUserColumns, currentPhotoColumns, toCurrentUser } from "./publicUser";
import { isValidEmail, isValidName, isValidPassword } from "./security";
import { registrationErrors } from "@shared/registration-validation";

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

let sharedSessionMiddleware: ReturnType<typeof session> | undefined;
let sharedSessionStore: any;

export function getSession() {
  if (sharedSessionMiddleware) return sharedSessionMiddleware;
  const sessionTtlSeconds = 7 * 24 * 60 * 60; // 1 week in seconds
  const sessionTtlMs = sessionTtlSeconds * 1000; // 1 week in milliseconds
  const pgStore = connectPg(session);
  sharedSessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtlSeconds, // connect-pg-simple expects seconds
    tableName: "sessions",
  });
  sharedSessionMiddleware = session({
    secret: process.env.SESSION_SECRET!,
    store: sharedSessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtlMs, // cookie maxAge expects milliseconds
      sameSite: "lax",
    },
  });
  return sharedSessionMiddleware;
}

export function isStoredSessionValid(sessionId: string, userId: string): Promise<boolean> {
  if (!sharedSessionStore) return Promise.resolve(false);
  return new Promise((resolve) => {
    sharedSessionStore.get(sessionId, (err: Error | null, storedSession: any) => {
      resolve(!err && storedSession?.userId === userId);
    });
  });
}

function isRequestBody(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function logAuthFailure(event: string, error: unknown) {
  const err = error as { name?: unknown; code?: unknown } | null;
  const knownTypes = new Set(["Error", "TypeError", "RangeError", "DatabaseError", "PostgresError", "DrizzleError", "QueryError"]);
  const type = typeof err?.name === "string" && knownTypes.has(err.name) ? err.name : "Error";
  const code = typeof err?.code === "string" &&
    (/^[A-Z0-9]{5}$/.test(err.code) || ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE"].includes(err.code))
    ? ` code=${err.code}`
    : "";
  console.error(`[Auth] ${event} failed (type=${type}${code})`);
}

function regenerateSession(req: any, user: { id: string; email: string | null; firstName: string | null; lastName: string | null }): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError: Error) => {
      if (regenerateError) return reject(regenerateError);
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
      req.session.save((saveError: Error) => saveError ? reject(saveError) : resolve());
    });
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(apiLimiter);

  // Registration creates the account and authenticates it in a fresh session.
  app.post("/api/register", async (req, res) => {
    try {
      if (!isRequestBody(req.body)) return res.status(400).json({ error: "Invalid registration details" });
      const { email, password, firstName, lastName, ageConfirmed, termsVersion, contentLicenseAccepted } = req.body;

      const fieldErrors = registrationErrors({ email, password, firstName });
      if (Object.keys(fieldErrors).length) {
        return res.status(400).json({ error: "Invalid registration details", code: fieldErrors.password === "PASSWORD_TOO_LONG" ? "PASSWORD_TOO_LONG" : "VALIDATION_ERROR", fieldErrors });
      }
      if (!isValidName(lastName)) {
        return res.status(400).json({ error: "Invalid registration details", fieldErrors: { firstName: "NAME_INVALID" } });
      }
      if (ageConfirmed !== true || termsVersion !== CURRENT_TERMS_VERSION || contentLicenseAccepted !== true) {
        return res.status(400).json({ error: "Age confirmation and acceptance of the current terms are required", code: "CONSENT_REQUIRED" });
      }
      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already registered", fieldErrors: { email: "EMAIL_REGISTERED" } });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          ageConfirmed: "true",
          ageConfirmedAt: new Date(),
          termsAcceptedAt: new Date(),
          termsAcceptedVersion: CURRENT_TERMS_VERSION,
          emailVerified: 'true',
          notificationPrefs: JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFERENCES, interfaceLanguage: communicationLocale(req.body.language) }),
        })
        .returning();

      // Notify admin (fire-and-forget)
      sendAdminAlert({ type: 'new_user', data: { email: newUser.email || '', firstName: newUser.firstName || '', lastName: newUser.lastName || '' } }).catch(() => {});

      await regenerateSession(req, newUser);

      res.status(201).json({ success: true, user: { id: newUser.id, email: newUser.email } });
    } catch (error: unknown) {
      // Only translate the email unique constraint, including Drizzle's wrapped errors.
      const failure = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
      const conflict = failure?.cause ?? failure;
      if (conflict?.code === "23505" && conflict.constraint === "users_email_unique") {
        return res.status(409).json({ error: "Email already registered", fieldErrors: { email: "EMAIL_REGISTERED" } });
      }
      logAuthFailure("registration", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Verify email endpoint — called when user clicks the link in their email
  app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query as { token: string };
    const locale = communicationLocale(req.query.ui_lang);
    const resultUrl = (status: string) => `/?verified=${status}&ui_lang=${locale}`;
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    if (!token) return res.redirect(resultUrl("error"));

    try {
      const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
      if (!user || !user.emailVerificationTokenExpiry) return res.redirect(resultUrl("invalid"));
      if (new Date() > new Date(user.emailVerificationTokenExpiry)) return res.redirect(resultUrl("expired"));

      await db.update(users)
        .set({ emailVerified: 'true', emailVerificationToken: null, emailVerificationTokenExpiry: null })
        .where(eq(users.id, user.id));

      await regenerateSession(req, user);
      res.redirect(resultUrl("success"));
    } catch (error: unknown) {
      logAuthFailure("email verification", error);
      res.redirect(resultUrl("error"));
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    if (!isRequestBody(req.body) || !isValidEmail(req.body.email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    const { email } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user) return res.json({ success: true }); // Don't leak existence
    if (user.emailVerified === 'true') return res.json({ success: true });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(users)
      .set({ emailVerificationToken: token, emailVerificationTokenExpiry: expiry })
      .where(eq(users.id, user.id));

    const baseUrl = process.env.NODE_ENV === "production" || !process.env.REPLIT_DEV_DOMAIN ? "https://fallonyou.app" : `https://${process.env.REPLIT_DEV_DOMAIN}`;
    Promise.resolve().then(() => sendVerificationEmail(user.email!, user.firstName || "", `${baseUrl}/api/auth/verify-email?token=${token}`, requestCommunicationLocale(req.body.language, user.notificationPrefs))).catch(() => console.error("[Email] Verification dispatch failed"));
    res.json({ success: true });
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      if (!isRequestBody(req.body)) return res.status(400).json({ error: "Invalid login details" });
      const { email, password, ageConfirmed } = req.body;

      if (!isValidEmail(email) || !isValidPassword(password) ||
          (ageConfirmed !== undefined && typeof ageConfirmed !== "boolean")) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        return res.status(401).json({ error: "Invalid email or password" });
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

      await regenerateSession(req, user);
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        ageConfirmed: ageConfirmed || user.ageConfirmed === "true",
      });
    } catch (error: unknown) {
      logAuthFailure("login", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout is a state-changing operation and is available only through POST.
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

  // Get current user with profile and photos
  app.get("/api/user", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db.select(currentUserColumns).from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Fetch profile data
    const [profile] = await db.select(currentProfileColumns).from(profiles).where(eq(profiles.userId, userId));
    
    // Fetch photos
    const userPhotos = await db.select(currentPhotoColumns).from(photos).where(eq(photos.userId, userId));

    // Check if banned - return error for banned users
    if (user.isBanned === 'true') {
      return res.status(403).json({ 
        error: "Account suspended", 
        reason: user.banReason || "Your account has been suspended" 
      });
    }

    res.json(toCurrentUser(user, profile || null, userPhotos));
  });

  const recovery = createPasswordRecoveryHandlers({
    ...passwordRecoveryRepository(),
    deliveryReady: isConfigured,
    deliver: sendPasswordResetEmail,
    hashPassword: password => bcrypt.hash(password, 10),
    // Production domain verified against deployment metadata. Never trust Host
    // or forwarding headers when creating a password-reset link.
    baseUrl: () => process.env.NODE_ENV === "production" || !process.env.REPLIT_DEV_DOMAIN
      ? "https://fallonyou.app" : `https://${process.env.REPLIT_DEV_DOMAIN}`,
    now: () => new Date(),
    token: newRecoveryToken,
    report: event => console.error(`[Recovery] ${event}`),
  });
  app.post("/api/auth/forgot-password", recovery.request);
  app.post("/api/auth/reset-password", recovery.reset);

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
