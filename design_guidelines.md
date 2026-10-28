# FallonYou Dating App - Design Guidelines

## Design Approach
**Reference-Based**: Drawing from Tinder's card-based swiping, Bumble's friendly approachability, and Hinge's conversation-focused design. Creating a romantic, warm experience that balances excitement with trust.

## Typography System
- **Primary Font**: Poppins (Google Fonts) - Modern, friendly, approachable
- **Secondary Font**: Inter (Google Fonts) - Clean readability for body text
- **Hierarchy**:
  - Hero/Headlines: Poppins Bold, text-4xl to text-6xl
  - Section Titles: Poppins SemiBold, text-2xl to text-3xl
  - Body Text: Inter Regular, text-base to text-lg
  - UI Labels: Inter Medium, text-sm
  - Small Print: Inter Regular, text-xs

## Layout & Spacing System
**Tailwind Units**: Primary spacing set of 4, 6, 8, 12, 16, 20
- Component padding: p-6 to p-8
- Section spacing: py-16 to py-24
- Card gaps: gap-6
- Container max-width: max-w-7xl with px-6

## Hero Section
**Full-width immersive hero** (h-screen on desktop, min-h-[600px] on mobile):
- Large romantic lifestyle image showing couples/connection moments
- Overlay gradient (subtle, non-intrusive)
- Centered content: App logo, tagline, dual CTAs (Download iOS/Android)
- Floating phone mockup showing app interface (positioned right on desktop, centered on mobile)
- Buttons with backdrop-blur-lg and semi-transparent backgrounds
- Trust indicators below CTAs: "10M+ Downloads" | "4.8★ Rating" | "Safe & Verified"

## Core App Screens Layout
**Mobile-First Card Interface** (all screens max-w-md centered on desktop):

1. **Swipe/Discovery Screen**:
   - Full-screen cards (aspect-ratio-[3/4])
   - Large user photo with subtle gradient overlay at bottom
   - Name/age positioned bottom-left with p-6
   - Bio snippet below (max 2 lines, truncated)
   - Action buttons row: circular buttons (w-16 h-16) - Pass, Super Like, Like
   - Settings icon top-right, profile icon top-left

2. **Match Screen**:
   - Dual circular profile photos (w-32 h-32) overlapping slightly
   - "It's a Match!" headline centered
   - Matched user name
   - Two action buttons: "Send Message" (primary) | "Keep Swiping" (secondary)
   - Animated confetti overlay suggestion

3. **Messaging Interface**:
   - Header: Matched user photo (w-12 h-12), name, online status
   - Chat bubbles: sender (right-aligned, rounded-3xl), receiver (left-aligned, rounded-3xl)
   - Message spacing: gap-3
   - Input bar: fixed bottom with input field, emoji picker, send button

4. **Profile View**:
   - Photo carousel (swipeable, indicator dots)
   - Sticky header with back button
   - Bio section with p-6
   - Tags/interests grid (flex-wrap, gap-2, pill-shaped badges)
   - Info cards: Education, Location, Height (grid-cols-2, gap-4)

## Feature Showcase Section
**Grid layout** (grid-cols-1 md:grid-cols-3, gap-8):
- Three feature cards with illustrations/screenshots
- Card structure: Image top, title, description, padding p-8
- Features: "Smart Matching" | "Video Dates" | "Safety First"

## Premium Subscription Section
**Pricing cards** (grid-cols-1 md:grid-cols-3, gap-6):
- Three tiers: Basic (free), Premium, VIP
- Card elevation hierarchy (VIP emphasized with transform scale-105)
- Each card: Badge (if featured), price, duration, feature list with checkmarks, CTA button
- Toggle for Monthly/Annual billing above cards

## Social Proof Section
**Testimonials carousel** (single column, overflow-x-auto on mobile):
- Cards with user photo (w-16 h-16 rounded-full), quote, name, relationship status
- 3 testimonials visible on desktop, swipeable on mobile
- Success metrics row below: "50K+ Matches Daily" | "87% Success Rate" | "150+ Countries"

## Footer
**Comprehensive footer** (grid-cols-2 md:grid-cols-4, gap-8):
- App download badges (iOS/Android)
- Quick links: About, Safety, Privacy, Terms
- Language selector dropdown
- Social media icons (row of 5)
- Newsletter signup: email input + submit button
- Trust badges: Verified Business, SSL Secure, Privacy Certified

## Component Library

**Buttons**:
- Primary CTA: rounded-full, px-8 py-4, font-semibold
- Secondary: border-2, rounded-full, px-8 py-4
- Icon buttons: circular (w-12 h-12), centered icon
- Floating action: w-14 h-14, fixed bottom-right with shadow-lg

**Cards**:
- User cards: rounded-3xl, overflow-hidden, shadow-xl
- Content cards: rounded-2xl, p-6, shadow-md
- Message bubbles: rounded-3xl, px-5 py-3, max-w-[75%]

**Forms**:
- Input fields: rounded-xl, px-4 py-3, border-2, focus ring
- Dropdown/select: rounded-xl with chevron icon
- Toggle switches: rounded-full track, circular thumb

**Navigation** (mobile bottom tab):
- 5 icons: Discover, Matches, Messages, Profile, Settings
- Fixed bottom, backdrop-blur, icon + label, active state emphasized

## Images
1. **Hero**: Romantic sunset couple photo, warm lighting, candid moment (full-width, h-screen)
2. **Feature illustrations**: Custom illustrations for Smart Matching, Video Dates, Safety (aspect-ratio-square)
3. **App screenshots**: iPhone mockups showing swiping, matching, messaging (multiple throughout)
4. **Testimonial photos**: Real user-style portraits (w-16 h-16 circular)
5. **Profile examples**: Diverse user photos in cards throughout (aspect-ratio-[3/4])

## Responsive Breakpoints
- Mobile: base (full-width cards, stacked layout)
- Tablet: md: (2-column grids, side-by-side elements)
- Desktop: lg: (max-w-md for app interface, wider for marketing sections)

**Critical**: All interactive app screens stay mobile-width even on desktop (max-w-md centered) for authentic app feel. Marketing sections expand to full-width with appropriate containers.