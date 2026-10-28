// Browser-only fixtures: ALL /api requests are intercepted, no user data is read
// or modified. Run against an already-running preview with `node` on Replit.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
const assert = require("node:assert/strict");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "language-course-browser-"));
const chrome = spawn(process.env.CHROMIUM_BIN || "chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9226",
  "--user-data-dir=" + profileDir, "about:blank",
], { stdio: "ignore" });
const levels = [
  ["a1", ["greetings", "restaurant", "social"]], ["a2", ["airport", "transport", "hotel"]],
  ["b1", ["emergency", "numbers", "shopping"]], ["b2plus", ["health", "business", "culture"]],
  ["c1", ["negotiation", "opinions", "resolution"]], ["c2", ["nuance", "debate", "mediation"]],
].map(([id, categories], rank) => ({
  id, premium: rank >= 3, lessons: categories.map(category => (id === "b2plus" ? "b2" : id) + "-" + category),
}));
const completed = new Set(levels.slice(0, 4).flatMap(level => level.lessons).concat(["c1-negotiation", "c1-opinions"]));
const saves = [], errors = [], pending = new Map();
let socket, sequence = 0, premium = true, apiFailure = false, refreshDelay = 0, accessRequests = 0;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error("Browser timeout: " + expression);
}
async function click(id) {
  const selector = JSON.stringify(`[data-testid="${id}"]`);
  await wait(`!!document.querySelector(${selector}) && !document.querySelector(${selector}).disabled`);
  await evaluate(`document.querySelector(${selector}).click()`);
  await delay(150);
}
async function openLevels() {
  await click("tab-levels");
  await wait('!!document.querySelector("[data-testid=btn-level-c1]")');
}
async function reload() {
  await send("Page.reload");
  // Page.reload acknowledges navigation before destroying the previous DOM.
  await delay(800);
  await wait('document.readyState === "complete" && !!document.querySelector("[data-testid=tab-levels]")');
}
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "jpeg", quality: 80, captureBeyondViewport: true });
  const output = path.join(os.tmpdir(), name + ".jpg");
  fs.writeFileSync(output, Buffer.from(result.data, "base64"));
  console.log("Screenshot:", output);
}
async function respond(params) {
  const url = new URL(params.request.url);
  if (url.pathname === "/api/premium/status" || url.pathname === "/api/language/progress" || url.pathname.startsWith("/api/language/levels/")) {
    if (params.request.method === "GET") {
      accessRequests++;
      if (refreshDelay) await delay(refreshDelay);
    }
  }
  const lang = url.searchParams.get("lang") || url.pathname.split("/").pop();
  const done = lang === "en" ? completed : new Set();
  let body = { ok: true }, status = 200;
  if (url.pathname === "/api/user") body = {
    id: "fixture-course-browser", firstName: "Fictional Course Tester", isPremium: premium ? "true" : "false",
    ageConfirmed: true, termsAcceptedAt: "2026-10-09T12:00:00Z",
    profileImageUrl: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
    photos: [{ type: "photo", url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>" }],
    profile: { userId: "fixture-course-browser", displayName: "Fictional Course Tester", speaksLanguages: [], learningLanguages: [] },
  };
  else if (url.pathname === "/api/premium/status") body = { isPremium: premium };
  else if (url.pathname === "/api/profile/languages") body = { speaksLanguages: [], learningLanguages: [] };
  else if (url.pathname === "/api/language/progress") {
    if (params.request.method === "POST") {
      const input = JSON.parse(params.request.postData);
      saves.push(input);
      completed.add(input.lessonId);
      body = { ok: true, level: "c1", completedLevel: "c1" };
    } else body = { completedLessons: [...done] };
  } else if (url.pathname.startsWith("/api/language/levels/")) {
    if (apiFailure) { status = 500; body = { error: "fixture_read_failure" }; }
    else body = {
      completedLessons: [...done],
      levels: levels.map((level, rank) => ({
        levelId: level.id, requiresPremium: level.premium, isPremiumUser: premium,
        completed: level.lessons.every(id => done.has(id)),
        unlocked: (!level.premium || premium) && levels.slice(0, rank).every(previous => previous.lessons.every(id => done.has(id))),
        lessons: level.lessons.map(lessonId => ({ lessonId, completed: done.has(lessonId) })),
      })),
    };
  } else if (url.pathname === "/api/language/quiz/today") body = { completed: false };
  else if (url.pathname === "/api/notifications/preferences") body = { learningReminders: false, interfaceLanguage: "en" };
  else if (url.pathname.includes("unread-count")) body = { count: 0 };
  else if (url.pathname === "/api/notifications" || url.pathname === "/api/matches") body = [];
  await send("Fetch.fulfillRequest", {
    requestId: params.requestId, responseCode: status,
    responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}
(async () => {
  try {
    assert(process.env.REPLIT_DEV_DOMAIN, "Start the preview and provide REPLIT_DEV_DOMAIN.");
    let target;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        target = await fetch("http://127.0.0.1:9226/json/new?about:blank", { method: "PUT" }).then(response => response.json());
        break;
      } catch { await delay(100); }
    }
    assert(target, "Chromium did not start.");
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => socket.once("open", resolve));
    socket.on("message", raw => {
      const message = JSON.parse(raw);
      if (message.id) {
        const request = pending.get(message.id);
        if (request) {
          pending.delete(message.id);
          message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
        }
      } else if (message.method === "Fetch.requestPaused") {
        respond(message.params).catch(error => errors.push(error.message));
      } else if (message.method === "Runtime.exceptionThrown") {
        errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      }
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: `
      window.__learningTones = [];
      const NativeAudio = window.AudioContext;
      window.AudioContext = class extends NativeAudio {
        createOscillator() {
          const oscillator = super.createOscillator();
          const start = oscillator.start.bind(oscillator);
          oscillator.start = (...args) => { window.__learningTones.push(Number(oscillator.frequency.value.toFixed(2))); return start(...args); };
          return oscillator;
        }
      };
    ` });
    await send("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
    await send("Page.navigate", { url: "https://" + process.env.REPLIT_DEV_DOMAIN + "/languages" });
    await wait('!!document.querySelector("[data-testid=tab-levels]")');
    await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Understood")?.click()');
    await openLevels();
    await wait('!document.querySelector("[data-testid=btn-level-c1]").disabled');
    assert.equal(await evaluate('document.querySelector("[data-testid=btn-level-c2]").disabled'), true);
    await screenshot("course-premium-overview");
    await click("btn-level-c1");
    await click("btn-lesson-c1-resolution");
    await wait('document.querySelectorAll("[data-testid^=study-phrase-]").length === 5');
    async function refreshWithoutInterrupting(selector) {
      const before = accessRequests;
      refreshDelay = 1200;
      await evaluate('window.dispatchEvent(new Event("visibilitychange"))');
      for (let attempt = 0; attempt < 30 && accessRequests === before; attempt++) await delay(50);
      assert(accessRequests > before, "Background access refresh must really start");
      assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), true);
      assert.equal(await evaluate('document.body.innerText.includes("Checking course access")'), false);
      assert.equal(await evaluate('document.body.innerText.includes("Check again")'), false);
      await delay(1500);
      refreshDelay = 0;
      assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), true);
    }
    await refreshWithoutInterrupting("[data-testid=study-phrase-0]");
    const answers = await evaluate('Object.fromEntries([...document.querySelectorAll("[data-testid^=study-phrase-]")].map(element => {const paragraphs = element.querySelectorAll("p");return [paragraphs[0].textContent, paragraphs[2].textContent]}))');
    await click("btn-start-lesson-quiz");
    for (let question = 0; question < 5; question++) {
      await wait('!!document.querySelector("[data-testid=section-quiz-mode]")');
      const phrase = await evaluate('document.querySelector("[data-testid=section-quiz-mode] p.text-2xl").textContent');
      assert(answers[phrase]);
      await evaluate(`(()=>{const button = [...document.querySelectorAll("[data-testid=section-quiz-mode] button")].find(button => button.textContent.trim() === ${JSON.stringify(answers[phrase])}); if (!button) throw new Error("Answer not found"); button.click()})()`);
      if (question === 0) {
        await wait('window.__learningTones.length === 2');
        assert.deepEqual(await evaluate('window.__learningTones'), [523.25, 783.99]);
        await refreshWithoutInterrupting("[data-testid=section-quiz-mode]");
        assert.equal(await evaluate('document.querySelector("[data-testid=section-quiz-mode] p.text-2xl").textContent'), phrase);
        assert.equal(await evaluate('document.querySelector("[data-testid=btn-quiz-next]").disabled'), false);
      }
      await click("btn-quiz-next");
    }
    await click("btn-claim-completion");
    await wait('!!document.querySelector("[data-testid=section-level-complete]")');
    assert.equal(saves.length, 1);
    assert.deepEqual(saves[0], { language: "en", lessonId: "c1-resolution", score: 5, total: 5 });
    await click("btn-level-complete-next");
    await click("btn-lesson-c2-nuance");
    await wait('document.querySelectorAll("[data-testid^=study-phrase-]").length === 5');
    await screenshot("course-c2-study");
    premium = false;
    await evaluate('window.dispatchEvent(new Event("visibilitychange"))');
    await wait('document.querySelectorAll("[data-testid^=study-phrase-]").length === 0');
    premium = true;
    await evaluate('window.dispatchEvent(new Event("visibilitychange"))');
    await wait('document.querySelectorAll("[data-testid^=study-phrase-]").length === 5');
    await reload();
    await openLevels();
    await wait('!document.querySelector("[data-testid=btn-level-c2]").disabled');
    await click("btn-level-c2");
    await click("btn-lesson-c2-nuance");
    await click("btn-lang-fr");
    await wait('!!document.querySelector("[data-testid=btn-level-c1]")');
    assert.equal(await evaluate('document.querySelector("[data-testid=btn-level-c1]").disabled'), true);
    premium = false;
    await reload();
    await openLevels();
    await wait('!document.querySelector("[data-testid=btn-level-b1]").disabled');
    assert.equal(await evaluate('document.querySelector("[data-testid=btn-level-b2plus]").disabled'), true);
    const premiumCard = await evaluate('document.querySelector("[data-testid=btn-level-b2plus]").textContent');
    assert(premiumCard.includes("Premium"));
    assert(!premiumCard.includes("Complete B1 to unlock"));
    apiFailure = true;
    await reload();
    await openLevels();
    await wait('!!document.querySelector("[role=alert]")');
    assert.equal(await evaluate('document.querySelector("[data-testid=btn-level-c1]").disabled'), true);
    await click("btn-open-quiz");
    await wait('document.querySelectorAll("[data-testid^=quiz-option-]").length > 0');
    await evaluate('document.querySelector("[data-testid^=quiz-option-]").click()');
    await wait('window.__learningTones.length === 2');
    const dailyTones = await evaluate('window.__learningTones');
    assert([[523.25, 783.99], [246.94, 196]].some(pair => JSON.stringify(pair) === JSON.stringify(dailyTones)));
    assert.equal(await evaluate('document.querySelectorAll("[data-testid=learning-sound-toggle]").length'), 2);
    assert.deepEqual(errors, []);
    console.log("PASS: course/daily quiz Web Audio feedback; delayed refresh preserves study/quiz and answer; C1 quiz/save → C2, reload, language reset, Premium revocation and failed-read recovery. Browser fixtures only.");
  } catch (error) {
    console.error(error.stack);
    if (socket?.readyState === WebSocket.OPEN)
      console.error((await evaluate("document.body.innerText").catch(() => "")).slice(-2000));
    process.exitCode = 1;
  } finally {
    socket?.close();
    if (chrome.exitCode === null && chrome.signalCode === null) {
      const exited = new Promise(resolve => chrome.once("exit", resolve));
      chrome.kill("SIGTERM");
      await exited;
    }
    // Chromium helper processes can finish writing after the main process exits.
    await fs.promises.rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
})();
