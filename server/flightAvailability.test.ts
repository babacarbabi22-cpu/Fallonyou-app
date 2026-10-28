import assert from "node:assert/strict";
import { test } from "node:test";
import { flightSearchEnabled } from "../shared/travel-availability";
import { duffelConfigured, searchFlights } from "./duffelService";

test("flight search fails closed without contacting the supplier", async () => {
  assert.equal(flightSearchEnabled, false);
  assert.equal(duffelConfigured(), false);
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("Unexpected supplier request"); };
  try {
    await assert.rejects(searchFlights({
      origin: "MAD", destination: "DPS", departureDate: "2030-01-01", adults: 1,
    }), /flight_search_unavailable/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
