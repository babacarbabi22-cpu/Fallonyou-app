// Intercept every API call: no real accounts, events or services are touched.
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const WebSocket = require("ws");
const sharp = require("sharp");
const QRCode = require("qrcode");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const url = "https://fallonyou.app";
async function main() {
  assert(process.env.REPLIT_DEV_DOMAIN, "Start the preview first.");
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "invite-qr-browser-"));
  const browser = spawn("/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  let ws, scriptId;
  const errors = [], requests = [];
  try {
    let endpoint;
    for (let attempt = 0; attempt < 80; attempt++) {
      try { endpoint = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split("\n"); break; }
      catch { await sleep(100); }
    }
    assert(endpoint, "Chromium did not start");
    const target = await fetch(`http://127.0.0.1:${endpoint[0]}/json/new?about:blank`, { method: "PUT" }).then(response => response.json());
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    let sequence = 0;
    const pending = new Map();
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.on("message", raw => {
      const message = JSON.parse(raw);
      if (message.id) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (request) message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
      } else if (message.method === "Runtime.exceptionThrown") {
        errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      } else if (message.method === "Fetch.requestPaused") {
        const event = message.params, pathname = new URL(event.request.url).pathname;
        requests.push({ pathname, method: event.request.method });
        let body = [];
        if (pathname === "/api/user") body = {
          id: "fixture-invite-qr", firstName: "Fictional", ageConfirmed: true,
          termsAcceptedAt: "2026-10-10T12:00:00Z", isPremium: "false",
          profile: { userId: "fixture-invite-qr", displayName: "Fictional traveler", currentCity: "Stockholm", speaksLanguages: [], learningLanguages: [] },
        };
        else if (pathname === "/api/premium/status") body = { isPremium: false };
        else if (pathname.includes("unread-count")) body = { count: 0 };
        else if (pathname === "/api/notifications/preferences") body = { interfaceLanguage: "en" };
        else if (pathname === "/api/notifications/push/status") body = { subscribed: false };
        else if (pathname.replace(/\/$/, "") === "/api/events") body = [{
          id: 123, title: "Fictional QR test activity", description: "Browser fixture only",
          category: "social", city: "Stockholm", country: "Sweden",
          startsAt: new Date(Date.now() + 86400000).toISOString(), creatorId: "fixture-invite-qr",
          creator: null, participantCount: 0, participants: [], imageUrl: null,
          isOpportunity: false, isJoined: false,
        }];
        call("Fetch.fulfillRequest", {
          requestId: event.requestId, responseCode: 200,
          responseHeaders: [{ name: "content-type", value: "application/json" }],
          body: Buffer.from(JSON.stringify(body)).toString("base64"),
        }).catch(error => errors.push(error.message));
      }
    });
    const evaluate = async expression => {
      const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async expression => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(expression)) return;
        await sleep(100);
      }
      throw new Error(`Browser timeout: ${expression}; ${await evaluate("document.body.innerText.slice(-1500)")}`);
    };
    const click = async id => {
      const selector = JSON.stringify(`[data-testid="${id}"]`);
      await wait(`!!document.querySelector(${selector})`);
      await evaluate(`document.querySelector(${selector}).click()`);
      await sleep(150);
    };
    await call("Page.enable"); await call("Runtime.enable");
    await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
    await call("Emulation.setDeviceMetricsOverride", { width: 375, height: 667, deviceScaleFactor: 1, mobile: true });
    const labels = { en: "Show QR code", es: "Mostrar código QR", fr: "Afficher le code QR", sv: "Visa QR-kod" };
    for (const [locale, label] of Object.entries(labels)) {
      if (scriptId) await call("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptId });
      scriptId = (await call("Page.addScriptToEvaluateOnNewDocument", { source: `
        localStorage.setItem("fallonyou_language", "${locale}");
        localStorage.setItem("fallonyou_tour_completed", "true");
        localStorage.setItem("fallonyou_notif_banner_dismissed", "true");
        localStorage.setItem("fallonyou_cookie_consent", "accepted");
        localStorage.removeItem("fallonyou_invite_dismissed");
        window.__copies = []; window.__shares = []; window.__copyFails = false;
        Object.defineProperty(navigator, "share", { configurable: true, value: async data => {
          window.__shares.push(data); if(window.__shareAbort) throw new DOMException("Cancelled", "AbortError");
        }});
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: {writeText: async text => {
          if(window.__copyFails) throw new Error("Fictional copy failure"); window.__copies.push(text);
        }}});
        document.execCommand = () => false;
      ` })).identifier;
      await call("Page.navigate", { url: `https://${process.env.REPLIT_DEV_DOMAIN}/events?fixtureLocale=${locale}` });
      await sleep(800);
      await wait(`document.querySelector("[data-testid=button-show-invite-qr]")?.textContent.includes(${JSON.stringify(label)})`);
      await evaluate('document.querySelector("[data-testid=button-cookie-reject]")?.click()');
      if (locale === "en") await evaluate('window.__originalCanvas = HTMLCanvasElement.prototype.toDataURL; HTMLCanvasElement.prototype.toDataURL = () => {throw new Error("Fictional QR generation failure")}');
      await click("button-show-invite-qr");
      if (locale === "en") {
        await wait('!!document.querySelector("[data-testid=dialog-invite-qr] [role=alert]")');
        await evaluate('HTMLCanvasElement.prototype.toDataURL = window.__originalCanvas; document.querySelector("[data-testid=dialog-invite-qr] [role=alert] button").click()');
      }
      await wait('document.querySelector("[data-testid=image-invite-qr]")?.naturalWidth === 320');
      const png = await evaluate('document.querySelector("[data-testid=image-invite-qr]").src');
      const expected = await QRCode.toBuffer(url, { errorCorrectionLevel: "H", margin: 4, width: 320, color: { dark: "#000000", light: "#ffffff" } });
      const [actualPixels, expectedPixels] = await Promise.all([
        sharp(Buffer.from(png.split(",")[1], "base64")).ensureAlpha().raw().toBuffer(),
        sharp(expected).ensureAlpha().raw().toBuffer(),
      ]);
      assert(actualPixels.equals(expectedPixels), "Rendered QR pixels must encode only the canonical public landing URL");
      assert.equal(await evaluate("window.__shares.length"), 0);
      assert.equal(await evaluate('localStorage.getItem("fallonyou_invite_dismissed")'), null);
      assert(await evaluate('(()=>{const r=document.querySelector("[data-testid=dialog-invite-qr]").getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})()'), "QR dialog must fit a small iPhone viewport");
      await click("button-copy-invite-link");
      await wait('!!document.querySelector("[data-testid=dialog-invite-qr] [role=status]")');
      assert.deepEqual(await evaluate("window.__copies"), [url]);
      if (locale === "en") {
        const capture = await call("Page.captureScreenshot", { format: "jpeg", quality: 85 });
        await fs.writeFile("/tmp/invite-qr-iphone.jpg", Buffer.from(capture.data, "base64"));
        await evaluate("window.__copyFails = true");
        await click("button-copy-invite-link");
        await wait('!!document.querySelector("[data-testid=dialog-invite-qr] [role=alert]")');
      }
      await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await wait('!document.querySelector("[data-testid=dialog-invite-qr]")');
      await click("button-share-invite");
      assert.equal((await evaluate("window.__shares"))[0].url, url);
      await evaluate("window.__shareAbort = true");
      await click("button-share-invite");
      assert.equal((await evaluate("window.__copies")).length, 1, "Share cancellation must not copy or dismiss");
    }
    await click("button-dismiss-invite-text");
    await wait('!document.querySelector("[data-testid=card-invite-friends]")');
    assert.equal(await evaluate('localStorage.getItem("fallonyou_invite_dismissed")'), "true");
    assert.deepEqual(errors, []);
    console.log("PASS: four locales, canonical QR pixels, small-phone layout, copy success/failure, QR retry, native share/cancel, dismiss. Screenshot: /tmp/invite-qr-iphone.jpg");
    await call("Browser.close").catch(() => {});
  } finally {
    ws?.close();
    if (browser.exitCode === null && browser.signalCode === null) {
      const exited = new Promise(resolve => browser.once("exit", resolve));
      browser.kill("SIGTERM"); await exited;
    }
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
