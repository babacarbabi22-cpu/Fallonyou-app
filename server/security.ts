import type { IncomingMessage } from "http";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_LENGTH = 1024;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function isValidPassword(value: unknown, minimumLength = 6): value is string {
  return typeof value === "string" &&
    value.length >= minimumLength &&
    value.length <= MAX_PASSWORD_LENGTH;
}

export function isValidName(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === "string" && value.length <= 100);
}

function originMatchesHost(originValue: string, host: string, production: boolean): boolean {
  try {
    const origin = new URL(originValue);
    return origin.host.toLowerCase() === host.toLowerCase() &&
      (production ? origin.protocol === "https:" : origin.protocol === "http:" || origin.protocol === "https:");
  } catch {
    return false;
  }
}

export function isAllowedBrowserOrigin(
  headers: Pick<IncomingMessage["headers"], "origin" | "referer" | "host" | "sec-fetch-site">,
  production = process.env.NODE_ENV === "production",
): boolean {
  const origin = headers.origin;
  const referer = headers.referer;
  const candidate = Array.isArray(origin) ? origin[0] : origin;
  const referrer = Array.isArray(referer) ? referer[0] : referer;
  const host = Array.isArray(headers.host) ? headers.host[0] : headers.host;
  const fetchSite = Array.isArray(headers["sec-fetch-site"])
    ? headers["sec-fetch-site"]?.[0]
    : headers["sec-fetch-site"];

  if (fetchSite?.toLowerCase() === "cross-site") return false;
  if (candidate) return !!host && originMatchesHost(candidate, host, production);
  if (referrer) return !!host && originMatchesHost(referrer, host, production);
  // Native clients generally omit browser origin/fetch metadata. Do not reject them,
  // but reject metadata-bearing browser requests that omit both origin and referer.
  return !fetchSite || fetchSite.toLowerCase() === "none";
}

export function isSafeMutationPayload(raw: string | Buffer | Buffer[] | ArrayBuffer, maxBytes = 8 * 1024): boolean {
  if (Array.isArray(raw)) return raw.reduce((size, part) => size + part.byteLength, 0) <= maxBytes;
  if (raw instanceof ArrayBuffer) return raw.byteLength <= maxBytes;
  return Buffer.byteLength(raw) <= maxBytes;
}

export function isActiveChatMember(
  userId: string,
  match: { user1Id: string; user2Id: string; status: string } | undefined,
  isBlocked: boolean,
): boolean {
  return !!match &&
    match.status === "matched" &&
    (match.user1Id === userId || match.user2Id === userId) &&
    !isBlocked;
}

export class WebSocketMessageLimiter {
  private windowStartedAt: number;
  private messages = 0;

  constructor(private readonly maxMessages = 30, private readonly windowMs = 10_000, now = Date.now()) {
    this.windowStartedAt = now;
  }

  allow(now = Date.now()): boolean {
    if (now - this.windowStartedAt >= this.windowMs) {
      this.windowStartedAt = now;
      this.messages = 0;
    }
    return ++this.messages <= this.maxMessages;
  }
}