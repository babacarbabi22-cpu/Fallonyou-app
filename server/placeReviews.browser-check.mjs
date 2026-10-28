// Fictional browser-only API fixtures. Never signs in or writes real accounts.
// Start isolated Chromium on debugging port 9222, then:
// npx tsx server/placeReviews.browser-check.mjs https://<development-domain>
import assert from "node:assert/strict";
import WebSocket from "ws";
import { writeFile } from "node:fs/promises";
import { CURRENT_TERMS_VERSION } from "../shared/terms.ts";
import { placeReviewInput, placeReviewKey } from "../shared/place-reviews.ts";
import { PLACE_REVIEW_COPY } from "../client/src/shared/place-review-copy.ts";

const base = process.argv[2];
assert(base, "Pass the development URL");
const target = await (await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.once("open", resolve));
const pending = new Map(), errors = [], forbidden = [];
let sequence = 0, language = "en", isAdmin = false, failList = false, writes = 0;
const input = { kind: "hotel", placeName: "Fictional Hotel", city: "Fictional City", country: "Fictional Country",
  rating: 4, review: "A fictional experience, never a real stay.", recommendation: "A fictional practical tip." };
const makeRow = (id, isOwner, fields = {}) => ({
  ...input, ...fields, id, placeKey: placeReviewKey({ ...input, ...fields }), authorName: "Fictional reviewer",
  isOwner, hidden: false, reportedByMe: false, createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", averageRating: 4, ratingCount: 1,
});
let reviews = [makeRow(1, true), makeRow(2, false, { kind: "place", placeName: "Fictional Museum" })];
let reports = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
ws.on("message", raw => {
  const event = JSON.parse(raw.toString());
  if (event.id) {
    const promise = pending.get(event.id); pending.delete(event.id);
    if (event.error) promise.reject(new Error(event.error.message));
    else promise.resolve(event.result);
  }
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
  if (event.method === "Fetch.requestPaused") void intercept(event.params).catch(error => errors.push(error.stack));
});
async function intercept({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  const bodyInput = request.postData ? JSON.parse(request.postData) : {};
  let body = {}, status = 200;
  if (path === "/api/user" || path === "/api/auth/user") body = {
    id: "fictional-reviewer", firstName: "Fictional", email: "fixture@example.invalid", emailVerified: "true",
    ageConfirmed: true, termsAcceptedAt: "2026-01-01T00:00:00Z", termsAcceptedVersion: CURRENT_TERMS_VERSION,
    isAdmin: isAdmin ? "true" : "false",
    profile: { id: 987, userId: "fictional-reviewer", bio: "" },
    photos: [{ id: 987, type: "image", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3C/svg%3E" }],
  };
  else if (path === "/api/notifications/preferences") {
    if (request.method === "PATCH" && bodyInput.interfaceLanguage) language = bodyInput.interfaceLanguage;
    body = { interfaceLanguage: language, messages: true, messageEmails: false };
  } else if (path === "/api/place-reviews" && request.method === "GET") {
    if (failList) { status = 503; body = { error: "unavailable" }; }
    else {
      const scope = url.searchParams.get("scope"), q = (url.searchParams.get("q") || "").toLowerCase();
      const kind = url.searchParams.get("kind");
      body = { reviews: reviews.filter(row =>
        (scope === "moderation" || (scope === "mine" ? row.isOwner : !row.hidden)) &&
        (!kind || row.kind === kind) &&
        (!q || `${row.placeName} ${row.city} ${row.country}`.toLowerCase().includes(q))
      ).sort((a, b) => b.id - a.id), nextCursor: null };
    }
  } else if (path === "/api/place-reviews" && request.method === "POST") {
    const { pastVisitConfirmed, ...fields } = placeReviewInput.parse(bodyInput);
    assert.equal(pastVisitConfirmed, true);
    writes++;
    const row = makeRow(3, true, fields); reviews.push(row); body = { id: row.id }; status = 201;
  } else if (/^\/api\/place-reviews\/\d+$/.test(path)) {
    const id = Number(path.split("/").pop()), row = reviews.find(row => row.id === id);
    assert(row?.isOwner, "Fixture must never mutate another person's review");
    writes++;
    if (request.method === "PATCH") {
      const { pastVisitConfirmed, ...fields } = placeReviewInput.parse(bodyInput);
      assert.equal(pastVisitConfirmed, true);
      Object.assign(row, fields, { updatedAt: "2026-01-02T00:00:00Z" }); body = { id };
    } else if (request.method === "DELETE") { reviews = reviews.filter(row => row.id !== id); body = { success: true }; }
    else throw new Error("Unexpected fixture review operation");
  } else if (/^\/api\/place-reviews\/\d+\/report$/.test(path) && request.method === "POST") {
    const row = reviews.find(row => row.id === Number(path.split("/")[3]));
    assert(row && !row.isOwner); row.reportedByMe = true;
    reports.push({ id: 1, reason: bodyInput.reason, details: bodyInput.details, createdAt: "2026-01-02T00:00:00Z", review: row });
    body = { success: true }; writes++;
  } else if (path === "/api/place-reviews/reports") body = { reports, nextCursor: null };
  else if (/^\/api\/place-reviews\/\d+\/moderation$/.test(path)) {
    assert(isAdmin); const row = reviews.find(row => row.id === Number(path.split("/")[3]));
    row.hidden = bodyInput.hidden; reports = reports.filter(report => report.review.id !== row.id);
    body = { success: true }; writes++;
  } else if (path === "/api/my-badges") body = [];
  else if (path === "/api/destinations") body = { destinations: [] };
  else if (request.method !== "GET" && path !== "/api/sessions/ping") {
    forbidden.push(path); status = 418;
  }
  await send("Fetch.fulfillRequest", { requestId, responseCode: status,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64") });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 120; i++) {
    if (await evaluate(`!!document.documentElement && (${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`UI did not settle: ${expression}\n${errors.join("\n")}`);
}
async function click(selector) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
async function clickText(text, selector = "button") {
  await wait(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).some(node => node.textContent.trim() === ${JSON.stringify(text)})`);
  await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(node => node.textContent.trim() === ${JSON.stringify(text)}).click()`);
}
async function fill(selector, value, textarea = false) {
  await evaluate(`{
    const node = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(${textarea ? "HTMLTextAreaElement" : "HTMLInputElement"}.prototype,"value").set.call(node,${JSON.stringify(value)});
    node.dispatchEvent(new Event("input",{bubbles:true}));
  }`);
}
async function navigate(path) {
  await send("Page.navigate", { url: `${base}${path}` });
  await wait(`!!document.querySelector('[data-testid="button-new-place-review"]')`);
  if (await evaluate(`!!document.querySelector('[data-testid="button-cookie-reject"]')`)) await click('[data-testid="button-cookie-reject"]');
}
try {
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await navigate("/place-reviews?ui_lang=en");
  await wait(`!!document.querySelector('[data-testid="place-review-2"]')`);
  assert.equal(await evaluate(`!!document.querySelector('[data-testid="edit-place-review-2"]')`), false);
  for (const locale of ["es", "fr", "sv", "en"]) {
    await evaluate(`document.querySelector('[data-testid="button-language-selector"]').dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"mouse",button:0,ctrlKey:false}))`);
    await click(`[data-testid="menu-item-language-${locale}"]`);
    await wait(`document.documentElement.lang === ${JSON.stringify(locale)} && !document.querySelector('[role="menu"]')`);
    assert(await evaluate(`document.querySelector('h1').textContent === ${JSON.stringify(PLACE_REVIEW_COPY[locale].title)}`));
  }
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  const phone = await send("Page.captureScreenshot", { format: "png" });
  await writeFile("/tmp/place-reviews-phone.png", Buffer.from(phone.data, "base64"));
  await click('[data-testid="button-new-place-review"]');
  await fill('[data-testid="review-place-name"]', "New Fictional Hotel");
  await fill('[data-testid="review-city"]', "Other fictional city");
  await fill('[data-testid="review-country"]', "Fictional country");
  await fill('[data-testid="review-text"]', "A useful fictional past experience.", true);
  await fill('[data-testid="review-recommendation"]', "A fictional practical recommendation.", true);
  await click('[role="radio"][aria-label="4 / 5"]');
  await click('[data-testid="submit-place-review"]');
  await wait(`document.body.innerText.includes(${JSON.stringify(PLACE_REVIEW_COPY.en.pastVisitRequired)})`);
  assert.equal(writes, 0);
  await click("#past-visit-confirmation");
  await click('[data-testid="submit-place-review"]');
  await wait(`!document.querySelector('[data-testid="place-review-form"]') && !!document.querySelector('[data-testid="place-review-3"]')`);
  await click('[data-testid="edit-place-review-3"]');
  await wait(`!!document.querySelector('[data-testid="place-review-form"]')`);
  assert.equal(await evaluate(`document.querySelector("#past-visit-confirmation").getAttribute("data-state")`), "unchecked");
  await fill('[data-testid="review-text"]', "Edited fictional experience, still about a past visit.", true);
  await click("#past-visit-confirmation");
  await click('[data-testid="submit-place-review"]');
  await wait(`document.querySelector('[data-testid="place-review-3"]')?.innerText.includes("Edited fictional")`);
  await click('[data-testid="delete-place-review-3"]');
  assert(reviews.some(row => row.id === 3), "Delete must require confirmation");
  await clickText(PLACE_REVIEW_COPY.en.confirmDelete, '[role="dialog"] button');
  await wait(`!document.querySelector('[data-testid="place-review-3"]') && !document.querySelector('[role="dialog"]')`);
  await click('[data-testid="report-place-review-2"]');
  await clickText(PLACE_REVIEW_COPY.en.submitReport, '[role="dialog"] button');
  await wait(`document.querySelector('[data-testid="report-place-review-2"]')?.disabled === true`);
  await click('[data-testid="reviews-scope-mine"]');
  await wait(`!!document.querySelector('[data-testid="place-review-1"]') && !document.querySelector('[data-testid="place-review-2"]')`);
  console.log("PASS: member review create/edit/delete, visit confirmation, report and mine view");
  isAdmin = true;
  await navigate("/place-reviews?ui_lang=en");
  await click('[data-testid="reviews-scope-mine"]');
  await wait(`!document.querySelector('[data-testid="place-review-2"]')`);
  await click('[data-testid="reviews-reports"]');
  await wait(`document.body.innerText.includes("Fictional Museum") && document.body.innerText.includes(${JSON.stringify(PLACE_REVIEW_COPY.en[`${reports[0].reason}Reason`])})`);
  await clickText(PLACE_REVIEW_COPY.en.hide);
  await wait(`document.body.innerText.includes(${JSON.stringify(PLACE_REVIEW_COPY.en.noReports)})`);
  await click('[data-testid="reviews-moderation"]');
  await wait(`document.querySelector('[data-testid="place-review-2"]')?.innerText.includes(${JSON.stringify(PLACE_REVIEW_COPY.en.restore)})`);
  await click('[data-testid="moderate-place-review-2"]');
  await wait(`document.querySelector('[data-testid="place-review-2"]')?.innerText.includes(${JSON.stringify(PLACE_REVIEW_COPY.en.hide)})`);
  await click('[data-testid="reviews-scope-community"]');
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await wait(`!!document.querySelector('[data-testid="place-review-2"]')`);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  const desktop = await send("Page.captureScreenshot", { format: "png" });
  await writeFile("/tmp/place-reviews-desktop.png", Buffer.from(desktop.data, "base64"));
  // Intentional GET failure must show an error, not a fabricated empty feed.
  failList = true;
  await navigate("/place-reviews?ui_lang=en");
  await wait(`document.body.innerText.includes(${JSON.stringify(PLACE_REVIEW_COPY.en.errorTitle)})`);
  failList = false;
  await clickText(PLACE_REVIEW_COPY.en.retry);
  await wait(`!!document.querySelector('[data-testid="place-review-2"]')`);
  assert.deepEqual(forbidden, []);
  assert.deepEqual(errors, []);
  console.log("PASS: admin mine view, reports, hide/restore, four languages, mobile/desktop layout, failed-load recovery");
} finally {
  ws.close();
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
}
