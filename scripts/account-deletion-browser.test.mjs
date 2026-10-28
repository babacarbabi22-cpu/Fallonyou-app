// Isolated fixtures only: all API traffic is intercepted; no real account is deleted.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL;
if (!base || !new URL(base).hostname.endsWith(".replit.dev")) throw new Error("Use a development preview URL");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  for (const [language, outcome] of [
    ["es", "queued"], ["en", "queued"], ["fr", "queued"], ["sv", "queued"],
    ["en", "not_required"], ["en", "failure"], ["en", "network"], ["en", "malformed"],
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(lang => localStorage.setItem("fallonyou_language", lang), language);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let calls = 0, deleted = false, release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/user/delete-account") {
        assert.equal(route.request().method(), "DELETE");
        calls++;
        await pending;
        if (outcome === "network") return route.abort("failed");
        if (outcome === "failure") return route.fulfill({ status: 500, json: { error: "Failed to delete account" } });
        if (outcome === "malformed") return route.fulfill({ status: 200, json: { success: true } });
        deleted = true;
        return route.fulfill({ status: 200, json: { success: true, mediaCleanup: outcome } });
      }
      if (path === "/api/user") {
        return route.fulfill({ status: deleted ? 401 : 200, json: deleted ? {} : {
          id: "fictional-delete-owner", firstName: "Fictional", lastName: null,
          email: "fictional@example.invalid", profileImageUrl: "/favicon.png",
          ageConfirmed: true, photos: [], isPremium: "false",
          termsAcceptedAt: "2026-10-01T00:00:00Z", termsAcceptedVersion: "2026-10-content-license",
        } });
      }
      if (path === "/api/notifications/preferences") return route.fulfill({ status: 200, json: { interfaceLanguage: language } });
      return route.fulfill({ status: 200, json: [] });
    });
    await page.goto(`${base}/delete-account`, { waitUntil: "networkidle" });
    const cookie = page.getByTestId("button-cookie-reject");
    if (await cookie.isVisible()) await cookie.click();
    const button = page.getByTestId("button-delete-account-confirm");
    await button.click();
    assert.equal(calls, 0, "first confirmation must not delete");
    await button.click();
    await page.getByTestId("account-deletion-progress").waitFor();
    assert.equal(await button.isDisabled(), true);
    assert.equal(await page.getByTestId("account-deletion-result").count(), 0);
    assert.equal(await page.getByText("Could not delete account. Please try again.", { exact: true }).count(), 0);
    if (language === "en" && outcome === "queued") await page.screenshot({ path: "/tmp/account-deletion-progress.jpg", fullPage: true });
    release();
    if (["queued", "not_required"].includes(outcome)) {
      await page.getByTestId("account-deletion-result").waitFor();
      assert.equal(await page.getByTestId("button-delete-account-confirm").count(), 0);
      if (language === "en" && outcome === "queued") {
        assert.ok((await page.getByTestId("account-deletion-result").innerText()).includes("Your account has been deleted."));
        await page.screenshot({ path: "/tmp/account-deletion-success.jpg", fullPage: true });
      }
    } else {
      const message = outcome === "failure"
        ? "Could not delete account. Please try again."
        : "We couldn’t confirm the result.";
      await page.locator('[data-component-name="ToastDescription"]').filter({ hasText: message }).waitFor();
      assert.equal(await page.getByTestId("account-deletion-result").count(), 0);
      assert.equal(await button.isEnabled(), true);
    }
    assert.equal(calls, 1);
    assert.deepEqual(errors, []);
    console.log(`PASS ${language}/${outcome}: two confirmations, truthful pending/result, no real API calls`);
    await context.close();
  }
} finally { await browser.close(); }
