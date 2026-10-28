// Development-only browser fixtures: every API request is intercepted, never real user data.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL;
if (!base || !new URL(base).hostname.endsWith(".replit.dev")) throw new Error("Use a development preview URL");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const member = id => ({ id, firstName: id, lastName: null, profileImageUrl: null, isVerified: "false", profile: {} });
const row = (id, who, incoming = true, createdAt = "2026-10-18T07:06:00Z") => ({
  id, user1Id: incoming ? who : "fixture-owner", user2Id: incoming ? "fixture-owner" : who,
  status: "pending", createdAt, otherUser: member(who),
});
const touch = process.env.TEST_TOUCH === "1";
const press = locator => touch ? locator.tap() : locator.click();
try {
  for (const language of process.env.TEST_LANGUAGES?.split(",") || ["es", "en", "fr", "sv"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: touch, isMobile: touch });
    await context.addInitScript(lang => localStorage.setItem("fallonyou_language", lang), language);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let incoming = [row(1, "FixtureOld", true, "2026-10-17T07:06:00Z"), row(2, "FixtureNew")];
    let sent = Array.from({ length: 11 }, (_, i) => row(10 + i, `FixtureSent${i}`, false));
    let matches = [{ ...row(30, "FixtureConnected"), status: "matched" }];
    let blockCalls = 0, reportCalls = 0, acceptCalls = 0, blockFails = false, acceptResult = false;
    let failIncoming = false;
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body = [], status = 200;
      if (path === "/api/user") body = {
        ...member("fixture-owner"), email: "fixture@example.invalid", ageConfirmed: true,
        termsAcceptedAt: "2026-10-01T00:00:00Z", termsAcceptedVersion: "2026-10-content-license",
        profileImageUrl: "/favicon.png", photos: [], isPremium: "false",
      };
      else if (path === "/api/matches/incoming") { body = incoming; if (failIncoming) { status = 500; body = { error: "fixture unavailable" }; } }
      else if (path === "/api/matches/requests") body = sent;
      else if (path === "/api/matches" && route.request().method() === "GET") body = matches;
      else if (path === "/api/matches" && route.request().method() === "POST") {
        acceptCalls++;
        const target = route.request().postDataJSON().targetUserId;
        const request = incoming.find(item => item.otherUser.id === target);
        body = { isMatch: acceptResult, match: { ...request, status: acceptResult ? "matched" : "pending" } };
        if (acceptResult) incoming = incoming.filter(item => item.otherUser.id !== target);
      } else if (path.endsWith("/block")) {
        blockCalls++;
        if (blockFails) { status = 500; body = { error: "fixture blocked" }; }
        else {
          const id = path.split("/")[3];
          incoming = incoming.filter(item => item.otherUser.id !== id);
          sent = sent.filter(item => item.otherUser.id !== id);
          matches = matches.filter(item => item.otherUser.id !== id);
          body = { success: true };
        }
      } else if (path.endsWith("/report")) { reportCalls++; body = { success: true, reportId: 1 }; }
      else if (/^\/api\/matches\/\d+$/.test(path)) body = { ...row(2, "FixtureNew"), status: "matched" };
      else if (path.includes("unread-count")) body = { count: 0 };
      else if (path === "/api/notifications/preferences") body = { matches: false, messages: false };
      else if (route.request().method() !== "GET") body = { success: true };
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(`${base}/matches`, { waitUntil: "networkidle" });
    await page.getByTestId("button-cookie-reject").click();
    await page.getByTestId("incoming-request-card-2").waitFor();
    assert.deepEqual(await page.locator('[data-testid^="incoming-request-card-"]').evaluateAll(elements => elements.map(el => el.dataset.testid)), ["incoming-request-card-2", "incoming-request-card-1"]);
    assert.match(await page.getByTestId("incoming-request-timestamp-2").innerText(), /2026/);
    assert.equal(await page.getByTestId("match-timestamp-30").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await press(page.getByTestId("request-2-menu"));
    await page.getByRole("dialog").waitFor();
    assert.equal(acceptCalls, 0, "opening safety options never accepts the request");
    assert.equal(blockCalls, 0);
    assert.equal(reportCalls, 0);
    assert.equal(await page.getByTestId("request-2-block").isVisible(), true);
    assert.equal(await page.getByTestId("request-2-report").isVisible(), true);
    const bounds = await page.getByRole("dialog").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
    if (language === "es") await page.screenshot({ path: `/tmp/connection-safety-${touch ? "touch" : "mouse"}.jpg` });
    await press(page.getByTestId("request-2-cancel"));
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await page.getByTestId("request-2-menu").evaluate(el => document.activeElement === el), true);
    if (!touch) {
      await page.getByTestId("request-2-menu").press("Enter");
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
    }
    await page.getByTestId("accept-request-2").click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="accept-request-2"]').disabled);
    assert.equal(acceptCalls, 1);
    assert.equal(new URL(page.url()).pathname, "/matches"); // never treat pending as accepted
    await press(page.getByTestId("request-2-menu"));
    await press(page.getByTestId("request-2-block"));
    assert.equal(blockCalls, 0);
    await press(page.getByTestId("request-2-cancel"));
    assert.equal(blockCalls, 0);
    await press(page.getByTestId("request-2-menu"));
    await press(page.getByTestId("request-2-report"));
    await page.getByTestId("request-2-report-details").fill("Fictional demonstration only");
    assert.equal(reportCalls, 0);
    await press(page.getByTestId("request-2-report-confirm"));
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(reportCalls, 1);
    blockFails = true;
    await press(page.getByTestId("request-2-menu"));
    await press(page.getByTestId("request-2-block"));
    await press(page.getByTestId("request-2-block-confirm"));
    await page.getByRole("dialog").getByRole("alert").waitFor();
    assert.equal(await page.getByTestId("incoming-request-card-2").count(), 1);
    blockFails = false;
    await press(page.getByTestId("request-2-block-confirm"));
    await page.getByTestId("incoming-request-card-2").waitFor({ state: "hidden" });
    assert.equal(blockCalls, 2);
    assert.equal(await page.getByTestId("connection-requests").locator("p[role=status]").count(), 0);
    incoming.push(row(3, "FixturePolling", true, "2026-10-18T08:00:00Z"));
    await page.getByTestId("incoming-request-card-3").waitFor({ timeout: 8500 }); // active-screen polling
    await page.getByTestId("sent-tab").click();
    assert.equal(await page.locator('[data-testid^="sent-request-card-"]').count(), 11);
    await press(page.getByTestId("request-10-menu"));
    await page.getByRole("dialog").waitFor();
    await press(page.getByTestId("request-10-cancel"));
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByTestId("match-card-30").scrollIntoViewIfNeeded();
    assert.equal(await page.getByTestId("match-card-30").isVisible(), true);
    await press(page.getByTestId("match-30-menu"));
    await press(page.getByTestId("match-30-block"));
    await press(page.getByTestId("match-30-block-confirm"));
    await page.getByTestId("match-card-30").waitFor({ state: "hidden" });
    await page.getByTestId("incoming-tab").click();
    if (language === "es") await page.screenshot({ path: "/tmp/connection-requests-mobile.jpg", fullPage: true });
    acceptResult = true;
    await page.getByTestId("accept-request-3").click();
    await page.waitForURL("**/chat/3");
    assert.deepEqual(errors, []);
    console.log(`PASS ${language}/${touch ? "touch" : "mouse/keyboard"}: options before acceptance, dates/order, no premature chat, report, block/cancel/failure, polling, sent/confirmed menus, accepted chat`);
    await context.close();
  }
} finally { await browser.close(); }
