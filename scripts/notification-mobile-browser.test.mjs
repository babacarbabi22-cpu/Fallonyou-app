// Fictional fixtures only: intercept every API call, including mark-read mutations.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL;
if (!base || !new URL(base).hostname.endsWith(".replit.dev")) throw new Error("Use the development preview");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  for (const language of ["es", "en", "fr", "sv"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(lang => {
      localStorage.setItem("fallonyou_language", lang);
      localStorage.setItem("fallonyou_tour_completed", "true");
    }, language);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const notices = Array.from({ length: 18 }, (_, i) => ({
      id: i + 1, type: "system", read: false, link: i === 1 ? "/matches" : null,
      title: `Fictional notice ${i + 1} ${"LongUnbrokenTitle".repeat(8)}`,
      body: `Fictional notification body, readable without rotating the phone.\n${"A complete line of information for mobile readers. ".repeat(12)}\n${"LongUnbrokenBody".repeat(12)}`,
      createdAt: "2026-10-18T00:00:00Z",
    }));
    let readAllCalls = 0, readOneCalls = 0;
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body = [];
      if (path === "/api/user") body = {
        id: "fictional-notification-owner", firstName: "Fictional", lastName: null,
        email: "fictional@example.invalid", profileImageUrl: "/favicon.png", photos: [], profile: {},
        ageConfirmed: true, isPremium: "false", termsAcceptedAt: "2026-10-01T00:00:00Z",
        termsAcceptedVersion: "2026-10-content-license",
      };
      else if (path === "/api/notifications/preferences") body = { interfaceLanguage: language };
      else if (path === "/api/notifications/unread-count") body = { count: notices.filter(n => !n.read).length };
      else if (path === "/api/notifications") body = notices;
      else if (path === "/api/notifications/read-all") {
        readAllCalls++; notices.forEach(n => { n.read = true; }); body = { success: true };
      } else if (/^\/api\/notifications\/\d+\/read$/.test(path)) {
        readOneCalls++; notices.find(n => n.id === Number(path.split("/")[3])).read = true; body = { success: true };
      } else if (path === "/api/events/top-rated") body = { events: [] };
      else if (path === "/api/events/suggestions") body = { suggestions: [] };
      else if (path === "/api/album") body = { photos: [] };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(`${base}/events`, { waitUntil: "networkidle" });
    const cookie = page.getByTestId("button-cookie-reject");
    if (await cookie.isVisible()) await cookie.click();
    const bell = page.getByTestId("button-notification-bell");
    await bell.click();
    const panel = page.getByTestId("panel-notifications");
    await panel.waitFor();
    for (const [width, height] of [[390, 844], [320, 568], [430, 932], [844, 390], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(300); // allow collision repositioning and entry animation
      const dimensions = await panel.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          overflow: [...el.querySelectorAll("button, p, h3")].some(child => child.scrollWidth > child.clientWidth + 2),
        };
      });
      assert.ok(dimensions.left >= 4 && dimensions.right <= width - 4, `${language} ${width}: horizontal bounds ${JSON.stringify(dimensions)}`);
      assert.ok(dimensions.top >= 0 && dimensions.bottom <= height + 1, `${language} ${width}: vertical bounds ${JSON.stringify(dimensions)}`);
      assert.equal(dimensions.overflow, false, `${language} ${width}: text fits`);
      const firstBody = page.getByTestId("notif-item-1").locator("p").nth(1);
      assert.equal(await firstBody.evaluate(el => getComputedStyle(el).webkitLineClamp), "none");
      if (language === "en" && width === 390) await page.screenshot({ path: "/tmp/notification-mobile-portrait.jpg" });
    }
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    assert.equal(await bell.evaluate(el => document.activeElement === el), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await bell.click();
    await panel.waitFor();
    await page.getByTestId("notif-item-1").click();
    await panel.waitFor({ state: "hidden" });
    assert.equal(readOneCalls, 1);
    await bell.click();
    await page.getByTestId("button-read-all").click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="button-read-all"]'));
    assert.equal(readAllCalls, 1);
    await page.getByTestId("notif-item-18").scrollIntoViewIfNeeded();
    assert.equal(await page.getByTestId("notif-item-18").isVisible(), true);
    await page.mouse.click(2, 2);
    await panel.waitFor({ state: "hidden" });
    await bell.click();
    await page.getByTestId("notif-item-2").click();
    await page.waitForURL("**/matches");
    assert.deepEqual(errors, []);
    console.log(`PASS ${language}: portrait 320/390/430, landscape, desktop, full text, scrolling, Escape/focus, outside close, read-one/all, navigation`);
    await context.close();
  }
} finally { await browser.close(); }
