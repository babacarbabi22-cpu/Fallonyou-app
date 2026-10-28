/**
 * RateHawk / ETG (Emerging Travel Group) B2B Hotel API
 * Docs: https://docs.emergingtravel.com
 * Auth: HTTP Basic — base64(keyId:apiKey)
 * Base: https://api.worldota.net/api/b2b/v3
 */

const BASE_URL = "https://api.worldota.net/api/b2b/v3";

// ── Destination → RateHawk region_id mapping ─────────────────────────────────
// These are ETG region IDs for each city (lookup via /static/regions endpoint)
export const IATA_TO_REGION: Record<string, number> = {
  DPS: 900,      // Bali
  BKK: 1076,     // Bangkok
  TYO: 2729,     // Tokyo
  JED: 5765,     // Jeddah (La Meca zone)
  DKR: 4124,     // Dakar
  RAK: 3527,     // Marrakech
  ZNZ: 6312,     // Zanzibar
  CAI: 1298,     // El Cairo
  NBO: 2984,     // Nairobi
  JFK: 2685,     // Nueva York
  MLE: 2843,     // Maldivas
  LIS: 2567,     // Lisboa
  CUN: 1467,     // Cancún
};

export interface HotelSearchParams {
  iataCode: string;
  checkin: string;   // YYYY-MM-DD
  checkout: string;  // YYYY-MM-DD
  adults: number;
  currency?: string;
  language?: string;
}

export interface HotelRate {
  match_hash: string;
  daily_prices: number[];
  meal: string;
  payment_options: {
    payment_types: { amount: string; show_amount: string; currency_code: string; is_need_credit_card: boolean; type: string; }[];
  };
  room_name: string;
  rooms_count: number;
}

export interface HotelResult {
  id: string;
  name: string;
  star_rating: number;
  address?: string;
  images?: string[];
  rates: HotelRate[];
  cheapestRate: number;   // EUR, already with your markup
  currency: string;
}

// ── Markup: % added on top of wholesale price before showing to client ────────
const MARKUP_PERCENT = 20;

function applyMarkup(price: number) {
  return Math.ceil(price * (1 + MARKUP_PERCENT / 100));
}

function authHeader() {
  const keyId = process.env.RATEHAWK_KEY_ID;
  const apiKey = process.env.RATEHAWK_API_KEY;
  if (!keyId || !apiKey) throw new Error("RateHawk credentials not configured");
  return "Basic " + Buffer.from(`${keyId}:${apiKey}`).toString("base64");
}

export function ratehawkConfigured(): boolean {
  return !!(process.env.RATEHAWK_KEY_ID && process.env.RATEHAWK_API_KEY);
}

/**
 * Search hotels for a destination.
 * Returns up to `limit` hotels sorted by price (cheapest first).
 */
export async function searchHotels(
  params: HotelSearchParams,
  limit = 6
): Promise<HotelResult[]> {
  const regionId = IATA_TO_REGION[params.iataCode.toUpperCase()];
  if (!regionId) throw new Error(`No region mapping for IATA code: ${params.iataCode}`);

  const body = {
    checkin: params.checkin,
    checkout: params.checkout,
    language: params.language ?? "es",
    guests: [{ adults: params.adults, children: [] }],
    region_id: regionId,
    currency: params.currency ?? "EUR",
    residency: "es",
  };

  const res = await fetch(`${BASE_URL}/search/serp/region/`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RateHawk hotel search failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (data.status !== "ok" || !data.data?.hotels) {
    throw new Error(`RateHawk returned error: ${JSON.stringify(data.error ?? data)}`);
  }

  const hotels: HotelResult[] = (data.data.hotels as any[])
    .filter((h: any) => h.rates?.length > 0)
    .map((h: any) => {
      const cheapestRaw = Math.min(
        ...h.rates.map((r: any) =>
          parseFloat(r.payment_options?.payment_types?.[0]?.show_amount ?? "99999")
        )
      );
      return {
        id: h.id,
        name: h.name,
        star_rating: h.star_rating ?? 0,
        address: h.address,
        images: h.images?.slice(0, 3) ?? [],
        rates: h.rates.slice(0, 2),
        cheapestRate: applyMarkup(cheapestRaw),
        currency: params.currency ?? "EUR",
      };
    })
    .sort((a, b) => a.cheapestRate - b.cheapestRate)
    .slice(0, limit);

  return hotels;
}
