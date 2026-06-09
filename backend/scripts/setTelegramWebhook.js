const fs = require("fs");
const https = require("https");
const path = require("path");

loadEnvFile(path.join(__dirname, "..", "..", ".env"));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function telegramRequest(method, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TELEGRAM_BOT_TOKEN}/${method}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch (error) {
            reject(new Error(responseBody));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Set TELEGRAM_BOT_TOKEN in .env.");
  }
  if (!PUBLIC_BASE_URL) {
    throw new Error("Set PUBLIC_BASE_URL in .env, for example your ngrok HTTPS URL.");
  }

  const webhookUrl = `${PUBLIC_BASE_URL}/api/telegram/webhook`;
  const result = await telegramRequest("setWebhook", {
    url: webhookUrl,
    secret_token: TELEGRAM_WEBHOOK_SECRET || undefined,
    allowed_updates: ["message"]
  });

  console.log(result);
  if (!result.ok) {
    process.exitCode = 1;
    return;
  }
  console.log(`Telegram webhook set to ${webhookUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
