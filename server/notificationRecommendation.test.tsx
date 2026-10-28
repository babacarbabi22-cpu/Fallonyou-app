import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { NotificationRecommendation } from "../client/src/components/NotificationRecommendation";
import { notificationRecommendationCopy } from "../client/src/lib/notification-recommendation-copy";

const defaults = {
  language: "en" as const, supported: true, subscribed: false,
  permission: "default" as NotificationPermission, loading: false, failed: false,
  onEnable: () => { throw new Error("Rendering must not request notification permission"); },
  onContinue: () => {},
};
function render(props: Partial<React.ComponentProps<typeof NotificationRecommendation>> = {}) {
  return renderToStaticMarkup(<NotificationRecommendation {...defaults} {...props} />);
}
test("recommendation is optional and localized in all four languages", () => {
  for (const language of ["en", "es", "fr", "sv"] as const) {
    const copy = notificationRecommendationCopy[language];
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(notificationRecommendationCopy.en).sort());
    const html = render({ language });
    assert(html.includes(copy.recommended)); assert(html.includes(copy.title));
    assert(html.includes(copy.enable)); assert(html.includes(copy.skip));
    assert(html.includes('data-testid="button-enable-notifications"'));
    assert(html.includes('data-testid="button-skip-notifications"'));
    assert(!html.includes('data-testid="notification-enabled"'));
  }
});
test("declined and unavailable environments can continue without repeated permission prompts", () => {
  for (const state of [{ supported: false }, { permission: "denied" as const }]) {
    const html = render(state);
    assert(!html.includes('data-testid="button-enable-notifications"'));
    assert(html.includes(notificationRecommendationCopy.en.continue));
    assert(!html.includes('data-testid="notification-enabled"'));
  }
});
test("existing or confirmed subscriptions show success and do not ask again", () => {
  const html = render({ subscribed: true });
  assert(html.includes(notificationRecommendationCopy.en.enabled));
  assert(!html.includes('data-testid="button-enable-notifications"'));
  assert(html.includes(notificationRecommendationCopy.en.continue));
});
test("failed activation remains a visible, retryable error instead of false success", () => {
  const html = render({ failed: true });
  assert(html.includes('data-testid="notification-failed"'));
  assert(html.includes('role="alert"'));
  assert(html.includes('data-testid="button-enable-notifications"'));
  assert(html.includes(notificationRecommendationCopy.en.skip));
  assert(!html.includes('data-testid="notification-enabled"'));
});
test("pending activation prevents duplicate requests but does not replace user consent", () => {
  const html = render({ loading: true });
  assert(html.includes(notificationRecommendationCopy.en.enabling));
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
});
test("the actual registration journey now reaches the recommendation before the profile", () => {
  const source = readFileSync("client/src/pages/OnboardingPage.tsx", "utf8");
  const journey = source.slice(source.indexOf("const handleJourneySubmit"), source.indexOf("const toggleConnectionType"));
  assert(journey.includes('setStep("notifications")'));
  assert(!journey.includes('setLocation("/profile")'));
  const enable = source.slice(source.indexOf("const handleEnableNotifications"), source.indexOf("const handleComplete"));
  assert(enable.includes("if (success) setNotifEnabled(true)"));
  assert(enable.includes("else setNotifFailed(true)"));
  assert(!enable.includes("setStep"));
  assert(source.includes('["profile", "journey", "notifications"]'));
  assert(source.includes("onEnable={handleEnableNotifications} onContinue={handleComplete}"));
  const handler = source.slice(source.indexOf("const handleComplete"), source.indexOf("// Auto-verification"));
  assert(handler.includes('setLocation("/profile")'));
});
