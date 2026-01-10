# FallonYou - Dating App

## Overview

FallonYou is a Tinder-style dating application built with a React frontend and Express backend. The app enables users to discover potential matches through a swipe-based interface, chat with matches, and offers a premium subscription tier with additional features like unlimited likes and seeing who liked your profile.

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

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Data fetching and caching
- `framer-motion` - Animations
- `@google-cloud/storage` - File storage
- `passport` / `openid-client` - Authentication
- `stripe` / `stripe-replit-sync` - Payment processing
- `@uppy/core` / `@uppy/aws-s3` - File upload handling