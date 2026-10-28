import { z } from "zod";

export const nativePushDeviceInput = z.object({
  platform: z.enum(["ios", "android"]),
  token: z.string().min(20).max(2048).regex(/^[A-Za-z0-9:_-]+$/),
}).strict().superRefine((value, context) => {
  if (value.platform === "ios" && (!/^[a-fA-F0-9]+$/.test(value.token) || value.token.length % 2 !== 0)) {
    context.addIssue({ code: "custom", path: ["token"], message: "Invalid Apple device token" });
  }
});
export type NativePushDeviceInput = z.infer<typeof nativePushDeviceInput>;

// Notifications may navigate inside this app, never to another origin.
export function notificationPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") ||
      /[\\\u0000-\u0020]/.test(value)) return "/";
  try {
    const parsed = new URL(value, "https://notification.invalid");
    return parsed.origin === "https://notification.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/";
  } catch { return "/"; }
}
