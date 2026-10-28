import test from "node:test";
import assert from "node:assert/strict";
import { createConnectionSummaryHandler } from "./connectionSummary";

const summary = { totalConnections: 3, cities: ["Stockholm"], origins: ["Barcelona"], hasMoreCities: false, hasMoreOrigins: false };
function response() {
  return {
    statusCode: 200, body: undefined as unknown, headers: {} as Record<string, string>,
    setHeader(key: string, value: string) { this.headers[key] = value; },
    vary(value: string) { this.headers.Vary = value; },
    status(code: number) { this.statusCode = code; return this; },
    sendStatus(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

test("connection summary requires authentication before reading anything", async () => {
  let reads = 0;
  const handler = createConnectionSummaryHandler(async () => { reads++; return summary; });
  const res = response();
  await handler({ isAuthenticated: () => false } as any, res as any, () => {});
  assert.equal(res.statusCode, 401);
  assert.equal(reads, 0);
});

test("summary is private, server-session-owned and allowlisted", async () => {
  const readers: string[] = [];
  const handler = createConnectionSummaryHandler(async id => {
    readers.push(id);
    return { ...summary, userIds: ["fictional-private-id"] };
  });
  const res = response();
  await handler({
    isAuthenticated: () => true, user: { id: "fictional-viewer" },
    query: { userId: "fictional-other" }, body: { userId: "fictional-other" },
  } as any, res as any, () => {});
  assert.deepEqual(readers, ["fictional-viewer"]);
  assert.deepEqual(res.body, summary);
  assert.equal(res.headers["Cache-Control"], "private, no-store");
  assert.equal(res.headers.Vary, "Cookie");
});

test("a failed dependency is unavailable, never a fabricated zero count", async () => {
  const handler = createConnectionSummaryHandler(async () => { throw new Error("Fictional database failure"); });
  const res = response();
  await handler({ isAuthenticated: () => true, user: { id: "fictional-viewer" } } as any, res as any, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal((res.body as any).totalConnections, undefined);
});
