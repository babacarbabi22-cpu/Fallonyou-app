import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeEmailHtml } from "./emailText";

test("untrusted email content cannot inject tags or attribute boundaries", () => {
  assert.equal(escapeEmailHtml('<img src="https://example.invalid/x" onerror="alert(1)">'),
    "&lt;img src=&quot;https://example.invalid/x&quot; onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeEmailHtml("A&B's"), "A&amp;B&#39;s");
});

test("ordinary international names and empty optional values remain usable", () => {
  assert.equal(escapeEmailHtml("María Åsa"), "María Åsa");
  assert.equal(escapeEmailHtml(undefined), "");
  assert.equal(escapeEmailHtml(null), "");
});