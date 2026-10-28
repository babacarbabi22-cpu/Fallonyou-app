
import type { Express } from "express";
import { createAccountDeletionHandler } from "./accountDeletion";
import type { Server } from "http";
import { setupAuth, getSession, isAuthenticated } from "./auth";
import { createAdminPasswordRecoveryHandler } from "./adminPasswordRecovery";
import { adminAccountStatusColumns } from "./adminAccountStatus";
import { passwordRecoveryRepository, newRecoveryToken } from "./passwordRecovery";
import { setupChatWebSocket } from "./wsChat";
import { notifyMessageRecipient } from "./messageNoticesRepository";
import { registerPlaceReviewRoutes } from "./placeReviews";
import { registerNativePushRoutes } from "./nativePush";
import { EndedMatchConnectionError, storage } from "./storage";
import { createMemberProfileHandler } from "./memberProfile";
import { db } from "./db";
import { parseMemberPage, discoveryMemberPage, directoryMemberPage } from "./memberPaging";
import { messagePage, parseMessageCursor } from "./messagePaging";
import { users, profiles, photos, events, eventParticipants, eventComments, eventRatings, matches, preferences, referrals, profileViews, stories, businessPartners, localOffers, notifications, swipes, ambassadorApplications, appSessions, blockedUsers, adventurePhotos, cityTips, cityTipVotes, localHelpRequests, localHelpOffers, languageProgress, trips, tripBookings, layovers, aviationRoles, layoverActivityTypes } from "@shared/schema";
import { CURRENT_TERMS_VERSION } from "@shared/terms";
import { eq, and, desc, ilike, gte, inArray, or, sql, lt, ne, count, gt } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerLanguageExchangeRoutes } from "./languageExchange";
import { registerLanguageCourseRoutes } from "./languageCourse";
import { registerWritingCourseRoutes } from "./writingCourse";
import { hasLanguagePremium } from "@shared/language-course";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "path";
import { readFile, unlink } from "fs/promises";
import express from "express";
import { createLocalMediaAuthorization } from "./localMediaAccess";
import { hasPersonalPreferencesConsent, validatePersonalPreferencesPatch, PERSONAL_PREFERENCES_CONSENT_VERSION, PersonalPreferencesConsentError } from "@shared/personal-preferences-consent";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { saveSubscription, removeSubscription, sendPushNotification, sendPushToAllExcept, getVapidPublicKey } from "./pushService";
import { sendWeeklyNotifications, sendEventReminders, sendPhotoReminderEmails } from "./weeklyNotifications";
import { sendReferralEmail, sendAdminAlert, sendPasswordResetEmail, isConfigured as emailDeliveryReady } from "./emailService";
import { duffelConfigured } from "./duffelService";
import { flightSearchEnabled } from "@shared/travel-availability";
import { hasImageUrl, requireContentLicense } from "./contentLicense";
import { ageVisibilityPatchSchema, publicAgeColumn, publicPhotoColumns, publicProfileColumns, publicUserColumns, toCurrentProfile, toPublicPhoto, toPublicProfile, toPublicUser } from "./publicUser";
import { canRateConnection, getValidPremiumExpiry, hotelAndPackageSalesEnabled, stripeCustomerMatches } from "./releaseSafety";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_UPLOAD_BYTES, canSendChatMessage, hasValidRasterImageSignature, validateImageUploadMetadata } from "./replit_integrations/object_storage/mediaSecurity";
import { getMediaCleanupSummary, retryMediaCleanup, recordMediaUpload, finishMediaUpload } from "./mediaDeletionRepository";
import { requireUploadAuthentication, trackLocalMediaUpload } from "./localMediaUpload";
import { createStoryUploadHandler } from "./storyUploadHandler";
import { canViewStory } from "@shared/story-audience";
import { getAcceptedStoryConnections } from "./storyAudienceAccess";
import { createNotificationPreferencesHandlers } from "./notificationPreferences";
import { notifyConnection, registerEngagementRoutes, startLearningReminderScheduler } from "./engagementService";
import { createConnectionRequestsHandler } from "./connectionRequests";
import { sortConnectionsNewestFirst } from "@shared/connection-time";
import { parseNotificationPreferences } from "@shared/notification-preferences";
import { createConnectionSummaryHandler, getConnectionSummary } from "./connectionSummary";
import { createProfilePhotoGate } from "./profilePhotoGate";
import { userHasProfilePhoto } from "./profilePhotoAccess";

let paypalModule: any = null;
// Fail closed while the Android version is being reviewed in Google Play.
// Set PREMIUM_PURCHASES_ENABLED=true only after a Play-compliant billing
// implementation is ready.
const premiumPurchasesEnabled = process.env.PREMIUM_PURCHASES_ENABLED === "true";

async function loadPayPal() {
  if (!paypalModule && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    paypalModule = await import("./paypal");
  }
  return paypalModule;
}

const photoUpload = multer({
  dest: "uploads/",
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES },
  fileFilter: (_req, file, callback) => {
    const error = validateImageUploadMetadata({
      name: file.originalname,
      size: 1,
      contentType: file.mimetype,
    });
    callback(null, !error && ALLOWED_IMAGE_TYPES.has(file.mimetype.toLowerCase()));
  },
});

const aviationProfilePatchSchema = z.object({
  aviationOptIn: z.boolean().optional(),
  aviationRole: z.enum(aviationRoles).nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.aviationOptIn === true && !value.aviationRole) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["aviationRole"],
      message: "An aviation role is required when aviation mode is enabled",
    });
  }
});

const layoverInputSchema = z.object({
  city: z.string().trim().min(1).max(100),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  activityType: z.enum(layoverActivityTypes),
}).strict().superRefine((value, ctx) => {
  const start = new Date(value.startsAt);
  const end = new Date(value.endsAt);
  if (start <= new Date()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "Start time must be in the future" });
  if (end <= start) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End time must be after start time" });
  if (end.getTime() - start.getTime() > 48 * 60 * 60 * 1000) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Layovers cannot exceed 48 hours" });
});

const layoverSearchSchema = z.object({
  city: z.string().trim().min(1).max(100).optional(),
  activityType: z.enum(layoverActivityTypes).optional(),
}).strict();

