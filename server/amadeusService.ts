/**
 * Amadeus Flight Search Service
 * Uses the Amadeus Self-Service API (free tier) to search real flight offers.
 * Docs: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search
 */

const AMADEUS_BASE = "https://test.api.amadeus.com";

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  // Serve cached token if still valid (with 60s buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const key    = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;
  if (!key || !secret) throw new Error("AMADEUS_API_KEY / AMADEUS_API_SECRET not configured");

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: key,
      client_secret: secret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

export interface FlightSegment {
  departure:  { iataCode: string; at: string };
  arrival:    { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration: string;
}

export interface FlightOffer {
  id: string;
  price: { total: string; currency: string };
  itineraries: Array<{
    duration: string;
    segments: FlightSegment[];
  }>;
  numberOfBookableSeats: number;
  validatingAirlineCodes: string[];
  oneWay: boolean;
}

export interface FlightSearchParams {
  originLocationCode: string;      // IATA, e.g. "MAD"
  destinationLocationCode: string; // IATA, e.g. "DPS"
  departureDate: string;           // YYYY-MM-DD
  returnDate?: string;             // YYYY-MM-DD (optional for round-trip)
  adults: number;
  currencyCode?: string;           // default EUR
  max?: number;                    // max results, default 10
}

export async function searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
  const token = await getAccessToken();

  const qs = new URLSearchParams({
    originLocationCode:      params.originLocationCode.toUpperCase(),
    destinationLocationCode: params.destinationLocationCode.toUpperCase(),
    departureDate:           params.departureDate,
    adults:                  String(params.adults ?? 1),
    currencyCode:            params.currencyCode ?? "EUR",
    max:                     String(params.max ?? 10),
    nonStop:                 "false",
  });
  if (params.returnDate) qs.set("returnDate", params.returnDate);

  const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus flight search failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return (data.data ?? []) as FlightOffer[];
}

/** Check whether the Amadeus keys are present in the environment */
export function amadeusConfigured(): boolean {
  return !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
}
