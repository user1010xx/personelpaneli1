import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Kullanım: node scripts/apply-google-credentials.mjs <service-account.json>");
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!creds.client_email || !creds.private_key) {
  console.error("JSON içinde client_email ve private_key gerekli");
  process.exit(1);
}

const envPath = path.join(__dirname, "..", ".env");
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

function setLine(key, value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  const line = `${key}="${escaped}"`;
  const re = new RegExp(`^${key}=.*\\r?\\n?`, "m");
  env = re.test(env) ? env.replace(re, `${line}\n`) : `${env.trimEnd()}\n${line}\n`;
}

setLine("GOOGLE_SERVICE_ACCOUNT_EMAIL", creds.client_email);
setLine("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", creds.private_key);

fs.writeFileSync(envPath, env.endsWith("\n") ? env : `${env}\n`);
console.log("OK: .env güncellendi —", creds.client_email);
