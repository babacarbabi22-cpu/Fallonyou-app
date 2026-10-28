import { Resend } from "resend";
import { escapeEmailHtml } from "./emailText";
import { renderAutomaticEmail } from "./emailTemplates";
import type { CommunicationLocale } from "@shared/communication-locale";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "FallonYou <noreply@fallonyou.app>";
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || "fallonyouapp@hotmail.com";

export function isConfigured(): boolean {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured");
    return false;
  }
  return true;
}

async function deliver(to: string, message: { subject: string; html: string; text?: string }): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const { error } = await resend.emails.send({ from: FROM, to, ...message });
    if (error) { console.error("[Email] Delivery rejected"); return false; }
    return true;
  } catch {
    // Provider errors may include addresses or authentication/reset links.
    console.error("[Email] Delivery failed");
    return false;
  }
}

export async function sendEngagementEmail(to: string, title: string, body: string, path: string) {
  if (process.env.NODE_ENV !== "production") return;
  const url = new URL(path, "https://fallonyou.app").href;
  if (!await deliver(to, { subject: title, text: `${body}\n\n${url}`,
    html: `<p>${escapeEmailHtml(body)}</p><p><a href="${escapeEmailHtml(url)}">FallOnYou</a></p>` })) {
    throw new Error("Engagement email delivery failed");
  }
}

export function sendPasswordResetEmail(to: string, firstName: string, resetLink: string, locale: CommunicationLocale = "en") {
  return deliver(to, renderAutomaticEmail("passwordReset", { firstName, link: resetLink }, locale));
}
export function sendVerificationEmail(to: string, firstName: string, verifyLink: string, locale: CommunicationLocale = "en") {
  return deliver(to, renderAutomaticEmail("verification", { firstName, link: verifyLink }, locale));
}
export function sendPhotoReminderEmail(to: string, firstName: string, locale: CommunicationLocale = "en") {
  if (process.env.NODE_ENV !== "production") return Promise.resolve(false);
  return deliver(to, renderAutomaticEmail("photoReminder", { firstName }, locale));
}
export function sendIncompleteOnboardingEmail(to: string, firstName: string, locale: CommunicationLocale = "en") {
  if (process.env.NODE_ENV !== "production") return Promise.resolve(false);
  return deliver(to, renderAutomaticEmail("onboardingReminder", { firstName, link: "https://fallonyou.app/onboarding" }, locale));
}
export function sendReferralEmail(to: string, firstName: string, opts: {
  refereeName: string; newCount: number; tierLabel?: string; isAmbassador?: boolean;
}, locale: CommunicationLocale = "en") {
  if (process.env.NODE_ENV !== "production") return Promise.resolve(false);
  return deliver(to, renderAutomaticEmail("referral", { firstName, ...opts }, locale));
}

function internalEmail(subject: string, heading: string, rows: Record<string, unknown>, path: string) {
  const h = escapeEmailHtml;
  const textRows = Object.entries(rows).filter(([, value]) => value !== undefined && value !== null && value !== "");
  const link = new URL(path, "https://fallonyou.app").href;
  return {
    subject,
    text: `${heading}\n\n${textRows.map(([label, value]) => `${label}: ${String(value)}`).join("\n")}\n\n${link}`,
    html: `<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;color:#111"><h1>FallOnYou</h1><h2>${h(heading)}</h2><table>${textRows.map(([label, value]) => `<tr><th style="padding:8px;text-align:left">${h(label)}</th><td style="padding:8px">${h(String(value))}</td></tr>`).join("")}</table><p><a href="${h(link)}">Open FallOnYou</a></p></body></html>`,
  };
}

export function sendTripInquiryEmail(input: {
  destination: string; country: string; fromPrice: number; duration: string; note?: string;
  userName: string; userEmail: string; userPhone?: string; message?: string;
}) {
  return deliver(ADMIN_EMAIL, internalEmail(`New trip inquiry: ${input.destination}`, "New travel inquiry", {
    Destination: input.destination, Country: input.country, "Indicative price": input.fromPrice,
    Duration: input.duration, Note: input.note, Name: input.userName, Email: input.userEmail,
    Phone: input.userPhone, Message: input.message,
  }, "/admin"));
}

type AdminAlertEvent = {
  type: "new_user" | "new_verification" | "new_premium" | "premium_canceled" | "new_report" | "user_banned" | "user_unbanned";
  data: Record<string, unknown>;
};
export async function sendAdminAlert(event: AdminAlertEvent): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  const headings: Record<AdminAlertEvent["type"], string> = {
    new_user: "New user", new_verification: "Verification request", new_report: "New report",
    new_premium: "New Premium subscriber", premium_canceled: "Premium canceled", user_banned: "User suspended", user_unbanned: "User suspension removed",
  };
  await deliver(ADMIN_EMAIL, internalEmail(`[FallOnYou] ${headings[event.type]}`, headings[event.type], event.data, "/admin"));
}
export async function verifyEmailConnection(): Promise<boolean> {
  return isConfigured();
}
