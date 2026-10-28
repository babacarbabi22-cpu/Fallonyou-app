// Run against development only; all authentication mutations are intercepted.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH may point to an existing system installation.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.TEST_BASE_URL;
if (!baseURL || !new URL(baseURL).hostname.endsWith(".replit.dev")) {
  throw new Error("Provide the development preview URL in TEST_BASE_URL");
}
const browser = await chromium.launch({
  headless: true, executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox"],
});
try {
  for (const language of ["es", "en", "fr", "sv"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(lang => localStorage.setItem("fallonyou_language", lang), language);
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", error => failures.push(error.message));
    let requests = 0;
    let response = { status: 400, body: { fieldErrors: { email: "EMAIL_REGISTERED" } } };
    await page.route("**/api/register", async route => {
      requests++;
      await route.fulfill({ status: response.status, contentType: "application/json", body: JSON.stringify(response.body) });
    });
    await page.route("**/api/login", route => route.fulfill({
      status: 401, contentType: "application/json", body: JSON.stringify({ error: "Invalid email or password" }),
    }));
    await page.goto(`${baseURL}/auth`, { waitUntil: "networkidle" });
    await page.getByTestId("button-cookie-reject").click();
    assert.match(await page.getByTestId("button-language-selector").innerText(), new RegExp(language.toUpperCase()));
    await page.getByTestId("button-register-tab").click();
    await page.getByTestId("button-submit").click();
    assert.equal(await page.locator("p[role=alert]").count(), 3);
    assert.equal(requests, 0);
    assert.equal(await page.locator("#auth-firstName").evaluate(el => el === document.activeElement), true);
    await page.getByTestId("input-first-name").fill("Two Names");
    await page.getByTestId("input-email").fill("bad-email");
    await page.getByTestId("input-password").fill("short");
    await page.getByTestId("button-submit").click();
    assert.equal(await page.locator("p[role=alert]").count(), 3);
    assert.equal(requests, 0);
    await page.getByTestId("input-first-name").fill("Fixture");
    await page.getByTestId("input-email").fill("fixture@example.invalid");
    await page.getByTestId("input-password").fill("é".repeat(37));
    await page.getByTestId("button-submit").click();
    assert.equal(await page.locator("#auth-password").getAttribute("aria-invalid"), "true");
    assert.equal(requests, 0);
    await page.getByTestId("input-password").fill("Fictional123");
    await page.getByTestId("checkbox-age-confirm").check({ force: true });
    await page.getByTestId("button-submit").click();
    await page.getByTestId("button-existing-email-login").waitFor();
    assert.equal(requests, 1); // no retry for validation
    assert.equal(await page.getByTestId("input-email").inputValue(), "fixture@example.invalid");
    assert.equal(await page.getByTestId("input-password").inputValue(), "Fictional123");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (language === "es") {
      assert.match(await page.locator("#auth-email-error").innerText(), /correo ya está registrado/);
      await page.screenshot({ path: "/tmp/registration-mobile.jpg", fullPage: true });
    }
    await page.getByTestId("button-existing-email-login").click();
    assert.equal(await page.getByTestId("input-first-name").count(), 0);
    assert.equal(await page.getByTestId("input-email").inputValue(), "fixture@example.invalid");
    await page.getByTestId("button-submit").click();
    await page.getByTestId("button-submit").filter({ hasNot: page.locator("svg") }).waitFor();
    await page.getByTestId("button-register-tab").click();
    await page.getByTestId("checkbox-age-confirm").check({ force: true });
    response = { status: 429, body: { error: "rate limited" } };
    await page.getByTestId("button-submit").click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="button-submit"]').disabled);
    assert.equal(requests, 2);
    assert.equal(await page.locator("p[role=alert]").count(), 0);
    response = { status: 500, body: { error: "internal details must not be shown" } };
    await page.getByTestId("button-submit").click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="button-submit"]').disabled);
    assert.equal(requests, 4); // one bounded server retry
    assert.equal(await page.getByText("internal details must not be shown", { exact: true }).count(), 0);
    await page.route("**/api/register", async route => { requests++; await route.abort("failed"); });
    await page.getByTestId("button-submit").click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="button-submit"]').disabled);
    assert.equal(requests, 6); // one bounded network retry
    assert.equal(await page.locator("p[role=alert]").count(), 0);
    assert.deepEqual(failures, []);
    console.log(`PASS ${language}: required fields, invalid inputs, duplicate email, retained values, login, rate limit, server/network failures, mobile layout`);
    await context.close();
  }
} finally {
  await browser.close();
}
