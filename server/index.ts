import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { startWeeklyNotificationScheduler } from './weeklyNotifications';
import { isAllowedBrowserOrigin } from "./security";
import { startMediaDeletionWorker } from "./mediaDeletionWorker";

// Prevent the process from crashing on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message, err.stack);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[Unhandled Rejection]', reason?.message || reason);
});

const app = express();
const httpServer = createServer(app);

const isDev = process.env.NODE_ENV !== "production";
const premiumPurchasesEnabled = process.env.PREMIUM_PURCHASES_ENABLED === "true";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), "https://js.stripe.com", "https://www.paypal.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://www.paypal.com", "https://storage.googleapis.com", "https://*.googleapis.com", "wss:", "ws:", ...(isDev ? ["http://localhost:*"] : [])],
      frameSrc: ["'self'", "https://js.stripe.com", "https://www.paypal.com"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});
// Reset links carry a short-lived credential. Do not send it as a Referer or
// allow the recovery document to be reused from a browser/proxy cache.
app.use((req, res, next) => {
  if (req.path === "/reset-password") {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth/resend-verification", authLimiter);

// Health check endpoint - must respond immediately for deployment
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    // stripe-replit-sync hardcodes its schema to "stripe" (see package README);
    // its runMigrations config does not accept a schema option.
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (replitDomain) {
      const webhookBaseUrl = `https://${replitDomain}`;
      try {
        const { webhook } = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        console.log(`Webhook configured: ${webhook?.url || 'pending'}`);
      } catch (webhookError) {
        console.log('Webhook setup skipped (will be configured on deployment)');
      }
    } else {
      console.log('Webhook setup skipped (no domain configured yet)');
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

if (premiumPurchasesEnabled) {
  initStripe().catch(err => {
    console.error('Stripe initialization error (non-fatal):', err);
  });
} else {
  console.log('Stripe startup sync skipped while Premium purchases are disabled');
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('Webhook body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// The signed Stripe webhook is mounted above this middleware and is intentionally
// exempt. All other state-changing API requests must be same-origin in browsers.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !req.path.startsWith("/api")) {
    return next();
  }
  if (!isAllowedBrowserOrigin(req.headers)) {
    return res.status(403).json({ error: "Cross-origin request rejected" });
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("[Server Error]", status, message, err.stack || "");
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startWeeklyNotificationScheduler();
      startMediaDeletionWorker();
    },
  );
})();
