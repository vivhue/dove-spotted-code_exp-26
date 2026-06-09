const fs = require("fs");
const https = require("https");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

loadEnvFile(path.join(__dirname, "..", "..", ".env"));

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

function maskChatId(chatId) {
  const value = String(chatId || "");
  if (!value) return "not linked";
  return value.length <= 4 ? "****" : `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

function getWebhookInfo(token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${token}/getWebhookInfo`,
        method: "GET",
        timeout: 7000
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error("Telegram returned an unreadable response."));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Telegram request timed out.")));
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const connected = await connectDB();
  if (!connected) {
    process.exitCode = 1;
    return;
  }

  const professionals = await User.find({ role: "professional" })
    .select("email telegramChatId telegramUsername telegramLinkedAt")
    .sort({ email: 1 })
    .lean();

  console.log("Professional Telegram links:");
  professionals.forEach((user) => {
    const username = user.telegramUsername ? ` @${user.telegramUsername}` : "";
    console.log(`- ${user.email}: ${maskChatId(user.telegramChatId)}${username}`);
  });

  const linkedGroups = new Map();
  professionals.forEach((user) => {
    if (!user.telegramChatId) return;
    const owners = linkedGroups.get(user.telegramChatId) || [];
    owners.push(user.email);
    linkedGroups.set(user.telegramChatId, owners);
  });
  const duplicates = [...linkedGroups.values()].filter((owners) => owners.length > 1);
  if (duplicates.length) {
    console.error("Duplicate Telegram ownership found:", duplicates);
    process.exitCode = 1;
  } else {
    console.log("No Telegram chat is assigned to multiple professionals.");
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not configured.");
    process.exitCode = 1;
    return;
  }

  const webhook = await getWebhookInfo(botToken);
  if (!webhook.ok) {
    throw new Error(webhook.description || "Unable to inspect Telegram webhook.");
  }

  const info = webhook.result || {};
  console.log(`Webhook URL: ${info.url || "not configured"}`);
  console.log(`Pending Telegram updates: ${info.pending_update_count || 0}`);
  if (info.last_error_message) {
    console.error(`Last webhook error: ${info.last_error_message}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Telegram check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
