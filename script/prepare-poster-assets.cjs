const fs = require("node:fs/promises");
const sharp = require("sharp");
const QRCode = require("qrcode");

async function main() {
  const directory = "output/fallonyou-ad";
  await fs.mkdir(directory, { recursive: true });
  // A fresh QR to the confirmed public deployment, not a recreated QR illustration.
  await QRCode.toFile(`${directory}/qr.png`, "https://fallonyou.app/", {
    errorCorrectionLevel: "H", margin: 4, scale: 12,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  // Preserve the user's actual wordmark from the supplied reference.
  const reference = "attached_assets/IMG_3663_1791288980877.png";
  const metadata = await sharp(reference).metadata();
  const scale = metadata.width / 559;
  const { data, info } = await sharp(reference)
    .extract({
      left: Math.round(90 * scale), top: Math.round(20 * scale),
      width: Math.round(390 * scale), height: Math.round(65 * scale),
    })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    const brightness = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = brightness < 45 ? 0 : brightness < 90 ? Math.round((brightness - 45) / 45 * 255) : 255;
  }
  await sharp(data, { raw: info }).trim().png().toFile(`${directory}/wordmark.png`);
  console.log(JSON.stringify({ qrTarget: "https://fallonyou.app/", output: directory }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
