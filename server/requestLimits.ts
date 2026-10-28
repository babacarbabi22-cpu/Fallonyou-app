import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export function accountRateKey(req: { session?: { userId?: string }; ip?: string }) {
  // Use only the session restored by server middleware, never a client header/cookie.
  return req.session?.userId ? `account:${req.session.userId}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: req => (req as typeof req & { session?: { userId?: string } }).session?.userId ? 1200 : 200,
  keyGenerator: req => accountRateKey(req as typeof req & { session?: { userId?: string } }),
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => !req.path.startsWith("/api"),
  message: { error: "Too many requests, please try again later." },
});
