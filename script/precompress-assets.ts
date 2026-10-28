import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

// Compress public, build-generated code only. Never compress personalized
// responses, uploads, or API data, and do the CPU work at build time.
export async function precompressAssets(directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await precompressAssets(filePath);
      return;
    }
    if (!entry.isFile() || !/\.(js|css)$/.test(entry.name)) return;

    const source = await readFile(filePath);
    if (source.length < 1024) return;
    const [br, gz] = await Promise.all([
      compressBrotli(source, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
      }),
      compressGzip(source, { level: 9 }),
    ]);
    await Promise.all([
      ...(br.length < source.length ? [writeFile(`${filePath}.br`, br)] : []),
      ...(gz.length < source.length ? [writeFile(`${filePath}.gz`, gz)] : []),
    ]);
  }));
}