// Isolated browser fixtures only: no real login, registration, email or DB writes.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");

async function main() {
  const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "entry-language-fixture-"));
  const browser = spawn("/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let ws;
  try {
    const socket = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(new Error("Browser startup timeout")), 15000);
      browser.stderr.on("data", data => {
        output += data;
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      browser.once("error", reject);
    });
    const pages = await (await fetch(`http://127.0.0.1:${new URL(socket).port}/json/list`)).json();
    ws = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    let id = 0;
    const pending = new Map(), errors = [], mutations = [];
    function command(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        ws.send(JSON.stringify({ id: requestId, method, params }));
      });
    }
    ws.on("message", async raw => {
      const message = JSON.parse(raw.toString());
      if (message.id) {
        const task = pending.get(message.id);
        pending.delete(message.id);
        if (task) message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
      } else if (message.method === "Runtime.exceptionThrown") {
        errors.push(message.params.exceptionDetails.text);
      } else if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const pathname = new URL(request.url).pathname;
        const isMutation = !["GET", "HEAD"].includes(request.method);
        if (isMutation) mutations.push(`${request.method} ${pathname}`);
        // Even unexpected writes are fulfilled here, never forwarded to the app.
        await command("Fetch.fulfillRequest", {
          requestId, responseCode: pathname === "/api/user" ? 401 : isMutation ? 400 : 200,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }],
          body: Buffer.from(JSON.stringify(isMutation
            ? { error: "ERROR_FICTICIO_EN_ESPAÑOL" } : pathname === "/api/user" ? {} : [])).toString("base64"),
        });
      }
    });
    async function evaluate(expression) {
      const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }
    async function waitFor(expression) {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error(`Timed out: ${expression}`);
    }
    async function tap(selector) {
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);
      // Menu entry animations and focus scrolling must settle before pointer coordinates.
      await new Promise(resolve => setTimeout(resolve, 250));
      const point = await evaluate(`(() => {
        const element=document.querySelector(${JSON.stringify(selector)});
        const r=element.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
        return {x,y,hit:element.contains(document.elementFromPoint(x,y))};
      })()`);
      assert.equal(point.hit, true, `pointer target must be visible: ${selector}`);
      for (const type of ["mousePressed", "mouseReleased"]) {
        await command("Input.dispatchMouseEvent", { type, button: "left", clickCount: 1, x: point.x, y: point.y });
      }
    }
    await command("Page.enable");
    await command("Runtime.enable");
    await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await command("Fetch.enable", { patterns: [{ urlPattern: `${origin}/api/*` }] });
    for (const scenario of [
      { browser: "es-ES", saved: null, expected: "en" },
      { browser: "fr-FR", saved: null, expected: "en" },
      { browser: "sv-SE", saved: null, expected: "en" },
      { browser: "es-ES", saved: "es", expected: "es" },
      { browser: "es-ES", saved: "fr", expected: "fr" },
      { browser: "es-ES", saved: "sv", expected: "sv" },
      { browser: "es-ES", saved: "invalid", expected: "en" },
    ]) {
      await command("Storage.clearDataForOrigin", { origin, storageTypes: "local_storage" });
      const init = await command("Page.addScriptToEvaluateOnNewDocument", {
        source: `Object.defineProperty(navigator, 'language', {get:()=>${JSON.stringify(scenario.browser)}}); ${
          scenario.saved === null ? "" : `localStorage.setItem('fallonyou_language', ${JSON.stringify(scenario.saved)});`
        }`,
      });
      const oldDocument = await evaluate("performance.timeOrigin");
      await command("Page.navigate", { url: `${origin}/auth` });
      await waitFor(`performance.timeOrigin !== ${oldDocument}`);
      await waitFor(`!!document.querySelector('[data-testid="button-register-tab"]')`);
      assert.equal(await evaluate("navigator.language"), scenario.browser);
      assert.equal(await evaluate("document.documentElement.lang"), scenario.expected);
      await evaluate(`document.querySelector('[data-testid="button-register-tab"]').click()`);
      await waitFor(`!!document.querySelector('[data-testid="input-first-name"]')`);
      const registerButton = await evaluate(`document.querySelector('[data-testid="button-submit"]').textContent.trim()`);
      assert.equal(registerButton, { en: "Sign Up", es: "Registrarse", fr: "S'inscrire", sv: "Registrera dig" }[scenario.expected]);
      await evaluate(`document.querySelector('[data-testid="button-toggle-legal"]').click()`);
      if (scenario.expected === "en") {
        const text = await evaluate("document.body.textContent");
        for (const spanish of ["Depende de ti", "Ver condiciones de uso", "Compromisos al crear tu cuenta", "Solo tus propias fotos"]) {
          assert.ok(!text.includes(spanish), `unexpected Spanish signup copy: ${spanish}`);
        }
        assert.ok(!(await evaluate(`document.querySelector('[data-testid="input-first-name"]').placeholder`)).includes("Tu nombre"));
      }
      await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: init.identifier });
      // Explicitly choose another language through the actual selector, then reload.
      await tap('[data-testid="button-language-selector"]');
      await waitFor(`!!document.querySelector('[data-testid="menu-item-language-fr"]')`);
      await tap('[data-testid="menu-item-language-fr"]');
      await waitFor(`document.documentElement.lang === 'fr'`);
      assert.equal(await evaluate("localStorage.getItem('fallonyou_language')"), "fr");
      const beforeReload = await evaluate("performance.timeOrigin");
      await command("Page.reload");
      await waitFor(`performance.timeOrigin !== ${beforeReload}`);
      await waitFor(`document.documentElement.lang === 'fr' && !!document.querySelector('[data-testid="button-register-tab"]')`);
      console.log(`PASS browser=${scenario.browser}, saved=${scenario.saved}: signup=${scenario.expected}, manual French survives reload`);
    }
    assert.deepEqual(mutations, [], "do not create accounts or send emails during these checks");
    assert.deepEqual(errors, [], "no browser runtime exceptions");
  } finally {
    ws?.close();
    browser.kill("SIGTERM");
    await fs.rm(profile, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });