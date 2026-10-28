// Every /api request is intercepted; no real account, session or email is created.
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
const assert = require("node:assert/strict");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "account-auth-fixture-"));
  const browser = spawn("/repl/tools/bin/chromium", ["--headless", "--no-sandbox", "--disable-gpu",
    "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"], { stdio: "ignore", detached: true });
  let ws, sid, seq = 0, evaluate, authenticated = false, mode = "credentials";
  const pending = new Map(), writes = [], errors = [];
  const user = { id: "fictional-account", email: "fixture@example.invalid", firstName: "Fixture", lastName: "",
    ageConfirmed: true, isBanned: "false", isAdmin: "false",
    termsAcceptedAt: "2026-10-03T00:00:00Z", termsAcceptedVersion: "2026-10-content-license",
    photos: [], profile: { bio: "Fictional browser fixture", age: 30 } };
  const call = (method, params = {}, sessionId = sid) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  try {
    let endpoint;
    for (let i = 0; i < 100; i++) {
      try { endpoint = (await fs.readFile(path.join(dir, "DevToolsActivePort"), "utf8")).trim().split("\n"); break; }
      catch { await sleep(100); }
    }
    assert.ok(endpoint);
    ws = new WebSocket(`ws://127.0.0.1:${endpoint[0]}${endpoint[1]}`);
    await new Promise(resolve => ws.once("open", resolve));
    const fulfill = async event => {
      const route = new URL(event.request.url).pathname;
      let status = 200, body = {}, type = "application/json";
      if (route === "/api/login" || route === "/api/register") {
        const payload = JSON.parse(event.request.postData);
        writes.push({ route, payload });
        await sleep(250);
        if (mode === "credentials") { status = 401; body = { error: "Private unlocalized error" }; }
        else if (mode === "duplicate") { status = 400; body = { error: "Email already registered" }; }
        else if (mode === "limited") { status = 429; body = { error: "Private rate-limit text" }; }
        else if (mode === "unavailable") { status = 503; body = { error: "Private infrastructure text" }; }
        else if (mode === "html") { type = "text/html"; body = "<html>Fictional gateway</html>"; }
        else if (mode === "false-success") body = { success: false };
        else { authenticated = true; body = route === "/api/login" ? user : { success: true, user: { id: user.id, email: user.email } }; }
      } else if (route === "/api/user") {
        status = authenticated ? 200 : 401; body = authenticated ? user : { error: "Not authenticated" };
      } else if (route === "/api/notifications/preferences") {
        body = { interfaceLanguage: "en", messages: false, profileViews: false };
      } else if (route === "/api/matches" || route === "/api/matches/requests" ||
        route === "/api/stories" || route === "/api/album" || route.startsWith("/api/events") ||
        route === "/api/users" || route === "/api/users/with-photos" || route === "/api/notifications") body = [];
      else if (route === "/api/notifications/unread-count") body = { count: 0 };
      else if (route === "/api/premium/status") body = { isPremium: false };
      await call("Fetch.fulfillRequest", { requestId: event.requestId, responseCode: status,
        responseHeaders: [{ name: "Content-Type", value: type }],
        body: Buffer.from(typeof body === "string" ? body : JSON.stringify(body)).toString("base64") });
    };
    ws.on("message", bytes => {
      const message = JSON.parse(bytes);
      if (message.id) {
        const task = pending.get(message.id);
        if (task) { pending.delete(message.id); message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result); }
      } else if (message.method === "Fetch.requestPaused") fulfill(message.params).catch(error => errors.push(error.message));
      else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        const text = message.params.args.map(argument => argument.value || argument.description || "").join(" ");
        // Chromium reports expected synthetic HTTP errors to the console.
        if (!/^Failed to load resource: the server responded with a status of (400|401|429|503)/.test(text)) errors.push(text);
      }
    });
    sid = (await call("Target.attachToTarget", {
      targetId: (await call("Target.createTarget", { url: "about:blank" })).targetId, flatten: true,
    })).sessionId;
    await call("Page.enable"); await call("Runtime.enable"); await call("Network.enable");
    await call("Network.setBypassServiceWorker", { bypass: true });
    await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
    await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await call("Page.addScriptToEvaluateOnNewDocument", { source: `Object.defineProperty(navigator,"language",{value:"es-ES"});
      if(location.search.includes("fresh=1"))localStorage.clear();
      (() => {
        const Native = window.WebSocket;
        class FictionalSocket extends EventTarget {
          readyState=0; bufferedAmount=0; onopen=null; onmessage=null; onclose=null;
          constructor() { super(); setTimeout(() => {
            if(this.readyState!==0)return;
            this.readyState=1; const event=new Event("open"); this.dispatchEvent(event); this.onopen?.(event);
          },50); }
          send() {}
          close() { this.readyState=3; const event=new Event("close"); this.dispatchEvent(event); this.onclose?.(event); }
        }
        window.WebSocket=class extends Native {
          constructor(url,protocols) { if(String(url).includes("/ws/chat"))return new FictionalSocket(); super(url,protocols); }
        };
      })();` });
    evaluate = async expression => {
      const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const wait = async (expression, label) => {
      for (let i = 0; i < 180; i++) {
        try { if (await evaluate(expression)) return; }
        catch (error) { if (!/context|navigated/i.test(error.message)) throw error; }
        await sleep(100);
      }
      throw new Error(`Missing ${label}`);
    };
    const click = async id => { await evaluate(`document.querySelector('[data-testid=${id}]').click()`); await sleep(100); };
    const fill = async (id, value) => {
      await evaluate(`(()=>{const el=document.querySelector('[data-testid=${id}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event("input",{bubbles:true}));})()`);
    };
    const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const navigate = async query => {
      const result = await call("Page.navigate", { url: `${base}/auth${query || ""}` });
      if (result.errorText) throw new Error(result.errorText);
      await wait('!!document.querySelector("[data-testid=input-email]")', "auth form");
    };
    await navigate("?fresh=1");
    assert.equal(await evaluate("document.documentElement.lang"), "en", "Spanish device must not override English first entry");
    await fill("input-email", "fixture@example.invalid"); await fill("input-password", "Fictional123");
    mode = "false-success";
    await click("button-submit"); await sleep(900);
    assert.equal(await evaluate("location.pathname"), "/auth", "HTTP 200 success:false must not claim an authenticated session");
    assert.ok(await evaluate('document.body.innerText.includes("We couldn\'t complete your request.")'));
    if (process.argv.includes("--probe")) return;
    for (const failure of ["credentials", "limited", "unavailable", "html"]) {
      mode = failure;
      await click("button-submit");
      await wait('!document.querySelector("[data-testid=button-submit]")?.disabled', `${failure} retry completed`);
      assert.equal(await evaluate("location.pathname"), "/auth");
      assert.equal(await evaluate('document.querySelector("[data-testid=input-email]").value'), "fixture@example.invalid");
      assert.equal(await evaluate('document.body.innerText.includes("Private ")'), false);
    }
    await click("button-register-tab");
    await fill("input-first-name", "Fixture");
    const beforeConsent = writes.length;
    await click("button-submit"); await sleep(200);
    assert.equal(writes.length, beforeConsent, "missing consent never reaches registration API");
    await click("label-age-confirm");
    await fill("input-password", "é".repeat(37));
    const beforeLongPassword = writes.length;
    await click("button-submit"); await sleep(150);
    assert.equal(writes.length, beforeLongPassword, "oversized Unicode password is rejected before registration");
    assert.equal(await evaluate('document.querySelector("[data-testid=input-password]").value'), "é".repeat(37));
    await fill("input-password", "Fictional123");
    mode = "duplicate";
    await click("button-submit");
    await wait('!document.querySelector("[data-testid=button-submit]").disabled', "duplicate response");
    assert.equal(await evaluate("location.pathname"), "/auth");
    const signup = writes.at(-1).payload;
    assert.equal(signup.language, "en"); assert.equal(signup.ageConfirmed, true);
    assert.equal(signup.contentLicenseAccepted, true); assert.ok(signup.termsVersion);
    mode = "false-success";
    await click("button-submit");
    await wait('!document.querySelector("[data-testid=button-submit]").disabled', "negative registration success");
    assert.equal(await evaluate("location.pathname"), "/auth");
    for (const locale of ["es", "fr", "sv"]) {
      await evaluate(`localStorage.setItem("fallonyou_language",${JSON.stringify(locale)})`);
      await navigate();
      await wait(`document.documentElement.lang===${JSON.stringify(locale)}`, `${locale} locale`);
      await fill("input-email", "fixture@example.invalid"); await fill("input-password", "Fictional123");
      mode = "credentials"; await click("button-submit");
      await wait('!document.querySelector("[data-testid=button-submit]").disabled', `${locale} error`);
      assert.equal(writes.at(-1).payload.language, locale);
      assert.equal(await evaluate("location.pathname"), "/auth");
      const credentialsText = { es: "Email o contraseña incorrectos.", fr: "Adresse e-mail ou mot de passe incorrect.", sv: "Fel e-postadress eller lösenord." }[locale];
      assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(credentialsText)})`), `${locale} error copy`);
      await click("button-register-tab");
      await fill("input-first-name", "Fixture");
      await click("label-age-confirm");
      mode = "duplicate"; await click("button-submit");
      await wait('!document.querySelector("[data-testid=button-submit]").disabled', `${locale} signup`);
      assert.equal(writes.at(-1).route, "/api/register");
      assert.equal(writes.at(-1).payload.language, locale);
    }
    await evaluate('localStorage.setItem("fallonyou_language","en")');
    await navigate();
    await fill("input-email", "fixture@example.invalid"); await fill("input-password", "Fictional123");
    mode = "success"; await click("button-submit");
    await wait('location.pathname==="/"', "successful login");
    await call("Page.reload");
    await wait('location.pathname==="/" && document.readyState==="complete"', "fixture session survives reload");
    assert.equal(authenticated, true);
    authenticated = false;
    await navigate("?fresh=1");
    await click("button-register-tab");
    await fill("input-first-name", "Fixture");
    await fill("input-email", "fixture@example.invalid"); await fill("input-password", "Fictional123");
    await click("label-age-confirm"); await click("button-submit");
    await wait('location.pathname==="/"', "successful registration");
    assert.equal(writes.at(-1).route, "/api/register");
    assert.deepEqual(errors, []);
    console.log("PASS isolated auth UI: English first entry on Spanish device; four locale payloads; consent gating; failures/false success remain on form; values retained; successful login and simulated session reload. No real API writes.");
  } catch (error) {
    console.error(error.message);
    if (evaluate) console.error("Fixture DOM:", (await evaluate("document.body.innerText").catch(() => "")).slice(0,1500));
    console.error("Fixture errors:", errors);
    process.exitCode = 1;
  } finally {
    ws?.close();
    try { process.kill(-browser.pid, "SIGKILL"); } catch { browser.kill("SIGKILL"); }
    await sleep(200);
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  }
}
main();
