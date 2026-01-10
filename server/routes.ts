
import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";

let paypalModule: any = null;
async function loadPayPal() {
  if (!paypalModule && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    paypalModule = await import("./paypal");
  }
  return paypalModule;
}

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerObjectStorageRoutes(app);

  app.use("/uploads", express.static("uploads"));

  // Users
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getPotentialMatches(req.user!.id);
    const enriched = await Promise.all(users.map(async u => {
      const profile = await storage.getProfile(u.id);
      const photos = await storage.getPhotos(u.id);
      return { ...u, profile: profile || null, photos };
    }));
    res.json(enriched);
  });

  app.patch(api.users.updateProfile.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.users.updateProfile.input.parse(req.body);
    const updated = await storage.upsertProfile(req.user!.id, input);
    res.json(updated);
  });

  // Photos
  app.post(api.photos.upload.path, upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).send("No file uploaded");
    
    const url = `/uploads/${req.file.filename}`;
    const photo = await storage.createPhoto({
      userId: req.user!.id,
      url: url,
      type: 'image'
    });
    res.status(201).json(photo);
  });

  app.delete(api.photos.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deletePhoto(Number(req.params.id));
    res.sendStatus(204);
  });

  // Matches
  app.post(api.matches.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { targetUserId } = api.matches.create.input.parse(req.body);
    
    const likeStatus = await storage.canUserLike(req.user!.id);
    if (!likeStatus.canLike) {
      return res.status(429).json({ 
        error: 'Daily like limit reached',
        remainingLikes: 0,
        isPremium: false 
      });
    }
    
    if (!likeStatus.isPremium) {
      await storage.incrementDailyLikes(req.user!.id);
    }
    
    const match = await storage.createMatch(req.user!.id, targetUserId);
    
    if (match && match.status === 'matched') {
       res.json({ match, isMatch: true });
    } else {
       res.json({ match, isMatch: false, remainingLikes: likeStatus.remainingLikes - 1 });
    }
  });

  app.get(api.matches.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matches = await storage.getMatches(req.user!.id);
    
    const enriched = await Promise.all(matches.map(async m => {
      const otherId = m.user1Id === req.user!.id ? m.user2Id : m.user1Id;
      const otherUser = await storage.getUser(otherId);
      const profile = await storage.getProfile(otherId);
      const photos = await storage.getPhotos(otherId);
      return { 
        ...m, 
        otherUser: { ...otherUser!, profile: profile || null, photos } 
      };
    }));
    
    res.json(enriched);
  });

  // Ratings
  app.post(api.ratings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.ratings.create.input.parse(req.body);
    const rating = await storage.createRating({
      ...input,
      raterId: req.user!.id
    });
    res.status(201).json(rating);
  });

  // Premium Status
  app.get('/api/premium/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.sendStatus(404);
    
    const isPremium = user.isPremium === 'true' || 
      (user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
    
    const likeStatus = await storage.canUserLike(req.user!.id);
    
    res.json({
      isPremium,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      premiumExpiresAt: user.premiumExpiresAt,
      trialEndsAt: user.trialEndsAt,
      ...likeStatus
    });
  });

  // Get Stripe publishable key
  app.get('/api/stripe/config', async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Stripe config' });
    }
  });

  // Get subscription products
  app.get('/api/premium/products', async (req, res) => {
    try {
      const products = await storage.getProductsWithPrices();
      res.json({ products });
    } catch (error) {
      res.json({ products: [] });
    }
  });

  // Create checkout session
  app.post('/api/premium/checkout', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { priceId, includeTrial } = req.body;
    if (!priceId) return res.status(400).json({ error: 'Price ID required' });
    
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.sendStatus(404);
    
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(
        user.email || `${user.id}@fallonyou.app`,
        user.id
      );
      await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/premium?success=true&session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/premium?canceled=true`,
      includeTrial ? 7 : undefined
    );
    
    res.json({ url: session.url });
  });

  // Verify checkout session and activate premium
  app.post('/api/premium/verify-session', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
    
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        await storage.updateUserStripeInfo(req.user!.id, {
          isPremium: 'true',
          stripeSubscriptionId: session.subscription as string,
          premiumExpiresAt: new Date(subscription.current_period_end * 1000),
        });
        
        res.json({ success: true, isPremium: true });
      } else {
        res.json({ success: false, isPremium: false });
      }
    } catch (error) {
      console.error('Session verification error:', error);
      res.status(500).json({ error: 'Failed to verify session' });
    }
  });

  // Customer portal for managing subscription
  app.post('/api/premium/portal', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = await storage.getUser(req.user!.id);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const session = await stripeService.createCustomerPortalSession(
      user.stripeCustomerId,
      `${baseUrl}/premium`
    );
    
    res.json({ url: session.url });
  });

  // Start free trial
  app.post('/api/premium/trial', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.sendStatus(404);
    
    if (user.trialEndsAt || user.isPremium === 'true') {
      return res.status(400).json({ error: 'Trial already used or already premium' });
    }
    
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    
    await storage.updateUserStripeInfo(user.id, { trialEndsAt: trialEnd });
    
    res.json({ success: true, trialEndsAt: trialEnd });
  });

  // Who liked me (premium feature)
  app.get('/api/premium/liked-by', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.sendStatus(404);
    
    const isPremium = user.isPremium === 'true' || 
      (user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
    
    if (!isPremium) {
      const likers = await storage.getUsersWhoLikedMe(req.user!.id);
      return res.json({ 
        count: likers.length, 
        users: [],
        isPremium: false 
      });
    }
    
    const likers = await storage.getUsersWhoLikedMe(req.user!.id);
    const enriched = await Promise.all(likers.map(async u => {
      const profile = await storage.getProfile(u.id);
      const photos = await storage.getPhotos(u.id);
      return { ...u, profile, photos };
    }));
    
    res.json({ 
      count: likers.length, 
      users: enriched,
      isPremium: true 
    });
  });

  // Check like limit
  app.get('/api/likes/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const status = await storage.canUserLike(req.user!.id);
    res.json(status);
  });

  // PayPal routes (conditional - only if credentials are configured)
  app.get("/paypal/setup", async (req, res) => {
    const paypal = await loadPayPal();
    if (!paypal) {
      return res.status(503).json({ error: "PayPal not configured" });
    }
    await paypal.loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    const paypal = await loadPayPal();
    if (!paypal) {
      return res.status(503).json({ error: "PayPal not configured" });
    }
    await paypal.createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    const paypal = await loadPayPal();
    if (!paypal) {
      return res.status(503).json({ error: "PayPal not configured" });
    }
    await paypal.capturePaypalOrder(req, res);
  });

  // Check available payment methods
  app.get("/api/payment-methods", async (req, res) => {
    const paypal = await loadPayPal();
    res.json({
      stripe: true,
      paypal: !!paypal
    });
  });

  return httpServer;
}
