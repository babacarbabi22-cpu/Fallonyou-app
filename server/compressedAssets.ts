import type { RequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";

export function serveCompressedAssets(directory: string): RequestHandler {
  const root = path.resolve(directory);
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    let pathname: string;
    try {
      pathname = decodeURIComponent(req.path);
    } catch {
      // Let express.static handle malformed paths consistently.
      return next();
    }
    if (!/\.(js|css)$/.test(pathname)) return next();

    const original = path.resolve(root, `.${pathname}`);
    const relative = path.relative(root, original);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      return next();
    }

    // Identity responses must vary too, so caches never mix encodings.
    res.vary("Accept-Encoding");
    // Retain normal byte-range behavior for the original representation.
    if (req.headers.range) return next();

    const variants = [
      { encoding: "br", suffix: ".br" },
      { encoding: "gzip", suffix: ".gz" },
    ].filter(({ suffix }) => fs.existsSync(`${original}${suffix}`));
    const encoding = req.acceptsEncodings(...variants.map(v => v.encoding), "identity");
    const variant = variants.find(v => v.encoding === encoding);
    if (!variant) return next();

    res.type(path.extname(original));
    res.setHeader("Content-Encoding", variant.encoding);
    res.sendFile(`${relative}${variant.suffix}`, {
      root,
      maxAge: "1y",
      immutable: true,
      dotfiles: "deny",
    }, (error) => {
      if (!error) return;
      if (!res.headersSent) {
        res.removeHeader("Content-Encoding");
        res.removeHeader("Content-Type");
      }
      next(error);
    });
  };
}