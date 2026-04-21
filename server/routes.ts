
import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { users, profiles, photos, events, eventParticipants, eventComments, eventRatings, matches, preferences, referrals } from "@shared/schema";
import { eq, and, desc, ilike, gte, inArray, or } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { saveSubscription, removeSubscription, sendPushNotification, sendPushToAllExcept, getVapidPublicKey } from "./pushService";
import { sendWeeklyNotifications, sendEventReminders, sendPhotoReminderEmails } from "./weeklyNotifications";
import { sendReferralEmail, sendAdminAlert } from "./emailService";

let paypalModule: any = null;
async function loadPayPal() {
  if (!paypalModule && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    paypalModule = await import("./paypal");
  }
  return paypalModule;
}

const upload = multer({ dest: "uploads/" });

// Strip sensitive fields before sending user data to frontend
function safeUser(user: Record<string, any>) {
  const { password, passwordResetToken, passwordResetTokenExpiry, verificationSelfieUrl, ...safe } = user;
  return safe;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerObjectStorageRoutes(app);

  app.use("/uploads", express.static("uploads"));

  // Accept terms & conditions
  app.post('/api/accept-terms', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await db.update(users)
      .set({ termsAcceptedAt: new Date() })
      .where(eq(users.id, req.user!.id));
    res.json({ success: true });
  });

  // Batch helper: enrich user list with profiles + photos (3 queries instead of 1+2N)
  async function enrichUsers(userList: { id: string; [key: string]: any }[]) {
    if (userList.length === 0) return [];
    const ids = userList.map(u => u.id);
    const [allProfiles, allPhotos] = await Promise.all([
      db.select().from(profiles).where(inArray(profiles.userId, ids)),
      db.select().from(photos).where(inArray(photos.userId, ids)),
    ]);
    const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
    const photosMap = new Map<string, typeof allPhotos>();
    for (const p of allPhotos) {
      if (!photosMap.has(p.userId)) photosMap.set(p.userId, []);
      photosMap.get(p.userId)!.push(p);
    }
    return userList.map(u => ({
      ...u,
      profile: profileMap.get(u.id) ?? null,
      photos: photosMap.get(u.id) ?? [],
    }));
  }

  // Users
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUserId = req.user!.id;

    // Fetch preferences + already swiped in parallel
    const [[userPrefs], alreadySwiped, allUsers] = await Promise.all([
      db.select().from(preferences).where(eq(preferences.userId, currentUserId)),
      db.select({ id: matches.user2Id }).from(matches).where(eq(matches.user1Id, currentUserId)),
      storage.getPotentialMatches(currentUserId),
    ]);

    const showMe = userPrefs?.showMe ?? 'everyone';
    const swipedSet = new Set(alreadySwiped.map(r => r.id));

    // Batch-enrich all users (3 queries instead of 1+2N)
    const enriched = await enrichUsers(allUsers);

    // Filter by swiped + gender preference
    const filtered = enriched.filter(u => {
      if (swipedSet.has(u.id)) return false;
      if (showMe === 'men') return u.profile?.gender === 'male';
      if (showMe === 'women') return u.profile?.gender === 'female';
      return true;
    });

    res.json(filtered);
  });

  app.patch(api.users.updateProfile.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { 
        displayName, bio, age, gender, preference,
        zodiacSign, smoking, drinking, children, education,
        occupation, birthplace, height, religion, politics, pets, exercise, incognito,
        interests, relationshipType,
        connectionTypes, travelInterests, travelerMode, currentCity, homeCity, latitude, longitude
      } = req.body;
      
      // Update user's display name if provided
      if (displayName) {
        await db.update(users)
          .set({ firstName: displayName })
          .where(eq(users.id, req.user!.id));
      }
      
      // Update profile data
      const profileData: any = {};
      if (bio !== undefined) profileData.bio = bio;
      if (age !== undefined) profileData.age = Number(age) || null;
      if (gender !== undefined) profileData.gender = gender;
      if (preference !== undefined) profileData.preference = preference;
      if (zodiacSign !== undefined) profileData.zodiacSign = zodiacSign;
      if (smoking !== undefined) profileData.smoking = smoking;
      if (drinking !== undefined) profileData.drinking = drinking;
      if (children !== undefined) profileData.children = children;
      if (education !== undefined) profileData.education = education;
      if (occupation !== undefined) profileData.occupation = occupation;
      if (birthplace !== undefined) profileData.birthplace = birthplace;
      if (height !== undefined) profileData.height = height;
      if (religion !== undefined) profileData.religion = religion;
      if (politics !== undefined) profileData.politics = politics;
      if (pets !== undefined) profileData.pets = pets;
      if (exercise !== undefined) profileData.exercise = exercise;
      if (incognito !== undefined) profileData.incognito = incognito;
      if (interests !== undefined) profileData.interests = Array.isArray(interests) ? interests : [];
      if (relationshipType !== undefined) profileData.relationshipType = relationshipType;
      if (connectionTypes !== undefined) profileData.connectionTypes = connectionTypes;
      if (travelInterests !== undefined) profileData.travelInterests = travelInterests;
      if (travelerMode !== undefined) profileData.travelerMode = travelerMode;
      if (currentCity !== undefined) profileData.currentCity = currentCity;
      if (homeCity !== undefined) profileData.homeCity = homeCity;
      if (latitude !== undefined) profileData.latitude = latitude;
      if (longitude !== undefined) profileData.longitude = longitude;
      if (latitude !== undefined || longitude !== undefined) profileData.lastLocationAt = new Date();
      
      const updated = await storage.upsertProfile(req.user!.id, profileData);
      res.json({ ...updated, displayName });
    } catch (err) {
      console.error("[updateProfile] Error saving profile:", err);
      res.status(500).json({ error: "No se pudo guardar el perfil. Por favor inténtalo de nuevo." });
    }
  });

  // Photos - supports both file upload and URL registration
  app.post(api.photos.upload.path, upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    let url: string;
    let type: string = 'image';
    
    // Check if this is a JSON request with a URL (from object storage)
    if (req.body && req.body.url && typeof req.body.url === 'string') {
      url = req.body.url;
      type = req.body.type || 'image';
    } else if (req.file) {
      // Traditional file upload
      url = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ error: "No file or URL provided" });
    }
    
    const photo = await storage.createPhoto({
      userId: req.user!.id,
      url: url,
      type: type
    });
    res.status(201).json(photo);
  });

  app.delete(api.photos.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deletePhoto(Number(req.params.id));
    res.sendStatus(204);
  });

  // Set profile image
  app.patch('/api/profile-image', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    await db.update(users)
      .set({ profileImageUrl: url })
      .where(eq(users.id, req.user!.id));
    res.json({ success: true, profileImageUrl: url });
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
    
    const senderProfile = await storage.getProfile(req.user!.id);
    const senderName = senderProfile?.displayName || 'Someone';

    if (match && match.status === 'matched') {
       sendPushNotification(targetUserId, {
         title: 'New Match! ✈️',
         body: `You and ${senderName} are a match! Start chatting now.`,
         url: '/matches',
       }).catch(() => {});
       sendPushNotification(req.user!.id, {
         title: 'New Match! ✈️',
         body: `You and someone special are a match!`,
         url: '/matches',
       }).catch(() => {});
       res.json({ match, isMatch: true });
    } else {
       sendPushNotification(targetUserId, {
         title: 'Someone likes you! 💛',
         body: `${senderName} is interested in connecting with you.`,
         url: '/discover',
       }).catch(() => {});
       res.json({ match, isMatch: false, remainingLikes: likeStatus.remainingLikes - 1 });
    }
  });

  app.get(api.matches.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUserId = req.user!.id;
    const matchList = await storage.getMatches(currentUserId);

    if (matchList.length === 0) return res.json([]);

    // Collect the other user IDs, then batch-fetch in 3 queries
    const otherIds = matchList.map(m => m.user1Id === currentUserId ? m.user2Id : m.user1Id);
    const uniqueOtherIds = [...new Set(otherIds)];

    const [otherUsers, otherProfiles, otherPhotos] = await Promise.all([
      db.select().from(users).where(inArray(users.id, uniqueOtherIds)),
      db.select().from(profiles).where(inArray(profiles.userId, uniqueOtherIds)),
      db.select().from(photos).where(inArray(photos.userId, uniqueOtherIds)),
    ]);

    const userMap = new Map(otherUsers.map(u => [u.id, u]));
    const profileMap = new Map(otherProfiles.map(p => [p.userId, p]));
    const photosMap = new Map<string, typeof otherPhotos>();
    for (const p of otherPhotos) {
      if (!photosMap.has(p.userId)) photosMap.set(p.userId, []);
      photosMap.get(p.userId)!.push(p);
    }

    const enriched = matchList.map(m => {
      const otherId = m.user1Id === currentUserId ? m.user2Id : m.user1Id;
      const otherUser = userMap.get(otherId);
      return {
        ...m,
        otherUser: {
          ...safeUser(otherUser!),
          profile: profileMap.get(otherId) ?? null,
          photos: photosMap.get(otherId) ?? [],
        },
      };
    });

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
    const enriched = await enrichUsers(likers);
    
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
    
    res.json({ ...match, otherUser: { ...safeUser(otherUser!), profile, photos } });
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

    const recipientId = match.user1Id === req.user!.id ? match.user2Id : match.user1Id;
    const senderProfile = await storage.getProfile(req.user!.id);
    const senderName = senderProfile?.displayName || 'Someone';
    sendPushNotification(recipientId, {
      title: `${senderName} ✉️`,
      body: content.trim().substring(0, 100),
      url: `/matches`,
    }).catch(() => {});

    res.status(201).json(message);
  });

  app.post('/api/matches/:matchId/end', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = parseInt(req.params.matchId);
    
    const match = await storage.getMatchById(matchId);
    if (!match) return res.sendStatus(404);
    if (match.user1Id !== req.user!.id && match.user2Id !== req.user!.id) {
      return res.sendStatus(403);
    }
    
    const { reason } = req.body;
    await storage.endMatch(matchId, reason || 'User ended conversation');
    res.json({ success: true });
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

    const senderProfile = await storage.getProfile(req.user!.id);
    const senderName = senderProfile?.displayName || 'Someone';
    if (match?.status === 'matched') {
      sendPushNotification(toUserId, {
        title: 'New Match! ✈️',
        body: `You and ${senderName} are a match! Start chatting now.`,
        url: '/matches',
      }).catch(() => {});
    } else {
      sendPushNotification(toUserId, {
        title: 'Super Like! ⭐',
        body: `${senderName} sent you a super like!`,
        url: '/discover',
      }).catch(() => {});
    }

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

    // Admin alert
    const [reporter] = await db.select().from(users).where(eq(users.id, req.user!.id));
    const [reported] = await db.select().from(users).where(eq(users.id, req.params.userId));
    sendAdminAlert({ type: 'new_report', data: { reporterEmail: reporter?.email || req.user!.id, reportedEmail: reported?.email || req.params.userId, reason, details } }).catch(() => {});

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

  // ============ ADMIN ROUTES ============
  
  // Middleware to check admin status
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getUser(req.user!.id);
    if (user?.isAdmin !== 'true') return res.status(403).json({ error: 'Admin access required' });
    next();
  };

  // Get all users (admin only)
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const allUsers = await db.select().from(users);
    const enriched = await Promise.all(allUsers.map(async u => {
      const profile = await storage.getProfile(u.id);
      return { ...safeUser(u), profile };
    }));
    res.json(enriched);
  });

  // Ban a user (admin only)
  app.post('/api/admin/users/:userId/ban', requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    
    await db.update(users)
      .set({ 
        isBanned: 'true', 
        bannedAt: new Date(),
        banReason: reason 
      })
      .where(eq(users.id, userId));

    const [adminUser] = await db.select().from(users).where(eq(users.id, req.user!.id));
    sendAdminAlert({ type: 'user_banned', data: { userEmail: targetUser?.email || userId, userName: `${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`.trim() || undefined, reason: reason || undefined, adminEmail: adminUser?.email || req.user!.id } }).catch(() => {});
    
    res.json({ success: true });
  });

  // Unban a user (admin only)
  app.post('/api/admin/users/:userId/unban', requireAdmin, async (req, res) => {
    const { userId } = req.params;

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    
    await db.update(users)
      .set({ 
        isBanned: 'false', 
        bannedAt: null,
        banReason: null 
      })
      .where(eq(users.id, userId));

    const [adminUser] = await db.select().from(users).where(eq(users.id, req.user!.id));
    sendAdminAlert({ type: 'user_unbanned', data: { userEmail: targetUser?.email || userId, userName: `${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`.trim() || undefined, adminEmail: adminUser?.email || req.user!.id } }).catch(() => {});
    
    res.json({ success: true });
  });

  // Set or remove premium for a user (admin only)
  app.post('/api/admin/users/:userId/set-premium', requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const { isPremium, months } = req.body;

    if (isPremium) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + (months || 1));
      await db.update(users)
        .set({ isPremium: 'true', premiumExpiresAt: expiresAt })
        .where(eq(users.id, userId));
    } else {
      await db.update(users)
        .set({ isPremium: 'false', premiumExpiresAt: null })
        .where(eq(users.id, userId));
    }

    res.json({ success: true });
  });

  // Manually trigger weekly notifications (admin only)
  app.post('/api/admin/send-weekly-notifications', requireAdmin, async (req, res) => {
    try {
      await sendWeeklyNotifications();
      res.json({ success: true, message: 'Weekly notifications sent' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/send-event-reminders', requireAdmin, async (req, res) => {
    try {
      await sendEventReminders();
      res.json({ success: true, message: 'Event reminders sent' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send photo reminder emails to users without profile photo (admin only)
  app.post('/api/admin/send-photo-reminder-emails', requireAdmin, async (req, res) => {
    try {
      const result = await sendPhotoReminderEmails();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all reports (admin only)
  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    const allReports = await storage.getReports();
    res.json(allReports);
  });

  // Resolve a report (admin only)
  app.post('/api/admin/reports/:reportId/resolve', requireAdmin, async (req, res) => {
    const { reportId } = req.params;
    await storage.resolveReport(parseInt(reportId));
    res.json({ success: true });
  });

  // Check if current user is admin
  app.get('/api/admin/check', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getUser(req.user!.id);
    res.json({ isAdmin: user?.isAdmin === 'true' });
  });

  // Delete user account
  app.delete('/api/user/delete-account', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    
    try {
      // Delete user's photos
      await storage.deleteUserPhotos(userId);
      
      // Delete user's profile
      await storage.deleteProfile(userId);
      
      // Delete user's matches
      await storage.deleteUserMatches(userId);
      
      // Delete user's messages
      await storage.deleteUserMessages(userId);
      
      // Delete user account
      await storage.deleteUser(userId);
      
      // Logout the user
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // ========== EVENTS API ==========
  
  // ── Referral / Ambassador Programme ─────────────────────────────────────
  function generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FALL-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  const REFERRAL_TIERS = [
    { min: 1,  max: 4,   reward: 'likes_bonus',    label: '+10 likes/semana' },
    { min: 5,  max: 9,   reward: 'premium_1week',  label: '1 semana Premium' },
    { min: 10, max: 24,  reward: 'premium_1month',  label: '1 mes Premium' },
    { min: 25, max: 49,  reward: 'premium_3months', label: '3 meses Premium' },
    { min: 50, max: Infinity, reward: 'ambassador', label: 'Embajador Oficial' },
  ];

  app.get('/api/referrals/stats', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
      let code = user.referralCode;
      if (!code) {
        // Lazy-generate unique code
        let attempts = 0;
        do {
          code = generateReferralCode();
          const [existing] = await db.select().from(users).where(eq(users.referralCode, code));
          if (!existing) break;
          attempts++;
        } while (attempts < 10);
        await db.update(users).set({ referralCode: code }).where(eq(users.id, req.user!.id));
      }

      const myReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, req.user!.id));
      const count = myReferrals.length;
      const currentTier = REFERRAL_TIERS.find(t => count >= t.min && count <= t.max) || null;
      const nextTier = REFERRAL_TIERS.find(t => t.min > count) || null;

      res.json({ code, count, currentTier, nextTier, tiers: REFERRAL_TIERS, referredBy: user.referredBy || null });
    } catch (err) {
      console.error('[referrals/stats]', err);
      res.status(500).json({ error: 'Error cargando estadísticas' });
    }
  });

  app.post('/api/referrals/apply', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Código requerido' });

      const [me] = await db.select().from(users).where(eq(users.id, req.user!.id));
      if (me.referredBy) return res.status(400).json({ error: 'Ya usaste un código de referido' });

      const [referrer] = await db.select().from(users).where(eq(users.referralCode, code.toUpperCase()));
      if (!referrer) return res.status(404).json({ error: 'Código no válido' });
      if (referrer.id === req.user!.id) return res.status(400).json({ error: 'No puedes usar tu propio código' });

      // Check not already referred
      const [existing] = await db.select().from(referrals).where(eq(referrals.refereeId, req.user!.id));
      if (existing) return res.status(400).json({ error: 'Ya usaste un código de referido' });

      await db.update(users).set({ referredBy: code.toUpperCase() }).where(eq(users.id, req.user!.id));
      await db.insert(referrals).values({ referrerId: referrer.id, refereeId: req.user!.id });

      // Count referrer's total referrals after this one
      const allReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, referrer.id));
      const newCount = allReferrals.length;
      const newTier = REFERRAL_TIERS.find(t => t.min === newCount); // Exact tier unlock

      const refereeName = (req.user as any)?.firstName || 'Alguien';

      // Notify referrer: someone used their code
      await sendPushNotification(referrer.id, {
        title: '🎉 ¡Nuevo invitado en FallonYou!',
        body: `${refereeName} se ha unido usando tu código. Llevas ${newCount} invitado${newCount !== 1 ? 's' : ''}${newTier ? ` — ¡${newTier.label} desbloqueado! 🏆` : ''}`,
        url: '/ambassadors',
      });

      // Notify tier milestone (5, 10, 25, 50)
      if (newTier) {
        const milestoneMessages: Record<string, { title: string; body: string }> = {
          premium_1week:  { title: '⭐ ¡1 semana Premium desbloqueada!',    body: `Has conseguido ${newCount} invitados. ¡Tu semana Premium ya está activa!` },
          premium_1month: { title: '👑 ¡1 mes Premium desbloqueado!',        body: `¡Increíble! ${newCount} invitados. ¡Tu mes Premium ya está activo!` },
          premium_3months:{ title: '🏆 ¡3 meses Premium desbloqueados!',     body: `¡Eres una estrella! ${newCount} invitados. ¡3 meses Premium para ti!` },
          ambassador:     { title: '🌟 ¡Embajador Oficial FallonYou!',       body: `¡50+ invitados! Eres Embajador Oficial. El equipo de FallonYou te contactará pronto con beneficios exclusivos.` },
        };
        const msg = milestoneMessages[newTier.reward];
        if (msg) {
          await sendPushNotification(referrer.id, { ...msg, url: '/ambassadors' });
        }
      }

      // Send email notification to referrer
      if (referrer.email) {
        const isAmbassador = newTier?.reward === 'ambassador';
        sendReferralEmail(referrer.email, referrer.firstName || '', {
          refereeName,
          newCount,
          tierLabel: newTier?.label,
          isAmbassador,
        }).catch((err) => console.error('[referrals] Email send failed:', err));
      }

      res.json({ success: true, referrerName: referrer.firstName || 'tu amigo' });
    } catch (err) {
      console.error('[referrals/apply]', err);
      res.status(500).json({ error: 'Error aplicando código' });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  // Get all events
  function fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    return url.replace(/^\/objects\/\/objects\//, '/objects/');
  }

  app.get('/api/events', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { city, category } = req.query;
    
    let allEvents = await db.select().from(events).orderBy(desc(events.startsAt));
    
    if (city && typeof city === 'string') {
      allEvents = allEvents.filter(e => e.city.toLowerCase().includes(city.toLowerCase()));
    }
    if (category && typeof category === 'string') {
      allEvents = allEvents.filter(e => e.category === category);
    }
    
    const userId = req.user!.id;
    // Enrich with participant count, creator info, and user participation status
    const enrichedEvents = await Promise.all(allEvents.map(async (event) => {
      const participants = await db.select().from(eventParticipants).where(eq(eventParticipants.eventId, event.id));
      const creator = await storage.getUser(event.creatorId);
      const isParticipant = participants.some(p => p.userId === userId);
      const participantAvatars = await Promise.all(
        participants.slice(0, 4).map(async (p) => {
          const u = await storage.getUser(p.userId);
          return u ? { id: u.id, firstName: u.firstName, profileImageUrl: u.profileImageUrl } : null;
        })
      );
      return {
        ...event,
        imageUrl: fixImageUrl(event.imageUrl),
        participantCount: participants.length,
        isParticipant,
        participantAvatars: participantAvatars.filter(Boolean),
        creator: creator ? { id: creator.id, firstName: creator.firstName, profileImageUrl: creator.profileImageUrl } : null,
      };
    }));
    
    res.json(enrichedEvents);
  });

  // ============ EVENT SUGGESTIONS (must be before /:id) ============

  app.get('/api/events/suggestions', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;

    const profile = await storage.getProfile(userId);
    const userCity = profile?.currentCity || profile?.homeCity;

    const allEvents = await db.select().from(events)
      .where(gte(events.startsAt, new Date()))
      .orderBy(desc(events.startsAt));

    const candidates = userCity
      ? allEvents.filter(e => e.city.toLowerCase() === userCity.toLowerCase() && e.creatorId !== userId)
      : allEvents.filter(e => e.creatorId !== userId);

    const suggestions = await Promise.all(
      candidates.map(async (event) => {
        const participants = await db.select().from(eventParticipants).where(eq(eventParticipants.eventId, event.id));
        const isParticipant = participants.some(p => p.userId === userId);
        if (isParticipant) return null;
        const creator = await storage.getUser(event.creatorId);
        return {
          ...event,
          imageUrl: fixImageUrl(event.imageUrl),
          participantCount: participants.length,
          creator: creator ? { id: creator.id, firstName: creator.firstName, profileImageUrl: creator.profileImageUrl } : null,
        };
      })
    );

    const filtered = suggestions.filter(Boolean).slice(0, 10);
    res.json({ suggestions: filtered, city: userCity || null });
  });

  app.get('/api/events/search/cities', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const allEvents = await db.select({ city: events.city }).from(events);
    const uniqueCities = [...new Set(allEvents.map(e => e.city))].sort();
    res.json(uniqueCities);
  });

  // ============ SINGLE EVENT (must be after named routes) ============

  app.get('/api/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event ID' });

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const participantRows = await db.select().from(eventParticipants).where(eq(eventParticipants.eventId, eventId));
    const participants = await Promise.all(participantRows.map(async (p) => {
      const user = await storage.getUser(p.userId);
      return {
        id: p.userId,
        firstName: user?.firstName || null,
        profileImageUrl: user?.profileImageUrl || null,
        status: p.status,
      };
    }));

    const creator = await storage.getUser(event.creatorId);
    res.json({
      ...event,
      imageUrl: fixImageUrl(event.imageUrl),
      participants,
      creator: creator ? { id: creator.id, firstName: creator.firstName, profileImageUrl: creator.profileImageUrl } : null,
    });
  });

  // Create event
  app.post('/api/events', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { title, description, category, city, location, startsAt, endsAt, capacity, latitude, longitude, imageUrl } = req.body;
    
    if (!title || !category || !city || !startsAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [newEvent] = await db.insert(events).values({
      creatorId: req.user!.id,
      title,
      description,
      category,
      city,
      location,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      capacity,
      latitude,
      longitude,
      imageUrl: fixImageUrl(imageUrl),
    }).returning();
    
    // Automatically join as participant
    await db.insert(eventParticipants).values({
      eventId: newEvent.id,
      userId: req.user!.id,
      status: 'going',
    });

    const creatorName = req.user!.firstName || 'Someone';
    const categoryIcon = { dining: '🍽️', nightlife: '🎉', outdoor: '🏔️', culture: '🎭', sports: '⚽', travel: '✈️', music: '🎵', other: '📌' }[category] || '📌';
    sendPushToAllExcept(req.user!.id, {
      title: `${categoryIcon} New Activity in ${city}!`,
      body: `${creatorName} created "${title}" — check it out and join!`,
      url: '/',
    }).catch(err => console.error('Push notification error:', err));
    
    res.json(newEvent);
  });

  // Join event
  app.post('/api/events/:id/join', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    
    // Check if already joined
    const [existing] = await db.select().from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, req.user!.id)));
    
    if (existing) {
      return res.status(400).json({ error: 'Already joined' });
    }
    
    await db.insert(eventParticipants).values({
      eventId,
      userId: req.user!.id,
      status: 'going',
    });

    // Notify event creator when someone joins (not if creator joins their own event)
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (event && event.creatorId !== req.user!.id) {
      const joiner = await storage.getUser(req.user!.id);
      sendPushNotification(event.creatorId, {
        title: `🎉 Nuevo participante en "${event.title}"`,
        body: `${joiner?.firstName || 'Alguien'} se ha apuntado a tu actividad.`,
        url: `/event/${eventId}`,
        icon: '/favicon.png',
      }).catch(() => {});
    }

    res.json({ success: true });
  });

  // Leave event
  app.delete('/api/events/:id/leave', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    
    await db.delete(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, req.user!.id)));
    
    res.json({ success: true });
  });

  app.patch('/api/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

    const { title, description, category, city, location, startsAt, capacity, imageUrl } = req.body;

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (city !== undefined) updateData.city = city;
    if (location !== undefined) updateData.location = location;
    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt);
    if (capacity !== undefined) updateData.capacity = capacity;
    if (imageUrl !== undefined) updateData.imageUrl = fixImageUrl(imageUrl);

    const [updated] = await db.update(events).set(updateData).where(eq(events.id, eventId)).returning();
    res.json(updated);
  });

  // Delete event (only creator)
  app.delete('/api/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
    
    await db.delete(eventParticipants).where(eq(eventParticipants.eventId, eventId));
    await db.delete(events).where(eq(events.id, eventId));
    
    res.json({ success: true });
  });

  // ============ EVENT COMMENTS ============

  app.get('/api/events/:id/comments', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event ID' });

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const comments = await db.select().from(eventComments)
      .where(eq(eventComments.eventId, eventId))
      .orderBy(desc(eventComments.createdAt));

    const enriched = await Promise.all(comments.map(async (comment) => {
      const user = await storage.getUser(comment.userId);
      return {
        ...comment,
        user: user ? { id: user.id, firstName: user.firstName, profileImageUrl: user.profileImageUrl } : null,
      };
    }));

    res.json(enriched);
  });

  app.post('/api/events/:id/comments', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event ID' });

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long' });
    }

    const [comment] = await db.insert(eventComments).values({
      eventId,
      userId: req.user!.id,
      content: content.trim(),
    }).returning();

    const user = await storage.getUser(req.user!.id);

    // Notify event creator if someone else commented
    if (event.creatorId !== req.user!.id) {
      sendPushNotification(event.creatorId, {
        title: `💬 Nuevo comentario en "${event.title}"`,
        body: `${user?.firstName || 'Alguien'}: ${content.trim().slice(0, 80)}`,
        url: `/event/${eventId}`,
        icon: '/favicon.png',
      }).catch(() => {});
    }

    res.json({
      ...comment,
      user: user ? { id: user.id, firstName: user.firstName, profileImageUrl: user.profileImageUrl } : null,
    });
  });

  app.delete('/api/events/:eventId/comments/:commentId', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.eventId);
    const commentId = parseInt(req.params.commentId);
    if (isNaN(eventId) || isNaN(commentId)) return res.status(400).json({ error: 'Invalid ID' });

    const [comment] = await db.select().from(eventComments)
      .where(and(eq(eventComments.id, commentId), eq(eventComments.eventId, eventId)));
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

    await db.delete(eventComments).where(eq(eventComments.id, commentId));
    res.json({ success: true });
  });

  // ============ EVENT RATINGS ============

  app.post('/api/events/:id/rating', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event ID' });

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { rating } = req.body;
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const [existing] = await db.select().from(eventRatings)
      .where(and(eq(eventRatings.eventId, eventId), eq(eventRatings.userId, req.user!.id)));

    if (existing) {
      const [updated] = await db.update(eventRatings)
        .set({ rating })
        .where(and(eq(eventRatings.eventId, eventId), eq(eventRatings.userId, req.user!.id)))
        .returning();
      return res.json(updated);
    }

    const [created] = await db.insert(eventRatings).values({
      eventId,
      userId: req.user!.id,
      rating,
    }).returning();
    res.json(created);
  });

  app.get('/api/events/:id/rating', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event ID' });

    const allRatings = await db.select().from(eventRatings).where(eq(eventRatings.eventId, eventId));
    const userRating = allRatings.find(r => r.userId === req.user!.id);
    const average = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : null;

    res.json({
      userRating: userRating?.rating ?? null,
      average: average ? Math.round(average * 10) / 10 : null,
      count: allRatings.length,
    });
  });

  // ============ SELFIE VERIFICATION ============

  // Submit selfie for verification
  app.post('/api/verification/submit', upload.single('selfie'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;

    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    if (currentUser?.verificationStatus === 'approved') {
      return res.status(400).json({ error: 'Already verified' });
    }
    if (currentUser?.verificationStatus === 'pending') {
      return res.status(400).json({ error: 'Verification already pending' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Selfie file required' });
    }

    const selfieUrl = `/uploads/${req.file.filename}`;

    await db.update(users)
      .set({
        verificationStatus: 'pending',
        verificationSelfieUrl: selfieUrl,
        verificationRequestedAt: new Date(),
        verificationRejectedReason: null,
      })
      .where(eq(users.id, userId));

    // Admin alert
    sendAdminAlert({ type: 'new_verification', data: { userEmail: currentUser?.email || userId, userName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || undefined } }).catch(() => {});

    res.json({ success: true });
  });

  // Admin: list all verification requests
  app.get('/api/admin/verifications', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true') return res.sendStatus(403);

    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      isVerified: users.isVerified,
      verificationStatus: users.verificationStatus,
      verificationSelfieUrl: users.verificationSelfieUrl,
      verificationRequestedAt: users.verificationRequestedAt,
      verificationReviewedAt: users.verificationReviewedAt,
      verificationRejectedReason: users.verificationRejectedReason,
    }).from(users);

    const withVerification = allUsers.filter(u =>
      u.verificationStatus && u.verificationStatus !== 'none'
    ).sort((a, b) => {
      if (a.verificationStatus === 'pending' && b.verificationStatus !== 'pending') return -1;
      if (b.verificationStatus === 'pending' && a.verificationStatus !== 'pending') return 1;
      return 0;
    });

    res.json(withVerification);
  });

  // Admin: approve verification
  app.post('/api/admin/verifications/:userId/approve', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true') return res.sendStatus(403);

    await db.update(users)
      .set({
        isVerified: 'true',
        verifiedAt: new Date(),
        verificationStatus: 'approved',
        verificationReviewedAt: new Date(),
        verificationRejectedReason: null,
      })
      .where(eq(users.id, req.params.userId));

    res.json({ success: true });
  });

  // Admin: reject verification
  app.post('/api/admin/verifications/:userId/reject', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true') return res.sendStatus(403);

    const { reason } = req.body;
    await db.update(users)
      .set({
        isVerified: 'false',
        verificationStatus: 'rejected',
        verificationReviewedAt: new Date(),
        verificationRejectedReason: reason || null,
      })
      .where(eq(users.id, req.params.userId));

    res.json({ success: true });
  });

  // ============ PUSH NOTIFICATIONS ============
  app.get('/api/push/vapid-key', (req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.post('/api/push/subscribe', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    await saveSubscription(req.user!.id, subscription);
    res.json({ success: true });
  });

  app.post('/api/push/unsubscribe', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { endpoint } = req.body;
    if (endpoint) {
      await removeSubscription(endpoint);
    }
    res.json({ success: true });
  });

  return httpServer;
}
