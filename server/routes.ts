
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

  // Get single match with user details
  app.get('/api/matches/:matchId', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = parseInt(req.params.matchId);
    const match = await storage.getMatchById(matchId);
    
    if (!match) return res.sendStatus(404);
    if (match.user1Id !== req.user!.id && match.user2Id !== req.user!.id) {
      return res.sendStatus(403);
    }
    
    const otherId = match.user1Id === req.user!.id ? match.user2Id : match.user1Id;
    const otherUser = await storage.getUser(otherId);
    const profile = await storage.getProfile(otherId);
    const photos = await storage.getPhotos(otherId);
    
    res.json({ ...match, otherUser: { ...otherUser, profile, photos } });
  });

  // ============ MESSAGING ============
  app.get('/api/matches/:matchId/messages', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = parseInt(req.params.matchId);
    
    const match = await storage.getMatchById(matchId);
    if (!match) return res.sendStatus(404);
    if (match.user1Id !== req.user!.id && match.user2Id !== req.user!.id) {
      return res.sendStatus(403);
    }
    
    const messages = await storage.getMessages(matchId);
    await storage.markMessagesAsRead(matchId, req.user!.id);
    res.json(messages);
  });

  app.post('/api/matches/:matchId/messages', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = parseInt(req.params.matchId);
    
    const match = await storage.getMatchById(matchId);
    if (!match) return res.sendStatus(404);
    if (match.user1Id !== req.user!.id && match.user2Id !== req.user!.id) {
      return res.sendStatus(403);
    }
    
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });
    
    const message = await storage.createMessage({
      matchId,
      senderId: req.user!.id,
      content: content.trim()
    });
    res.status(201).json(message);
  });

  app.get('/api/messages/unread-count', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const count = await storage.getUnreadMessageCount(req.user!.id);
    res.json({ count });
  });

  // ============ PROMPTS ============
  app.get('/api/prompts', async (req, res) => {
    const allPrompts = await storage.getAllPrompts();
    res.json(allPrompts);
  });

  app.get('/api/prompts/responses', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const responses = await storage.getPromptResponses(req.user!.id);
    res.json(responses);
  });

  app.get('/api/users/:userId/prompts', async (req, res) => {
    const responses = await storage.getPromptResponses(req.params.userId);
    res.json(responses);
  });

  app.post('/api/prompts/respond', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { promptId, answer } = req.body;
    if (!promptId || !answer?.trim()) {
      return res.status(400).json({ error: 'Prompt ID and answer required' });
    }
    const response = await storage.upsertPromptResponse(req.user!.id, promptId, answer.trim());
    res.json(response);
  });

  // ============ SUPER LIKES ============
  app.get('/api/super-likes/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const status = await storage.canUserSuperLike(req.user!.id);
    res.json(status);
  });

  app.post('/api/super-likes', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ error: 'Target user ID required' });
    
    const superLike = await storage.createSuperLike(req.user!.id, toUserId);
    if (!superLike) {
      return res.status(429).json({ error: 'No super likes remaining today' });
    }
    
    const match = await storage.createMatch(req.user!.id, toUserId);
    res.json({ superLike, match, isMatch: match?.status === 'matched' });
  });

  app.get('/api/super-likes/received', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getUser(req.user!.id);
    const isPremium = user?.isPremium === 'true';
    
    if (!isPremium) {
      const superLikes = await storage.getSuperLikesReceived(req.user!.id);
      return res.json({ count: superLikes.length, users: [], isPremium: false });
    }
    
    const superLikes = await storage.getSuperLikesReceived(req.user!.id);
    const enriched = await Promise.all(superLikes.map(async sl => {
      const user = await storage.getUser(sl.fromUserId);
      const profile = await storage.getProfile(sl.fromUserId);
      const photos = await storage.getPhotos(sl.fromUserId);
      return { ...sl, user: { ...user, profile, photos } };
    }));
    res.json({ count: superLikes.length, users: enriched, isPremium: true });
  });

  // ============ PREFERENCES ============
  app.get('/api/preferences', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prefs = await storage.getPreferences(req.user!.id);
    res.json(prefs || { minAge: 18, maxAge: 50, maxDistance: 50, showMe: 'everyone' });
  });

  app.patch('/api/preferences', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const existingPrefs = await storage.getPreferences(req.user!.id);
    const defaults = { minAge: 18, maxAge: 50, maxDistance: 50, showMe: 'everyone' };
    const current = { ...defaults, ...existingPrefs };
    
    const updates: any = {};
    if (req.body.minAge !== undefined) updates.minAge = req.body.minAge;
    if (req.body.maxAge !== undefined) updates.maxAge = req.body.maxAge;
    if (req.body.maxDistance !== undefined) updates.maxDistance = req.body.maxDistance;
    if (req.body.showMe !== undefined) updates.showMe = req.body.showMe;
    
    const merged = { ...current, ...updates };
    const prefs = await storage.upsertPreferences(req.user!.id, merged);
    res.json(prefs);
  });

  // ============ SAFETY ============
  app.post('/api/users/:userId/block', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.blockUser(req.user!.id, req.params.userId);
    res.json({ success: true });
  });

  app.delete('/api/users/:userId/block', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.unblockUser(req.user!.id, req.params.userId);
    res.json({ success: true });
  });

  app.get('/api/blocked-users', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const blocked = await storage.getBlockedUsers(req.user!.id);
    res.json(blocked);
  });

  app.post('/api/users/:userId/report', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { reason, details } = req.body;
    if (!reason) return res.status(400).json({ error: 'Report reason required' });
    
    const report = await storage.reportUser({
      reporterId: req.user!.id,
      reportedUserId: req.params.userId,
      reason,
      details
    });
    res.json({ success: true, reportId: report.id });
  });

  // ============ VERIFICATION ============
  app.get('/api/verification/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getUser(req.user!.id);
    res.json({
      isVerified: user?.isVerified === 'true',
      verifiedAt: user?.verifiedAt
    });
  });

  app.post('/api/verification/request', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.verifyUser(req.user!.id);
    res.json({
      success: true,
      isVerified: user?.isVerified === 'true',
      verifiedAt: user?.verifiedAt
    });
  });

  // ============ LOCATION ============
  app.patch('/api/user/location', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { location, latitude, longitude } = req.body;
    const user = await storage.updateUserLocation(req.user!.id, location, latitude, longitude);
    res.json({ success: true, location: user?.location });
  });

  // Activate premium after PayPal payment
  app.post('/api/premium/activate-paypal', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const durationMonths = plan === 'yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
    
    await storage.updateUserStripeInfo(req.user!.id, {
      isPremium: 'true',
      premiumExpiresAt: expiresAt,
    });
    
    res.json({ success: true, premiumExpiresAt: expiresAt });
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
