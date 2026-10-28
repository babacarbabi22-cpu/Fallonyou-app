/**
 * Duffel Flight Search Service
 *
 * Searches flight offers without exposing the Duffel token to the browser.
 * Duffel's offer response is normalized to the shape already used by the
 * Trips page.
 */

import { flightSearchEnabled } from "@shared/travel-availability";

const DUFFEL_BASE = "https://api.duffel.com";

export interface FlightSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
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
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  max?: number;
}

interface DuffelSegment {
  departing_at?: string;
  arriving_at?: string;
  duration?: string;
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  marketing_carrier?: { iata_code?: string };
  operating_carrier?: { iata_code?: string };
  marketing_carrier_flight_number?: string;
}

interface DuffelSlice {
  duration?: string;
  segments?: DuffelSegment[];
}

interface DuffelOffer {
  id?: string;
  total_amount?: string;
  total_currency?: string;
  slices?: DuffelSlice[];
  owner?: { iata_code?: string };
  available_seats?: number;
}

function token(): string | undefined {
  return process.env.DUFFEL_ACCESS_TOKEN?.trim() || undefined;
}

export function duffelConfigured(): boolean {
  return flightSearchEnabled && Boolean(token());
}

function normalizeOffer(offer: DuffelOffer): FlightOffer | null {
  if (
    !offer.id ||
    !offer.total_amount ||
    !offer.total_currency ||
    !Array.isArray(offer.slices)
  ) {
    return null;
  }

  const itineraries = offer.slices
    .map((slice) => ({
      duration: slice.duration || "",
      segments: (slice.segments || [])
        .map((segment): FlightSegment | null => {
          const origin = segment.origin?.iata_code;
          const destination = segment.destination?.iata_code;
          const departure = segment.departing_at;
          const arrival = segment.arriving_at;
          if (!origin || !destination || !departure || !arrival) return null;

          return {
            departure: { iataCode: origin, at: departure },
            arrival: { iataCode: destination, at: arrival },
            carrierCode:
              segment.marketing_carrier?.iata_code ||
              segment.operating_carrier?.iata_code ||
              "—",
            number: segment.marketing_carrier_flight_number || "",
            duration: segment.duration || slice.duration || "",
          };
        })
        .filter((segment): segment is FlightSegment => Boolean(segment)),
    }))
    .filter((itinerary) => itinerary.segments.length > 0);

  if (itineraries.length === 0) return null;

  const ownerCode =
    offer.owner?.iata_code ||
    itineraries[0].segments[0]?.carrierCode ||
    "—";

  return {
    id: offer.id,
    price: { total: offer.total_amount, currency: offer.total_currency },
    itineraries,
    numberOfBookableSeats: offer.available_seats ?? 0,
    validatingAirlineCodes: [ownerCode],
    oneWay: itineraries.length === 1,
  };
}

export async function searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
  if (!flightSearchEnabled) throw new Error("flight_search_unavailable");
  const accessToken = token();
  if (!accessToken) {
    throw new Error("DUFFEL_ACCESS_TOKEN not configured");
  }

  const slices = [
    {
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      departure_date: params.departureDate,
    },
  ];

  if (params.returnDate) {
    slices.push({
      origin: params.destination.toUpperCase(),
      destination: params.origin.toUpperCase(),
      departure_date: params.returnDate,
    });
  }

  const query = new URLSearchParams({
    return_offers: "true",
    supplier_timeout: "15000",
    limit: String(Math.min(params.max ?? 10, 50)),
  });

  const response = await fetch(`${DUFFEL_BASE}/air/offer_requests?${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Duffel-Version": "v2",
    },
    body: JSON.stringify({
      data: {
        slices,
        passengers: Array.from({ length: Math.min(Math.max(params.adults, 1), 9) }, () => ({
          type: "adult",
        })),
        cabin_class: "economy",
      },
    }),
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(`Duffel flight search failed: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as { data?: { offers?: DuffelOffer[] } };
  return (payload.data?.offers || [])
    .map(normalizeOffer)
    .filter((offer): offer is FlightOffer => Boolean(offer))
    .slice(0, params.max ?? 10);
}