async function purgeExpiredLayovers() {
  await db.delete(layovers).where(lt(layovers.endsAt, new Date()));
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
  purgeExpiredLayovers().catch((error) => {
    console.error("[layovers] Failed to purge expired records:", error);
  });
  const layoverPurgeTimer = setInterval(() => {
    purgeExpiredLayovers().catch((error) => {
      console.error("[layovers] Failed to purge expired records:", error);
    });
  }, 6 * 60 * 60 * 1000);
  layoverPurgeTimer.unref();
  httpServer.once("close", () => clearInterval(layoverPurgeTimer));

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
  registerPlaceReviewRoutes(app);
  registerNativePushRoutes(app);
  const chatWS = setupChatWebSocket(httpServer, getSession());
  registerObjectStorageRoutes(app, requireContentLicense());
  const mediaStorage = new ObjectStorageService();

  app.use("/uploads", createLocalMediaAuthorization(), express.static("uploads", { dotfiles: "deny", fallthrough: false }));
  // Account setup and photo uploads stay accessible; community APIs require a photo.
  app.use(createProfilePhotoGate(userHasProfilePhoto));

  // Accept terms & conditions
  app.post('/api/accept-terms', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.body?.termsVersion !== CURRENT_TERMS_VERSION || req.body?.contentLicenseAccepted !== true) {
      return res.status(400).json({ error: "Acceptance of the current terms and content license is required" });
    }
    await db.update(users)
      .set({ termsAcceptedAt: new Date(), termsAcceptedVersion: CURRENT_TERMS_VERSION })
      .where(eq(users.id, req.user!.id));
    res.json({ success: true });
  });

  // Batch helper: enrich user list with profiles + photos (3 queries instead of 1+2N)
  async function enrichUsers(userList: { id: string; [key: string]: any }[]) {
    if (userList.length === 0) return [];
    const ids = userList.map(u => u.id);
    const [allProfiles, allPhotos] = await Promise.all([
      db.select({ userId: profiles.userId, ...publicProfileColumns }).from(profiles).where(inArray(profiles.userId, ids)),
      db.select({ userId: photos.userId, ...publicPhotoColumns }).from(photos).where(inArray(photos.userId, ids)),
    ]);
    const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
    const photosMap = new Map<string, typeof allPhotos>();
    for (const p of allPhotos) {
      if (!photosMap.has(p.userId)) photosMap.set(p.userId, []);
      photosMap.get(p.userId)!.push(p);
    }
    return userList.map(u => ({
      ...toPublicUser(u),
      profile: toPublicProfile(profileMap.get(u.id)),
      photos: (photosMap.get(u.id) ?? []).map(toPublicPhoto),
    }));
  }

  // Users
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUserId = req.user!.id;

    let page;
    try { page = parseMemberPage(req.query); }
    catch { return res.status(400).json({ error: "Invalid pagination" }); }
    const [[userPrefs], [viewerPreferencesConsent]] = await Promise.all([
      db.select().from(preferences).where(eq(preferences.userId, currentUserId)),
      db.select({
        personalPreferencesConsentAt: profiles.personalPreferencesConsentAt,
        personalPreferencesConsentVersion: profiles.personalPreferencesConsentVersion,
      }).from(profiles).where(eq(profiles.userId, currentUserId)),
    ]);
    const showMe = hasPersonalPreferencesConsent(viewerPreferencesConsent) ? userPrefs?.showMe ?? 'everyone' : 'everyone';
    const result = await discoveryMemberPage(currentUserId, page, showMe);
    res.setHeader("Cache-Control", "private, no-store");
    if (result.nextCursor) res.setHeader("X-Next-Cursor", result.nextCursor);
    res.json(await enrichUsers(result.items));
  });

  // Browse photographed members independently of swipe history and account age.
  app.get('/api/users/with-photos', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const viewerId = req.user!.id;
      let page;
      try { page = parseMemberPage(req.query); }
      catch { return res.status(400).json({ error: "Invalid pagination" }); }
      const [[viewer], [viewerPhoto]] = await Promise.all([
        db.select({ profileImageUrl: users.profileImageUrl }).from(users).where(eq(users.id, viewerId)).limit(1),
        db.select({ id: photos.id }).from(photos).where(eq(photos.userId, viewerId)).limit(1),
      ]);
      if (!viewer?.profileImageUrl && !viewerPhoto) return res.sendStatus(403);

      const result = await directoryMemberPage(viewerId, page);
      res.setHeader("Cache-Control", "private, no-store");
      if (result.nextCursor) res.setHeader("X-Next-Cursor", result.nextCursor);
      res.json(result.items);
    } catch (error) {
      console.error('Unable to load photographed members:', error);
      res.sendStatus(500);
    }
  });

  app.get("/api/users/:userId/public-profile", createMemberProfileHandler({
    viewerHasPhoto: async (viewerId) => {
      const [[viewer], [photo]] = await Promise.all([
        db.select({ profileImageUrl: users.profileImageUrl }).from(users).where(eq(users.id, viewerId)).limit(1),
        db.select({ id: photos.id }).from(photos).where(eq(photos.userId, viewerId)).limit(1),
      ]);
      return Boolean(viewer?.profileImageUrl || photo);
    },
    blockedIds: getBlockedIds,
    member: async (memberId) => {
      const [member] = await db.select({ ...publicUserColumns, isBanned: users.isBanned })
        .from(users).where(eq(users.id, memberId)).limit(1);
      return member;
    },
    profile: async (memberId) => {
      const [profile] = await db.select(publicProfileColumns)
        .from(profiles).where(eq(profiles.userId, memberId)).limit(1);
      return profile;
    },
    photos: (memberId) => db.select(publicPhotoColumns).from(photos).where(eq(photos.userId, memberId)),
    connection: (viewerId, memberId) => storage.getMatchConnection(viewerId, memberId),
  }));

  app.patch(api.users.updateProfile.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const ageVisibilityPatch = ageVisibilityPatchSchema.parse(req.body);
      const [consentProfile] = await db.select({
        personalPreferencesConsentAt: profiles.personalPreferencesConsentAt,
        personalPreferencesConsentVersion: profiles.personalPreferencesConsentVersion,
      }).from(profiles).where(eq(profiles.userId, req.user!.id));
      try { validatePersonalPreferencesPatch(req.body, consentProfile); }
      catch (error) { return res.status(400).json({ message: (error as Error).message }); }
      // Validate aviation settings separately so existing profile clients remain
      // compatible, while these privacy-sensitive fields never accept coercion.
      const hasAviationPatch = Object.prototype.hasOwnProperty.call(req.body, "aviationOptIn")
        || Object.prototype.hasOwnProperty.call(req.body, "aviationRole");
      const aviationPatch = hasAviationPatch ? aviationProfilePatchSchema.parse({
        aviationOptIn: req.body.aviationOptIn,
        aviationRole: req.body.aviationRole,
      }) : null;
      const { 
        displayName, bio, age, gender, preference,
        zodiacSign, smoking, drinking, children, education,
        occupation, birthplace, height, religion, politics, pets, exercise,
        interests, relationshipType,
        connectionTypes, travelInterests, travelerMode, currentCity, homeCity, latitude, longitude,
        wantToHelp, helpWith, favoriteDestinations, notRecommendedDestinations
      } = req.body;

      const destinationListSchema = z.array(z.string().trim().min(1).max(80)).max(10)
        .refine(items => new Set(items.map(item => item.toLocaleLowerCase())).size === items.length);
      const destinationLists = z.object({
        favoriteDestinations: destinationListSchema.optional(),
        notRecommendedDestinations: destinationListSchema.optional(),
      }).safeParse({ favoriteDestinations, notRecommendedDestinations });
      if (!destinationLists.success) {
        return res.status(400).json({ message: "Lista de destinos inválida" });
      }
      
      // Update user's display name if provided
      if (displayName) {
        await db.update(users)
          .set({ firstName: displayName })
          .where(eq(users.id, req.user!.id));
      }
      
      // Update profile data
      const profileData: any = {};
      if (req.body.personalPreferencesConsent === true) {
        profileData.personalPreferencesConsentAt = consentProfile?.personalPreferencesConsentAt || new Date();
        profileData.personalPreferencesConsentVersion = PERSONAL_PREFERENCES_CONSENT_VERSION;
      }
      if (bio !== undefined) profileData.bio = bio;
      if (age !== undefined) profileData.age = Number(age) || null;
      if (ageVisibilityPatch.showAge !== undefined) profileData.showAge = ageVisibilityPatch.showAge;
      if (gender !== undefined) profileData.gender = gender;
      if (preference !== undefined) profileData.preference = preference;
      if (req.body.personalPreferencesConsent === false) {
        profileData.preference = null;
        profileData.personalPreferencesConsentAt = null;
        profileData.personalPreferencesConsentVersion = null;
      }
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
      if (destinationLists.data.favoriteDestinations !== undefined) profileData.favoriteDestinations = destinationLists.data.favoriteDestinations;
      if (destinationLists.data.notRecommendedDestinations !== undefined) profileData.notRecommendedDestinations = destinationLists.data.notRecommendedDestinations;
      if (wantToHelp !== undefined) profileData.wantToHelp = !!wantToHelp;
      if (helpWith !== undefined) profileData.helpWith = Array.isArray(helpWith) ? helpWith : [];
      const { workStatus } = req.body;
      if (workStatus !== undefined) profileData.workStatus = workStatus || null;
       if (aviationPatch) {
         if (aviationPatch.aviationOptIn !== undefined) profileData.aviationOptIn = aviationPatch.aviationOptIn;
         // An opt-out always removes the role; a role cannot exist without consent.
         if (aviationPatch.aviationOptIn === false) profileData.aviationRole = null;
         // Role updates must explicitly retain consent, preventing a stale or
         // crafted role-only patch from attaching a role to an opted-out profile.
         else if (aviationPatch.aviationOptIn === true && aviationPatch.aviationRole !== undefined) profileData.aviationRole = aviationPatch.aviationRole;
       }
      
      // Get old city before updating (for new-traveler notification)
      const [oldProfile] = await db.select({ currentCity: profiles.currentCity })
        .from(profiles).where(eq(profiles.userId, req.user!.id));
      const oldCity = oldProfile?.currentCity;

      const updated = await db.transaction(async (tx) => {
            const [activeOwner] = await tx.select({ id: users.id }).from(users).where(eq(users.id, req.user!.id)).for("update");
            if (!activeOwner) throw new PersonalPreferencesConsentError("Account unavailable");
            const [freshConsent] = await tx.select({
              preference: profiles.preference,
              personalPreferencesConsentAt: profiles.personalPreferencesConsentAt,
              personalPreferencesConsentVersion: profiles.personalPreferencesConsentVersion,
            }).from(profiles).where(eq(profiles.userId, req.user!.id));
            validatePersonalPreferencesPatch(req.body, freshConsent);
            if (req.body.personalPreferencesConsent === true) {
              profileData.personalPreferencesConsentAt = hasPersonalPreferencesConsent(freshConsent) ? freshConsent!.personalPreferencesConsentAt : new Date();
              if (!hasPersonalPreferencesConsent(freshConsent) && preference === undefined) profileData.preference = null;
            }
            const [savedProfile] = await tx.insert(profiles)
              .values({ ...profileData, userId: req.user!.id })
              .onConflictDoUpdate({
                target: profiles.userId,
                set: profileData,
              })
              .returning();
            if (aviationPatch?.aviationOptIn === false) await tx.delete(layovers).where(eq(layovers.userId, req.user!.id));
            if (req.body.personalPreferencesConsent === false) {
              await tx.update(preferences).set({ showMe: "everyone" }).where(eq(preferences.userId, req.user!.id));
            } else if ((req.body.personalPreferencesConsent === true && !hasPersonalPreferencesConsent(freshConsent)) ||
                       (preference !== undefined && preference !== freshConsent?.preference)) {
              const showMe = ["men", "women"].includes(preference) ? preference : "everyone";
              await tx.insert(preferences).values({ userId: req.user!.id, showMe })
                .onConflictDoUpdate({ target: preferences.userId, set: { showMe } });
            }
            return savedProfile;
          });
      res.json({ ...toCurrentProfile(updated), displayName });

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
            const [targetUser] = await db.select({ isPremium: users.isPremium, notificationPrefs: users.notificationPrefs })
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
      if (err instanceof PersonalPreferencesConsentError) {
        return res.status(400).json({ message: err.message });
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid aviation profile settings" });
      }
      console.error("[updateProfile] Error saving profile:", err);
      res.status(500).json({ error: "No se pudo guardar el perfil. Por favor inténtalo de nuevo." });
    }
  });

  // ─── Privacy-first layovers ───────────────────────────────────────────────
  // These endpoints intentionally expose no airline, flight, airport, hotel,
  // exact-location or notes data. Input schemas are strict for the same reason.
  const toLayoverResponse = (row: any) => ({
    id: row.id,
    city: row.city,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    activityType: row.activityType,
    user: row.firstName === undefined ? undefined : {
      firstName: row.firstName,
      profileImageUrl: row.profileImageUrl,
      aviationRole: row.aviationRole,
    },
  });

  app.get("/api/layovers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = layoverSearchSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid layover filters" });
    const [requesterProfile] = await db.select({
      aviationOptIn: profiles.aviationOptIn,
      aviationRole: profiles.aviationRole,
    }).from(profiles).where(eq(profiles.userId, req.user!.id));
    if (!requesterProfile?.aviationOptIn || !requesterProfile.aviationRole) {
      return res.status(403).json({ error: "Aviation profile and role are required" });
    }
    const { city, activityType } = parsed.data;
    const conditions = [
      gt(layovers.endsAt, new Date()),
      eq(profiles.aviationOptIn, true),
      ne(layovers.userId, req.user!.id),
    ];
    if (city) conditions.push(ilike(layovers.city, `%${city}%`));
    if (activityType) conditions.push(eq(layovers.activityType, activityType));
    const [rows, blocked] = await Promise.all([
      db.select({
        id: layovers.id, userId: layovers.userId, city: layovers.city, startsAt: layovers.startsAt,
        endsAt: layovers.endsAt, activityType: layovers.activityType,
        firstName: users.firstName, profileImageUrl: users.profileImageUrl, aviationRole: profiles.aviationRole,
      }).from(layovers)
        .innerJoin(users, eq(layovers.userId, users.id))
        .innerJoin(profiles, eq(layovers.userId, profiles.userId))
        .where(and(...conditions))
        .orderBy(layovers.startsAt)
        .limit(100),
      getBlockedIds(req.user!.id),
    ]);
    res.json(rows.filter(row => !blocked.has(row.userId)).map(toLayoverResponse));
  });

  app.get("/api/layovers/mine", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rows = await db.select().from(layovers)
      .where(eq(layovers.userId, req.user!.id))
      .orderBy(layovers.startsAt);
    res.json(rows.map(toLayoverResponse));
  });

  app.post("/api/layovers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = layoverInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid layover data" });
    const userId = req.user!.id;
    const [profile, future] = await Promise.all([
      db.select({
        aviationOptIn: profiles.aviationOptIn,
        aviationRole: profiles.aviationRole,
      }).from(profiles).where(eq(profiles.userId, userId)),
      db.select({ value: count() }).from(layovers).where(and(eq(layovers.userId, userId), gt(layovers.startsAt, new Date()))),
    ]);
    if (!profile[0]?.aviationOptIn || !profile[0]?.aviationRole) {
      return res.status(403).json({ error: "Aviation profile and role are required" });
    }
    if (Number(future[0]?.value ?? 0) >= 10) return res.status(400).json({ error: "Maximum of 10 future layovers" });
    const input = parsed.data;
    const [created] = await db.insert(layovers).values({
      userId, city: input.city, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), activityType: input.activityType,
    }).returning();
    res.status(201).json(toLayoverResponse(created));
  });

  app.patch("/api/layovers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid layover id" });
    const parsed = layoverInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid layover data" });
    const [existing, profile] = await Promise.all([
      db.select().from(layovers).where(and(eq(layovers.id, id), eq(layovers.userId, req.user!.id))),
      db.select({
        aviationOptIn: profiles.aviationOptIn,
        aviationRole: profiles.aviationRole,
      }).from(profiles).where(eq(profiles.userId, req.user!.id)),
    ]);
    if (!existing[0]) return res.status(404).json({ error: "Layover not found" });
    if (!profile[0]?.aviationOptIn || !profile[0]?.aviationRole) {
      return res.status(403).json({ error: "Aviation profile and role are required" });
    }
    const input = parsed.data;
    const [updated] = await db.update(layovers).set({
      city: input.city, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), activityType: input.activityType,
    }).where(and(eq(layovers.id, id), eq(layovers.userId, req.user!.id))).returning();
    res.json(toLayoverResponse(updated));
  });

  app.delete("/api/layovers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid layover id" });
    const deleted = await db.delete(layovers)
      .where(and(eq(layovers.id, id), eq(layovers.userId, req.user!.id))).returning({ id: layovers.id });
    if (!deleted[0]) return res.status(404).json({ error: "Layover not found" });
    res.sendStatus(204);
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

  // Private accepted-connection summary; no public follower count or graph.
  app.get('/api/my-connected-cities', isAuthenticated, createConnectionSummaryHandler(getConnectionSummary));

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
    const cityPhotos = await db.select({ userId: photos.userId, url: photos.url }).from(photos).where(inArray(photos.userId, ids));
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
  app.post(api.photos.upload.path, requireContentLicense(), photoUpload.single('file'), trackLocalMediaUpload, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    let url: string;
    
    // Check if this is a JSON request with a URL (from object storage)
    if (req.body && req.body.url && typeof req.body.url === 'string') {
      url = req.body.url;
      if (url.startsWith('/objects/')) {
        const ownedUpload = await mediaStorage.getOwnedCompletedUpload(req.user!.id, url, process.env.SESSION_SECRET || "");
        if (!ownedUpload) return res.status(403).json({ error: 'Only your completed image uploads can be registered' });
      } else {
        return res.status(400).json({ error: 'A completed owned image upload is required' });
      }
    } else if (req.file) {
      // Traditional file upload
      const bytes = await readFile(req.file.path);
      if (!hasValidRasterImageSignature(bytes, req.file.mimetype.toLowerCase())) {
        await unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Uploaded file is not a supported raster image' });
      }
      url = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ error: "No file or URL provided" });
    }
    
    const photo = await storage.createPhoto({
      userId: req.user!.id,
      url: url,
      type: 'image'
    });
    res.status(201).json(photo);
  });

  app.delete(api.photos.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const photoId = Number(req.params.id);
    // Serialize removals so concurrent requests cannot remove the last image.
    const outcome = await db.transaction(async tx => {
      const userId = req.user!.id;
      await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
      const userPhotos = await tx.select().from(photos).where(eq(photos.userId, userId));
      const photoToDelete = userPhotos.find(photo => photo.id === photoId);
      if (!photoToDelete) return "missing";
      const remainingImages = userPhotos.filter(photo => photo.id !== photoId && photo.type === "image" && photo.url.trim());
      if (photoToDelete.type === "image" && remainingImages.length === 0) return "required";
      await tx.delete(photos).where(eq(photos.id, photoId));
      // Do not retain an avatar URL pointing to a removed photo.
      await tx.update(users).set({ profileImageUrl: remainingImages[0]?.url ?? null })
        .where(and(eq(users.id, userId), eq(users.profileImageUrl, photoToDelete.url)));
      return "deleted";
    });
    if (outcome === "missing") return res.status(404).json({ error: "Photo not found" });
    if (outcome === "required") {
      return res.status(400).json({ code: "PROFILE_PHOTO_REQUIRED", error: "Your profile must have at least one photo." });
    }
    res.sendStatus(204);
  });

  // Set profile image
  app.patch('/api/profile-image', requireContentLicense(), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    const [ownedPhoto] = await db.select({ url: photos.url }).from(photos).where(and(
      eq(photos.userId, req.user!.id),
      eq(photos.url, url),
    )).limit(1);
    if (!ownedPhoto) return res.status(403).json({ error: 'Profile image must be one of your registered photos' });
    await db.update(users)
      .set({ profileImageUrl: url })
      .where(eq(users.id, req.user!.id));
    res.json({ success: true, profileImageUrl: url });
  });

  // Matches
  app.post(api.matches.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { targetUserId } = api.matches.create.input.parse(req.body);
    const currentUserId = req.user!.id;
    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot connect with yourself' });
    }
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetUser.isBanned === "true") {
      return res.status(403).json({ error: 'Action not allowed' });
    }

    // Prevent liking a blocked user (or being liked by a blocker)
    const blockedSet = await getBlockedIds(currentUserId);
    if (blockedSet.has(targetUserId)) {
      return res.status(403).json({ error: 'Action not allowed' });
    }

    const existingConnection = await storage.getMatchConnection(currentUserId, targetUserId);
    let likeStatus: Awaited<ReturnType<typeof storage.canUserLike>> | undefined;
    if (!existingConnection) {
      likeStatus = await storage.canUserLike(currentUserId);
      if (!likeStatus.canLike) {
        return res.status(429).json({
          error: 'Daily like limit reached',
          remainingLikes: 0,
          isPremium: false
        });
      }
    }

    try {
      const result = await storage.connectMatch(currentUserId, targetUserId);
      if (result.created && likeStatus && !likeStatus.isPremium) {
        await storage.incrementDailyLikes(currentUserId);
      }

      if (result.becameMatch) {
        void notifyConnection(targetUserId, req.user!.firstName || "FallonYou", true)
          .catch(() => console.error("[Connections] Target notification failed"));
        void notifyConnection(currentUserId, "FallonYou", true)
          .catch(() => console.error("[Connections] Sender notification failed"));
      } else if (result.created) {
        void notifyConnection(targetUserId, req.user!.firstName || "FallonYou", false)
          .catch(() => console.error("[Connections] Request notification failed"));
      }

      const response: { match: typeof result.match; isMatch: boolean; remainingLikes?: number } = {
        match: result.match,
        isMatch: result.isMatch,
      };
      if (result.created && !result.isMatch && likeStatus) {
        response.remainingLikes = likeStatus.remainingLikes - (likeStatus.isPremium ? 0 : 1);
      }
      return res.json(response);
    } catch (error) {
      if (error instanceof EndedMatchConnectionError) {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  });

  const requestDependencies = {
    requests: (owner: string, direction: "sent" | "incoming") => storage.getPendingMatchRequests(owner, direction),
    blockedIds: getBlockedIds,
    members: (ids: string[]) => db.select({ ...publicUserColumns, isBanned: users.isBanned })
      .from(users).where(inArray(users.id, ids)),
  };
  app.get(api.matches.requests.path, createConnectionRequestsHandler("sent", requestDependencies));
  app.get(api.matches.incoming.path, createConnectionRequestsHandler("incoming", requestDependencies));

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
      db.select(publicUserColumns).from(users).where(inArray(users.id, uniqueOtherIds)),
      db.select({ userId: profiles.userId, ...publicProfileColumns }).from(profiles).where(inArray(profiles.userId, uniqueOtherIds)),
      db.select({ userId: photos.userId, ...publicPhotoColumns }).from(photos).where(inArray(photos.userId, uniqueOtherIds)),
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
          ...toPublicUser(otherUser ?? {}),
          profile: toPublicProfile(profileMap.get(otherId)),
          photos: (photosMap.get(otherId) ?? []).map(toPublicPhoto),
        },
      };
    });

    res.json(sortConnectionsNewestFirst(enriched));
  });

  // Ratings
  app.post(api.ratings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = api.ratings.create.input.safeParse(req.body);
    if (!parsed.success || !Number.isSafeInteger(parsed.data.matchId) ||
        parsed.data.matchId <= 0 || !Number.isInteger(parsed.data.score)) {
      return res.status(400).json({ error: "Invalid connection rating" });
    }
    const input = parsed.data;

    const [match] = await db.select().from(matches).where(eq(matches.id, input.matchId)).limit(1);
    const blockedSet = await getBlockedIds(req.user!.id);
    const otherUserId = match && (match.user1Id === req.user!.id ? match.user2Id : match.user1Id);
    if (!canRateConnection(req.user!.id, match, !!otherUserId && blockedSet.has(otherUserId))) {
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
    
    const isPremium = hasLanguagePremium(user);
    
    const likeStatus = await storage.canUserLike(req.user!.id);
    
    res.json({
      ...likeStatus,
      isPremium,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      premiumExpiresAt: user.premiumExpiresAt,
      trialEndsAt: user.trialEndsAt,
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
    if (!premiumPurchasesEnabled) {
      return res.status(503).json({
        error: 'premium_purchases_unavailable',
        message: 'Premium subscriptions are temporarily unavailable during app testing.',
      });
    }
    
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
    if (!premiumPurchasesEnabled) {
      return res.status(503).json({ error: 'premium_purchases_unavailable' });
    }
    
    const { sessionId } = req.body;
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_") || sessionId.length > 300) {
      return res.status(400).json({ error: 'Valid session ID required' });
    }
    
    try {
      const account = await storage.getUser(req.user!.id);
      if (!account?.stripeCustomerId) return res.sendStatus(403);
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.mode !== "subscription" || !stripeCustomerMatches(account.stripeCustomerId, session.customer)) {
        return res.status(403).json({ error: "Checkout session does not belong to this account" });
      }
      
      if (session.payment_status === 'paid' && session.subscription) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const expiry = getValidPremiumExpiry(subscription);
        if (!stripeCustomerMatches(account.stripeCustomerId, subscription.customer) || !expiry) {
          return res.json({ success: false, isPremium: false });
        }
        
        await storage.updateUserStripeInfo(req.user!.id, {
          isPremium: 'true',
          stripeSubscriptionId: subscriptionId,
          premiumExpiresAt: expiry,
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
    if (!premiumPurchasesEnabled) {
      return res.status(503).json({
        error: 'premium_purchases_unavailable',
        message: 'Premium subscription management is temporarily unavailable during app testing.',
      });
    }
    
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
    if (!premiumPurchasesEnabled) {
      return res.status(503).json({
        error: 'premium_purchases_unavailable',
        message: 'Premium trials are temporarily unavailable during app testing.',
      });
    }
    
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
    const allPhotos = await db.select({ userId: photos.userId, url: photos.url }).from(photos).where(inArray(photos.userId, ids));
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
    const [[otherUser], [profile], otherPhotos] = await Promise.all([
      db.select(publicUserColumns).from(users).where(eq(users.id, otherId)),
      db.select(publicProfileColumns).from(profiles).where(eq(profiles.userId, otherId)),
      db.select(publicPhotoColumns).from(photos).where(eq(photos.userId, otherId)),
    ]);
    
    res.json({
      ...match,
      otherUser: {
        ...toPublicUser(otherUser ?? {}),
        profile: toPublicProfile(profile),
        photos: otherPhotos.map(toPublicPhoto),
      },
    });
  });

  // ============ MESSAGING ============
  app.get('/api/matches/:matchId/messages', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = parseInt(req.params.matchId);
    if (!Number.isSafeInteger(matchId) || matchId <= 0) return res.sendStatus(400);
    
    const match = await storage.getMatchById(matchId);
    if (!match) return res.sendStatus(404);
    if (match.user1Id !== req.user!.id && match.user2Id !== req.user!.id) {
      return res.sendStatus(403);
    }
    if (!['matched', 'ended'].includes(match.status)) return res.sendStatus(403);
    const otherId = match.user1Id === req.user!.id ? match.user2Id : match.user1Id;
    if ((await getBlockedIds(req.user!.id)).has(otherId)) return res.sendStatus(403);
    
    let before;
    try { before = parseMessageCursor(req.query.before); }
    catch { return res.status(400).json({ error: "Invalid message cursor" }); }
    const page = await messagePage(matchId, before);
    await storage.markMessagesAsRead(matchId, req.user!.id);
    res.setHeader("Cache-Control", "private, no-store");
    if (page.nextCursor) res.setHeader("X-Older-Cursor", page.nextCursor);
    res.json(page.items);
  });

  app.post('/api/matches/:matchId/messages', requireContentLicense(hasImageUrl), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = parseInt(req.params.matchId);
    if (!Number.isSafeInteger(matchId) || matchId <= 0) return res.sendStatus(400);
    
    const match = await storage.getMatchById(matchId);
    if (!match) return res.sendStatus(404);
    if (match.user1Id !== req.user!.id && match.user2Id !== req.user!.id) {
      return res.sendStatus(403);
    }
    // Prevent messaging between blocked users
    const recipientId = match.user1Id === req.user!.id ? match.user2Id : match.user1Id;
    const blockedSet = await getBlockedIds(req.user!.id);
    if (!canSendChatMessage({
      isParticipant: true,
      isActiveMatch: match.status === 'matched',
      isBlocked: blockedSet.has(recipientId),
    })) {
      if (blockedSet.has(recipientId)) {
        return res.status(403).json({ error: 'No puedes enviar mensajes a este usuario' });
      }
      return res.status(409).json({ error: 'Messages can only be sent in an active match' });
    }
    
    const { content, imageUrl } = req.body;
    if (content !== undefined && (typeof content !== 'string' || content.length > 5000)) {
      return res.status(400).json({ error: 'Message text must be 5000 characters or fewer' });
    }
    if (imageUrl !== undefined && (typeof imageUrl !== 'string' || !imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }
    if (!content?.trim() && !imageUrl) return res.status(400).json({ error: 'Message content or image required' });
    if (imageUrl && !await mediaStorage.getOwnedCompletedUpload(req.user!.id, imageUrl, process.env.SESSION_SECRET || "")) {
      return res.status(403).json({ error: 'Only your completed image uploads can be sent' });
    }
    
    const message = await storage.createMessage({
      matchId,
      senderId: req.user!.id,
      content: content?.trim() || '',
      imageUrl: imageUrl || null,
    });

    // Notify connected WS clients in this room (real-time delivery)
    chatWS.notifyNewMessage(matchId, message);

    await notifyMessageRecipient({ kind: "chat", recipientId, senderId: req.user!.id, sourceId: message.id });

    res.status(201).json(message);
  });

  app.post('/api/matches/:matchId/end', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = parseInt(req.params.matchId);
    if (!Number.isSafeInteger(matchId) || matchId <= 0) return res.sendStatus(400);
    
    const match = await storage.getMatchById(matchId);
    if (!match) return res.sendStatus(404);
    if (match.user1Id !== req.user!.id && match.user2Id !== req.user!.id) {
      return res.sendStatus(403);
    }
    if (match.status !== 'matched') return res.status(409).json({ error: 'Match is not active' });
    
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

    const senderName = req.user!.firstName || 'Someone';
    if (match?.status === 'matched') {
      sendPushNotification(toUserId, {
        title: 'New Match! ✈️',
        preference: "matches",
        body: `You and ${senderName} are a match! Start chatting now.`,
        url: '/matches',
      }).catch(() => {});
    } else {
      sendPushNotification(toUserId, {
        title: 'Super Like! ⭐',
        preference: "matches",
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
      const [[user], [profile], userPhotos] = await Promise.all([
        db.select(publicUserColumns).from(users).where(eq(users.id, sl.fromUserId)),
        db.select(publicProfileColumns).from(profiles).where(eq(profiles.userId, sl.fromUserId)),
        db.select(publicPhotoColumns).from(photos).where(eq(photos.userId, sl.fromUserId)),
      ]);
      return {
        ...sl,
        user: {
          ...toPublicUser(user ?? {}),
          profile: toPublicProfile(profile),
          photos: userPhotos.map(toPublicPhoto),
        },
      };
    }));
    res.json({ count: superLikes.length, users: enriched, isPremium: true });
  });

  // ============ PREFERENCES ============
  app.get('/api/preferences', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prefs = await storage.getPreferences(req.user!.id);
    const [profile] = await db.select({
      personalPreferencesConsentAt: profiles.personalPreferencesConsentAt,
      personalPreferencesConsentVersion: profiles.personalPreferencesConsentVersion,
    }).from(profiles).where(eq(profiles.userId, req.user!.id));
    res.json({ ...(prefs || { minAge: 18, maxAge: 50, maxDistance: 50 }), showMe: hasPersonalPreferencesConsent(profile) ? prefs?.showMe || "everyone" : "everyone" });
  });

  app.patch('/api/preferences', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const parsed = z.object({
      minAge: z.number().int().min(18).max(100).optional(),
      maxAge: z.number().int().min(18).max(100).optional(),
      maxDistance: z.number().int().min(1).max(10000).optional(),
      showMe: z.enum(["everyone", "men", "women"]).optional(),
      personalPreferencesConsent: z.boolean().optional(),
      personalPreferencesConsentVersion: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid preferences" });
    const [profile] = await db.select({
      personalPreferencesConsentAt: profiles.personalPreferencesConsentAt,
      personalPreferencesConsentVersion: profiles.personalPreferencesConsentVersion,
    }).from(profiles).where(eq(profiles.userId, req.user!.id));
    try { validatePersonalPreferencesPatch(parsed.data, profile, !!parsed.data.showMe && parsed.data.showMe !== "everyone"); }
    catch (error) { return res.status(400).json({ message: (error as Error).message }); }
    const existingPrefs = await storage.getPreferences(req.user!.id);
    const defaults = { minAge: 18, maxAge: 50, maxDistance: 50, showMe: 'everyone' };
    const current = { ...defaults, ...existingPrefs };
    
    const updates: any = {};
    if (req.body.minAge !== undefined) updates.minAge = req.body.minAge;
    if (req.body.maxAge !== undefined) updates.maxAge = req.body.maxAge;
    if (req.body.maxDistance !== undefined) updates.maxDistance = req.body.maxDistance;
    if (req.body.showMe !== undefined) updates.showMe = req.body.showMe;
    
    const merged = { ...current, ...updates };
    if (merged.minAge > merged.maxAge) return res.status(400).json({ message: "Invalid age range" });
    try {
    const saved = await db.transaction(async tx => {
      const [activeOwner] = await tx.select({ id: users.id }).from(users).where(eq(users.id, req.user!.id)).for("update");
      if (!activeOwner) throw new PersonalPreferencesConsentError("Account unavailable");
      const [freshConsent] = await tx.select({
        personalPreferencesConsentAt: profiles.personalPreferencesConsentAt,
        personalPreferencesConsentVersion: profiles.personalPreferencesConsentVersion,
      }).from(profiles).where(eq(profiles.userId, req.user!.id));
      validatePersonalPreferencesPatch(parsed.data, freshConsent, !!parsed.data.showMe && parsed.data.showMe !== "everyone");
      if (parsed.data.personalPreferencesConsent !== undefined) {
        const consent = parsed.data.personalPreferencesConsent;
        await tx.insert(profiles).values({
          userId: req.user!.id,
          personalPreferencesConsentAt: consent ? hasPersonalPreferencesConsent(freshConsent) ? freshConsent!.personalPreferencesConsentAt : new Date() : null,
          personalPreferencesConsentVersion: consent ? PERSONAL_PREFERENCES_CONSENT_VERSION : null,
        }).onConflictDoUpdate({ target: profiles.userId, set: {
          personalPreferencesConsentAt: consent ? hasPersonalPreferencesConsent(freshConsent) ? freshConsent!.personalPreferencesConsentAt : new Date() : null,
          personalPreferencesConsentVersion: consent ? PERSONAL_PREFERENCES_CONSENT_VERSION : null,
          ...(consent && hasPersonalPreferencesConsent(freshConsent) ? {} : { preference: null }),
        } });
      }
      if (parsed.data.personalPreferencesConsent === false || (!hasPersonalPreferencesConsent(freshConsent) && parsed.data.personalPreferencesConsent !== true)) merged.showMe = "everyone";
      const [prefs] = await tx.insert(preferences).values({ ...merged, userId: req.user!.id })
        .onConflictDoUpdate({ target: preferences.userId, set: merged }).returning();
      return prefs;
    });
    res.json(saved);
    } catch (error) {
      if (error instanceof PersonalPreferencesConsentError) return res.status(400).json({ message: error.message });
      console.error("Failed to save preferences:", error);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // ============ SAFETY ============
  app.post('/api/users/:userId/block', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const targetId = req.params.userId;
    if (!targetId || targetId.length > 255 || targetId === req.user!.id) return res.status(400).json({ error: 'Invalid user to block' });
    if (!await storage.getUser(targetId)) return res.status(404).json({ error: 'User not found' });
    const [existingBlock] = await db.select({ id: blockedUsers.id }).from(blockedUsers).where(and(
      eq(blockedUsers.userId, req.user!.id),
      eq(blockedUsers.blockedUserId, targetId),
    )).limit(1);
    if (!existingBlock) await storage.blockUser(req.user!.id, targetId);
    res.json({ success: true });
  });

  app.delete('/api/users/:userId/block', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const targetId = req.params.userId;
    if (!targetId || targetId.length > 255 || targetId === req.user!.id) return res.status(400).json({ error: 'Invalid user to unblock' });
    await storage.unblockUser(req.user!.id, targetId);
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

  const manualRecoveryRepository = passwordRecoveryRepository();
  app.post("/api/admin/users/:userId/send-password-link", requireAdmin, rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    keyGenerator: req => req.user!.id,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: "RECOVERY_RATE_LIMITED" },
  }), createAdminPasswordRecoveryHandler({
    authorizeAdmin: async adminId => {
      const admin = await storage.getUser(adminId);
      return admin?.isBanned !== "true" && (admin?.isAdmin === "true" || ADMIN_EMAILS.includes(admin?.email || ""));
    },
    deliveryReady: emailDeliveryReady,
    findUser: async userId => {
      const [recipient] = await db.select({
        id: users.id, email: users.email, firstName: users.firstName,
        isBanned: users.isBanned, notificationPrefs: users.notificationPrefs,
      }).from(users).where(eq(users.id, userId)).limit(1);
      return recipient;
    },
    issue: manualRecoveryRepository.issueManual,
    revoke: manualRecoveryRepository.revoke,
    deliver: sendPasswordResetEmail,
    baseUrl: () => process.env.NODE_ENV === "production" || !process.env.REPLIT_DEV_DOMAIN
      ? "https://fallonyou.app" : `https://${process.env.REPLIT_DEV_DOMAIN}`,
    now: () => new Date(),
    token: newRecoveryToken,
    report: event => console.info(`[Recovery admin] ${event}`),
  }));

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

  // Admin: manually verify or unverify a user
  app.post('/api/admin/users/:userId/set-verified', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);
    const { verified } = req.body; // true or false
    await db.update(users)
      .set({
        isVerified: verified ? 'true' : 'false',
        verifiedAt: verified ? new Date() : null,
        verificationStatus: verified ? 'approved' : 'none',
        verificationReviewedAt: new Date(),
      })
      .where(eq(users.id, req.params.userId));
    res.json({ success: true });
  });

  // Send a direct message/notification from admin to a specific user
  app.post('/api/admin/send-user-message', requireAdmin, async (req, res) => {
    const { userId, message } = req.body;
    if (!userId || !message?.trim()) return res.status(400).json({ error: 'userId and message required' });
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    const [notice] = await db.insert(notifications).values({
      userId, type: "admin_message", title: "Mensaje del equipo FallonYou",
      body: message.trim(), link: "/",
    }).returning({ id: notifications.id });
    await notifyMessageRecipient({ kind: "admin", recipientId: userId, sourceId: notice.id });
    res.json({ success: true });
  });

  // Get all users (admin only)
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      isPremium: users.isPremium,
      isVerified: users.isVerified,
      isBanned: users.isBanned,
      banReason: users.banReason,
      createdAt: users.createdAt,
      ...adminAccountStatusColumns,
    }).from(users);
    const enriched = await Promise.all(allUsers.map(async u => {
      const [profile] = await db.select({ age: profiles.age }).from(profiles).where(eq(profiles.userId, u.id));
      return {
        ...u,
        profile: profile ? { age: profile.age, displayName: null } : null,
      };
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

    if (targetUser.stripeSubscriptionId) {
      if (!targetUser.stripeCustomerId) {
        return res.status(409).json({ error: "Subscription ownership must be resolved before account deletion" });
      }
      try {
        await stripeService.cancelSubscription(targetUser.stripeSubscriptionId, targetUser.stripeCustomerId);
      } catch {
        return res.status(503).json({ error: "Subscription cancellation failed; account has not been deleted" });
      }
    }

    try {
      const result = await storage.deleteUserAccount(userId);
      res.json({ success: true, mediaCleanup: result.queuedMedia ? "queued" : "not_required" });
    } catch {
      return res.status(500).json({ error: "Account deletion failed; database changes were rolled back" });
    }
  });

  app.get("/api/admin/media-cleanup", requireAdmin, async (_req, res, next) => {
    try { res.json(await getMediaCleanupSummary()); } catch (error) { next(error); }
  });
  app.post("/api/admin/media-cleanup/retry", requireAdmin, async (req, res, next) => {
    const parsed = z.object({ ids: z.array(z.number().int().positive()).min(1).max(20) }).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid cleanup job IDs" });
    try {
      await retryMediaCleanup(parsed.data.ids);
      res.json({ success: true });
    } catch (error) { next(error); }
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
  app.delete('/api/user/delete-account', createAccountDeletionHandler({
    getAccount: id => storage.getUser(id),
    cancelSubscription: (subscriptionId, customerId) => stripeService.cancelSubscription(subscriptionId, customerId),
    deleteAccount: id => storage.deleteUserAccount(id),
  }));

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
        Promise.resolve().then(async () => sendReferralEmail(referrer.email!, referrer.firstName || '', {
          refereeName,
          newCount,
          tierLabel: newTier?.label,
          isAmbassador,
        }, (await import("@shared/communication-locale")).recipientLocale(referrer.notificationPrefs))).catch(() => console.error('[referrals] Email send failed'));
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
      const [creator] = await db.select({
        id: users.id,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, event.creatorId));
      const isParticipant = participants.some(p => p.userId === userId);
      // Only show avatars of non-blocked participants
      const visibleParticipants = participants.filter(p => !blockedSet.has(p.userId));
      const participantAvatars = await Promise.all(
        visibleParticipants.slice(0, 4).map(async (p) => {
          const [u] = await db.select({
            id: users.id,
            firstName: users.firstName,
            profileImageUrl: users.profileImageUrl,
          }).from(users).where(eq(users.id, p.userId));
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
        const [creator] = await db.select({
          id: users.id,
          firstName: users.firstName,
          profileImageUrl: users.profileImageUrl,
        }).from(users).where(eq(users.id, event.creatorId));
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
  app.post('/api/events', requireContentLicense(hasImageUrl), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { title, description, category, city, location, startsAt, endsAt, capacity, latitude, longitude, imageUrl, isOpportunity, opportunityType } = req.body;
    
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
      isOpportunity: !!isOpportunity,
      opportunityType: isOpportunity ? (opportunityType || null) : null,
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
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          ne(users.id, req.user!.id),
          or(
            ilike(profiles.currentCity, city),
            ilike(profiles.homeCity, city)
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
        const allUsers = await db.select({ id: users.id, notificationPrefs: users.notificationPrefs })
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

  app.patch('/api/events/:id', requireContentLicense(async (req) => {
    if (!hasImageUrl(req)) return false;
    const [existingEvent] = await db
      .select({ imageUrl: events.imageUrl })
      .from(events)
      .where(eq(events.id, Number(req.params.id)));
    return !existingEvent || fixImageUrl(req.body.imageUrl) !== existingEvent.imageUrl;
  }), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = parseInt(req.params.id);

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const editorUser = await storage.getUser(req.user!.id);
    const isAdminEditor = editorUser?.isAdmin === 'true';
    if (!isAdminEditor && event.creatorId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

    const { title, description, category, city, location, startsAt, capacity, imageUrl, isOpportunity, opportunityType } = req.body;

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (city !== undefined) updateData.city = city;
    if (location !== undefined) updateData.location = location;
    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt);
    if (capacity !== undefined) updateData.capacity = capacity;
    if (imageUrl !== undefined) updateData.imageUrl = fixImageUrl(imageUrl);
    if (isOpportunity !== undefined) { updateData.isOpportunity = !!isOpportunity; updateData.opportunityType = isOpportunity ? (opportunityType || null) : null; }

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
      const [user] = await db.select({
        id: users.id,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, comment.userId));
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

  app.post('/api/album', requireContentLicense(), async (req, res) => {
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
  app.post('/api/verification/submit', requireUploadAuthentication, photoUpload.single('selfie'), trackLocalMediaUpload, async (req, res) => {
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
        const [viewedUser] = await db.select({ isPremium: users.isPremium, notificationPrefs: users.notificationPrefs })
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
    const account = await storage.getUser(userId);
    const isPremium = account?.isPremium === 'true';
    if (!isPremium) {
      return res.json({ count: uniqueViewerIds.length, viewers: [] });
    }
    const viewerUsers = uniqueViewerIds.length > 0
      ? await db.select(publicUserColumns).from(users).where(inArray(users.id, uniqueViewerIds.slice(0, 20)))
      : [];
    const [allProfiles, allPhotos] = await Promise.all([
      viewerUsers.length > 0 ? db.select({ userId: profiles.userId, ...publicProfileColumns }).from(profiles).where(inArray(profiles.userId, viewerUsers.map(u => u.id))) : [],
      viewerUsers.length > 0 ? db.select({ userId: photos.userId, ...publicPhotoColumns }).from(photos).where(inArray(photos.userId, viewerUsers.map(u => u.id))) : [],
    ]);
    const enriched = viewerUsers.map(u => ({
      ...toPublicUser(u),
      profile: toPublicProfile(allProfiles.find(p => p.userId === u.id)),
      photos: allPhotos.filter(p => p.userId === u.id).map(toPublicPhoto),
    }));
    res.json({ count: uniqueViewerIds.length, viewers: enriched });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STORIES (24h)
  // ───────────────────────────────────────────────────────────────────────────
  // Authors choose the audience; pending or ended connections never grant access.
  app.get('/api/stories', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.setHeader("Cache-Control", "private, no-store");
    try {
    const currentUserId = req.user!.id;
    const now = new Date();
    const [activeStories, blockedSet, acceptedConnections] = await Promise.all([
      db.select({
        id: stories.id,
        userId: stories.userId,
        mediaUrl: stories.mediaUrl,
        caption: stories.caption,
        audience: stories.audience,
        expiresAt: stories.expiresAt,
        createdAt: stories.createdAt,
      }).from(stories)
        .where(gte(stories.expiresAt, now))
        .orderBy(desc(stories.createdAt)),
      getBlockedIds(currentUserId),
      getAcceptedStoryConnections(currentUserId),
    ]);
    if (activeStories.length === 0) return res.json([]);
    // Filter out stories from blocked users (keep own stories)
    const visibleStories = activeStories.filter(s => canViewStory(s, currentUserId, acceptedConnections, blockedSet));
    if (visibleStories.length === 0) return res.json([]);
    const userIds = [...new Set(visibleStories.map(s => s.userId))];
    const [storyUsers, storyPhotos] = await Promise.all([
      db.select({ id: users.id, firstName: users.firstName, profileImageUrl: users.profileImageUrl })
        .from(users).where(inArray(users.id, userIds)),
      db.select({ userId: photos.userId, url: photos.url }).from(photos).where(inArray(photos.userId, userIds)),
    ]);
    // Group stories by user
    const grouped = userIds.map(uid => {
      const user = storyUsers.find(u => u.id === uid);
      const photo = storyPhotos.find(p => p.userId === uid);
      return {
        userId: uid,
        userName: user?.firstName || "",
        userPhoto: photo?.url || user?.profileImageUrl || null,
        stories: visibleStories.filter(s => s.userId === uid),
      };
    });
    res.json(grouped);
    } catch {
      console.error("[Stories] Unable to load stories");
      res.status(500).json({ error: "Unable to load stories" });
    }
  });

  // Create a story
  const storyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => req.user!.id,
    message: { error: "Too many story uploads. Please try again later." },
  });
  app.post('/api/stories', requireContentLicense(), storyLimiter, createStoryUploadHandler({
    write: (owner, bytes, type) => mediaStorage.writeOwnedStoryUpload(owner, bytes, type, process.env.SESSION_SECRET || "", {
      record: recordMediaUpload, finish: finishMediaUpload,
    }),
    ownsReference: (owner, path) => mediaStorage.ownsDurableStoryReference(owner, path, process.env.SESSION_SECRET || ""),
    insert: async (owner, path, caption, audience) => {
      const [story] = await db.insert(stories).values({
        userId: owner, mediaUrl: path, caption, audience, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).returning();
      return story;
    },
  }));

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
      .where(and(eq(notifications.userId, req.user!.id), ne(notifications.type, "solidarity_interest_record")))
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
        age: publicAgeColumn,
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
      const sparkPhotos = await db.select(publicPhotoColumns).from(photos)
        .where(eq(photos.userId, pick.id)).limit(3);

      res.json({ ...pick, photos: sparkPhotos.map(toPublicPhoto), date: today });
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

  registerLanguageExchangeRoutes(app);

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

  registerLanguageCourseRoutes(app);
  registerWritingCourseRoutes(app);

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
  registerEngagementRoutes(app);
  startLearningReminderScheduler();
  const notificationPreferencesHandlers = createNotificationPreferencesHandlers({
    merge: async (userId, patch) => db.transaction(async tx => {
      const [user] = await tx.select({ notificationPrefs: users.notificationPrefs })
        .from(users).where(eq(users.id, userId)).for("update");
      if (!user) return undefined;
      const preferences = { ...parseNotificationPreferences(user.notificationPrefs), ...patch };
      await tx.update(users).set({ notificationPrefs: JSON.stringify(preferences) }).where(eq(users.id, userId));
      return preferences;
    }),
    read: async userId => {
      const [user] = await db.select({ notificationPrefs: users.notificationPrefs, email: users.email, emailVerified: users.emailVerified })
        .from(users).where(eq(users.id, userId));
      return user;
    },
    write: async (userId, preferences) => {
      await db.update(users).set({ notificationPrefs: preferences }).where(eq(users.id, userId));
    },
  });
  app.get("/api/notifications/preferences", notificationPreferencesHandlers.read);
  app.patch("/api/notifications/preferences", notificationPreferencesHandlers.update);

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
    const helperName = req.user!.firstName || 'Alguien';
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
    const helperName = req.user!.firstName || 'Alguien';

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

  // ── TRIPS (Viajes) ────────────────────────────────────────────────────────────

  // Flight search via Duffel (public — token stays on the server)
  app.get('/api/flights/search', async (req, res) => {
    if (!flightSearchEnabled) {
      return res.status(503).json({ error: "flight_search_unavailable", message: "Flight search is not available in this version." });
    }
    const { searchFlights, duffelConfigured } = await import('./duffelService');
    if (!duffelConfigured()) {
      return res.status(503).json({ error: 'flight_search_not_configured', message: 'Duffel access token not configured yet' });
    }
    const { origin, destination, departureDate, returnDate, adults } = req.query as Record<string, string>;
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ error: 'origin, destination and departureDate are required' });
    }
    try {
      const results = await searchFlights({
        origin,
        destination,
        departureDate,
        returnDate: returnDate || undefined,
        adults: Math.min(Number(adults) || 1, 9),
        max: 10,
      });
      res.json(results);
    } catch (err: any) {
      console.error('[Duffel] flight search error:', err.message);
      res.status(502).json({ error: 'flight_search_error', message: err.message });
    }
  });

  // Duffel status check
  app.get('/api/flights/status', (_req, res) => {
    res.json({ configured: duffelConfigured() });
  });

  // ── RateHawk hotel search ──────────────────────────────────────────────────
  app.get('/api/hotels/search', async (req, res) => {
    if (!hotelAndPackageSalesEnabled) {
      return res.status(503).json({ error: "hotels_unavailable", message: "Hotel search is not currently available." });
    }
    const { searchHotels, ratehawkConfigured } = await import('./ratehawkService');
    if (!ratehawkConfigured()) {
      return res.status(503).json({ error: 'not_configured', message: 'RateHawk credentials not set up yet' });
    }
    const { iata, checkin, checkout, adults } = req.query as Record<string, string>;
    if (!iata || !checkin || !checkout) {
      return res.status(400).json({ error: 'iata, checkin and checkout are required' });
    }
    try {
      const results = await searchHotels({
        iataCode: iata.toUpperCase(),
        checkin,
        checkout,
        adults: Math.min(Number(adults) || 2, 9),
        currency: 'EUR',
        language: 'es',
      });
      res.json(results);
    } catch (err: any) {
      console.error('[RateHawk] hotel search error:', err.message);
      res.status(502).json({ error: 'search_error', message: err.message });
    }
  });

  // RateHawk status
  app.get('/api/hotels/status', async (_req, res) => {
    if (!hotelAndPackageSalesEnabled) return res.json({ configured: false });
    const { ratehawkConfigured } = await import('./ratehawkService');
    res.json({ configured: ratehawkConfigured() });
  });

  // Destination inquiry (from inspiration section — no auth required)
  app.post('/api/trips/inquiry', async (req, res) => {
    if (!hotelAndPackageSalesEnabled) {
      return res.status(503).json({ error: "packages_unavailable", message: "Package inquiries are not currently available." });
    }
    const { destination, country, fromPrice, duration, note, userName, userEmail, userPhone, message } = req.body;
    if (!destination || !userEmail || !userName) {
      return res.status(400).json({ error: 'destination, userName and userEmail are required' });
    }
    const { sendTripInquiryEmail } = await import('./emailService');
    await sendTripInquiryEmail({ destination, country, fromPrice, duration, note, userName, userEmail, userPhone, message });
    res.json({ success: true });
  });

  // List all active trips (public)
  app.get('/api/trips', async (req, res) => {
    const allTrips = await db.select().from(trips).where(eq(trips.isActive, true)).orderBy(trips.departureDate);
    const enriched = await Promise.all(allTrips.map(async (trip) => {
      const bookings = await db.select({ userId: tripBookings.userId, paymentStatus: tripBookings.paymentStatus })
        .from(tripBookings).where(and(eq(tripBookings.tripId, trip.id), eq(tripBookings.paymentStatus, 'confirmed')));
      const participants = await Promise.all(bookings.map(async (b) => {
        const [u] = await db.select({ firstName: users.firstName, profileImageUrl: users.profileImageUrl })
          .from(users).where(eq(users.id, b.userId));
        return u;
      }));
      return { ...trip, confirmedCount: bookings.length, participants: participants.filter(Boolean) };
    }));
    res.json(enriched);
  });

  // Get single trip detail
  app.get('/api/trips/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    if (!trip) return res.sendStatus(404);
    const bookings = await db.select({ userId: tripBookings.userId })
      .from(tripBookings).where(and(eq(tripBookings.tripId, id), eq(tripBookings.paymentStatus, 'confirmed')));
    const participants = await Promise.all(bookings.map(async (b) => {
      const [u] = await db.select({ firstName: users.firstName, profileImageUrl: users.profileImageUrl })
        .from(users).where(eq(users.id, b.userId));
      return u;
    }));
    res.json({ ...trip, confirmedCount: bookings.length, participants: participants.filter(Boolean) });
  });

  // Book a trip — creates Stripe checkout session
  app.post('/api/trips/:id/book', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [trip] = await db.select().from(trips).where(and(eq(trips.id, id), eq(trips.isActive, true)));
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Check capacity
    const confirmedCount = await db.select({ count: count() }).from(tripBookings)
      .where(and(eq(tripBookings.tripId, id), eq(tripBookings.paymentStatus, 'confirmed')));
    if ((confirmedCount[0]?.count ?? 0) >= trip.capacity) {
      return res.status(400).json({ error: 'Trip is fully booked' });
    }

    // Check if already booked
    const [existing] = await db.select().from(tripBookings)
      .where(and(eq(tripBookings.tripId, id), eq(tripBookings.userId, req.user!.id)));
    if (existing?.paymentStatus === 'confirmed') {
      return res.status(400).json({ error: 'Already booked' });
    }

    const { getUncachableStripeClient } = await import('./stripeClient');
    const stripe = await getUncachableStripeClient();
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `${trip.title} — ${trip.destination}` },
          unit_amount: trip.pricePerPerson,
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/viajes?booking_success=true&session_id={CHECKOUT_SESSION_ID}&trip_id=${id}`,
      cancel_url: `${baseUrl}/viajes`,
      customer_email: req.user!.id,
      metadata: { tripId: String(id), userId: req.user!.id },
    });

    // Upsert pending booking
    if (existing) {
      await db.update(tripBookings).set({ stripeSessionId: session.id, paymentStatus: 'pending' })
        .where(eq(tripBookings.id, existing.id));
    } else {
      await db.insert(tripBookings).values({ tripId: id, userId: req.user!.id, stripeSessionId: session.id, paymentStatus: 'pending' });
    }

    res.json({ url: session.url });
  });

  // Verify trip booking after payment
  app.post('/api/trips/:id/verify-booking', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const { getUncachableStripeClient } = await import('./stripeClient');
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      await db.update(tripBookings).set({ paymentStatus: 'confirmed' })
        .where(and(eq(tripBookings.stripeSessionId, sessionId), eq(tripBookings.userId, req.user!.id)));
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  });

  // Admin: create trip
  app.post('/api/admin/trips', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);
    const { title, description, destination, departureDate, returnDate, pricePerPerson, originalPricePerPerson, capacity, coverImageUrl, includedServices, type, featured } = req.body;
    const [trip] = await db.insert(trips).values({
      title, description, destination,
      departureDate: new Date(departureDate),
      returnDate: returnDate ? new Date(returnDate) : null,
      pricePerPerson: Math.round(Number(pricePerPerson) * 100),
      originalPricePerPerson: originalPricePerPerson ? Math.round(Number(originalPricePerPerson) * 100) : null,
      capacity: Number(capacity),
      coverImageUrl, includedServices,
      type: type || 'package',
      isActive: true,
      featured: !!featured,
    }).returning();
    res.json(trip);
  });

  // Admin: update trip
  app.patch('/api/admin/trips/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const { title, description, destination, departureDate, returnDate, pricePerPerson, originalPricePerPerson, capacity, coverImageUrl, includedServices, type, isActive, featured } = req.body;
    const update: any = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (destination !== undefined) update.destination = destination;
    if (departureDate !== undefined) update.departureDate = new Date(departureDate);
    if (returnDate !== undefined) update.returnDate = returnDate ? new Date(returnDate) : null;
    if (pricePerPerson !== undefined) update.pricePerPerson = Math.round(Number(pricePerPerson) * 100);
    if (originalPricePerPerson !== undefined) update.originalPricePerPerson = originalPricePerPerson ? Math.round(Number(originalPricePerPerson) * 100) : null;
    if (capacity !== undefined) update.capacity = Number(capacity);
    if (coverImageUrl !== undefined) update.coverImageUrl = coverImageUrl;
    if (includedServices !== undefined) update.includedServices = includedServices;
    if (type !== undefined) update.type = type;
    if (isActive !== undefined) update.isActive = isActive;
    if (featured !== undefined) update.featured = !!featured;
    const [updated] = await db.update(trips).set(update).where(eq(trips.id, id)).returning();
    res.json(updated);
  });

  // Admin: delete trip
  app.delete('/api/admin/trips/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);
    await db.delete(trips).where(eq(trips.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // Admin: list all trips (including inactive)
  app.get('/api/admin/trips', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [admin] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (admin?.isAdmin !== 'true' && !ADMIN_EMAILS.includes(admin?.email || '')) return res.sendStatus(403);
    const allTrips = await db.select().from(trips).orderBy(desc(trips.createdAt));
    const enriched = await Promise.all(allTrips.map(async (trip) => {
      const [{ count: confirmedCount }] = await db.select({ count: count() }).from(tripBookings)
        .where(and(eq(tripBookings.tripId, trip.id), eq(tripBookings.paymentStatus, 'confirmed')));
      return { ...trip, confirmedCount };
    }));
    res.json(enriched);
  });

  return httpServer;
}
