import { photos, profiles, users, type Photo, type Profile, type User } from "@shared/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";

// Explicit opt-in only: omissions on older clients preserve the stored choice.
export const ageVisibilityPatchSchema = z.object({ showAge: z.boolean().optional() });

// For public endpoints that select a flat age rather than a profile DTO.
export const publicAgeColumn = sql<number | null>`CASE WHEN ${profiles.showAge} = true THEN ${profiles.age} ELSE NULL END`;

// Public identity returned when another person's profile is shown. Keep this
// allowlist intentionally small; account, billing, location, and moderation
// fields must never be inherited from a database row.
export const publicUserColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  profileImageUrl: users.profileImageUrl,
  isVerified: users.isVerified,
} as const;

// Fields used by public profile cards and profile details. Precise coordinates,
// location timestamps and account IDs are deliberately excluded. showAge is
// selected only to enforce visibility; it is never emitted in public DTOs.
export const publicProfileColumns = {
  bio: profiles.bio,
  age: profiles.age,
  showAge: profiles.showAge,
  gender: profiles.gender,
  zodiacSign: profiles.zodiacSign,
  smoking: profiles.smoking,
  drinking: profiles.drinking,
  children: profiles.children,
  education: profiles.education,
  occupation: profiles.occupation,
  birthplace: profiles.birthplace,
  height: profiles.height,
  pets: profiles.pets,
  exercise: profiles.exercise,
  interests: profiles.interests,
  connectionTypes: profiles.connectionTypes,
  travelInterests: profiles.travelInterests,
  travelerMode: profiles.travelerMode,
  currentCity: profiles.currentCity,
  homeCity: profiles.homeCity,
  travelerVerified: profiles.travelerVerified,
  availableToday: profiles.availableToday,
  availableUntil: profiles.availableUntil,
  nextAdventure: profiles.nextAdventure,
  favoriteDestinations: profiles.favoriteDestinations,
  notRecommendedDestinations: profiles.notRecommendedDestinations,
  availableAsGuide: profiles.availableAsGuide,
  speaksLanguages: profiles.speaksLanguages,
  learningLanguages: profiles.learningLanguages,
  wantToHelp: profiles.wantToHelp,
  helpWith: profiles.helpWith,
  langLevel: profiles.langLevel,
  primaryLang: profiles.primaryLang,
  workStatus: profiles.workStatus,
  aviationOptIn: profiles.aviationOptIn,
  aviationRole: profiles.aviationRole,
} as const;

export const currentProfileColumns = {
  ...publicProfileColumns,
  preference: profiles.preference,
  religion: profiles.religion,
  politics: profiles.politics,
  relationshipType: profiles.relationshipType,
  personalPreferencesConsentAt: profiles.personalPreferencesConsentAt,
  personalPreferencesConsentVersion: profiles.personalPreferencesConsentVersion,
} as const;

export const publicPhotoColumns = {
  id: photos.id,
  url: photos.url,
} as const;

// The owner needs the media type to distinguish a saved photo from a video.
// Keep the community-facing photo DTO unchanged.
export const currentPhotoColumns = {
  ...publicPhotoColumns,
  type: photos.type,
} as const;

// The current-user endpoint may return fields needed for the owner's settings
// and app permissions. isBanned is selected only to enforce access and is
// intentionally omitted by toCurrentUser.
export const currentUserColumns = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  profileImageUrl: users.profileImageUrl,
  isPremium: users.isPremium,
  isVerified: users.isVerified,
  isAdmin: users.isAdmin,
  ageConfirmed: users.ageConfirmed,
  ageConfirmedAt: users.ageConfirmedAt,
  termsAcceptedAt: users.termsAcceptedAt,
  termsAcceptedVersion: users.termsAcceptedVersion,
  verificationStatus: users.verificationStatus,
  verificationRejectedReason: users.verificationRejectedReason,
  isBanned: users.isBanned,
  banReason: users.banReason,
} as const;

export type PublicUser = Pick<User, keyof typeof publicUserColumns>;
export type PublicProfile = Pick<Profile, keyof typeof publicProfileColumns>;

export function toPublicUser(user: Partial<User>) {
  return {
    id: user.id ?? "",
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    isVerified: user.isVerified,
  };
}

export function toPublicProfile(profile: Partial<Profile> | null | undefined): Partial<PublicProfile> | null {
  if (!profile) return null;

  return {
    bio: profile.bio,
    ...(profile.showAge === true ? { age: profile.age } : {}),
    gender: profile.gender,
    zodiacSign: profile.zodiacSign,
    smoking: profile.smoking,
    drinking: profile.drinking,
    children: profile.children,
    education: profile.education,
    occupation: profile.occupation,
    birthplace: profile.birthplace,
    height: profile.height,
    pets: profile.pets,
    exercise: profile.exercise,
    interests: profile.interests,
    connectionTypes: profile.connectionTypes,
    travelInterests: profile.travelInterests,
    travelerMode: profile.travelerMode,
    currentCity: profile.currentCity,
    homeCity: profile.homeCity,
    travelerVerified: profile.travelerVerified,
    availableToday: profile.availableToday,
    availableUntil: profile.availableUntil,
    nextAdventure: profile.nextAdventure,
    favoriteDestinations: profile.favoriteDestinations,
    notRecommendedDestinations: profile.notRecommendedDestinations,
    availableAsGuide: profile.availableAsGuide,
    speaksLanguages: profile.speaksLanguages,
    learningLanguages: profile.learningLanguages,
    wantToHelp: profile.wantToHelp,
    helpWith: profile.helpWith,
    langLevel: profile.langLevel,
    primaryLang: profile.primaryLang,
    workStatus: profile.workStatus,
    aviationOptIn: profile.aviationOptIn,
    aviationRole: profile.aviationRole,
  };
}

export function toPublicPhoto(photo: Partial<Photo>) {
  return {
    id: photo.id,
    url: photo.url,
  };
}

export function toCurrentUser(
  user: Partial<User>,
  profile: Partial<Profile> | null | undefined,
  userPhotos: Partial<Photo>[],
) {
  const safeProfile = toCurrentProfile(profile);
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified ?? "false",
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.firstName,
    profileImageUrl: user.profileImageUrl,
    isPremium: user.isPremium,
    isVerified: user.isVerified,
    isAdmin: user.isAdmin,
    ageConfirmed: user.ageConfirmed === "true",
    ageConfirmedAt: user.ageConfirmedAt,
    termsAcceptedAt: user.termsAcceptedAt,
    termsAcceptedVersion: user.termsAcceptedVersion,
    verificationStatus: user.verificationStatus,
    verificationRejectedReason: user.verificationRejectedReason,
    profile: safeProfile,
    photos: userPhotos.map(photo => ({
      ...toPublicPhoto(photo),
      type: photo.type === "image" || photo.type === "video" ? photo.type : null,
    })),
    bio: safeProfile?.bio,
    age: safeProfile?.age,
    gender: safeProfile?.gender,
    preference: profile?.preference,
  };
}

export function toCurrentProfile(profile: Partial<Profile> | null | undefined) {
  if (!profile) return null;
  return {
    ...toPublicProfile(profile),
    age: profile.age,
    showAge: profile.showAge === true,
    preference: profile.preference,
    religion: profile.religion,
    politics: profile.politics,
    relationshipType: profile.relationshipType,
    personalPreferencesConsentAt: profile.personalPreferencesConsentAt,
    personalPreferencesConsentVersion: profile.personalPreferencesConsentVersion,
  };
}