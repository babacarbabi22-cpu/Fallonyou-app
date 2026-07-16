
import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { users, profiles, photos, events, eventParticipants, eventComments, eventRatings, matches, preferences, referrals, profileViews, stories, businessPartners, localOffers, notifications, swipes, ambassadorApplications, appSessions, blockedUsers, adventurePhotos, cityTips, cityTipVotes, localHelpRequests, localHelpOffers, languageProgress } from "@shared/schema";
import { eq, and, desc, ilike, gte, inArray, or, sql, lt, ne, count } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";
import { registerObjectStorageRoutes, objectStorageClient } from "./replit_integrations/object_storage";
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

// Returns all user IDs that are blocked by OR blocking the given userId (bidirectional)
async function getBlockedIds(userId: string): Promise<Set<string>> {
  const rows = await db.execute(sql`
    SELECT blocked_user_id AS other_id FROM blocked_users WHERE user_id = ${userId}
    UNION
    SELECT user_id AS other_id FROM blocked_users WHERE blocked_user_id = ${userId}
  `);
  return new Set((rows.rows as any[]).map((r: any) => r.other_id as string));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get('/feature_graphic_googleplay.png', (req, res) => {
    res.sendFile('feature_graphic_googleplay.png', { root: 'client/public' });
  });

  app.get('/.well-known/assetlinks.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json([{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'app.fallonyou.twa',
        sha256_cert_fingerprints: ['C4:00:2A:C1:B6:E1:B7:6B:55:21:9E:D7:7C:42:B9:FC:BF:AD:C7:3D:DA:03:A7:23:D8:BB:FF:BC:7A:BD:98:68']
      }
    }]);
  });
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

    // Fetch preferences + already swiped + blocked IDs in parallel
    const [[userPrefs], alreadySwiped, allUsers, blockedSet] = await Promise.all([
      db.select().from(preferences).where(eq(preferences.userId, currentUserId)),
      db.select({ id: matches.user2Id }).from(matches).where(eq(matches.user1Id, currentUserId)),
      storage.getPotentialMatches(currentUserId),
      getBlockedIds(currentUserId),
    ]);

    const showMe = userPrefs?.showMe ?? 'everyone';
    const swipedSet = new Set(alreadySwiped.map(r => r.id));

    // Batch-enrich all users (3 queries instead of 1+2N)
    const enriched = await enrichUsers(allUsers);

    // Filter by swiped + blocked + gender preference
    const filtered = enriched.filter(u => {
      if (swipedSet.has(u.id)) return false;
      if (blockedSet.has(u.id)) return false;
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
        occupation, birthplace, height, religion, politics, pets, exercise,
        interests, relationshipType,
        connectionTypes, travelInterests, travelerMode, currentCity, homeCity, latitude, longitude,
        wantToHelp, helpWith
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
      const { nextAdventure } = req.body;
      if (nextAdventure !== undefined) profileData.nextAdventure = nextAdventure;
      if (wantToHelp !== undefined) profileData.wantToHelp = !!wantToHelp;
      if (helpWith !== undefined) profileData.helpWith = Array.isArray(helpWith) ? helpWith : [];
      
      // Get old city before updating (for new-traveler notification)
      const [oldProfile] = await db.select({ currentCity: profiles.currentCity })
        .from(profiles).where(eq(profiles.userId, req.user!.id));
      const oldCity = oldProfile?.currentCity;

      const updated = await storage.upsertProfile(req.user!.id, profileData);
      res.json({ ...updated, displayName });

      // Fire-and-forget: notify users in new city that a traveler arrived
      const newCity = currentCity as string | undefined;
      if (newCity && newCity.trim() && newCity !== oldCity) {
        try {
          const moverName = req.user!.firstName || "Alguien";
          // Find users in that city (excluding the mover)
          const usersInCity = await db.select({ userId: profiles.userId })
            .from(profiles)
            .where(and(
              eq(profiles.currentCity, newCity.trim()),
              ne(profiles.userId, req.user!.id)
            ))
            .limit(50);
          for (const target of usersInCity) {
            // Only notify Premium users about new travelers
            const [targetUser] = await db.select({ isPremium: users.isPremium, notificationPrefs: (users as any).notificationPrefs })
              .from(users).where(eq(users.id, target.userId));
            if (targetUser?.isPremium !== 'true') continue;
            // Check prefs
            const prefs = targetUser?.notificationPrefs ? JSON.parse(targetUser.notificationPrefs as string) : { newTravelers: true };
            if (prefs.newTravelers === false) continue;
            // In-app notification
            await db.insert(notifications).values({
              userId: target.userId,
              type: "new_traveler",
              title: `✈️ Nuevo viajero en ${newCity}`,
              body: `${moverName} acaba de llegar a tu ciudad. ¡Conéctate con él!`,
              link: "/swipe",
              read: false,
            });
            // Push notification (fire-and-forget)
            sendPushNotification(target.userId, {
              title: `✈️ Nuevo viajero en ${newCity}`,
              body: `${moverName} acaba de llegar. ¡Abre FallonYou para conocerle!`,
              url: "/swipe",
            }).catch(() => {});
          }
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      console.error("[updateProfile] Error saving profile:", err);
      res.status(500).json({ error: "No se pudo guardar el perfil. Por favor inténtalo de nuevo." });
    }
  });

  // Toggle "available as guide" status
  app.patch('/api/profile/guide-status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { availableAsGuide } = req.body;
    const active = !!availableAsGuide;
    await db.update(profiles)
      .set({ availableAsGuide: active })
      .where(eq(profiles.userId, req.user!.id));
    res.json({ availableAsGuide: active });
  });

  // Toggle "available today" status
  app.patch('/api/profile/availability', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { availableToday } = req.body;
    const active = !!availableToday;
    const until = active ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    await db.update(profiles)
      .set({ availableToday: active, availableUntil: until })
      .where(eq(profiles.userId, req.user!.id));
    res.json({ availableToday: active, availableUntil: until });
  });

  // Get cities where current user has matches
  app.get('/api/my-connected-cities', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const rows = await db.execute(sql`
      SELECT DISTINCT p.current_city, p.home_city
      FROM matches m
      JOIN profiles p ON (
        CASE WHEN m.user1_id = ${userId} THEN p.user_id = m.user2_id
             ELSE p.user_id = m.user1_id END
      )
      WHERE (m.user1_id = ${userId} OR m.user2_id = ${userId})
        AND m.status = 'active'
    `);
    const cities = new Set<string>();
    (rows.rows as any[]).forEach((r: any) => {
      if (r.current_city) cities.add(r.current_city);
      if (r.home_city) cities.add(r.home_city);
    });
    res.json({ cities: Array.from(cities) });
  });

  // Users in a specific city — for destination upsell modal
  app.get('/api/explore/destination-users', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const city = String(req.query.city || '').trim();
    if (!city) return res.status(400).json({ error: 'city required' });
    const isPremium = (await storage.canUserLike(userId)).isPremium;
    // Get up to 6 users in that city with photos, excluding current user
    const profilesInCity = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(and(eq(profiles.currentCity, city), ne(profiles.userId, userId)))
      .limit(6);
    if (profilesInCity.length === 0) return res.json({ users: [], isPremium, total: 0 });
    const ids = profilesInCity.map(p => p.userId);
    const cityPhotos = await db.select().from(photos).where(inArray(photos.userId, ids));
    const photosMap = new Map<string, string>();
    for (const p of cityPhotos) {
      if (!photosMap.has(p.userId)) photosMap.set(p.userId, p.url);
    }
    const users = ids
      .filter(id => photosMap.has(id))
      .slice(0, 4)
      .map(id => ({ photoUrl: photosMap.get(id)! }));
    res.json({ users, isPremium, total: profilesInCity.length });
  });

  // Top destinations — cities with most users for the explore/tips page
  app.get('/api/explore/destinations', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rows = await db.execute(sql`
      SELECT current_city AS city, COUNT(*) AS user_count
      FROM profiles
      WHERE current_city IS NOT NULL AND current_city != ''
      GROUP BY current_city
      ORDER BY user_count DESC
      LIMIT 10
    `);
    res.json({ destinations: (rows.rows as any[]).map(r => ({ city: r.city, count: Number(r.user_count) })) });
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
    const photoId = Number(req.params.id);
    // Ensure user owns the photo and has more than 1 photo remaining
    const userPhotos = await storage.getPhotos(req.user!.id);
    const photoToDelete = userPhotos.find(p => p.id === photoId);
    if (!photoToDelete) return res.status(404).json({ error: "Photo not found" });
    if (userPhotos.length <= 1) {
      return res.status(400).json({ error: "Debes tener al menos una foto en tu perfil" });
    }
    await storage.deletePhoto(photoId);
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

    // Prevent liking a blocked user (or being liked by a blocker)
    const blockedSet = await getBlockedIds(req.user!.id);
    if (blockedSet.has(targetUserId)) {
      return res.status(403).json({ error: 'Action not allowed' });
    }
    
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
    const [matchList, blockedSet] = await Promise.all([
      storage.getMatches(currentUserId),
      getBlockedIds(currentUserId),
    ]);

    // Filter out matches with blocked users
    const activeMatches = matchList.filter(m => {
      const otherId = m.user1Id === currentUserId ? m.user2Id : m.user1Id;
      return !blockedSet.has(otherId);
    });

    if (activeMatches.length === 0) return res.json([]);

    // Collect the other user IDs, then batch-fetch in 3 queries
    const otherIds = activeMatches.map(m => m.user1Id === currentUserId ? m.user2Id : m.user1Id);
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

    const enriched = activeMatches.map(m => {
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

    // Silently ignore ratings between blocked users
    const blockedSet = await getBlockedIds(req.user!.id);
    if (blockedSet.has(input.ratedUserId)) {
      return res.status(403).json({ error: 'Action not allowed' });
    }

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
    
    const userId = req.user!.id;
    const [user, blockedSet] = await Promise.all([
      storage.getUser(userId),
      getBlockedIds(userId),
    ]);
    if (!user) return res.sendStatus(404);
    
    const isPremium = user.isPremium === 'true' || 
      (user.trialEndsAt && new Date(user.trialEndsAt) > new Date());

    const allLikers = await storage.getUsersWhoLikedMe(userId);
    // Filter out blocked users from likers
    const likers = allLikers.filter(u => !blockedSet.has(u.id));
    
    if (!isPremium) {
      return res.json({ 
        count: likers.length, 
        users: [],
        isPremium: false 
      });
    }
    
    const enriched = await enrichUsers(likers);
    
    res.json({ 
      count: likers.length, 
      users: enriched,
      isPremium: true 
    });
  });

  // Teaser users — random real users with photos for premium upsell (no sensitive data)
  app.get('/api/premium/teaser-users', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    // Get users who have at least one photo, excluding current user, random order, limit 6
    const usersWithPhotos = await db
      .selectDistinct({ id: photos.userId })
      .from(photos)
      .where(ne(photos.userId, userId))
      .orderBy(sql`RANDOM()`)
      .limit(6);
    if (usersWithPhotos.length === 0) return res.json({ users: [] });
    const ids = usersWithPhotos.map(u => u.id);
    const allPhotos = await db.select().from(photos).where(inArray(photos.userId, ids));
    const photosMap = new Map<string, string>();
    for (const p of allPhotos) {
      if (!photosMap.has(p.userId)) photosMap.set(p.userId, p.url);
    }
    const result = ids
      .filter(id => photosMap.has(id))
      .slice(0, 4)
      .map(id => ({ photoUrl: photosMap.get(id)! }));
    res.json({ users: result });
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

    // Prevent messaging between blocked users
    const recipientId = match.user1Id === req.user!.id ? match.user2Id : match.user1Id;
    const blockedSet = await getBlockedIds(req.user!.id);
    if (blockedSet.has(recipientId)) {
      return res.status(403).json({ error: 'No puedes enviar mensajes a este usuario' });
    }
    
    const { content, imageUrl } = req.body;
    if (!content?.trim() && !imageUrl) return res.status(400).json({ error: 'Message content or image required' });
    
    const message = await storage.createMessage({
      matchId,
      senderId: req.user!.id,
      content: content?.trim() || '',
      imageUrl: imageUrl || null,
    });

    const senderProfile = await storage.getProfile(req.user!.id);
    const senderName = senderProfile?.displayName || 'Someone';
    sendPushNotification(recipientId, {
      title: `${senderName} ✉️`,
      body: imageUrl ? '📸 Te envió una foto' : content.trim().substring(0, 100),
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

    // Prevent super-liking a blocked user
    const blockedSet = await getBlockedIds(req.user!.id);
    if (blockedSet.has(toUserId)) {
      return res.status(403).json({ error: 'Action not allowed' });
    }
    
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
    const [user, blockedSet] = await Promise.all([
      storage.getUser(req.user!.id),
      getBlockedIds(req.user!.id),
    ]);
    const isPremium = user?.isPremium === 'true';

    const allSuperLikes = await storage.getSuperLikesReceived(req.user!.id);
    // Filter out super-likes from blocked users
    const superLikes = allSuperLikes.filter(sl => !blockedSet.has(sl.fromUserId));
    
    if (!isPremium) {
      return res.json({ count: superLikes.length, users: [], isPremium: false });
    }
    
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

  // ============ ADMIN MIDDLEWARE ============
  const ADMIN_EMAILS = ['fallonyouapp@hotmail.com'];
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getUser(req.user!.id);
    const isAdmin = user?.isAdmin === 'true' || ADMIN_EMAILS.includes(user?.email || '');
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
    next();
  };

  // ============ SESSION TRACKING ============

  // Ping to record a daily session (called once when user opens the app)
  app.post('/api/sessions/ping', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    try {
      await db.execute(sql`
        INSERT INTO app_sessions (user_id, date)
        VALUES (${userId}, ${today})
        ON CONFLICT (user_id, date) DO NOTHING
      `);
    } catch (_) { /* ignore duplicate */ }
    res.json({ ok: true });
  });

  // Admin: get daily stats
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    // Daily active users for the last 30 days
    const daily = await db.execute(sql`
      SELECT date, COUNT(DISTINCT user_id)::int AS count
      FROM app_sessions
      WHERE date >= to_char(NOW() - INTERVAL '29 days', 'YYYY-MM-DD')
      GROUP BY date
      ORDER BY date ASC
    `);

    // Total users
    const [{ total_users }] = (await db.execute(sql`SELECT COUNT(*)::int AS total_users FROM users`)).rows as any[];
    // New users last 7 days
    const [{ new_users_7d }] = (await db.execute(sql`SELECT COUNT(*)::int AS new_users_7d FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`)).rows as any[];
    // Total matches
    const [{ total_matches }] = (await db.execute(sql`SELECT COUNT(*)::int AS total_matches FROM matches`)).rows as any[];
    // Total messages
    const [{ total_messages }] = (await db.execute(sql`SELECT COUNT(*)::int AS total_messages FROM messages`)).rows as any[];
    // Active today
    const [{ active_today }] = (await db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS active_today FROM app_sessions WHERE date = to_char(NOW(), 'YYYY-MM-DD')`)).rows as any[];

    res.json({
      daily: daily.rows,
      totals: { total_users, new_users_7d, total_matches, total_messages, active_today },
    });
  });

  // ============ ADMIN ROUTES ============

  // Send a direct message/notification from admin to a specific user
  app.post('/api/admin/send-user-message', requireAdmin, async (req, res) => {
    const { userId, message } = req.body;
    if (!userId || !message?.trim()) return res.status(400).json({ error: 'userId and message required' });
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (${userId}, 'admin_message', ${'Mensaje del equipo FallonYou'}, ${message.trim()}, ${'/'})
    `);
    res.json({ success: true });
  });

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

  // Delete a user account permanently (admin only)
  app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    const { userId } = req.params;

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Collect all GCS file URLs before deleting DB records
    const [userPhotos, userStories] = await Promise.all([
      db.select({ url: photos.url }).from(photos).where(eq(photos.userId, userId)),
      db.select({ mediaUrl: stories.mediaUrl }).from(stories).where(eq(stories.userId, userId)),
    ]);

    // Respond immediately so the UI feels instant
    res.json({ success: true });

    // Delete everything in the background (fire & forget)
    storage.deleteUser(userId)
      .then(async () => {
        sendAdminAlert({ type: 'user_banned', data: { userEmail: targetUser.email || userId, userName: `ELIMINADO: ${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim(), adminEmail: req.user!.id } }).catch(() => {});

        // Delete physical files from GCS
        const gcsUrls = [
          ...userPhotos.map(p => p.url),
          ...userStories.map(s => s.mediaUrl),
          targetUser.profileImageUrl,
        ].filter((url): url is string => !!url && url.startsWith('https://storage.googleapis.com/'));

        await Promise.allSettled(gcsUrls.map(async (url) => {
          try {
            const parsed = new URL(url);
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length < 2) return;
            const bucketName = parts[0];
            const objectName = parts.slice(1).join('/');
            await objectStorageClient.bucket(bucketName).file(objectName).delete();
          } catch (e) {
            console.error('[Admin] GCS file delete failed:', url, e);
          }
        }));
      })
      .catch((err) => console.error('[Admin] Error deleting user:', err));
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
    res.json({ isAdmin: user?.isAdmin === 'true' || ADMIN_EMAILS.includes(user?.email || '') });
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
    // Remove events created by blocked users (bidirectional)
    const blockedSet = await getBlockedIds(userId);
    allEvents = allEvents.filter(e => !blockedSet.has(e.creatorId));
    // Enrich with participant count, creator info, and user participation status
    const enrichedEvents = await Promise.all(allEvents.map(async (event) => {
      const participants = await db.select().from(eventParticipants).where(eq(eventParticipants.eventId, event.id));
      const creator = await storage.getUser(event.creatorId);
      const isParticipant = participants.some(p => p.userId === userId);
      // Only show avatars of non-blocked participants
      const visibleParticipants = participants.filter(p => !blockedSet.has(p.userId));
      const participantAvatars = await Promise.all(
        visibleParticipants.slice(0, 4).map(async (p) => {
          const u = await storage.getUser(p.userId);
          return u ? { id: u.id, firstName: u.firstName, profileImageUrl: u.profileImageUrl } : null;
        })
      );
      return {
        ...event,
        imageUrl: fixImageUrl(event.imageUrl),
        participantCount: visibleParticipants.length,
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

    const [profile, blockedSet] = await Promise.all([
      storage.getProfile(userId),
      getBlockedIds(userId),
    ]);
    const userCity = profile?.currentCity || profile?.homeCity;

    const allEvents = await db.select().from(events)
      .where(gte(events.startsAt, new Date()))
      .orderBy(desc(events.startsAt));

    const candidates = (userCity
      ? allEvents.filter(e => e.city.toLowerCase() === userCity.toLowerCase() && e.creatorId !== userId)
      : allEvents.filter(e => e.creatorId !== userId)
    ).filter(e => !blockedSet.has(e.creatorId));

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

  // Top-rated events (for EventsPage featured section) — must be before /:id
  app.get('/api/events/top-rated', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rows = await db.execute(sql`
      SELECT e.id, e.title, e.category, e.city, e.starts_at, e.image_url, e.location,
             ROUND(AVG(er.rating)::numeric, 1) AS avg_rating,
             COUNT(er.id) AS rating_count,
             COUNT(ep.id) AS participant_count
      FROM events e
      JOIN event_ratings er ON er.event_id = e.id
      LEFT JOIN event_participants ep ON ep.event_id = e.id
      GROUP BY e.id
      HAVING COUNT(er.id) >= 1
      ORDER BY avg_rating DESC, rating_count DESC
      LIMIT 8
    `);
    res.json({ events: rows.rows });
  });

  // ============ SINGLE EVENT (must be after named routes) ============

  app.get('/api/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event ID' });

    const [[event], blockedSet] = await Promise.all([
      db.select().from(events).where(eq(events.id, eventId)),
      getBlockedIds(req.user!.id),
    ]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const participantRows = await db.select().from(eventParticipants).where(eq(eventParticipants.eventId, eventId));
    // Filter out blocked users from the participant list
    const visibleParticipantRows = participantRows.filter(p => !blockedSet.has(p.userId));
    const participants = await Promise.all(visibleParticipantRows.map(async (p) => {
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

    const creatorName = req.user!.firstName || 'Alguien';
    const categoryIcon: Record<string, string> = { dining: '🍽️', nightlife: '🎉', outdoor: '🏔️', culture: '🎭', sports: '⚽', travel: '✈️', music: '🎵', other: '📌' };
    const icon = categoryIcon[category] || '📌';

    // Find users in the same city (currentCity or homeCity)
    const nearbyUsers = await db.select({ id: users.id })
      .from(users)
      .where(
        and(
          ne(users.id, req.user!.id),
          or(
            ilike(users.currentCity, city),
            ilike(users.homeCity, city)
          )
        )
      );

    // Respond immediately — send notifications in background (non-blocking)
    res.json(newEvent);

    // Fire-and-forget: notify all users who have events notifications enabled
    (async () => {
      try {
        const creatorBlockedSet = await getBlockedIds(req.user!.id);

        // Get all users except creator, with their notification prefs
        const allUsers = await db.select({ id: users.id, notificationPrefs: (users as any).notificationPrefs })
          .from(users)
          .where(ne(users.id, req.user!.id));

        const eligible = allUsers.filter(u => {
          if (creatorBlockedSet.has(u.id)) return false;
          try {
            const prefs = u.notificationPrefs ? JSON.parse(u.notificationPrefs as string) : {};
            return prefs.events !== false; // default: true
          } catch { return true; }
        });

        if (eligible.length === 0) return;

        // In-app notification for all eligible users
        const notifValues = eligible.map(u => ({
          userId: u.id,
          type: 'new_event',
          title: `${icon} Nueva actividad en ${city}`,
          body: `${creatorName} creó "${title}" — ¡únete ahora!`,
          link: `/events`,
          read: false,
        }));
        await db.insert(notifications).values(notifValues).catch(err =>
          console.error('Error creating event notifications:', err)
        );

        // Push notification for each eligible user (respects prefs)
        for (const u of eligible) {
          sendPushNotification(u.id, {
            title: `${icon} Nueva actividad en ${city}`,
            body: `${creatorName} creó "${title}" — ¡únete!`,
            url: '/events',
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Event notification background error:', err);
      }
    })();
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
    const editorUser = await storage.getUser(req.user!.id);
    const isAdminEditor = editorUser?.isAdmin === 'true';
    if (!isAdminEditor && event.creatorId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

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
    const requestingUser = await storage.getUser(req.user!.id);
    const isAdmin = requestingUser?.isAdmin === 'true';
    if (!isAdmin && event.creatorId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
    
    await db.delete(eventParticipants).where(eq(eventParticipants.eventId, eventId));
    await db.delete(events).where(eq(events.id, eventId));
    
    res.json({ success: true });
  });

  // ============ EVENT COMMENTS ============

  app.get('/api/events/:id/comments', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event ID' });

    const [[event], blockedSet] = await Promise.all([
      db.select().from(events).where(eq(events.id, eventId)),
      getBlockedIds(req.user!.id),
    ]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const comments = await db.select().from(eventComments)
      .where(eq(eventComments.eventId, eventId))
      .orderBy(desc(eventComments.createdAt));

    // Filter out comments from blocked users
    const visibleComments = comments.filter(c => !blockedSet.has(c.userId));

    const enriched = await Promise.all(visibleComments.map(async (comment) => {
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

    // Notify event creator if someone else commented (skip if blocked)
    if (event.creatorId !== req.user!.id) {
      const creatorBlockedSet = await getBlockedIds(event.creatorId);
      if (!creatorBlockedSet.has(req.user!.id)) {
        sendPushNotification(event.creatorId, {
          title: `💬 Nuevo comentario en "${event.title}"`,
          body: `${user?.firstName || 'Alguien'}: ${content.trim().slice(0, 80)}`,
          url: `/event/${eventId}`,
          icon: '/favicon.png',
        }).catch(() => {});
      }
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

  // ─── City Guide Tips ─────────────────────────────────────────────────────
  app.get('/api/city-tips', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { city, category } = req.query;
    let query = db
      .select({
        id: cityTips.id,
        city: cityTips.city,
        category: cityTips.category,
        title: cityTips.title,
        body: cityTips.body,
        votes: cityTips.votes,
        createdAt: cityTips.createdAt,
        userId: cityTips.userId,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(cityTips)
      .leftJoin(users, eq(cityTips.userId, users.id))
      .orderBy(desc(cityTips.votes), desc(cityTips.createdAt))
      .$dynamic();
    if (city && typeof city === 'string') query = query.where(ilike(cityTips.city, `%${city}%`)) as any;
    if (category && typeof category === 'string' && category !== 'all') query = query.where(eq(cityTips.category, category)) as any;
    const rows = await query.limit(50);
    const myVotes = await db.select({ tipId: cityTipVotes.tipId }).from(cityTipVotes).where(eq(cityTipVotes.userId, req.user!.id));
    const voted = new Set(myVotes.map(v => v.tipId));
    res.json({ tips: rows.map(r => ({ ...r, voted: voted.has(r.id) })) });
  });

  app.post('/api/city-tips', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { city, category, title, body } = req.body;
    if (!city?.trim() || !category?.trim() || !title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Missing fields' });
    const [tip] = await db.insert(cityTips).values({ userId: req.user!.id, city: city.trim(), category: category.trim(), title: title.trim(), body: body.trim() }).returning();
    res.json(tip);
  });

  app.post('/api/city-tips/:id/vote', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tipId = parseInt(req.params.id);
    if (isNaN(tipId)) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await db.select().from(cityTipVotes).where(and(eq(cityTipVotes.tipId, tipId), eq(cityTipVotes.userId, req.user!.id)));
    if (existing.length > 0) {
      await db.delete(cityTipVotes).where(and(eq(cityTipVotes.tipId, tipId), eq(cityTipVotes.userId, req.user!.id)));
      await db.update(cityTips).set({ votes: sql`${cityTips.votes} - 1` }).where(eq(cityTips.id, tipId));
      return res.json({ voted: false });
    }
    await db.insert(cityTipVotes).values({ tipId, userId: req.user!.id });
    await db.update(cityTips).set({ votes: sql`${cityTips.votes} + 1` }).where(eq(cityTips.id, tipId));
    res.json({ voted: true });
  });

  app.delete('/api/city-tips/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tipId = parseInt(req.params.id);
    if (isNaN(tipId)) return res.status(400).json({ error: 'Invalid ID' });
    const [tip] = await db.select().from(cityTips).where(eq(cityTips.id, tipId));
    if (!tip) return res.status(404).json({ error: 'Not found' });
    if (tip.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
    await db.delete(cityTips).where(eq(cityTips.id, tipId));
    res.json({ ok: true });
  });

  // Adventure photos — community album
  app.get('/api/album', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const limit = Math.min(parseInt(String(req.query.limit || 20)), 50);
    const offset = parseInt(String(req.query.offset || 0));
    const rows = await db
      .select({
        id: adventurePhotos.id,
        photoUrl: adventurePhotos.photoUrl,
        caption: adventurePhotos.caption,
        city: adventurePhotos.city,
        createdAt: adventurePhotos.createdAt,
        userId: adventurePhotos.userId,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(adventurePhotos)
      .leftJoin(users, eq(adventurePhotos.userId, users.id))
      .orderBy(desc(adventurePhotos.createdAt))
      .limit(limit)
      .offset(offset);
    res.json({ photos: rows });
  });

  app.post('/api/album', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { photoUrl, caption, city } = req.body;
    if (!photoUrl) return res.status(400).json({ error: 'photoUrl required' });
    const [created] = await db.insert(adventurePhotos).values({
      userId: req.user!.id,
      photoUrl,
      caption: caption || null,
      city: city || null,
    }).returning();
    res.status(201).json(created);
  });

  app.delete('/api/album/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [photo] = await db.select().from(adventurePhotos).where(eq(adventurePhotos.id, id));
    if (!photo) return res.sendStatus(404);
    if (photo.userId !== req.user!.id) return res.sendStatus(403);
    await db.delete(adventurePhotos).where(eq(adventurePhotos.id, id));
    res.json({ success: true });
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
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);

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
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);

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
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);

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

  // ============ PUBLIC STATS (no auth required) ============
  app.get('/api/stats/users', async (_req, res) => {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .innerJoin(photos, eq(photos.userId, users.id));
      res.json({ activeUsers: Number(result?.count ?? 0) });
    } catch {
      res.json({ activeUsers: 0 });
    }
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

  // ───────────────────────────────────────────────────────────────────────────
  // PROFILE VIEWS
  // ───────────────────────────────────────────────────────────────────────────
  // Record a profile view (called when opening a profile card)
  app.post('/api/profile-views/:viewedId', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const viewerId = req.user!.id;
    const { viewedId } = req.params;
    if (viewerId === viewedId) return res.json({ ok: true }); // don't track self-views
    try {
      // Don't record views between blocked users
      const blockedSet = await getBlockedIds(viewerId);
      if (blockedSet.has(viewedId)) return res.json({ ok: true });

      // Avoid duplicate in the last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [existing] = await db.select().from(profileViews)
        .where(and(
          eq(profileViews.viewerId, viewerId),
          eq(profileViews.viewedId, viewedId),
          gte(profileViews.createdAt, oneDayAgo)
        ));
      if (!existing) {
        await db.insert(profileViews).values({ viewerId, viewedId });
        // Only notify Premium users about profile views
        const [viewedUser] = await db.select({ isPremium: users.isPremium, notificationPrefs: (users as any).notificationPrefs })
          .from(users).where(eq(users.id, viewedId));
        const isViewedUserPremium = viewedUser?.isPremium === 'true';
        if (isViewedUserPremium) {
          await db.insert(notifications).values({
            userId: viewedId,
            type: "view",
            title: "👀 Alguien vio tu perfil",
            body: "Una persona ha visitado tu perfil hoy. ¡Toca para ver quién fue!",
            link: "/premium",
            read: false,
          });
          // Push notification (respects user prefs)
          try {
            const prefs = viewedUser?.notificationPrefs ? JSON.parse(viewedUser.notificationPrefs as string) : { profileViews: true };
            if (prefs.profileViews !== false) {
              sendPushNotification(viewedId, {
                title: "👀 Alguien vio tu perfil",
                body: "Una persona ha visitado tu perfil hoy. ¡Abre FallonYou para verlo!",
                url: "/premium",
              }).catch(() => {});
            }
          } catch { /* non-fatal */ }
        }
      }
      res.json({ ok: true });
    } catch { res.json({ ok: true }); }
  });

  // Get my profile viewers (last 30 days) - returns count + users if premium
  app.get('/api/profile-views/viewers', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [views, blockedSet] = await Promise.all([
      db.select().from(profileViews)
        .where(and(eq(profileViews.viewedId, userId), gte(profileViews.createdAt, thirtyDaysAgo)))
        .orderBy(desc(profileViews.createdAt)),
      getBlockedIds(userId),
    ]);
    const uniqueViewerIds = [...new Set(views.map(v => v.viewerId))].filter(id => !blockedSet.has(id));
    const isPremium = req.user!.isPremium === 'true';
    if (!isPremium) {
      return res.json({ count: uniqueViewerIds.length, viewers: [] });
    }
    const viewerUsers = uniqueViewerIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, uniqueViewerIds.slice(0, 20)))
      : [];
    const [allProfiles, allPhotos] = await Promise.all([
      viewerUsers.length > 0 ? db.select().from(profiles).where(inArray(profiles.userId, viewerUsers.map(u => u.id))) : [],
      viewerUsers.length > 0 ? db.select().from(photos).where(inArray(photos.userId, viewerUsers.map(u => u.id))) : [],
    ]);
    const enriched = viewerUsers.map(u => ({
      ...u,
      profile: allProfiles.find(p => p.userId === u.id),
      photos: allPhotos.filter(p => p.userId === u.id),
    }));
    res.json({ count: uniqueViewerIds.length, viewers: enriched });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STORIES (24h)
  // ───────────────────────────────────────────────────────────────────────────
  // Get active stories of users I follow or all users (discover)
  app.get('/api/stories', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUserId = req.user!.id;
    const now = new Date();
    const [activeStories, blockedSet] = await Promise.all([
      db.select({
        id: stories.id,
        userId: stories.userId,
        mediaUrl: stories.mediaUrl,
        caption: stories.caption,
        expiresAt: stories.expiresAt,
        createdAt: stories.createdAt,
      }).from(stories)
        .where(gte(stories.expiresAt, now))
        .orderBy(desc(stories.createdAt)),
      getBlockedIds(currentUserId),
    ]);
    if (activeStories.length === 0) return res.json([]);
    // Filter out stories from blocked users (keep own stories)
    const visibleStories = activeStories.filter(s => s.userId === currentUserId || !blockedSet.has(s.userId));
    if (visibleStories.length === 0) return res.json([]);
    const userIds = [...new Set(visibleStories.map(s => s.userId))];
    const [storyUsers, storyPhotos] = await Promise.all([
      db.select().from(users).where(inArray(users.id, userIds)),
      db.select().from(photos).where(inArray(photos.userId, userIds)),
    ]);
    // Group stories by user
    const grouped = userIds.map(uid => {
      const user = storyUsers.find(u => u.id === uid);
      const photo = storyPhotos.find(p => p.userId === uid);
      return {
        userId: uid,
        userName: user?.firstName || "Alguien",
        userPhoto: photo?.url || user?.profileImageUrl || null,
        stories: visibleStories.filter(s => s.userId === uid),
      };
    });
    res.json(grouped);
  });

  // Create a story
  app.post('/api/stories', upload.single('media'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    let mediaUrl: string;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    } else if (req.body?.mediaUrl) {
      mediaUrl = req.body.mediaUrl; // fallback for direct URL
    } else {
      return res.status(400).json({ error: "media file required" });
    }
    const caption = req.body?.caption || null;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db.insert(stories).values({
      userId: req.user!.id, mediaUrl, caption, expiresAt,
    }).returning();
    res.json(story);
  });

  // Delete my story
  app.delete('/api/stories/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await db.delete(stories).where(
      and(eq(stories.id, parseInt(req.params.id)), eq(stories.userId, req.user!.id))
    );
    res.json({ ok: true });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // IN-APP NOTIFICATIONS
  // ───────────────────────────────────────────────────────────────────────────
  app.get('/api/notifications', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const myNotifs = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json(myNotifs);
  });

  app.get('/api/notifications/unread-count', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [result] = await db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.userId, req.user!.id), eq(notifications.read, false)));
    res.json({ count: result?.count ?? 0 });
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, parseInt(req.params.id)), eq(notifications.userId, req.user!.id)));
    res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, req.user!.id));
    res.json({ ok: true });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // BUSINESS PARTNERS & LOCAL OFFERS
  // ───────────────────────────────────────────────────────────────────────────
  // Public: list active offers
  app.get('/api/offers', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const now = new Date();
    const activeOffers = await db.select({
      id: localOffers.id,
      title: localOffers.title,
      description: localOffers.description,
      discount: localOffers.discount,
      code: localOffers.code,
      validUntil: localOffers.validUntil,
      partnerName: businessPartners.name,
      partnerCity: businessPartners.city,
      partnerCategory: businessPartners.category,
      partnerLogo: businessPartners.logoUrl,
    }).from(localOffers)
      .innerJoin(businessPartners, eq(localOffers.partnerId, businessPartners.id))
      .where(and(
        eq(localOffers.active, true),
        eq(businessPartners.status, 'active'),
        or(sql`${localOffers.validUntil} IS NULL`, gte(localOffers.validUntil, now))
      ))
      .orderBy(desc(localOffers.createdAt));
    res.json(activeOffers);
  });

  // Admin: list all partners
  app.get('/api/admin/partners', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const partners = await db.select().from(businessPartners).orderBy(desc(businessPartners.createdAt));
    res.json(partners);
  });

  // Admin: create partner
  app.post('/api/admin/partners', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const { name, description, city, category, contactEmail, logoUrl, website, status } = req.body;
    if (!name || !city || !category || !contactEmail) return res.status(400).json({ error: "Missing fields" });
    const [partner] = await db.insert(businessPartners).values({ name, description, city, category, contactEmail, logoUrl, website, status: status || 'active' }).returning();
    res.json(partner);
  });

  // Admin: update partner status
  app.patch('/api/admin/partners/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const [partner] = await db.update(businessPartners)
      .set(req.body)
      .where(eq(businessPartners.id, parseInt(req.params.id)))
      .returning();
    res.json(partner);
  });

  // Admin: create offer for a partner
  app.post('/api/admin/offers', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const { partnerId, title, description, discount, code, validUntil } = req.body;
    if (!partnerId || !title || !description) return res.status(400).json({ error: "Missing fields" });
    const [offer] = await db.insert(localOffers).values({
      partnerId: parseInt(partnerId), title, description, discount, code,
      validUntil: validUntil ? new Date(validUntil) : null,
    }).returning();
    res.json(offer);
  });

  // Admin: list all offers
  app.get('/api/admin/offers', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const offers = await db.select({
      id: localOffers.id,
      title: localOffers.title,
      description: localOffers.description,
      discount: localOffers.discount,
      code: localOffers.code,
      validUntil: localOffers.validUntil,
      active: localOffers.active,
      partnerName: businessPartners.name,
      partnerCity: businessPartners.city,
    }).from(localOffers)
      .innerJoin(businessPartners, eq(localOffers.partnerId, businessPartners.id))
      .orderBy(desc(localOffers.createdAt));
    res.json(offers);
  });

  app.patch('/api/admin/offers/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const [offer] = await db.update(localOffers)
      .set(req.body)
      .where(eq(localOffers.id, parseInt(req.params.id)))
      .returning();
    res.json(offer);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AMBASSADOR APPLICATIONS
  // ───────────────────────────────────────────────────────────────────────────
  app.post('/api/ambassador/apply', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { name, email, city, instagram, motivation, followers } = req.body;
    if (!name || !email || !city || !motivation) {
      return res.status(400).json({ error: "name, email, city, motivation are required" });
    }
    const [application] = await db.insert(ambassadorApplications).values({
      userId: req.user!.id, name, email, city, instagram, motivation, followers,
    }).returning();
    // Notify admin
    await db.insert(notifications).values({
      userId: req.user!.id,
      type: "system",
      title: "¡Solicitud de embajador enviada!",
      body: "Revisaremos tu solicitud y te contactaremos pronto.",
      link: "/profile",
      read: false,
    });
    res.json(application);
  });

  // Admin: list ambassador applications
  app.get('/api/admin/ambassadors', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const apps = await db.select().from(ambassadorApplications).orderBy(desc(ambassadorApplications.createdAt));
    res.json(apps);
  });

  app.patch('/api/admin/ambassadors/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.email !== 'fallonyouapp@hotmail.com') return res.sendStatus(403);
    const [app2] = await db.update(ambassadorApplications)
      .set({ status: req.body.status })
      .where(eq(ambassadorApplications.id, parseInt(req.params.id)))
      .returning();
    res.json(app2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGAGEMENT FEATURES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 1. Login streak ────────────────────────────────────────────────────────
  app.get('/api/streak', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    try {
      // Get all session dates for this user, ordered descending
      const rows = await db.execute(sql`
        SELECT date FROM app_sessions
        WHERE user_id = ${userId}
        ORDER BY date DESC
      `);
      const dates: string[] = (rows.rows as any[]).map((r: any) => r.date);
      if (dates.length === 0) return res.json({ streak: 0, longestStreak: 0 });

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      // Current streak: count consecutive days from today or yesterday
      let streak = 0;
      let expected = dates[0] === today ? today : (dates[0] === yesterday ? yesterday : null);
      if (!expected) return res.json({ streak: 0, longestStreak: 1 });

      for (const d of dates) {
        if (d === expected) {
          streak++;
          const prev = new Date(new Date(expected).getTime() - 86400000).toISOString().slice(0, 10);
          expected = prev;
        } else break;
      }

      // Longest streak
      let longest = 1, current = 1;
      const sorted = [...dates].sort();
      for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
        if (diff === 1) { current++; longest = Math.max(longest, current); }
        else current = 1;
      }

      res.json({ streak, longestStreak: longest });
    } catch {
      res.json({ streak: 0, longestStreak: 0 });
    }
  });

  // ── 2. Profile views today ─────────────────────────────────────────────────
  app.get('/api/profile-views/today', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [{ cnt }] = (await db.execute(sql`
        SELECT COUNT(DISTINCT viewer_id)::int AS cnt
        FROM profile_views
        WHERE viewed_id = ${userId} AND created_at >= ${todayStart.toISOString()}
      `)).rows as any[];
      res.json({ count: cnt ?? 0 });
    } catch {
      res.json({ count: 0 });
    }
  });

  // ── 3. Daily Spark ─────────────────────────────────────────────────────────
  // Returns a single featured profile per day (deterministic per user + date)
  app.get('/api/daily-spark', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Seed: hash(userId + date) mod N to pick a profile
      const seedStr = userId + today;
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;

      // Get users that this user hasn't swiped on yet, excluding self and blocked
      const [swipedRows, blockedSet] = await Promise.all([
        db.select({ id: swipes.swipedId }).from(swipes).where(eq(swipes.swiperId, userId)),
        getBlockedIds(userId),
      ]);
      const swipedIds = swipedRows.map(s => s.id);
      const excludeIds = [userId, ...swipedIds, ...Array.from(blockedSet)];

      // Account must be at least 24h old and have a profile photo to appear in spark
      const minAge = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const candidates = await db.select({
        id: users.id,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
        bio: profiles.bio,
        age: profiles.age,
        occupation: profiles.occupation,
        birthplace: profiles.birthplace,
        currentCity: profiles.currentCity,
      })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(and(
          ne(users.id, userId),
          excludeIds.length > 1 ? sql`${users.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})` : sql`true`,
          eq(users.isBanned, 'false'),
          sql`${users.createdAt} < ${minAge}`,
          sql`${users.profileImageUrl} IS NOT NULL`,
        ))
        .limit(100);

      if (candidates.length === 0) return res.json(null);

      const pick = candidates[seed % candidates.length];

      // Get their photos
      const sparkPhotos = await db.select().from(photos)
        .where(eq(photos.userId, pick.id)).limit(3);

      res.json({ ...pick, photos: sparkPhotos, date: today });
    } catch (e) {
      console.error('Daily spark error:', e);
      res.json(null);
    }
  });

  // ── 4. Achievement badges ──────────────────────────────────────────────────
  app.get('/api/my-badges', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    try {
      const [
        eventsCreated,
        eventsJoined,
        matchCount,
        profileViewTotal,
        streakRow,
        ambassadorRow,
        userRow,
        profileRow,
      ] = await Promise.all([
        db.select({ c: count() }).from(events).where(eq(events.creatorId, userId)),
        db.select({ c: count() }).from(eventParticipants).where(and(eq(eventParticipants.userId, userId), eq(eventParticipants.status, 'going'))),
        db.select({ c: count() }).from(matches).where(or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))),
        db.execute(sql`SELECT COUNT(DISTINCT viewer_id)::int AS c FROM profile_views WHERE viewed_id = ${userId}`),
        db.execute(sql`SELECT date FROM app_sessions WHERE user_id = ${userId} ORDER BY date DESC LIMIT 60`),
        db.select().from(ambassadorApplications).where(and(eq(ambassadorApplications.userId, userId), eq(ambassadorApplications.status, 'approved'))).limit(1),
        db.select().from(users).where(eq(users.id, userId)).limit(1),
        db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
      ]);

      // Compute streak
      const dates: string[] = (streakRow.rows as any[]).map((r: any) => r.date);
      let streak = 0;
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let expected = dates[0] === todayStr ? todayStr : (dates[0] === yesterdayStr ? yesterdayStr : null);
      if (expected) {
        for (const d of dates) {
          if (d === expected) { streak++; expected = new Date(new Date(expected).getTime() - 86400000).toISOString().slice(0, 10); }
          else break;
        }
      }

      const created = Number(eventsCreated[0]?.c ?? 0);
      const joined = Number(eventsJoined[0]?.c ?? 0);
      const matches_ = Number(matchCount[0]?.c ?? 0);
      const views = Number((profileViewTotal.rows[0] as any)?.c ?? 0);
      const isAmb = ambassadorRow.length > 0;
      const isPrem = userRow[0]?.isPremium === 'true';
      const traveler = profileRow[0]?.travelerMode === true;
      const accountAgeDays = userRow[0]?.createdAt
        ? Math.floor((Date.now() - new Date(userRow[0].createdAt).getTime()) / 86400000)
        : 0;

      const badges: { id: string; icon: string; label: string; description: string; earned: boolean }[] = [
        { id: 'explorador', icon: '🌍', label: 'Explorador', description: 'Únete a tu primer plan', earned: joined >= 1 },
        { id: 'organizador', icon: '🎯', label: 'Organizador', description: 'Crea tu primer plan', earned: created >= 1 },
        { id: 'social', icon: '💬', label: 'Conectado', description: 'Consigue 3 conexiones', earned: matches_ >= 3 },
        { id: 'favorito', icon: '👀', label: 'Favorito', description: 'Que 10 personas vean tu perfil', earned: views >= 10 },
        { id: 'racha7', icon: '🔥', label: 'En racha', description: '7 días seguidos activo', earned: streak >= 7 },
        { id: 'racha30', icon: '💎', label: 'Constante', description: '30 días seguidos activo', earned: streak >= 30 },
        { id: 'viajero', icon: '✈️', label: 'Viajero', description: 'Activa el modo viajero', earned: traveler },
        { id: 'veterano', icon: '👑', label: 'Veterano', description: 'Lleva 30 días en FallonYou', earned: accountAgeDays >= 30 },
        { id: 'premium', icon: '⭐', label: 'Premium', description: 'Miembro Premium', earned: isPrem },
        { id: 'embajador', icon: '🏅', label: 'Embajador', description: 'Embajador oficial', earned: isAmb },
      ];

      res.json(badges);
    } catch (e) {
      console.error('Badges error:', e);
      res.json([]);
    }
  });

  // ── Language Hub ────────────────────────────────────────────────────────────

  // Update user language preferences
  app.patch("/api/profile/languages", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const { speaksLanguages, learningLanguages } = req.body;
    await db.update(profiles)
      .set({ speaksLanguages: speaksLanguages ?? [], learningLanguages: learningLanguages ?? [] })
      .where(eq(profiles.userId, userId));
    res.json({ ok: true });
  });

  // Get native speakers of a given language (exclude self + blocked)
  app.get("/api/language/natives", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const lang = (req.query.lang as string) || "en";
    const blocked = await getBlockedIds(userId);
    const rows = await db.execute(sql`
      SELECT u.id, u."firstName", u."profileImageUrl", p.speaks_languages, p.learning_languages,
             p.current_city, p.home_city, p.bio
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      WHERE u.id != ${userId}
        AND u."isBanned" = false
        AND ${lang} = ANY(p.speaks_languages)
      LIMIT 20
    `);
    const natives = (rows.rows as any[])
      .filter(r => !blocked.has(r.id))
      .map(r => ({
        id: r.id,
        firstName: r.firstName,
        profileImageUrl: r.profileImageUrl,
        speaksLanguages: r.speaks_languages || [],
        learningLanguages: r.learning_languages || [],
        city: r.current_city || r.home_city || null,
        bio: r.bio ? r.bio.slice(0, 100) : null,
      }));
    res.json(natives);
  });

  // Get user language preferences
  app.get("/api/profile/languages", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const rows = await db.select({ speaksLanguages: profiles.speaksLanguages, learningLanguages: profiles.learningLanguages })
      .from(profiles).where(eq(profiles.userId, userId)).limit(1);
    res.json(rows[0] || { speaksLanguages: [], learningLanguages: [] });
  });

  // ── Language Quiz ────────────────────────────────────────────────────────────

  // Get today's quiz result for current user
  app.get("/api/language/quiz/today", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const lang = (req.query.lang as string) || "en";
    const rows = await db.execute(sql`
      SELECT score, total, completed_at FROM language_quiz_results
      WHERE user_id = ${userId} AND quiz_date = CURRENT_DATE AND language = ${lang}
      LIMIT 1
    `);
    if (rows.rows.length === 0) return res.json({ completed: false });
    const r = rows.rows[0] as any;
    res.json({ completed: true, score: r.score, total: r.total, completedAt: r.completed_at });
  });

  // Save quiz result
  app.post("/api/language/quiz/result", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const { lang, score, total } = req.body;
    if (typeof score !== "number" || typeof total !== "number" || !lang) {
      return res.status(400).json({ error: "Invalid data" });
    }
    await db.execute(sql`
      INSERT INTO language_quiz_results (user_id, quiz_date, language, score, total)
      VALUES (${userId}, CURRENT_DATE, ${lang}, ${score}, ${total})
      ON CONFLICT (user_id, quiz_date, language) DO UPDATE SET score = ${score}, completed_at = NOW()
    `);
    res.json({ ok: true });
  });

  // Get quiz leaderboard (top scorers today)
  app.get("/api/language/quiz/leaderboard", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const lang = (req.query.lang as string) || "en";
    const rows = await db.execute(sql`
      SELECT u."firstName", u."profileImageUrl", r.score, r.total
      FROM language_quiz_results r
      JOIN users u ON u.id = r.user_id
      WHERE r.quiz_date = CURRENT_DATE AND r.language = ${lang}
      ORDER BY r.score DESC
      LIMIT 10
    `);
    res.json(rows.rows);
  });

  // ── Language Level Progress ────────────────────────────────────────────────

  app.get("/api/language/progress", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const lang = (req.query.lang as string) || "en";
    const rows = await db.select().from(languageProgress).where(
      and(eq(languageProgress.userId, userId), eq(languageProgress.language, lang))
    );
    res.json({ completedLessons: rows.map(r => r.lessonId) });
  });

  app.post("/api/language/progress", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const { language, level, lessonId } = req.body;
    if (!language || !level || !lessonId) return res.status(400).json({ error: "Missing fields" });
    if (level === "b2plus") {
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      const isPremium = (user as any)?.isPremium === true || (user as any)?.isPremium === "true" ||
        ((user as any)?.trialEndsAt && new Date((user as any).trialEndsAt) > new Date());
      if (!isPremium) return res.status(403).json({ error: "Premium required for B2+" });
    }
    await db.insert(languageProgress).values({ userId, language, level, lessonId }).onConflictDoNothing();
    res.json({ ok: true });
  });

  app.get("/api/language/my-level", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const rows = await db.select().from(languageProgress).where(eq(languageProgress.userId, userId));
    const LEVEL_ORDER = ["a1", "a2", "b1", "b2plus"];
    const LEVEL_LABELS: Record<string, string> = { a1: "A1", a2: "A2", b1: "B1", b2plus: "B2+" };
    const LESSONS_REQUIRED: Record<string, string[]> = {
      a1: ["a1-greetings"],
      a2: ["a2-airport", "a2-transport"],
      b1: ["b1-restaurant", "b1-hotel", "b1-social"],
      b2plus: ["b2-emergency", "b2-social-adv"],
    };
    const byLang: Record<string, string[]> = {};
    for (const r of rows) {
      if (!byLang[r.language]) byLang[r.language] = [];
      byLang[r.language].push(r.lessonId);
    }
    let bestLevel: string | null = null;
    let bestLang: string | null = null;
    for (const [lang, completed] of Object.entries(byLang)) {
      for (let i = LEVEL_ORDER.length - 1; i >= 0; i--) {
        const lv = LEVEL_ORDER[i];
        const required = LESSONS_REQUIRED[lv] ?? [];
        if (required.length > 0 && required.every(id => completed.includes(id))) {
          if (bestLevel === null || LEVEL_ORDER.indexOf(lv) > LEVEL_ORDER.indexOf(bestLevel)) {
            bestLevel = lv; bestLang = lang;
          }
          break;
        }
      }
    }
    res.json({ level: bestLevel, levelLabel: bestLevel ? LEVEL_LABELS[bestLevel] : null, language: bestLang });
  });

  // ── Dream Destinations ────────────────────────────────────────────────────

  // Get my dream destinations
  app.get("/api/dream-destinations/mine", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const rows = await db.execute(sql`
      SELECT id, destination, country, emoji, created_at
      FROM dream_destinations
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);
  });

  // Add a dream destination
  app.post("/api/dream-destinations", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const { destination, country, emoji } = req.body;
    if (!destination || typeof destination !== "string" || destination.trim().length < 2) {
      return res.status(400).json({ error: "Destino inválido" });
    }
    const trimmed = destination.trim().slice(0, 120);
    const trimmedCountry = (country || "").trim().slice(0, 80) || null;
    const trimmedEmoji = (emoji || "✈️").trim().slice(0, 10);
    try {
      const result = await db.execute(sql`
        INSERT INTO dream_destinations (user_id, destination, country, emoji)
        VALUES (${userId}, ${trimmed}, ${trimmedCountry}, ${trimmedEmoji})
        ON CONFLICT (user_id, destination) DO NOTHING
        RETURNING id, destination, country, emoji, created_at
      `);
      if (result.rows.length === 0) return res.status(409).json({ error: "Ya tienes este destino en tu lista" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a dream destination
  app.delete("/api/dream-destinations/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const destId = parseInt(req.params.id);
    if (isNaN(destId)) return res.status(400).json({ error: "Invalid id" });
    await db.execute(sql`
      DELETE FROM dream_destinations WHERE id = ${destId} AND user_id = ${userId}
    `);
    res.json({ ok: true });
  });

  // Get trending destinations (most wanted)
  app.get("/api/dream-destinations/trending", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const rows = await db.execute(sql`
      SELECT destination, country, emoji,
             COUNT(*) AS traveler_count,
             ARRAY_AGG(DISTINCT u."profileImageUrl") FILTER (WHERE u."profileImageUrl" IS NOT NULL) AS avatars
      FROM dream_destinations dd
      JOIN users u ON u.id = dd.user_id
      GROUP BY destination, country, emoji
      ORDER BY traveler_count DESC
      LIMIT 20
    `);
    res.json(rows.rows);
  });

  // ─── Notification Preferences ──────────────────────────────────────────────
  app.get("/api/notifications/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [u] = await db.select({ notificationPrefs: (users as any).notificationPrefs })
      .from(users).where(eq(users.id, req.user!.id));
    const defaultPrefs = { profileViews: true, newTravelers: true, matches: true, messages: true, events: true };
    try {
      const prefs = u?.notificationPrefs ? { ...defaultPrefs, ...JSON.parse(u.notificationPrefs as string) } : defaultPrefs;
      res.json(prefs);
    } catch {
      res.json(defaultPrefs);
    }
  });

  app.patch("/api/notifications/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const allowed = ["profileViews", "newTravelers", "matches", "messages", "events"];
    const patch: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof req.body[key] === "boolean") patch[key] = req.body[key];
    }
    // Merge with existing prefs
    const [u] = await db.select({ notificationPrefs: (users as any).notificationPrefs })
      .from(users).where(eq(users.id, req.user!.id));
    const existing = u?.notificationPrefs ? JSON.parse(u.notificationPrefs as string) : {};
    const merged = { ...existing, ...patch };
    await db.execute(sql`UPDATE users SET notification_prefs = ${JSON.stringify(merged)} WHERE id = ${req.user!.id}`);
    res.json(merged);
  });

  // Get travelers who want the same destination
  app.get("/api/dream-destinations/travelers", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const userId = (req.user as any).id;
    const destination = req.query.destination as string;
    if (!destination) return res.status(400).json({ error: "destination required" });
    const rows = await db.execute(sql`
      SELECT u.id, u."firstName", u."profileImageUrl", p.city, p.age, p.bio
      FROM dream_destinations dd
      JOIN users u ON u.id = dd.user_id
      LEFT JOIN profiles p ON p."userId" = u.id
      WHERE LOWER(dd.destination) = LOWER(${destination})
        AND dd.user_id != ${userId}
      ORDER BY dd.created_at DESC
      LIMIT 30
    `);
    res.json(rows.rows);
  });

  // ── Local Help Requests ────────────────────────────────────────────────────

  // GET all open requests (optionally filter by city)
  app.get('/api/local-help', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const city = req.query.city as string | undefined;
    const blockedSet = await getBlockedIds(req.user!.id);

    let query = db
      .select({
        id: localHelpRequests.id,
        userId: localHelpRequests.userId,
        city: localHelpRequests.city,
        category: localHelpRequests.category,
        description: localHelpRequests.description,
        status: localHelpRequests.status,
        budget: localHelpRequests.budget,
        createdAt: localHelpRequests.createdAt,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(localHelpRequests)
      .leftJoin(users, eq(localHelpRequests.userId, users.id))
      .where(eq(localHelpRequests.status, 'open'))
      .orderBy(desc(localHelpRequests.createdAt))
      .limit(50);

    const rows = await query;
    const filtered = rows.filter(r => !blockedSet.has(r.userId));
    const cityFiltered = city ? filtered.filter(r => r.city.toLowerCase().includes(city.toLowerCase())) : filtered;

    // Add offerCount and whether current user already offered
    const withCounts = await Promise.all(cityFiltered.map(async (r) => {
      const [offerRow] = await db.select({ count: count() }).from(localHelpOffers).where(eq(localHelpOffers.requestId, r.id));
      const myOffer = await db.select().from(localHelpOffers).where(and(eq(localHelpOffers.requestId, r.id), eq(localHelpOffers.helperId, req.user!.id))).limit(1);
      return { ...r, offerCount: Number(offerRow?.count || 0), iOffered: myOffer.length > 0 };
    }));

    res.json(withCounts);
  });

  // GET my own requests
  app.get('/api/local-help/mine', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rows = await db
      .select()
      .from(localHelpRequests)
      .where(eq(localHelpRequests.userId, req.user!.id))
      .orderBy(desc(localHelpRequests.createdAt));
    res.json(rows);
  });

  // POST create a new request
  app.post('/api/local-help', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { city, category, description, budget } = req.body;
    if (!city || !category || !description?.trim()) {
      return res.status(400).json({ error: 'city, category and description required' });
    }
    const budgetVal = budget && !isNaN(parseInt(budget)) && parseInt(budget) > 0 ? parseInt(budget) : null;
    const [row] = await db.insert(localHelpRequests).values({
      userId: req.user!.id,
      city: city.trim(),
      category,
      description: description.trim(),
      budget: budgetVal,
    }).returning();
    res.status(201).json(row);
  });

  // PATCH mark as resolved
  app.patch('/api/local-help/:id/resolve', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(localHelpRequests).where(eq(localHelpRequests.id, id)).limit(1);
    if (!row) return res.sendStatus(404);
    if (row.userId !== req.user!.id) return res.sendStatus(403);
    await db.update(localHelpRequests).set({ status: 'resolved' }).where(eq(localHelpRequests.id, id));
    res.json({ ok: true });
  });

  // DELETE own request
  app.delete('/api/local-help/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(localHelpRequests).where(eq(localHelpRequests.id, id)).limit(1);
    if (!row) return res.sendStatus(404);
    if (row.userId !== req.user!.id) return res.sendStatus(403);
    await db.delete(localHelpRequests).where(eq(localHelpRequests.id, id));
    res.json({ ok: true });
  });

  // POST offer to help — sends notification to requester
  app.post('/api/local-help/:id/offer', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(localHelpRequests).where(eq(localHelpRequests.id, id)).limit(1);
    if (!row) return res.sendStatus(404);
    if (row.userId === req.user!.id) return res.status(400).json({ error: 'Cannot offer on your own request' });

    // Upsert offer
    await db.insert(localHelpOffers).values({ requestId: id, helperId: req.user!.id }).onConflictDoNothing();

    // In-app notification to requester
    const helperProfile = await storage.getProfile(req.user!.id);
    const helperName = helperProfile?.displayName || req.user!.firstName || 'Alguien';
    await db.insert(notifications).values({
      userId: row.userId,
      type: 'local_help_offer',
      title: `🤝 ${helperName} quiere ayudarte`,
      body: `Ha respondido a tu petición de ayuda en ${row.city}`,
      link: `/local-help`,
      read: false,
    }).catch(() => {});

    sendPushNotification(row.userId, {
      title: `🤝 ${helperName} quiere ayudarte`,
      body: `Ha respondido a tu petición en ${row.city}`,
      url: '/local-help',
    }).catch(() => {});

    res.json({ ok: true });
  });

  // POST proactive help offer — user says "I can help you" to another user's profile
  app.post('/api/proactive-help/:userId', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const targetUserId = req.params.userId;
    if (targetUserId === req.user!.id) return res.status(400).json({ error: 'Cannot offer help to yourself' });

    const { type, amount } = req.body; // type: 'free' | 'paid', amount?: number
    const helperProfile = await storage.getProfile(req.user!.id);
    const helperName = helperProfile?.displayName || req.user!.firstName || 'Alguien';

    const isFree = type === 'free';
    const compensationText = isFree ? 'sin pedir nada a cambio ❤️' : `a cambio de un mínimo de ${amount || '?'}€ 💶`;

    await db.insert(notifications).values({
      userId: targetUserId,
      type: 'proactive_help',
      title: `🤝 ${helperName} puede ayudarte`,
      body: `Se ha ofrecido a ayudarte ${compensationText}`,
      link: `/matches`,
      read: false,
    }).catch(() => {});

    sendPushNotification(targetUserId, {
      title: `🤝 ${helperName} puede ayudarte`,
      body: `Se ha ofrecido a ayudarte ${compensationText}`,
      url: '/matches',
    }).catch(() => {});

    res.json({ ok: true });
  });

  // GET offers received on my requests (to see who wants to help me)
  app.get('/api/local-help/:id/offers', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(localHelpRequests).where(eq(localHelpRequests.id, id)).limit(1);
    if (!row) return res.sendStatus(404);
    if (row.userId !== req.user!.id) return res.sendStatus(403);

    const offers = await db
      .select({
        id: localHelpOffers.id,
        helperId: localHelpOffers.helperId,
        createdAt: localHelpOffers.createdAt,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(localHelpOffers)
      .leftJoin(users, eq(localHelpOffers.helperId, users.id))
      .where(eq(localHelpOffers.requestId, id));

    res.json(offers);
  });

  return httpServer;
}
