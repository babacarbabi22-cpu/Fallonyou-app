---
name: BetaFamily + Google Play closed testing setup
description: Gotchas encountered setting up a paid BetaFamily.com tester campaign feeding into Google Play closed testing for production access approval.
---

## Google Play requires a separate opt-in link per tester, not the public Play Store link
The normal Play Store URL (`play.google.com/store/apps/details?id=<package>`) only works for accounts already authorized as testers (e.g. the developer's own account). New/unauthorized testers get a 404 there even while the app is in closed testing.

**Why:** Google Play only resolves the public listing page for accounts that already have access; everyone else needs the dedicated opt-in flow.

**How to apply:** always share the "Join on Android" link from Google Play Console → Testing → Closed testing → "How testers join your test" section. That link (`play.google.com/apps/testing/<package>`) prompts sign-in and an explicit "become a tester" opt-in step. Only after a tester completes that step will the normal store link work for them.

## Testers must also be added to the Play Console email allow-list
Even with the correct join link, if the tester's Google account email isn't in the configured email list (or Google Group) under Closed testing, they still can't join. This was a likely root cause of a prior Google Play "more testing required" rejection — testers may never have actually gained access.

**How to apply:** collect each tester's Gmail address (e.g. via a required questionnaire field in BetaFamily) and manually add it to the Play Console tester email list before/as they're approved.

## BetaFamily site reliability
BetaFamily.com is prone to being slow, showing generic "you are completely lost" 404s mid-flow (e.g. right after checkout), and dropping in-progress test creation without clear indication of failure — even when $0 (no reward) tests are being created. A test that appears to fail can still succeed silently.

**How to apply:** after any checkout/publish action, don't assume failure just because a broken/lost page appears — check "My tests" → "Developed by me" (may take a little time to reflect) before recreating the test from scratch. Numeric-only fields (like test duration in days) can also fail to accept input on mobile Safari; try desktop browser as a fallback.
