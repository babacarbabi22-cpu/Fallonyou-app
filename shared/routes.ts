
import { z } from 'zod';
import { insertProfileSchema, insertPhotoSchema, insertMatchSchema, insertRatingSchema, users, profiles, photos, matches, ratings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect & { profile: typeof profiles.$inferSelect | null }>().nullable(),
      },
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect & { profile: typeof profiles.$inferSelect | null, photos: typeof photos.$inferSelect[] }>()),
      },
    },
    updateProfile: {
      method: 'PATCH' as const,
      path: '/api/profile',
      input: insertProfileSchema.partial().omit({ userId: true }),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
      },
    },
  },
  photos: {
    upload: {
      method: 'POST' as const,
      path: '/api/photos',
      responses: {
        201: z.custom<typeof photos.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/photos/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  matches: {
    list: {
      method: 'GET' as const,
      path: '/api/matches',
      responses: {
        200: z.array(z.custom<typeof matches.$inferSelect & { otherUser: typeof users.$inferSelect & { profile: typeof profiles.$inferSelect | null, photos: typeof photos.$inferSelect[] } }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/matches',
      input: z.object({ targetUserId: z.string() }),
      responses: {
        200: z.custom<typeof matches.$inferSelect>().nullable(),
      },
    },
  },
  ratings: {
    create: {
      method: 'POST' as const,
      path: '/api/ratings',
      input: z.object({ matchId: z.number(), score: z.number().min(1).max(10) }),
      responses: {
        201: z.custom<typeof ratings.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
