// Isolated browser-only fixtures: never writes to the app's database or APIs.
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
const assert = require("node:assert/strict");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const ageMode = process.argv.includes("--age-privacy");
  const storyMode = process.argv.includes("--story-arrows");
  const storyAudienceMode = process.argv.includes("--story-audience");
  const photoRaceMode = process.argv.includes("--photo-race");
  const capacityMode = process.argv.includes("--capacity");
  const connectionSummaryMode = process.argv.includes("--connection-summary");
  const recoveryMode = process.argv.includes("--password-recovery");
  const localeMode = process.argv.includes("--communication-locale");
  let localeReadFails = false;
  let localePrefs = { interfaceLanguage: "es", profileViews: false, newTravelers: false, matches: false, messages: false, events: false, learningReminders: false, fixtureExtension: "keep" };
  const localeWrites = [];
  let recoveryRequest = "unavailable", recoveryReset = "expired";
  const recoveryWrites = [];
  let connectionSummaryFails = false;
  let connectionSummary = { totalConnections: 3, cities: ["Stockholm"], origins: ["Barcelona"], hasMoreCities: false, hasMoreOrigins: false };
  let directoryNextFails = true;
  let slowPhotoReady = false, brokenPhotoFails = true, connectPhotoFails = true;
  let alphaFailuresRemaining = 0, alphaFailures = 0;
  const slowPhotoWaiters = [];
  const photoRaceMembers = [
    ["fixture-photo-d", "Photo Delta", null],
    ["fixture-photo-c", "Photo Charlie", "/fictional/photo-c.png"],
    ["fixture-photo-b", "Photo Bravo", "/fictional/photo-b.png"],
    ["fixture-photo-a", "Photo Alpha", "/fictional/photo-a.png"],
  ];
  const storyAudienceUploads = [];
  const helpMode = process.argv.includes("--optional-help");
  const engagementMode = process.argv.includes("--engagement");
  let engagementPrefs = { profileViews: false, newTravelers: false, matches: true, messages: false, events: false, learningReminders: false, interfaceLanguage: "en" };
  let preferenceFails = false, interestFails = false, submittedIdea = null;
  const studyStarts = [], preferenceUpdates = [];
  const helpWrites = [];
  let savedShowAge = false, legacyProfile = true, profileSaveFails = false;
  const profileWrites = [];
  const raster = await require("sharp")({
    create: { width: 400, height: 500, channels: 3, background: "#d97706" },
  }).png().toBuffer();
  const imageUrl = `data:image/png;base64,${raster.toString("base64")}`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "photos-browser-"));
  const browser = spawn("/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  let ws, sessionId, evaluate;
  let mode = "ok", status = "none", posts = 0, reads = 0, replyMatch = false;
  const errors = [];
  const imageRequests = [];
  const networkUrls = new Map();
  try {
    let endpoint;
    for (let i = 0; i < 100; i++) {
      try { endpoint = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split("\n"); break; }
      catch { await sleep(100); }
    }
    assert.ok(endpoint, "Chromium must start");
    ws = new WebSocket(`ws://127.0.0.1:${endpoint[0]}${endpoint[1]}`);
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    let id = 0;
    const pending = new Map();
    const call = (method, params = {}, sid = sessionId) => new Promise((resolve, reject) => {
      const n = ++id;
      const timer = setTimeout(() => { pending.delete(n); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(n, {
        resolve: result => {
          clearTimeout(timer);
          if (method === "Page.navigate" && result.errorText) reject(new Error(`Navigation failed: ${result.errorText}`));
          else resolve(result);
        },
        reject: error => { clearTimeout(timer); reject(error); },
      });
      ws.send(JSON.stringify({ id: n, method, params, ...(sid ? { sessionId: sid } : {}) }));
    });
    const member = memberId => ({
      id: memberId, firstName: memberId === "fixture-member" ? "Example" : "Other",
      lastName: "Traveler", profileImageUrl: imageUrl, isVerified: "false",
      photos: [{ id: 2, url: imageUrl }],
      profile: {
        bio: `Unique fictional biography ${memberId}`, currentCity: "Example City",
        ...(!ageMode || savedShowAge ? { age: ageMode ? 37 : 30 } : {}),
      },
      connectionStatus: memberId === "fixture-member" ? status : "none",
    });
    async function fulfill(event) {
      const pathname = new URL(event.request.url).pathname;
      const cursor = new URL(event.request.url).searchParams.get("cursor");
      let responseCursor;
      let olderCursor;
      let retryAfter;
      if (helpMode && !["GET", "HEAD"].includes(event.request.method)) helpWrites.push(pathname);
      let code = 200, body = {}, contentType = "application/json";
      if ((recoveryMode || localeMode) && pathname === "/api/auth/forgot-password") {
        recoveryWrites.push({ kind: "request", body: JSON.parse(event.request.postData) });
        await sleep(recoveryRequest === "accepted" ? 1000 : 250);
        if (recoveryRequest === "unavailable") { code = 503; body = { code: "RECOVERY_UNAVAILABLE" }; }
        else if (recoveryRequest === "malformed") { code = 200; body = { success: true }; }
        else if (recoveryRequest === "limited") { code = 429; body = { error: "Fictional rate limit" }; retryAfter = "2"; }
        else { code = 202; body = { success: true, accepted: true }; }
      } else if (recoveryMode && pathname === "/api/auth/reset-password") {
        recoveryWrites.push({ kind: "reset", body: JSON.parse(event.request.postData) });
        if (recoveryReset === "expired") { code = 400; body = { code: "INVALID_RESET_LINK" }; }
        else if (recoveryReset === "unavailable") { code = 503; body = { code: "RECOVERY_UNAVAILABLE" }; }
        else body = { success: true };
      } else if (capacityMode && pathname === "/api/users") {
        if (cursor) await sleep(500);
        body = (cursor ? ["d", "e", "f"] : ["a", "b", "c"]).map(id => member(`fixture-page-${id}`));
        if (!cursor) responseCursor = "fixture-page-c";
      } else if (capacityMode && pathname === "/api/users/with-photos") {
        if (cursor && directoryNextFails) { code = 503; body = { error: "Fictional next page failure" }; }
        else {
          body = (cursor ? ["c", "d"] : ["a", "b"]).map(id => ({
            id: `fixture-directory-${id}`, firstName: "Fictional", age: null,
            currentCity: "Fictional", nextAdventure: null, favoriteDestinations: [],
            notRecommendedDestinations: [], photoUrl: imageUrl,
          }));
        }
        if (!cursor) responseCursor = "fixture-directory-b";
      } else if (capacityMode && pathname === "/api/matches" && event.request.method === "POST") {
        code = 503; body = { error: "Fictional failed connection" };
      } else if (capacityMode && pathname === "/api/matches/77") {
        body = { id: 77, status: "matched", otherUser: member("fixture-chat") };
      } else if (capacityMode && pathname === "/api/matches/77/messages") {
        const before = Number(new URL(event.request.url).searchParams.get("before") || 151);
        const end = before - 1, start = Math.max(1, end - 49);
        body = Array.from({ length: end - start + 1 }, (_, index) => ({
          id: start + index, matchId: 77, senderId: "fixture-chat",
          content: `Fictional message ${start + index}`, imageUrl: null, readAt: null,
          createdAt: "2026-10-01T10:00:00Z",
        }));
        if (start > 1) olderCursor = String(start);
      } else if (photoRaceMode && pathname === "/api/users") {
        body = photoRaceMembers.map(([id, firstName, url]) => ({
          id, firstName, profileImageUrl: url, photos: url ? [{ id, url }] : [],
          profile: { bio: `Fictional ${firstName} biography`, currentCity: "Fictional City" },
        }));
      } else if (photoRaceMode && pathname === "/api/matches" && event.request.method === "POST") {
        code = connectPhotoFails ? 503 : 200;
        body = connectPhotoFails ? { error: "Fictional failed connection" } : { isMatch: false };
      } else if (localeMode && pathname === "/api/notifications/preferences") {
        if (event.request.method === "PATCH") {
          const patch = JSON.parse(event.request.postData);
          localeWrites.push(patch);
          localePrefs = { ...localePrefs, ...patch };
        }
        body = localeReadFails ? { interfaceLanguage: ["es"] } : localePrefs;
      } else if (engagementMode && pathname === "/api/notifications/preferences") {
        if (event.request.method === "PATCH") {
          const patch = JSON.parse(event.request.postData);
          preferenceUpdates.push(patch);
          if (preferenceFails && Object.hasOwn(patch, "learningReminders")) { code = 500; body = { error: "Fictional preference failure" }; }
          else engagementPrefs = { ...engagementPrefs, ...patch };
        }
        if (code === 200) body = engagementPrefs;
      } else if (engagementMode && pathname === "/api/language/study/activity") {
        studyStarts.push(JSON.parse(event.request.postData));
        body = { ok: true };
      } else if (engagementMode && pathname === "/api/solidarity-interest") {
        if (event.request.method === "POST") {
          if (interestFails) { code = 503; body = { error: "Fictional unavailable receiver" }; }
          else { submittedIdea = JSON.parse(event.request.postData); body = { ok: true }; }
        } else body = submittedIdea ? { submitted: true, ...submittedIdea } : { submitted: false };
      } else if (engagementMode && pathname === "/api/language/progress") body = { completedLessons: [] };
      else if (engagementMode && pathname === "/api/profile/languages") body = { speaksLanguages: [], learningLanguages: [] };
      else if (engagementMode && pathname.startsWith("/api/local-help")) body = [];
      else if (engagementMode && pathname === "/api/notifications") body = [{ id: 99, type: "connection_request", title: "New connection request", body: "A fictional traveler would like to connect.", link: "/matches", read: false, createdAt: new Date().toISOString() }];
      else if (engagementMode && pathname === "/api/notifications/unread-count") body = { count: 1 };
      else if (pathname.startsWith("/fictional/")) {
        if (photoRaceMode && pathname === "/fictional/photo-b.png" && !slowPhotoReady) {
          await new Promise(resolve => slowPhotoWaiters.push(resolve));
        }
        if (photoRaceMode && pathname === "/fictional/photo-c.png" && brokenPhotoFails) code = 404;
        imageRequests.push(pathname);
        contentType = "image/png";
        body = raster;
        if (photoRaceMode && pathname === "/fictional/photo-c.png" && brokenPhotoFails) {
          contentType = "text/plain";
          body = "Fictional unavailable photo";
        }
        if (photoRaceMode && pathname === "/fictional/photo-a.png" && alphaFailuresRemaining > 0) {
          alphaFailuresRemaining--;
          alphaFailures++;
          code = 503;
          contentType = "text/plain";
          body = "Fictional temporary photo delay";
        }
      } else if (pathname === "/api/user") {
        body = {
          id: "fixture-viewer", firstName: "Viewer", isBanned: "false", isAdmin: "false",
          profileImageUrl: imageUrl, photos: [{ id: 1, url: imageUrl }],
          profile: { bio: "Viewer", age: ageMode ? 37 : 30, ...(!legacyProfile ? { showAge: savedShowAge } : {}) }, ageConfirmed: true,
          termsAcceptedAt: "2026-10-03T00:00:00Z", termsAcceptedVersion: "2026-10-content-license",
        };
      } else if (pathname === "/api/stories" && storyAudienceMode && event.request.method === "POST") {
        const audience = event.request.postData?.match(/name="audience"\r?\n\r?\n(connections|everyone)/)?.[1];
        assert.ok(audience, "multipart request must include a valid audience");
        storyAudienceUploads.push(audience);
        body = { id: 55, userId: "fixture-viewer", audience, mediaUrl: "/fictional/new-story.png" };
      } else if (pathname === "/api/stories" && (storyMode || storyAudienceMode)) {
        body = (storyAudienceMode ? ["fixture-viewer"] : ["fixture-member", "fixture-other"]).map((userId, i) => ({
          userId, userName: `Story traveler ${i}`, userPhoto: imageUrl,
          stories: [0, 1].map(n => ({
            id: i * 10 + n, mediaUrl: `/fictional/story-${i}-${n}.png`, caption: `Fixture photo ${i}-${n}`,
            expiresAt: "2099-01-01T00:00:00Z",
            ...(storyAudienceMode ? { audience: n === 0 ? "connections" : "everyone" } : {}),
          })),
        }));
      } else if (pathname === "/api/events" || pathname === "/api/events/" || pathname === "/api/offers" || pathname === "/api/stories") body = [];
      else if (pathname === "/api/users") body = [];
      else if (pathname === "/api/profile" && event.request.method === "PATCH") {
        const patch = JSON.parse(event.request.postData);
        profileWrites.push(patch);
        assert.equal(typeof patch.showAge, "boolean");
        assert.equal(patch.age, 37);
        if (profileSaveFails) { code = 500; body = { error: "fictional save failure" }; }
        else { savedShowAge = patch.showAge; legacyProfile = false; body = { ...patch, showAge: savedShowAge }; }
      } else if (pathname === "/api/my-badges") body = [];
      else if (pathname === "/api/my-connected-cities") {
        if (connectionSummaryMode && connectionSummaryFails) { code = 503; body = { error: "Fictional summary failure" }; }
        else body = connectionSummaryMode ? connectionSummary : { totalConnections: 0, cities: [], origins: [], hasMoreCities: false, hasMoreOrigins: false };
      }
      else if (pathname === "/api/users/with-photos") {
        body = ["fixture-member", "fixture-other"].map((x, i) => ({
          id: x, firstName: i ? "Other" : "Example", age: ageMode ? (savedShowAge ? 37 : null) : 30, currentCity: "Example City",
          nextAdventure: "Example Trip", favoriteDestinations: ["Example Destination"],
          notRecommendedDestinations: [], photoUrl: imageUrl,
        }));
      } else if (pathname.includes("/public-profile")) {
        reads++;
        if (mode === "load500" || mode === "load404") {
          code = Number(mode.slice(4)); body = { error: "fictional profile failure" };
        } else body = member(pathname.split("/")[3]);
      } else if (pathname === "/api/matches" && event.request.method === "POST") {
        posts++;
        assert.equal(JSON.parse(event.request.postData).targetUserId, "fixture-member");
        await sleep(250);
        if (mode.startsWith("send")) { code = Number(mode.slice(4)); body = { error: "fictional failure" }; }
        else {
          status = replyMatch ? "connected" : "pending";
          body = { match: { id: 55, user1Id: "fixture-viewer", user2Id: "fixture-member", status: replyMatch ? "matched" : "liked" }, isMatch: replyMatch };
        }
      } else if (pathname === "/api/matches" || pathname === "/api/matches/requests") body = [];
      else if (pathname === "/api/premium/status") body = { isPremium: false, canLike: true, remainingLikes: 10 };
      else if (pathname === "/api/premium/liked-by" || pathname === "/api/notifications/unread-count") body = { count: 0 };
      else if (pathname === "/api/daily-spark") body = null;
      await call("Fetch.fulfillRequest", {
        requestId: event.requestId, responseCode: code,
        responseHeaders: [
          { name: "Content-Type", value: contentType },
          ...(responseCursor ? [{ name: "X-Next-Cursor", value: responseCursor }] : []),
          ...(olderCursor ? [{ name: "X-Older-Cursor", value: olderCursor }] : []),
          ...(retryAfter ? [{ name: "Retry-After", value: retryAfter }] : []),
        ],
        body: (Buffer.isBuffer(body) ? body : Buffer.from(typeof body === "string" ? body : JSON.stringify(body))).toString("base64"),
      });
    }
    ws.on("message", bytes => {
      const message = JSON.parse(bytes);
      if (message.id) {
        const callbacks = pending.get(message.id);
        if (callbacks) {
          pending.delete(message.id);
          message.error ? callbacks.reject(new Error(JSON.stringify(message.error))) : callbacks.resolve(message.result);
        }
      } else if (message.method === "Fetch.requestPaused") {
        fulfill(message.params).catch(error => errors.push(`fixture: ${error.message}`));
      } else if (message.method === "Runtime.exceptionThrown") {
        errors.push(`exception: ${message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text}`);
      } else if (message.method === "Network.requestWillBeSent") {
        networkUrls.set(message.params.requestId, message.params.request.url);
      } else if (message.method === "Network.loadingFailed" && networkUrls.get(message.params.requestId)?.includes("/fictional/")) {
        errors.push(`image failure: ${JSON.stringify(message.params)}`);
      } else if (message.method === "Log.entryAdded" && message.params.entry.source === "security") {
        errors.push(`security: ${message.params.entry.text}`);
      } else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        errors.push(message.params.args.map(argument => argument.value || argument.description || "").join(" "));
      }
    });
    const target = await call("Target.createTarget", { url: "about:blank" });
    sessionId = (await call("Target.attachToTarget", { targetId: target.targetId, flatten: true })).sessionId;
    await call("Page.enable");
    await call("Page.bringToFront");
    await call("Runtime.enable");
    await call("Network.enable");
    await call("Log.enable");
    await call("Fetch.enable", { patterns: [
      { urlPattern: "*/api/*", requestStage: "Request" },
      { urlPattern: "*/fictional/*", requestStage: "Request" },
    ] });
    // Fixture media must never escape interception through the app's service worker.
    await call("Network.setBypassServiceWorker", { bypass: true });
    await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await call("Page.addScriptToEvaluateOnNewDocument", { source: localeMode
      ? `if(location.search.includes("fixture_account_locale")){localStorage.removeItem("fallonyou_language");localStorage.removeItem("fallonyou_language_explicit")}else if(!localStorage.getItem("fallonyou_language"))localStorage.setItem("fallonyou_language","en")`
      : "if(!localStorage.getItem('fallonyou_language'))localStorage.setItem('fallonyou_language','en')" });
    if (capacityMode) await call("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
      const Native = window.WebSocket;
      class FictionalSocket extends EventTarget {
        readyState=0; bufferedAmount=0; onopen=null; onmessage=null; onclose=null;
        constructor() { super(); setTimeout(() => { if(this.readyState!==0)return;this.readyState=1;const event=new Event('open');this.dispatchEvent(event);this.onopen?.(event); }, 50); }
        send() {}
        close() { this.readyState=3;const event=new Event('close');this.dispatchEvent(event);this.onclose?.(event); }
      }
      window.WebSocket=class extends Native { constructor(url,protocols){ if(String(url).includes('/ws/chat'))return new FictionalSocket();super(url,protocols); } };
    })()` });
    evaluate = async expression => {
      const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    async function wait(expression, label) {
      for (let i = 0; i < 150; i++) {
        let value;
        try { value = await evaluate(expression); }
        catch (error) {
          if (!/navigated or closed|context.*destroyed|Cannot find context/i.test(error.message)) throw error;
        }
        if (value) return value;
        await sleep(100);
      }
      throw new Error(`Missing ${label}`);
    }
    async function click(selector) {
      await wait(`!!document.querySelector(${JSON.stringify(selector)})`, selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await sleep(400);
    }
    const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const fill = async (id, value) => {
      await wait(`!!document.querySelector("[data-testid=${id}]")`, id);
      await evaluate(`(() => {
        const input=document.querySelector("[data-testid=${id}]");
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,${JSON.stringify(value)});
        input.dispatchEvent(new Event("input",{bubbles:true}));
      })()`);
    };
    if (localeMode) {
      const waitCallback = async (predicate, label) => {
        for (let attempt = 0; attempt < 100; attempt++) {
          if (predicate()) return;
          await sleep(100);
        }
        throw new Error(`Timeout: ${label}`);
      };
      const originalFlags = { profileViews: false, newTravelers: false, matches: false, messages: false, events: false, learningReminders: false, fixtureExtension: "keep" };
      await call("Page.navigate", { url: `${base}/reset-password` });
      await wait('!!document.querySelector("[data-testid=input-forgot-email]") && document.documentElement.lang==="en"', "explicit English choice");
      await waitCallback(() => localeWrites.length === 1, "pre-login choice saved after authentication");
      assert.deepEqual(localeWrites[0], { interfaceLanguage: "en" });
      assert.deepEqual({ ...localePrefs, interfaceLanguage: undefined }, { ...originalFlags, interfaceLanguage: undefined });
      localeWrites.length = 0;
      localePrefs.interfaceLanguage = "es";
      await call("Page.navigate", { url: `${base}/reset-password?fixture_account_locale=1` });
      await wait('!!document.querySelector("[data-testid=input-forgot-email]") && document.documentElement.lang==="es"', "account language restored without explicit device choice");
      await sleep(300);
      assert.equal(localeWrites.length, 0);
      await evaluate('localStorage.setItem("fallonyou_language","en");localStorage.setItem("fallonyou_language_explicit","true")');
      localeReadFails = true;
      await call("Page.navigate", { url: `${base}/reset-password?fixture_failed_preferences=1` });
      await wait('!!document.querySelector("[data-testid=button-retry-language-preferences]")', "malformed read is visible");
      assert.equal(localeWrites.length, 0, "unreadable preferences cannot be overwritten");
      localeReadFails = false;
      await click("[data-testid=button-retry-language-preferences]");
      await waitCallback(() => localeWrites.length === 1, "successful read retry permits language-only save");
      assert.deepEqual(localeWrites[0], { interfaceLanguage: "en" });
      localeWrites.length = 0;
      localePrefs.interfaceLanguage = "es";
      await call("Page.navigate", { url: `${base}/reset-password?fixture_account_locale=1&ui_lang=unsupported` });
      await wait('document.documentElement.lang==="es" && !!document.querySelector("[data-testid=input-forgot-email]")', "unsupported email locale does not replace account choice");
      await sleep(200);
      assert.equal(localeWrites.length, 0);
      await call("Page.navigate", { url: `${base}/reset-password?fixture_account_locale=1&ui_lang=fr` });
      await wait('document.documentElement.lang==="fr" && !!document.querySelector("[data-testid=input-forgot-email]")', "email locale takes precedence");
      await waitCallback(() => localeWrites.length === 1, "email choice synchronized");
      assert.deepEqual(localeWrites[0], { interfaceLanguage: "fr" });
      recoveryRequest = "accepted";
      await fill("input-forgot-email", "fixture@example.invalid");
      await click("[data-testid=button-send-reset]");
      await wait('!!document.querySelector("[data-testid=recovery-request-received]")', "localized recovery request accepted");
      assert.equal(recoveryWrites.at(-1).body.language, "fr");
      assert.deepEqual({ ...localePrefs, interfaceLanguage: undefined }, { ...originalFlags, interfaceLanguage: undefined });
      assert.deepEqual(errors, []);
      console.log("PASS communication locales: explicit pre-login choice; account restoration on new device; malformed read blocks writes and retries; only interfaceLanguage PATCH; notification opt-outs and extension preserved; validated email locale propagated to recovery. All APIs intercepted.");
      return;
    }
    if (recoveryMode) {
      const submit = () => click("[data-testid=button-send-reset]");
      await call("Page.navigate", { url: `${base}/reset-password` });
      await fill("input-forgot-email", "fictional@example.invalid");
      await submit();
      await wait('!!document.querySelector("[data-testid=recovery-error]")', "unavailable request error");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=recovery-request-received]")'), false);
      assert.equal(await evaluate('document.querySelector("[data-testid=input-forgot-email]").value'), "fictional@example.invalid");
      recoveryRequest = "malformed";
      await submit();
      await wait('!document.querySelector("[data-testid=button-send-reset]").disabled', "malformed success rejected");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=recovery-request-received]")'), false);
      recoveryRequest = "limited";
      await submit();
      await wait('!!document.querySelector("[data-testid=recovery-error]") && document.querySelector("[data-testid=button-send-reset]").disabled', "rate-limit cooldown");
      await wait('!document.querySelector("[data-testid=button-send-reset]").disabled', "cooldown expires");
      recoveryRequest = "accepted";
      const prior = recoveryWrites.length;
      await submit();
      await click("[data-testid=button-send-reset]");
      await wait('!!document.querySelector("[data-testid=recovery-request-received]")', "neutral request acknowledgement");
      assert.equal(recoveryWrites.length, prior + 1, "disabled button prevents duplicate requests");
      assert.ok(!await evaluate('document.querySelector("[data-testid=recovery-request-received]").innerText.includes("Email sent")'));
      await click("[data-testid=button-request-another-reset]");
      await wait('!!document.querySelector("[data-testid=input-forgot-email]")', "request another link");
      const fakeToken = "f".repeat(64);
      await call("Page.navigate", { url: `${base}/reset-password?token=${fakeToken}` });
      await fill("input-new-password", "Fictional123");
      await fill("input-confirm-password", "Fictional456");
      const beforeMismatch = recoveryWrites.length;
      await click("[data-testid=button-reset-password]");
      await wait('!!document.querySelector("[data-testid=recovery-error]")', "password mismatch");
      assert.equal(recoveryWrites.length, beforeMismatch, "mismatch never reaches API");
      await fill("input-confirm-password", "Fictional123");
      await click("[data-testid=button-reset-password]");
      await wait('!!document.querySelector("[data-testid=button-request-new-link]")', "expired link recovery action");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=recovery-reset-done]")'), false);
      await click("[data-testid=button-request-new-link]");
      await wait('!!document.querySelector("[data-testid=input-forgot-email]")', "expired link leads to a fresh request");
      await call("Page.navigate", { url: `${base}/reset-password?token=${fakeToken}` });
      await fill("input-new-password", "é".repeat(37));
      await fill("input-confirm-password", "é".repeat(37));
      const beforeLong = recoveryWrites.length;
      await click("[data-testid=button-reset-password]");
      await wait('!!document.querySelector("[data-testid=recovery-error]")', "bcrypt byte limit");
      assert.equal(recoveryWrites.length, beforeLong);
      await fill("input-new-password", "Fictional123");
      await fill("input-confirm-password", "Fictional123");
      recoveryReset = "unavailable";
      await click("[data-testid=button-reset-password]");
      await wait('!!document.querySelector("[data-testid=recovery-error]") && !document.querySelector("[data-testid=button-reset-password]").disabled', "reset unavailable and retryable");
      assert.equal(await evaluate('document.querySelector("[data-testid=input-new-password]").value'), "Fictional123");
      recoveryReset = "success";
      await click("[data-testid=button-reset-password]");
      await wait('!!document.querySelector("[data-testid=recovery-reset-done]")', "valid reset completion");
      for (const [language, heading] of [["es","¿Olvidaste tu contraseña?"],["fr","Mot de passe oublié ?"],["sv","Har du glömt lösenordet?"]]) {
        await evaluate(`localStorage.setItem("fallonyou_language",${JSON.stringify(language)})`);
        await call("Page.navigate", { url: `${base}/reset-password?fixture=${language}` });
        await wait(`!!document.querySelector("[data-testid=input-forgot-email]") && document.body?.innerText.includes(${JSON.stringify(heading)})`, `recovery locale ${language}`);
        recoveryRequest = "accepted";
        await fill("input-forgot-email", "fixture@example.invalid");
        await click("[data-testid=button-send-reset]");
        await wait('!!document.querySelector("[data-testid=recovery-request-received]")', `request locale ${language}`);
        assert.equal(recoveryWrites.at(-1).body.language, language);
      }
      await call("Page.navigate", { url: `${base}/reset-password?token=malformed` });
      await wait('!!document.querySelector("[data-testid=recovery-error]") && !!document.querySelector("[data-testid=button-request-new-link]")', "malformed token rejected before API");
      assert.deepEqual(errors, []);
      console.log("PASS password recovery UI: unavailable/malformed responses never report success; retained email/password; rate-limit countdown; duplicate suppression; neutral acknowledgement; mismatch/byte limit; expired/new-link path; retry/success; malformed token; four locales. All requests intercepted; no actual emails or accounts changed.");
      return;
    }
    if (connectionSummaryMode) {
      await call("Page.navigate", { url: `${base}/profile` });
      await wait('document.querySelector("[data-testid=text-connection-count]")?.textContent.trim().startsWith("3 ")', "own accepted connection count");
      assert.ok(await evaluate('document.querySelector("[data-testid=connection-origins]").parentElement.textContent.includes("Barcelona")'));
      assert.ok(await evaluate('document.querySelector("[data-testid=connection-current-cities]").parentElement.textContent.includes("Stockholm")'));
      assert.ok(!await evaluate('document.querySelector("[data-testid=connection-origins]").parentElement.textContent.includes("Stockholm")'));
      await evaluate('document.querySelector("[data-testid=section-private-connections]").scrollIntoView({block:"center"})');
      await sleep(800);
      await fs.writeFile("/tmp/private-connections-profile-mobile.png", Buffer.from((await call("Page.captureScreenshot", { format: "png" })).data, "base64"));
      assert.deepEqual(errors, []);
      connectionSummaryFails = true;
      await call("Page.reload", { ignoreCache: true });
      await wait('!!document.querySelector("[data-testid=button-retry-connections]")', "summary failure retry");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=text-connection-count]")'), false, "failure must not fabricate zero");
      connectionSummaryFails = false;
      await click("[data-testid=button-retry-connections]");
      await wait('document.querySelector("[data-testid=text-connection-count]")?.textContent.trim().startsWith("3 ")', "summary retry recovers");
      connectionSummary = { totalConnections: 0, cities: [], origins: [], hasMoreCities: false, hasMoreOrigins: false };
      await call("Page.reload", { ignoreCache: true });
      await wait('document.querySelector("[data-testid=text-connection-count]")?.textContent.trim().startsWith("0 ")', "true empty connection count");
      assert.equal(await evaluate('document.querySelector("[data-testid=connection-origins]").parentElement.textContent.includes("Barcelona")'), false);
      for (const language of ["es", "fr", "sv"]) {
        await evaluate(`localStorage.setItem("fallonyou_language",${JSON.stringify(language)})`);
        await call("Page.reload", { ignoreCache: true });
        const title = { es: "Tus conexiones de viaje", fr: "Vos connexions de voyage", sv: "Dina resekontakter" }[language];
        // Reload can acknowledge before the old document disappears. Require a
        // changed locale marker, not the same count from the previous document.
        await wait(`document.querySelector("#private-connections-title")?.textContent.trim()===${JSON.stringify(title)} && document.querySelector("[data-testid=text-connection-count]")?.textContent.trim().startsWith("0 ")`, `connection copy ${language}`);
        const text = await evaluate('document.querySelector("[data-testid=section-private-connections]").innerText');
        assert.ok(!text.includes("Your travel connections"), `translated heading ${language}`);
      }
      await call("Page.navigate", { url: `${base}/discover` });
      await wait('!!document.querySelector("[data-testid=button-all-photo-members]")', "discovery route");
      await click("[data-testid=button-all-photo-members]");
      await wait('!!document.querySelector("[data-testid=button-view-member-fixture-member]")', "public directory member");
      await click("[data-testid=button-view-member-fixture-member]");
      await wait('!!document.querySelector("[data-testid=button-close-profile-sheet]")', "public profile");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=section-private-connections]")'), false, "summary never appears on another person's discovery profile");
      assert.deepEqual(errors, []);
      console.log("PASS private connections UI: own accepted total, origin/current city distinct, error without fake zero, retry, true zero, four languages, no public counter. All APIs/accounts/media fictitious.");
      return;
    }
    if (capacityMode) {
      const currentId = 'document.querySelector("[data-testid=swipe-card]")?.getAttribute("data-member-id")';
      await call("Page.navigate", { url: `${base}/discover` });
      await wait(`${currentId}==="fixture-page-c"`, "first discovery page");
      await click("[data-testid=button-pass]");
      await wait(`${currentId}==="fixture-page-b"`, "skip remains skipped after next page arrival");
      await click("[data-testid=button-pass]");
      await wait(`${currentId}==="fixture-page-a"`, "first page order retained");
      await click("[data-testid=button-pass]");
      await wait(`${currentId}==="fixture-page-f"`, "second page reached without lost remaining cards");
      await click("[data-testid=button-like]");
      await wait(`${currentId}==="fixture-page-f"`, "failed connect restores member across page boundary");
      assert.equal(await evaluate('document.querySelectorAll("[data-testid=swipe-card]").length'), 1);
      await click("[data-testid=button-all-photo-members]");
      await wait('document.querySelector("[data-testid=photo-members-grid]")?.children.length===2', "directory first page");
      await click("[data-testid=button-more-photo-members]");
      await wait('document.querySelector("[data-testid=button-more-photo-members]")?.textContent.includes("Retry")', "next-page retry");
      assert.equal(await evaluate('document.querySelector("[data-testid=photo-members-grid]").children.length'), 2, "next-page error preserves existing members");
      directoryNextFails = false;
      await click("[data-testid=button-more-photo-members]");
      await wait('document.querySelector("[data-testid=photo-members-grid]")?.children.length===4', "directory next page appended");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=button-more-photo-members]")'), false, "no extra fetch when exhausted");
      await call("Page.navigate", { url: `${base}/chat/77` });
      await wait('document.body?.innerText.includes("Fictional message 150")', "recent chat page");
      assert.equal(await evaluate('document.body.innerText.includes("Fictional message 51")'), false, "old history is not downloaded at entry");
      await click("[data-testid=button-older-messages]");
      await wait('document.body.innerText.includes("Fictional message 51")', "earlier chat messages appended");
      assert.ok(await evaluate('document.body.innerText.includes("Fictional message 150")'), "recent messages retained");
      await click("[data-testid=button-older-messages]");
      await wait('!document.querySelector("[data-testid=button-older-messages]")', "history exhausted");
      assert.ok(await evaluate('document.body.innerText.includes("Fictional message 1")'));
      assert.deepEqual(errors, []);
      console.log("PASS capacity UI: discovery paging/order/no resurrection/failed connection; directory more/retry/retained data; bounded chat history with older pages. Every account, socket, image and API write fictitious.");
      return;
    }
    if (photoRaceMode) {
      const expectCard = async id => {
        await wait(`document.querySelector("[data-testid=swipe-card]")?.getAttribute("data-member-id")===${JSON.stringify(id)}`, id);
        assert.equal(await evaluate('document.querySelectorAll("[data-testid=swipe-card]").length'), 1, "only one identity may be on screen");
        const visible = await evaluate('document.querySelector("[data-testid=swipe-card]").textContent');
        for (const [otherId, name] of photoRaceMembers) if (otherId !== id) assert.equal(visible.includes(name), false);
      };
      const ready = async () => wait('document.querySelector("[data-testid=swipe-card]")?.getAttribute("data-image-state")==="ready"', "photo decoded");
      await call("Page.navigate", { url: `${base}/discover` });
      await expectCard("fixture-photo-a");
      await ready();
      await click("[data-testid=button-like]");
      await wait('document.body.innerText.includes("Could not send") || document.body.innerText.includes("try again")', "failed request");
      await expectCard("fixture-photo-a");
      await ready();
      await click("[data-testid=button-pass]");
      await expectCard("fixture-photo-b");
      assert.equal(await evaluate('document.querySelector("[data-testid=swipe-card-image]")?.getAttribute("src")'), "/fictional/photo-b.png");
      assert.equal(await evaluate('document.querySelector("[data-testid=swipe-card-image]")?.naturalWidth'), 0);
      assert.ok(await evaluate('!!document.querySelector("[data-testid=swipe-card-image-loading]")'), "slow photo shows a placeholder");
      assert.equal(await evaluate('document.querySelectorAll("[data-testid=swipe-card-image-loading] .lucide-plane").length'), 4);
      assert.equal(await evaluate('document.querySelectorAll("[data-testid=swipe-card-image-loading] .lucide-star").length'), 4);
      await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
      await wait('document.querySelector("[data-testid=travel-loading]")?.getAttribute("data-reduced-motion")==="true"', "reduced-motion loader");
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".travel-loading__icon")).animationName'), "none");
      await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
      await wait('document.querySelector("[data-testid=travel-loading]")?.getAttribute("data-reduced-motion")==="false"', "falling icons restored");
      const loadingScreenshot = await call("Page.captureScreenshot", { format: "png" });
      await fs.writeFile("/tmp/discovery-loading-preview.png", Buffer.from(loadingScreenshot.data, "base64"));
      assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-testid=swipe-card-image]")).opacity'), "0");
      await click("[data-testid=button-pass]");
      await expectCard("fixture-photo-c");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=swipe-card-image-error]")'), false, "no immediate error warning");
      assert.ok(await evaluate('!!document.querySelector("[data-testid=travel-loading]")'), "temporary failures keep the loading animation during retries");
      await wait('!!document.querySelector("[data-testid=swipe-card-image-error]")', "image failure placeholder");
      assert.ok(await evaluate('!!document.querySelector("[data-testid=swipe-card-retry-photo]")'), "persistent failure offers a neutral load-photo button");
      const requestsAfterRetries = imageRequests.filter(url => url === "/fictional/photo-c.png").length;
      await sleep(1000);
      assert.equal(imageRequests.filter(url => url === "/fictional/photo-c.png").length, requestsAfterRetries, "automatic retries are bounded");
      slowPhotoReady = true;
      for (const release of slowPhotoWaiters.splice(0)) release();
      await sleep(350);
      await expectCard("fixture-photo-c");
      assert.equal(await evaluate('document.querySelector("[data-testid=swipe-card-image]")?.getAttribute("src")'), "/fictional/photo-c.png", "late previous image does not replace current photo");
      assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-testid=swipe-card-image]")).opacity'), "0");
      brokenPhotoFails = false;
      await click("[data-testid=swipe-card-retry-photo]");
      await expectCard("fixture-photo-c");
      await ready();
      await click("[data-testid=button-pass]");
      await expectCard("fixture-photo-d");
      assert.ok(await evaluate('!!document.querySelector("[data-testid=swipe-card-image-empty]")'), "no-photo member cannot inherit old pixels");
      brokenPhotoFails = false;
      connectPhotoFails = false;
      alphaFailuresRemaining = 2;
      await call("Page.reload");
      await expectCard("fixture-photo-a");
      await ready();
      assert.equal(alphaFailures, 2, "temporary image failures recover automatically");
      await click("[data-testid=button-pass]");
      await expectCard("fixture-photo-b");
      await ready();
      await click("[data-testid=button-pass]");
      await expectCard("fixture-photo-c");
      await ready();
      assert.deepEqual(errors, []);
      console.log("PASS discovery photos: one identity; falling planes/stars; reduced motion; no immediate warning; bounded automatic retries; automatic/manual recovery; delayed/late responses; failed/no photos; failed-connect rollback. Screenshot: /tmp/discovery-loading-preview.png. All people, photos and requests fictitious.");
      return;
    }
    if (storyAudienceMode) {
      await call("Page.navigate", { url: `${base}/` });
      await wait('!!document.querySelector("[data-testid=button-add-story]")', "story creator");
      for (const [locale, connections, everyone] of [
        ["en", "Connections", "Everyone"], ["es", "Conexiones", "Todos"],
        ["fr", "Relations", "Tout le monde"], ["sv", "Kontakter", "Alla"],
      ]) {
        await evaluate(`localStorage.setItem('fallonyou_language',${JSON.stringify(locale)})`);
        await call("Page.reload");
        await wait('!!document.querySelector("[data-testid=button-add-story]")', "story creator after locale reload");
        await click("[data-testid=button-add-story]");
        await wait('!!document.querySelector("[data-testid=story-audience-connections]")', "story audience controls");
        assert.equal(await evaluate('document.querySelector("[data-testid=story-audience-connections]").checked'), true);
        assert.ok(await evaluate(`document.querySelector('[data-testid=story-audience-connections]').closest('label').textContent.includes(${JSON.stringify(connections)})`));
        await click("[data-testid=story-audience-everyone]");
        assert.equal(await evaluate('document.querySelector("[data-testid=story-audience-everyone]").checked'), true);
        assert.ok(await evaluate(`document.querySelector('[data-testid=story-audience-everyone]').closest('label').textContent.includes(${JSON.stringify(everyone)})`));
        await evaluate('Array.from(document.querySelector("[data-testid=story-picker-title]").parentElement.querySelectorAll("button")).at(-1).click()');
        await click("[data-testid=button-add-story]");
        assert.equal(await evaluate('document.querySelector("[data-testid=story-audience-connections]").checked'), true, "reopening never defaults to everyone");
        await evaluate('Array.from(document.querySelector("[data-testid=story-picker-title]").parentElement.querySelectorAll("button")).at(-1).click()');
      }
      await evaluate(`localStorage.setItem('fallonyou_language','en')`);
      await call("Page.reload");
      await wait('!!document.querySelector("[data-testid=button-add-story]")', "story creator before uploads");
      const addFixturePhoto = async () => {
        await evaluate(`(() => {
          const bytes=Uint8Array.from(atob(${JSON.stringify(raster.toString("base64"))}), c=>c.charCodeAt(0));
          const transfer=new DataTransfer();
          transfer.items.add(new File([bytes],'fictional.png',{type:'image/png'}));
          const input=document.querySelector('input[type=file]:not([capture])');
          input.files=transfer.files;
          input.dispatchEvent(new Event('change',{bubbles:true}));
        })()`);
      };
      await click("[data-testid=button-add-story]");
      await click("[data-testid=story-audience-everyone]");
      await addFixturePhoto();
      await wait('document.querySelector("[data-testid=button-add-story]")?.disabled===false', "everyone upload");
      assert.deepEqual(storyAudienceUploads, ["everyone"]);
      await click("[data-testid=button-add-story]");
      await addFixturePhoto();
      await wait('document.querySelector("[data-testid=button-add-story]")?.disabled===false', "connections upload");
      assert.deepEqual(storyAudienceUploads, ["everyone", "connections"]);
      await click("[data-testid=story-avatar-fixture-viewer]");
      await wait('document.querySelector("[data-testid=story-audience-label]")?.textContent.includes("Connections")', "first story privacy label");
      await click("[data-testid=story-next-media]");
      await wait('document.querySelector("[data-testid=story-audience-label]")?.textContent.includes("Everyone")', "per-story privacy label");
      assert.deepEqual(errors, []);
      console.log("PASS story audience: four locales, private default on every open, multipart payload for both audiences and independent viewer labels. All uploads intercepted; no real database/storage writes.");
      return;
    }
    if (engagementMode) {
      await call("Page.navigate", { url: `${base}/languages?lang=fr` });
      await wait('!!document.querySelector("[data-testid=language-reminder-toggle]")', "language reminder preference");
      assert.equal(studyStarts.length, 0, "visiting Languages must not count as studying");
      assert.equal(await evaluate('document.querySelector("[data-testid=language-reminder-toggle]").getAttribute("aria-checked")'), "false");
      preferenceFails = true;
      await click("[data-testid=language-reminder-toggle]");
      await wait('!!document.querySelector("[data-testid=retry-language-reminders-save]")', "failed preference save");
      assert.equal(engagementPrefs.learningReminders, false);
      preferenceFails = false;
      await click("[data-testid=retry-language-reminders-save]");
      await wait('document.querySelector("[data-testid=language-reminder-toggle]").getAttribute("aria-checked")==="true"', "optional reminder enabled");
      await click("[data-testid=phrase-card-0]");
      assert.equal(studyStarts[0].language, "fr", "reminder deep link selects correct learning language");
      assert.equal(studyStarts[0].locale, "en");
      assert.equal(studyStarts[0].completed, undefined);
      assert.equal(engagementPrefs.messages, false);
      assert.equal(engagementPrefs.events, false);
      await call("Page.navigate", { url: `${base}/profile` });
      await click("[data-testid=card-notif-prefs]");
      await wait('!!document.querySelector("[data-testid=toggle-notif-learningReminders]")', "profile reminder preference");
      await click("[data-testid=toggle-notif-learningReminders]");
      await wait('!document.querySelector("[data-testid=toggle-notif-learningReminders]").getAttribute("aria-checked") || document.querySelector("[data-testid=toggle-notif-learningReminders]").getAttribute("aria-checked")==="false"', "profile opt-out");
      assert.equal(engagementPrefs.learningReminders, false);
      await call("Page.navigate", { url: `${base}/local-help` });
      await wait('!!document.querySelector("[data-testid=solidarity-country]")', "solidarity form");
      await evaluate(`(() => {
        for(const [id,value] of [['solidarity-country','Senegal'],['solidarity-support','Support a locally led community project during the trip.']]) {
          const el=document.querySelector('[data-testid='+id+']');
          Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);
          el.dispatchEvent(new Event('input',{bubbles:true}));
        }
      })()`);
      interestFails = true;
      await click("[data-testid=solidarity-submit]");
      assert.equal(submittedIdea, null, "failed submission must not show success");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=solidarity-success]")'), false);
      interestFails = false;
      await click("[data-testid=solidarity-submit]");
      await wait('!!document.querySelector("[data-testid=solidarity-success]")', "solidarity server-confirmed success");
      assert.equal(submittedIdea.country, "Senegal");
      await call("Page.reload");
      await wait('!!document.querySelector("[data-testid=solidarity-success]")', "solidarity persists after reload");
      for (const [locale, label] of [["en","Language practice reminders"],["es","Recordatorios para practicar idiomas"],["fr","Rappels pour pratiquer les langues"],["sv","Påminnelser om språkträning"]]) {
        await evaluate(`localStorage.setItem('fallonyou_language',${JSON.stringify(locale)})`);
        await call("Page.navigate", { url: `${base}/languages?lang=fr` });
        await wait(`document.querySelector('[data-testid=language-reminders]')?.textContent.includes(${JSON.stringify(label)})`, `${locale} reminders`);
      }
      await call("Page.navigate", { url: `${base}/` });
      await click("[data-testid=button-notification-bell]");
      await wait('!!document.querySelector("[data-testid=notif-item-99]")', "connection request in bell");
      await click("[data-testid=notif-item-99]");
      await wait('location.pathname==="/matches"', "connection notice opens Connections");
      assert.deepEqual(errors, []);
      console.log("PASS engagement UI: optional reminders/save failure/opt-out/deep link/study tracking; solidarity failure/success/reload; four locales; connection notice routing. All API writes intercepted.");
      return;
    }
    if (helpMode) {
      const copy = {
        en: ["Help", "Welcome to FallOnyou!", "Create and join activities", "Discover people", "Connect and chat", "Enable notifications", "Start your adventure!"],
        es: ["Ayuda", "¡Bienvenido a FallOnyou!", "Crea y únete a actividades", "Descubre personas", "Conecta y chatea", "Activa las notificaciones", "¡Comienza tu aventura!"],
        fr: ["Aide", "Bienvenue sur FallOnyou!", "Créez et rejoignez des activités", "Découvrez des personnes", "Connectez-vous et chattez", "Activez les notifications", "Commencez votre aventure!"],
        sv: ["Hjälp", "Välkommen till FallOnyou!", "Skapa och delta i aktiviteter", "Upptäck människor", "Ta kontakt och chatta", "Aktivera notiser", "Börja ditt äventyr!"],
      };
      for (const [locale, text] of Object.entries(copy)) {
        await call("Page.navigate", { url: `${base}/` });
        await wait('!!document.querySelector("[data-testid=button-open-help]")', "help entry");
        await evaluate(`localStorage.setItem('fallonyou_language',${JSON.stringify(locale)});localStorage.removeItem('fallonyou_tour_completed')`);
        await call("Page.reload");
        await wait(`document.querySelector('[data-testid=button-open-help]')?.textContent.trim()===${JSON.stringify(text[0])}`, `${locale} help label`);
        await sleep(500);
        assert.equal(await evaluate('!!document.querySelector("[data-testid=button-skip-tour]")'), false, "fresh visitor must not get automatic guide");
        await click("[data-testid=button-open-help]");
        for (let slide = 1; slide <= 6; slide++) {
          await wait(`Array.from(document.querySelectorAll('h2')).some(x=>x.textContent===${JSON.stringify(text[slide])})`, `${locale} slide ${slide}`);
          assert.ok(await evaluate(`(() => {
            const card = document.querySelector('[data-testid=button-skip-tour]').parentElement.querySelector('h2').closest('.shadow-xl');
            const rect = card.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth;
          })()`), "help card must fit the mobile viewport");
          if (slide < 6) await click(slide === 5 ? "[data-testid=button-skip-notifications]" : "[data-testid=button-next]");
        }
        await click("[data-testid=button-start]");
        await wait('!document.querySelector("[data-testid=button-skip-tour]")', "guide finished");
        await click("[data-testid=button-open-help]");
        await wait(`Array.from(document.querySelectorAll('h2')).some(x=>x.textContent===${JSON.stringify(text[1])})`, "reopen starts from first slide");
        assert.ok(await evaluate('!!document.querySelector("[data-testid=button-skip-tour]").getAttribute("aria-label")'));
        await click("[data-testid=button-skip-tour]");
        await call("Page.reload");
        await wait('!!document.querySelector("[data-testid=button-open-help]")', "help after reload");
        assert.equal(await evaluate('!!document.querySelector("[data-testid=button-skip-tour]")'), false);
      }
      assert.deepEqual(errors, []);
      assert.ok(helpWrites.every(url => url === "/api/sessions/ping"), "help must not mutate user preferences or send notifications");
      console.log("PASS optional help en/es/fr/sv: no automatic opening, all six slides localized, completion/close/reopen/reload, mobile help card fits, no runtime errors.");
      return;
    }
    if (storyMode) {
      await call("Page.navigate", { url: `${base}/` });
      await click("[data-testid=story-avatar-fixture-member]");
      await wait('!!document.querySelector("[data-testid=story-next-media]")', "media arrows");
      assert.equal(await evaluate('document.querySelector("[data-testid=story-previous-media]").disabled'), true);
      for (const selector of ["story-next-media", "story-previous-media"]) {
        const geometry = await evaluate(`(() => {
          const button = document.querySelector('[data-testid=${selector}]');
          const rect = button.getBoundingClientRect(), media = button.parentElement.getBoundingClientRect();
          return { width: rect.width, height: rect.height, centered: Math.abs(rect.y + rect.height/2 - media.y - media.height/2) < 2 };
        })()`);
        assert.ok(geometry.width >= 44 && geometry.height >= 44 && geometry.centered);
      }
      await click("[data-testid=story-next-media]");
      await wait('document.body.innerText.includes("Fixture photo 0-1")', "next photo");
      assert.equal(await evaluate('document.querySelector("[data-testid=story-previous-media]").disabled'), false);
      await click("[data-testid=story-previous-media]");
      await wait('document.body.innerText.includes("Fixture photo 0-0")', "previous photo");
      await click("[data-testid=story-next]");
      await wait('document.body.innerText.includes("Fixture photo 0-1")', "footer next");
      await click("[data-testid=story-next-media]");
      await wait('document.body.innerText.includes("Fixture photo 1-0")', "next traveler");
      await click("[data-testid=story-previous-media]");
      await wait('document.body.innerText.includes("Fixture photo 0-0")', "previous traveler");
      await click("[data-testid=story-next-media]");
      await click("[data-testid=story-next-media]");
      await click("[data-testid=story-next-media]");
      await click("[data-testid=story-next-media]");
      await wait('!document.querySelector("[data-testid=story-next-media]")', "last photo closes viewer");
      assert.deepEqual(errors, []);
      console.log("PASS story arrows: 44px centered controls, previous/next photos and travelers, unchanged footer, last-photo close; no real data writes.");
      return;
    }
    if (ageMode) {
      await call("Page.navigate", { url: `${base}/profile` });
      await wait('!!document.querySelector("[data-testid=switch-show-age]")', "age privacy switch");
      await evaluate(`Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('Understood'))?.click()`);
      await wait('document.querySelector("[data-testid=input-age]")?.value==="37"', "owner private age");
      assert.equal(await evaluate('document.querySelector("[data-testid=switch-show-age]").getAttribute("aria-checked")'), "false");
      await click("[data-testid=button-ver-perfil]");
      await wait('document.querySelector("[data-testid=text-profile-name]")?.textContent==="Viewer"', "hidden owner preview");
      await click("[data-testid=button-close-profile-sheet]");
      await click("[data-testid=switch-show-age]");
      assert.equal(profileWrites.length, 0, "Toggle alone must not autosave");
      profileSaveFails = true;
      await click("[data-testid=button-save-profile]");
      await wait('document.querySelector("[data-testid=switch-show-age]").getAttribute("aria-checked")==="false"', "failed save rollback");
      assert.equal(savedShowAge, false);
      profileSaveFails = false;
      await click("[data-testid=switch-show-age]");
      await click("[data-testid=button-save-profile]");
      await wait('document.querySelector("[data-testid=switch-show-age]").getAttribute("aria-checked")==="true"', "saved opt-in");
      assert.equal(savedShowAge, true);
      assert.equal(profileWrites.at(-1).showAge, true);
      await call("Page.navigate", { url: `${base}/profile` });
      await wait('document.querySelector("[data-testid=switch-show-age]")?.getAttribute("aria-checked")==="true"', "opt-in after reload");
      await click("[data-testid=button-ver-perfil]");
      await wait('document.querySelector("[data-testid=text-profile-name]")?.textContent==="Viewer, 37"', "opt-in owner preview");
      await click("[data-testid=button-close-profile-sheet]");
      async function publicAgeCheck(expected) {
        await call("Page.navigate", { url: `${base}/discover` });
        await wait('!!document.querySelector("[data-testid=button-all-photo-members]")', "discovery");
        await click("[data-testid=button-all-photo-members]");
        await wait('!!document.querySelector("[data-testid=button-view-member-fixture-member]")', "photo grid");
        assert.equal(await evaluate('document.querySelector("[data-testid=button-view-member-fixture-member]").textContent.includes("37")'), expected);
        await click("[data-testid=button-view-member-fixture-member]");
        await wait('!!document.querySelector("[data-testid=text-profile-name]")', "public profile");
        assert.equal(await evaluate('document.querySelector("[data-testid=text-profile-name]").textContent'), expected ? "Example, 37" : "Example");
      }
      await publicAgeCheck(true);
      await call("Page.navigate", { url: `${base}/profile` });
      await wait('document.querySelector("[data-testid=switch-show-age]")?.getAttribute("aria-checked")==="true"', "switch before opt-out");
      await click("[data-testid=switch-show-age]");
      await click("[data-testid=button-save-profile]");
      await wait('document.querySelector("[data-testid=switch-show-age]").getAttribute("aria-checked")==="false"', "saved opt-out");
      assert.equal(profileWrites.at(-1).showAge, false);
      await publicAgeCheck(false);
      for (const [locale, label] of [["en", "Show my age"], ["es", "Mostrar mi edad"], ["fr", "Afficher mon âge"], ["sv", "Visa min ålder"]]) {
        await evaluate(`localStorage.setItem('fallonyou_language','${locale}')`);
        await call("Page.navigate", { url: `${base}/profile` });
        await wait(`document.querySelector('[data-testid=switch-show-age]')?.getAttribute('aria-label')===${JSON.stringify(label)}`, `localized switch ${locale}`);
        assert.equal(await evaluate('document.querySelector("[data-testid=switch-show-age]").getAttribute("aria-checked")'), "false");
        assert.equal(await evaluate('document.querySelector("[data-testid=input-age]").value'), "37");
        await evaluate(`document.querySelector('[data-testid=switch-show-age]').scrollIntoView({block:'center'})`);
        await sleep(200);
      }
      await fs.writeFile("/tmp/age-privacy-mobile.jpg", Buffer.from((await call("Page.captureScreenshot", { format: "jpeg" })).data, "base64"));
      assert.deepEqual(errors, []);
      console.log("PASS age privacy: legacy default hidden, owner age retained, explicit saves only, save-failure rollback, opt-in persists, public grid/profile shown only on opt-in, opt-out hides both, four locales.");
      return;
    }
    await call("Page.navigate", { url: `${base}/discover` });
    await wait('!!document.querySelector("[data-testid=button-all-photo-members]")', "discovery");
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('Understood'))?.click()`);
    console.log("Opened fictional discovery");
    await click("[data-testid=button-all-photo-members]");
    await wait('!!document.querySelector("[data-testid=button-view-member-fixture-member]")', "member button");
    await sleep(400);
    await evaluate(`document.querySelector('[data-testid=button-view-member-fixture-member]').focus()`);
    assert.equal(await evaluate(`document.activeElement===document.querySelector('[data-testid=button-view-member-fixture-member]')`), true);
    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await wait('document.body.innerText.includes("Unique fictional biography fixture-member")', "public profile absent from swipe feed");
    await wait('document.querySelector("[data-testid=img-profile-photo]")?.naturalWidth>0', "public profile photo");
    const before = posts;
    await evaluate(`{const b=document.querySelector('[data-testid=button-member-connect]');b.click();b.click();}`);
    await wait('document.body.innerText.includes("Request sent · awaiting response")', "pending label");
    assert.equal(posts, before + 1);
    assert.equal(await evaluate('!!document.querySelector("[data-testid=button-member-open-connections]")'), false);
    await click("[data-testid=button-close-profile-sheet]");
    await click("[data-testid=button-view-member-fixture-member]");
    await wait('document.body.innerText.includes("Request sent · awaiting response")', "pending after reopen");
    status = "connected";
    const previousReads = reads;
    await click("[data-testid=button-close-profile-sheet]");
    await click("[data-testid=button-view-member-fixture-member]");
    await wait('!!document.querySelector("[data-testid=button-member-open-connections]")', "accepted after reopen");
    assert.ok(reads > previousReads);
    await evaluate(`document.querySelector('[data-testid=button-member-open-connections]').scrollIntoView({block:'center'})`);
    await sleep(400);
    const reachable = await evaluate(`(()=>{const b=document.querySelector('[data-testid=button-member-open-connections]'),r=b.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===b||b.contains(e)})()`);
    assert.equal(reachable, true, "Connection action must be pointer reachable");
    await fs.writeFile("/tmp/photos-connected-mobile.jpg", Buffer.from((await call("Page.captureScreenshot", { format: "jpeg" })).data, "base64"));
    console.log("PASS profile, duplicate-send prevention, pending, refresh and mobile pointer reachability");
    await click("[data-testid=button-close-profile-sheet]");
    status = "none";
    for (const code of [500, 429, 403]) {
      mode = `send${code}`;
      await click("[data-testid=button-view-member-fixture-member]");
      await wait('!!document.querySelector("[data-testid=button-member-connect]")', "send button");
      await click("[data-testid=button-member-connect]");
      await wait('!!document.querySelector("[role=alert]")', `send ${code} error`);
      assert.equal(await evaluate('document.body.innerText.includes("Request sent · awaiting response")'), false);
      if (code === 500) {
        mode = "ok";
        await click("[data-testid=button-member-connect]");
        await wait('document.body.innerText.includes("Request sent · awaiting response")', "send retry");
      } else assert.equal(await evaluate('document.querySelector("[data-testid=button-member-connect]").disabled'), true);
      await click("[data-testid=button-close-profile-sheet]");
      status = "none";
    }
    console.log("PASS send errors 500/retry,429,403");
    mode = "load500";
    await click("[data-testid=button-view-member-fixture-member]");
    await wait('!!document.querySelector("[data-testid=public-profile-state] button")', "load retry");
    mode = "ok";
    await evaluate(`Array.from(document.querySelectorAll('[data-testid=public-profile-state] button')).find(x=>x.textContent.includes('Try again')).click()`);
    await wait('document.body.innerText.includes("Unique fictional biography fixture-member")', "load retry");
    await click("[data-testid=button-close-profile-sheet]");
    mode = "load404";
    await click("[data-testid=button-view-member-fixture-member]");
    await wait('!!document.querySelector("[data-testid=public-profile-state]")', "unavailable profile");
    assert.equal(await evaluate('!!document.querySelector("[data-testid=button-member-connect]")'), false);
    await evaluate(`document.querySelector('[data-testid=public-profile-state] > button').click()`);
    await sleep(400);
    mode = "ok"; replyMatch = true;
    await click("[data-testid=button-view-member-fixture-member]");
    await wait('!!document.querySelector("[data-testid=button-member-connect]")', "mutual send");
    await click("[data-testid=button-member-connect]");
    await wait('!!document.querySelector("[data-testid=button-member-open-connections]")', "mutual response");
    await click("[data-testid=button-member-open-connections]");
    await wait('location.pathname==="/matches"', "connections navigation");
    console.log("PASS load error/retry, unavailable and mutual result navigation");
    for (const [locale, label] of [["es", "Ver perfil"], ["fr", "Voir le profil"], ["sv", "Visa profil"]]) {
      await evaluate(`localStorage.setItem('fallonyou_language','${locale}')`);
      await call("Page.navigate", { url: `${base}/discover` });
      await wait('!!document.querySelector("[data-testid=button-all-photo-members]")', "localized discovery");
      await click("[data-testid=button-all-photo-members]");
      await wait(`document.querySelector('[data-testid=button-view-member-fixture-member]')?.textContent.includes('${label}')`, `localized grid ${locale}`);
      await click("[data-testid=button-view-member-fixture-member]");
      await wait('!!document.querySelector("[data-testid=button-member-open-connections]")', "localized profile");
      assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false);
      await click("[data-testid=button-close-profile-sheet]");
    }
    assert.deepEqual(errors, []);
    console.log("PASS en/es/fr/sv, no horizontal overflow, no runtime errors. Fixture API reads/posts:", reads, posts);
  } catch (error) {
    console.error("Browser test failure:", error.message, "Console errors:", errors);
    console.error("Image interception:", imageRequests);
    if (evaluate) console.error("Image DOM:", await evaluate("JSON.stringify(Array.from(document.images).map(i=>({src:i.src,width:i.naturalWidth})))").catch(() => ""));
    if (evaluate) console.error("DOM:", await evaluate("document.body.innerText").catch(() => "<unavailable>"));
    throw error;
  } finally {
    if (ws) ws.close();
    browser.kill("SIGTERM");
    if (browser.exitCode === null) await new Promise(resolve => browser.once("exit", resolve));
    await sleep(300);
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
}
main().catch(() => { process.exitCode = 1; });