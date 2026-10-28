// Optional UI smoke check. Start Chromium with --remote-debugging-port=9222,
// then run: node server/entryLanguage.browser-check.mjs https://<dev-domain>
// Every API request is intercepted: this never signs in or writes real accounts.
import assert from "node:assert/strict";
import WebSocket from "ws";

const base = process.argv[2];
if (!base) throw new Error("Pass the development app URL");
const target = await (await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.once("open", resolve));
let id = 0, phase = "terms", preference = "en";
let notificationMode = "success", pushWrites = 0, messageEmails = false, emailChoices = 0;
const pending = new Map(), errors = [], forbiddenWrites = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
}
ws.on("message", raw => {
  const event = JSON.parse(raw.toString());
  if (event.id) {
    const promise = pending.get(event.id);
    pending.delete(event.id);
    if (event.error) promise.reject(new Error(event.error.message));
    else promise.resolve(event.result);
  }
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
  if (event.method === "Fetch.requestPaused") void intercept(event.params).catch(error => errors.push(error.message));
});
async function intercept({ requestId, request }) {
  const path = new URL(request.url).pathname;
  let status = 200, body = {};
  const user = {
    id: "fictional-language-user", firstName: "Fictional", email: "fixture@example.invalid",
    emailVerified: phase === "notification" ? "true" : "false",
    ageConfirmed: phase !== "age", termsAcceptedAt: phase === "terms" ? null : "2026-01-01T00:00:00Z",
    profile: phase === "notification" ? { id: 987, userId: "fictional-language-user", displayName: "Fictional", bio: "", age: 25, gender: "other" } : null,
    photos: phase === "notification" ? [{ id: 987, type: "image", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3C/svg%3E" }] : [],
    profileImageUrl: null,
  };
  if (path === "/api/user" || path === "/api/auth/user") {
    status = phase === "auth" || phase === "public" ? 401 : 200;
    body = status === 401 ? {} : user;
  } else if (path === "/api/notifications/preferences") {
    if (request.method === "PATCH") {
      const patch = JSON.parse(request.postData);
      if (patch.interfaceLanguage) preference = patch.interfaceLanguage;
      if (typeof patch.messageEmails === "boolean") { messageEmails = patch.messageEmails; emailChoices++; }
    }
    body = { interfaceLanguage: preference, messageEmails, messages: true, events: true, matches: true,
      profileViews: true, newTravelers: true, learningReminders: false };
  } else if (phase === "notification" && path === "/api/profile" && request.method === "PATCH") {
    body = user.profile;
  } else if (phase === "notification" && path === "/api/push/vapid-key") {
    body = { publicKey: Buffer.alloc(65, 1).toString("base64url") };
  } else if (phase === "notification" && path === "/api/push/subscribe") {
    pushWrites++;
    status = notificationMode === "failed" ? 503 : 200;
    body = { success: status === 200 };
  } else if (path === "/api/my-badges") body = [];
  else if (path === "/api/stats/users") body = { count: 0, total: 0 };
  else if (request.method !== "GET" && path !== "/api/sessions/ping") {
    forbiddenWrites.push(path);
    status = 418;
    body = { error: "No real or simulated account mutations allowed by this check" };
  }
  await send("Fetch.fulfillRequest", {
    requestId, responseCode: status,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`!!document.documentElement && (${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`UI did not settle: ${expression}`);
}
const selector = '[data-testid="button-language-selector"]';
async function click(css) {
  await wait(`!!document.querySelector(${JSON.stringify(css)})`);
  await evaluate(`document.querySelector(${JSON.stringify(css)}).click()`);
}
async function choose(language) {
  // Radix opens its menu on pointerdown rather than synthetic click.
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new PointerEvent("pointerdown", {bubbles:true, pointerType:"mouse", button:0, ctrlKey:false}))`);
  await click(`[data-testid="menu-item-language-${language}"]`);
  await wait(`document.documentElement.lang === ${JSON.stringify(language)} && !document.querySelector('[role="menu"]')`);
}
async function navigate(path) {
  await send("Page.navigate", { url: `${base}${path}` });
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
  const cookie = await evaluate(`!!document.querySelector('[data-testid="button-cookie-reject"]')`);
  if (cookie) await click('[data-testid="button-cookie-reject"]');
}
async function fill(css, value) {
  await evaluate(`{
    const input = document.querySelector(${JSON.stringify(css)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", {bubbles:true}));
  }`);
}
try {
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await navigate("/onboarding?ui_lang=en&fixture=keep#anchor");
  await wait(`!!document.querySelector('[data-testid="checkbox-accept-terms"]')`);
  const titles = { en: "Welcome to FallonYou", es: "Bienvenido/a a FallonYou", fr: "Bienvenue sur FallonYou", sv: "Välkommen till FallonYou" };
  for (const language of ["es", "fr", "sv", "en"]) {
    await choose(language);
    assert(await evaluate(`document.body.innerText.includes(${JSON.stringify(titles[language])})`));
    assert.equal(await evaluate(`document.querySelector('[data-testid="checkbox-accept-terms"]').getAttribute("data-state")`), "unchecked");
    assert.equal(await evaluate(`document.querySelector('[data-testid="button-accept-terms"]').disabled`), true);
    assert(await evaluate(`location.search.includes("fixture=keep") && location.hash === "#anchor" && !location.search.includes("ui_lang=")`));
  }
  console.log("PASS: terms translate in four languages without automatic acceptance");
  phase = "onboarding";
  await navigate("/onboarding?ui_lang=en");
  await wait(`!!document.querySelector('[data-testid="input-display-name"]')`);
  await fill('[data-testid="input-display-name"]', "Fictional edited name");
  for (const language of ["es", "fr", "sv", "en"]) {
    await choose(language);
    assert.equal(await evaluate(`document.querySelector('[data-testid="input-display-name"]').value`), "Fictional edited name");
    assert.equal(await evaluate(`document.querySelector('[data-testid="button-next-step"]').disabled`), true);
  }
  await send("Page.reload");
  await wait(`document.documentElement.lang === "en" && !!document.querySelector('[data-testid="input-display-name"]')`);
  console.log("PASS: photo onboarding preserves form input and still requires a photo");
  phase = "age";
  await navigate("/onboarding?ui_lang=en");
  await wait(`!!document.querySelector('[data-testid="checkbox-age-confirm-modal"]')`);
  await choose("fr");
  assert.equal(await evaluate(`document.querySelector('[data-testid="button-confirm-age"]').disabled`), true);
  console.log("PASS: age gate exposes language switching without confirming age");
  phase = "public";
  await navigate("/support?ui_lang=en");
  await wait(`!!document.querySelector('[data-testid="app-language-control"]')`);
  await choose("sv");
  await wait(`localStorage.getItem("fallonyou_language") === "sv"`);
  await send("Page.reload");
  await wait(`document.documentElement.lang === "sv" && !!document.querySelector('[data-testid="app-language-control"]')`);
  console.log("PASS: persistent language control works on public pages and survives reload");
  phase = "auth";
  await navigate("/auth?ui_lang=en");
  await wait(`!!document.querySelector('[data-testid="input-email"]')`);
  await fill('[data-testid="input-email"]', "fixture@example.invalid");
  await choose("es");
  assert.equal(await evaluate(`document.querySelector('[data-testid="input-email"]').value`), "fixture@example.invalid");
  await click('[data-testid="button-register-tab"]');
  await wait(`!!document.querySelector('[data-testid="input-first-name"]')`);
  await fill('[data-testid="input-first-name"]', "Fictional signup");
  await fill('[data-testid="input-password"]', "Fictional fixture password");
  for (const language of ["fr", "sv", "en", "es"]) {
    await choose(language);
    assert.equal(await evaluate(`document.querySelector('[data-testid="input-first-name"]').value`), "Fictional signup");
    assert.equal(await evaluate(`document.querySelector('[data-testid="input-email"]').value`), "fixture@example.invalid");
    assert.equal(await evaluate(`document.querySelector('[data-testid="input-password"]').value`), "Fictional fixture password");
    assert.equal(await evaluate(`document.querySelector('[data-testid="checkbox-age-confirm"]').checked`), false);
  }
  assert.deepEqual(forbiddenWrites, []);
  assert.deepEqual(errors, []);
  console.log("PASS: login/signup language switching preserves all fields and consent; no account mutations or runtime exceptions");
  if (process.argv.includes("--notifications")) {
    phase = "notification";
    for (const mode of ["success", "denied", "failed", "unsupported"]) {
      notificationMode = mode;
      messageEmails = false;
      const beforeWrites = pushWrites;
      const beforeEmailChoices = emailChoices;
      const injected = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
        window.fixturePermissionRequests = 0;
        const mode = ${JSON.stringify(mode)};
        if (mode === "unsupported") {
          delete window.Notification; delete window.PushManager;
        } else {
          let permission = "default";
          Object.defineProperty(Notification, "permission", {get: () => permission});
          Notification.requestPermission = async () => {
            window.fixturePermissionRequests++;
            return permission = mode === "denied" ? "denied" : "granted";
          };
          const registration = {pushManager: {
            getSubscription: async () => null,
            subscribe: async () => ({toJSON: () => ({endpoint: "https://fixture.example.invalid/push", keys: {p256dh: "fictional", auth: "fictional"}})})
          }};
          Object.defineProperty(navigator, "serviceWorker", {value: {
            getRegistration: async () => null,
            register: async () => registration,
            ready: Promise.resolve(registration)
          }});
        }
      ` });
      await navigate("/onboarding?ui_lang=en");
      await wait(`!!document.querySelector('[data-testid="button-next-step"]') && !document.querySelector('[data-testid="button-next-step"]').disabled`);
      await click('[data-testid="button-next-step"]');
      await wait(`!!document.querySelector('[data-testid="button-next-journey"]')`);
      await click('[data-testid="button-next-journey"]');
      await wait(`!!document.querySelector('[data-testid="notification-recommendation"]')`);
      assert.equal(await evaluate("window.fixturePermissionRequests"), 0);
      await choose("es");
      assert(await evaluate(`document.body.innerText.includes("No te pierdas las novedades")`));
      await wait(`!!document.querySelector('[data-testid="toggle-message-emails"]') && !document.querySelector('[data-testid="toggle-message-emails"]').disabled`);
      assert.equal(await evaluate(`document.querySelector('[data-testid="toggle-message-emails"]').getAttribute("aria-checked")`), "false");
      assert.equal(emailChoices, beforeEmailChoices);
      await click('[data-testid="toggle-message-emails"]');
      await wait(`document.querySelector('[data-testid="toggle-message-emails"]').getAttribute("aria-checked") === "true"`);
      assert.equal(emailChoices, beforeEmailChoices + 1);
      assert.equal(await evaluate("window.fixturePermissionRequests"), 0);
      if (mode === "unsupported") {
        await wait(`!!document.querySelector('[data-testid="notification-unsupported"]')`);
        assert.equal(await evaluate(`!!document.querySelector('[data-testid="button-enable-notifications"]')`), false);
      } else {
        await click('[data-testid="button-enable-notifications"]');
        const resultSelector = mode === "success" ? "notification-enabled" : mode === "denied" ? "notification-blocked" : "notification-failed";
        await wait(`!!document.querySelector('[data-testid="${resultSelector}"]')`);
        assert.equal(await evaluate("window.fixturePermissionRequests"), 1);
        if (mode !== "success") assert.equal(await evaluate(`!!document.querySelector('[data-testid="notification-enabled"]')`), false);
      }
      assert.equal(pushWrites - beforeWrites, mode === "success" || mode === "failed" ? 1 : 0);
      await click('[data-testid="button-skip-notifications"]');
      await wait(`location.pathname === "/profile"`);
      if (mode === "success") {
        await wait(`!!document.querySelector('[data-testid="card-notif-prefs"]')`);
        await click('[data-testid="card-notif-prefs"]');
        await wait(`document.querySelector('[data-testid="toggle-message-emails"]')?.getAttribute("aria-checked") === "true"`);
        await click('[data-testid="toggle-message-emails"]');
        await wait(`document.querySelector('[data-testid="toggle-message-emails"]')?.getAttribute("aria-checked") === "false"`);
        assert.equal(emailChoices, beforeEmailChoices + 2);
      }
      await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
      console.log(`PASS: registration recommendation ${mode}; email separately opt-in; device permission only after explicit activation; continue reaches profile`);
    }
    assert.deepEqual(forbiddenWrites, []);
    assert.deepEqual(errors, []);
  }
} finally {
  ws.close();
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
}
