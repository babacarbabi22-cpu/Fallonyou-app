// Browser fixtures only: intercept every /api call; never access real accounts.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
const assert = require("node:assert/strict");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "writing-browser-"));
const chrome = spawn(process.env.CHROMIUM_BIN || "/repl/tools/bin/chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9234",
  "--user-data-dir=" + profileDir, "about:blank",
], { stdio: "ignore" });
let socket, sequence = 0, premium = false, saveFailure = false;
const pending = new Map(), errors = [], done = new Map(), saves = [];
const ids = ["starter", "builder", "challenge"];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error("Browser timeout: " + expression);
}
async function click(id) {
  const selector = JSON.stringify(`[data-testid="${id}"]`);
  await wait(`!!document.querySelector(${selector}) && !document.querySelector(${selector}).disabled`);
  await evaluate(`document.querySelector(${selector}).click()`);
  await delay(100);
}
async function type(value) {
  await evaluate(`(() => {
    const input = document.querySelector('[data-testid="writing-input"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', {bubbles: true}));
  })()`);
  await delay(50);
}
function exercises(lang, level) {
  const phrase = lang === "fr" ? "Nous allons visiter le musée demain." : "We will visit the museum tomorrow.";
  const answer = level === "challenge" ? phrase : level === "builder" ? "visit the museum" : "museum";
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${level}-${i}`, phrase, answer, phonetic: "",
    prompt: level === "challenge" ? phrase : level === "builder" ? "We will ____ ____ ____ tomorrow." : phrase.replace(lang === "fr" ? "musée" : "museum", "____"),
    mode: level === "challenge" ? "memory" : level === "builder" ? "words" : "word",
  }));
}
async function respond(params) {
  const url = new URL(params.request.url);
  let status = 200, body = {};
  if (url.pathname === "/api/user") body = {
    id: "fictional-writing-browser", firstName: "Fictional Writing Tester", isPremium: premium ? "true" : "false",
    ageConfirmed: true, termsAcceptedAt: "2026-10-21T10:00:00Z",
    profileImageUrl: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
    photos: [{ type: "photo", url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>" }],
    profile: { userId: "fictional-writing-browser", displayName: "Fictional Writing Tester", speaksLanguages: [], learningLanguages: [] },
  };
  else if (url.pathname === "/api/premium/status") body = { isPremium: premium };
  else if (url.pathname.startsWith("/api/language/writing/")) {
    const [, , , , lang, level] = url.pathname.split("/");
    const completed = done.get(lang) || new Set();
    if (params.request.method === "POST") {
      if (saveFailure) { status = 500; body = { error: "fixture_save_failure" }; }
      else {
        const input = JSON.parse(params.request.postData);
        assert.deepEqual(input.answers, exercises(lang, level).map(item => item.answer));
        completed.add(level); done.set(lang, completed); saves.push({ lang, level });
        body = { ok: true };
      }
    } else if (level) body = { exercises: exercises(lang, level) };
    else body = { isPremium: premium, levels: ids.map((id, rank) => ({
      id, premium: rank > 0, completed: completed.has(id),
      unlocked: (rank === 0 || premium) && ids.slice(0, rank).every(previous => completed.has(previous)),
    })) };
  } else if (url.pathname === "/api/profile/languages") body = { speaksLanguages: [], learningLanguages: [] };
  else if (url.pathname === "/api/language/progress") body = { completedLessons: [] };
  else if (url.pathname === "/api/language/quiz/today") body = { completed: false };
  else if (url.pathname === "/api/notifications/preferences") body = { learningReminders: false, interfaceLanguage: "en" };
  else if (url.pathname.includes("unread-count")) body = { count: 0 };
  else if (["/api/notifications", "/api/matches"].includes(url.pathname)) body = [];
  await send("Fetch.fulfillRequest", {
    requestId: params.requestId, responseCode: status,
    responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}
async function reloadWriting() {
  await send("Page.reload"); await delay(700);
  await wait('!!document.querySelector("[data-testid=tab-writing]")');
  await click("tab-writing");
  await wait('!!document.querySelector("[data-testid=writing-journey]")');
}
async function solve(level) {
  for (let i = 0; i < 4; i++) {
    if (level === "challenge") {
      await wait('!!document.querySelector("[data-testid=writing-memory-start]")');
      assert.equal(await evaluate('!!document.querySelector("[data-testid=writing-input]")'), false);
      await click("writing-memory-start");
      assert.equal(await evaluate('!!document.querySelector("[data-testid=writing-prompt]")'), false);
    }
    await wait('!!document.querySelector("[data-testid=writing-input]")');
    await type(exercises("en", level)[i].answer);
    await click("writing-check");
    await click("writing-next");
  }
}
(async () => {
  try {
    let target;
    for (let i = 0; i < 60; i++) {
      try { target = await fetch("http://127.0.0.1:9234/json/new?about:blank", { method: "PUT" }).then(r => r.json()); break; }
      catch { await delay(100); }
    }
    assert(target);
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => socket.once("open", resolve));
    socket.on("message", raw => {
      const message = JSON.parse(raw);
      if (message.id) {
        const request = pending.get(message.id);
        if (request) { pending.delete(message.id); message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result); }
      } else if (message.method === "Fetch.requestPaused") respond(message.params).catch(e => errors.push(e.message));
      else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    });
    await send("Page.enable"); await send("Runtime.enable");
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
    await wait('!!document.querySelector("[data-testid=tab-writing]")');
    await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Understood")?.click()');
    await click("tab-writing");
    await wait('!!document.querySelector("[data-testid=writing-journey]")');
    assert.equal(await evaluate('document.querySelector("[data-testid=writing-level-builder] a").getAttribute("href")'), "/premium");
    assert.equal(await evaluate('!!document.querySelector("[data-testid=writing-open-builder]")'), false);
    await click("writing-open-starter");
    await wait('!!document.querySelector("[data-testid=writing-input]")');
    await type("fictional incorrect answer");
    await click("writing-check");
    await wait('window.__learningTones.length === 2');
    assert.deepEqual(await evaluate('window.__learningTones'), [246.94, 196]);
    await evaluate('[...document.querySelectorAll("[data-testid=writing-practice] button")].find(button => button.textContent.includes("Try again")).click()');
    await click("learning-sound-toggle");
    assert.equal(await evaluate('document.querySelector("[data-testid=learning-sound-toggle]").getAttribute("aria-pressed")'), "false");
    await solve("starter");
    assert.equal(await evaluate('window.__learningTones.length'), 2, "Muted answers must not create tones");
    await wait('!!document.querySelector("[data-testid=writing-complete]")');
    assert.equal(saves.length, 1);
    premium = true;
    await reloadWriting();
    assert.equal(await evaluate('document.querySelector("[data-testid=learning-sound-toggle]").getAttribute("aria-pressed")'), "false", "Mute survives reload");
    await click("learning-sound-toggle");
    await wait('!document.querySelector("[data-testid=writing-open-builder]").disabled');
    assert.equal(await evaluate('document.querySelector("[data-testid=writing-open-challenge]").disabled'), true);
    await click("writing-open-builder");
    await wait('!!document.querySelector("[data-testid=writing-input]")');
    assert.equal(await evaluate('(document.querySelector("[data-testid=writing-prompt]").textContent.match(/____/g)||[]).length'), 3);
    saveFailure = true;
    await solve("builder");
    await wait('window.__learningTones.length > 0');
    assert.deepEqual(await evaluate('window.__learningTones.slice(0, 2)'), [523.25, 783.99]);
    await wait('!!document.querySelector("[data-testid=writing-practice] [role=alert]")');
    assert.equal(await evaluate('!!document.querySelector("[data-testid=writing-complete]")'), false);
    assert.equal(saves.length, 1);
    assert.equal(await evaluate('window.__learningTones.includes(1046.5)'), false, "Failed save must not celebrate");
    saveFailure = false;
    await evaluate('document.querySelector("[data-testid=writing-practice] [role=alert]").parentElement.querySelector("button").click()');
    await wait('!!document.querySelector("[data-testid=writing-complete]")');
    await wait('window.__learningTones.includes(1046.5)');
    assert.deepEqual(await evaluate('window.__learningTones.slice(-6)'), [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]);
    assert.equal(saves.length, 2);
    await click("writing-open-challenge");
    await solve("challenge");
    await wait('!!document.querySelector("[data-testid=writing-complete]")');
    assert.equal(saves.length, 3);
    await reloadWriting();
    await wait('document.querySelector("[data-testid=writing-level-challenge]").textContent.includes("Completed")');
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 80, captureBeyondViewport: true });
    fs.writeFileSync("/tmp/writing-journey-mobile.jpg", Buffer.from(shot.data, "base64"));
    await click("btn-lang-fr");
    await wait('document.querySelector("[data-testid=writing-open-builder]")?.disabled === true');
    await click("writing-open-starter");
    await wait('document.querySelector("[data-testid=writing-input]")?.lang === "fr"');
    await click("writing-mode-category");
    await wait('!!document.querySelector("[data-testid=writing-category-greetings]")');
    await click("writing-category-journey");
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    assert.deepEqual(errors, []);
    console.log("PASS: distinct Web Audio feedback, mute/reload persistence, free/Premium locks, sequential levels, typed answers, save failure/retry, memory masking, language separation, category-to-journey navigation, mobile/desktop.");
    console.log("Fixture screenshot: /tmp/writing-journey-mobile.jpg");
  } finally {
    if (socket) socket.close();
    chrome.kill("SIGTERM");
    await delay(200);
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
