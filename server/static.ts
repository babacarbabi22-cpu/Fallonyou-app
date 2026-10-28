import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { serveCompressedAssets } from "./compressedAssets";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const assetsPath = path.join(distPath, "assets");
  app.use("/assets", serveCompressedAssets(assetsPath));
  app.use("/assets", express.static(assetsPath, {
    maxAge: "1y",
    immutable: true,
  }));
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
