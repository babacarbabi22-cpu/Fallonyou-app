// Runs in the Android CI job. Never logs configuration contents or credentials.
import { readFile, writeFile } from "node:fs/promises";
const destination = "android/app/google-services.json";
let raw;
try { raw = await readFile(destination, "utf8"); } catch {
  raw = process.env.FIREBASE_ANDROID_CONFIG_JSON;
}
try {
  if (!raw) throw Error();
  const config = JSON.parse(raw);
  if (!config.project_info?.project_id ||
      !config.client?.some(client => client.client_info?.android_client_info?.package_name === "app.fallonyou.twa")) throw Error();
  await writeFile(destination, raw, { mode: 0o600 });
  console.log("Android Firebase configuration is ready.");
} catch {
  console.error("Android push setup required: configure FIREBASE_ANDROID_CONFIG_JSON in Codemagic for app.fallonyou.twa. See docs/native-push-setup.md.");
  process.exitCode = 1;
}
