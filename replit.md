# FallonYou - Dating App

## Overview

FallonYou is a luxury travel & social connection dating app built with React + Express + PostgreSQL. Black & gold palette, multi-language (ES/EN/FR), event creation, push notifications, admin panel, Ambassador/Referral program. Completely free during launch.

### Engagement / Retention Features
- **Spark del día** — A daily featured profile shown in SwipePage (deterministic per user+date seed, changes every 24h). Endpoint: `GET /api/daily-spark`
- **Racha de conexión** — Login streak counter computed from `app_sessions` table. Shown in ProfilePage. Endpoint: `GET /api/streak`
- **Vistas de perfil hoy** — Shows how many unique users viewed the profile today. Endpoint: `GET /api/profile-views/today`
- **Countdown en actividades** — Live countdown timer (green/amber/red) on future event cards in EventsPage. Pure frontend with `useCountdown` custom hook + `EventCountdown` component.
- **Sistema de logros/badges** — 10 achievement badges computed dynamically from user activity (Explorador, Organizador, Conectado, Favorito, En racha 7d, Constante 30d, Viajero, Veterano, Premium, Embajador). Shown in ProfilePage. Endpoint: `GET /api/my-badges`

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for swipe card animations and page transitions
- **Build Tool**: Vite with React plugin

The frontend follows a page-based architecture with:
- Protected routes requiring authentication
- Reusable components in `/client/src/components`
- Custom hooks in `/client/src/hooks` for data fetching and business logic
- UI components from shadcn/ui in `/client/src/components/ui`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Design**: RESTful endpoints defined in `/shared/routes.ts` with Zod validation
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js and session-based auth
- **File Storage**: Google Cloud Storage integration via Replit Object Storage

The backend uses a layered architecture:
- Routes registered in `/server/routes.ts`
- Storage layer in `/server/storage.ts` for database operations
- Auth integration in `/server/replit_integrations/auth`
- Object storage in `/server/replit_integrations/object_storage`

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `/shared/schema.ts` and `/shared/models/auth.ts`
- **Migrations**: Drizzle Kit with migrations in `/migrations`
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

Key database tables:
- `users` - User accounts with Stripe integration fields
- `profiles` - User profile information (bio, age, gender, preferences)
- `photos` - User uploaded photos
- `matches` - Mutual matches between users
- `messages` - Chat messages between matched users
- `ratings` - Match ratings/scoring
- `preferences` - User discovery preferences
- `events` - Events/activities with cover images
- `eventParticipants` - Event attendees
- `eventComments` - Comments on events

### Payment Integration
- **Stripe**: Primary payment processor for premium subscriptions
  - Checkout sessions for subscription signup
  - Customer portal for subscription management
  - Webhook handling for subscription lifecycle events
  - Managed via `stripe-replit-sync` package
- **PayPal**: Secondary payment option (configured but not primary)

### File Upload Flow
The app uses a presigned URL approach for file uploads:
1. Client requests presigned URL from `/api/uploads/request-url`
2. Client uploads directly to Google Cloud Storage
3. File URL is stored in the database via photo API

## External Dependencies

### Core Services
- **PostgreSQL Database**: Required for all data storage (DATABASE_URL environment variable)
- **Replit Auth**: OpenID Connect authentication via Replit's identity provider
- **Replit Object Storage**: Google Cloud Storage for photo uploads

### Payment Services
- **Stripe**: Subscription payments and customer management
  - Requires Stripe connector configuration in Replit
  - Uses `stripe-replit-sync` for webhook management and data sync
- **PayPal** (optional): Alternative payment method
  - Requires PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit environment identifier
- `ISSUER_URL` - OpenID Connect issuer (defaults to Replit)

### Security
- **Helmet**: Sets security HTTP headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.)
- **Rate Limiting**: Global API limit (200 req/15min) + stricter auth limit (15 req/15min for login/register)
- **Password Hashing**: bcryptjs with 10 salt rounds
- **Session Security**: httpOnly cookies, secure flag in production, sameSite: lax, PostgreSQL-backed sessions
- **SQL Injection Prevention**: Drizzle ORM with parameterized queries
- **XSS Protection**: React's built-in escaping + Content Security Policy headers
- **Stripe Webhook Verification**: Signature validation on all webhook events
- **Access Control**: Authentication middleware + ownership checks on all mutation endpoints

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Data fetching and caching
- `framer-motion` - Animations
- `@google-cloud/storage` - File storage
- `passport` / `openid-client` - Authentication
- `stripe` / `stripe-replit-sync` - Payment processing
- `@uppy/core` / `@uppy/aws-s3` - File upload handling
- `helmet` - Security HTTP headers
- `express-rate-limit` - API rate limiting