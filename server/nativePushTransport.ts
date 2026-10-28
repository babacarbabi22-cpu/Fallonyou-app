import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";
import { JWT } from "google-auth-library";
import { notificationPath } from "@shared/native-push";

export type NativeNotice = { title: string; body: string; url?: string;
  preference?: "messages" | "events" | "learningReminders" | "matches" | "newTravelers" | "profileViews" };
export type ProviderResult = { accepted: boolean; expired?: boolean };
const bundleId = "app.fallonyou.twa";

function firebaseConfig() {
  try {
    const value = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
    if (!/^[a-z][a-z0-9-]{4,62}[a-z0-9]$/.test(value.project_id) ||
        typeof value.client_email !== "string" || !value.client_email.endsWith(".iam.gserviceaccount.com") ||
        createPrivateKey(value.private_key).asymmetricKeyType !== "rsa") return null;
    return value as { project_id: string; client_email: string; private_key: string };
  } catch { return null; }
}
function appleConfig() {
  try {
    const keyId = process.env.APNS_KEY_ID || "", teamId = process.env.APNS_TEAM_ID || "";
    const key = process.env.APNS_PRIVATE_KEY || "";
    const environment = process.env.APNS_ENVIRONMENT || "production";
    if (!/^[A-Z0-9]{10}$/.test(keyId) || !/^[A-Z0-9]{10}$/.test(teamId) ||
        !["production", "development"].includes(environment) ||
        createPrivateKey(key).asymmetricKeyDetails?.namedCurve !== "prime256v1") return null;
    return { keyId, teamId, key, environment };
  } catch { return null; }
}
export function nativePushConfiguration() {
  return { ios: !!appleConfig(), android: !!firebaseConfig() };
}

export function nativePayload(notice: NativeNotice) {
  const url = notificationPath(notice.url);
  return { title: notice.title.slice(0, 100), body: notice.body.slice(0, 400), url };
}

let cachedApple: { key: string; token: string; expires: number } | undefined;
export function appleBearer(config: NonNullable<ReturnType<typeof appleConfig>>, now = Date.now()) {
  const identity = `${config.keyId}:${config.teamId}:${config.key}`;
  if (cachedApple?.key === identity && cachedApple.expires > now) return cachedApple.token;
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: config.keyId })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({ iss: config.teamId, iat: Math.floor(now / 1000) })).toString("base64url");
  const input = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(input), { key: config.key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  const token = `${input}.${signature}`;
  cachedApple = { key: identity, token, expires: now + 45 * 60_000 };
  return token;
}

async function sendApple(token: string, notice: NativeNotice): Promise<ProviderResult> {
  const config = appleConfig();
  if (!config) throw new Error("Apple push is not configured");
  const value = nativePayload(notice);
  const bearer = appleBearer(config);
  return new Promise((resolve, reject) => {
    const host = config.environment === "development" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
    const session = connect(`https://${host}`);
    let done = false;
    const finish = (result?: ProviderResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      session.destroy();
      result ? resolve(result) : reject(new Error("Apple push request failed"));
    };
    const timer = setTimeout(() => finish(), 10_000);
    session.on("error", () => finish());
    const request = session.request({
      ":method": "POST", ":path": `/3/device/${token}`,
      authorization: `bearer ${bearer}`, "apns-topic": bundleId,
      "apns-push-type": "alert", "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600),
      "content-type": "application/json",
    });
    let status = 0, body = "";
    request.on("response", headers => { status = Number(headers[":status"]); });
    request.on("data", chunk => { body += chunk; if (body.length > 4096) finish(); });
    request.on("error", () => finish());
    request.on("end", () => {
      let reason = "";
      try { reason = JSON.parse(body).reason; } catch { /* Successful responses have no body. */ }
      finish({ accepted: status === 200, expired: status === 410 && reason === "Unregistered" });
    });
    request.end(JSON.stringify({ aps: { alert: { title: value.title, body: value.body }, sound: "default" }, url: value.url }));
  });
}

let firebaseClient: { identity: string; client: JWT } | undefined;
async function sendFirebase(token: string, notice: NativeNotice): Promise<ProviderResult> {
  const config = firebaseConfig();
  if (!config) throw new Error("Firebase push is not configured");
  const identity = `${config.client_email}:${config.private_key}`;
  if (firebaseClient?.identity !== identity) firebaseClient = {
    identity,
    client: new JWT({ email: config.client_email, key: config.private_key,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
      transporterOptions: { timeout: 10_000, retry: false } }),
  };
  // Library caches and refreshes access tokens; no credentials go to the browser.
  const access = await firebaseClient.client.getAccessToken();
  if (!access.token) throw new Error("Firebase authorization failed");
  const value = nativePayload(notice);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.project_id}/messages:send`, {
    method: "POST", signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${access.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: {
      token, notification: { title: value.title, body: value.body }, data: { url: value.url },
      android: { priority: "HIGH", ttl: "3600s", notification: { channel_id: "fallonyou_updates", sound: "default" } },
    } }),
  });
  if (response.ok) return { accepted: true };
  const error = await response.json().catch(() => null) as any;
  // Do not delete tokens on wrong project, bad credentials, payload errors or outages.
  const expired = error?.error?.details?.some((entry: any) =>
    entry["@type"] === "type.googleapis.com/google.firebase.fcm.v1.FcmError" && entry.errorCode === "UNREGISTERED");
  return { accepted: false, expired: expired === true };
}

export async function sendNativeDevice(platform: string, token: string, notice: NativeNotice) {
  if (platform === "ios") return sendApple(token, notice);
  if (platform === "android") return sendFirebase(token, notice);
  throw new Error("Unsupported notification platform");
}
