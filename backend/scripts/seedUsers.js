const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");

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

async function upsertUser(user) {
  const passwordHash = await hashPassword(user.password);
  await User.findOneAndUpdate(
    { email: user.email.toLowerCase() },
    {
      $set: {
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash,
        role: user.role,
        status: user.status,
        agency: user.agency || "",
        roleTitle: user.roleTitle || "",
        telegramChatId: user.telegramChatId || "",
        mfaMethod: user.mfaMethod || "demo",
        approvedAt: user.status === "approved" ? new Date() : undefined
      }
    },
    { upsert: true, returnDocument: "after" }
  );
}

async function seed() {
  const connected = await connectDB();
  if (!connected) {
    throw new Error("Set MONGO_URI in .env before running the seed script.");
  }

  const professionalEmail = process.env.SEED_PRO_EMAIL || "agency@example.com";
  const professionalPassword = process.env.SEED_PRO_PASSWORD || "password123";
  const professionalName = process.env.SEED_PRO_NAME || "Agency Operations User";
  const publicEmail = process.env.SEED_PUBLIC_EMAIL || "public@example.com";
  const publicPassword = process.env.SEED_PUBLIC_PASSWORD || "secret123";
  const publicName = process.env.SEED_PUBLIC_NAME || "Public Demo User";

  await upsertUser({
    name: professionalName,
    email: professionalEmail,
    password: professionalPassword,
    role: "professional",
    status: "approved",
    agency: process.env.SEED_PRO_AGENCY || "SCDF",
    roleTitle: process.env.SEED_PRO_ROLE_TITLE || "Emergency Operations Officer",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    mfaMethod: process.env.TELEGRAM_CHAT_ID ? "telegram" : "demo"
  });

  await upsertUser({
    name: publicName,
    email: publicEmail,
    password: publicPassword,
    role: "public",
    status: "approved"
  });

  console.log("Seeded demo users:");
  console.log(`Professional: ${professionalEmail} / ${professionalPassword}`);
  console.log(`Public: ${publicEmail} / ${publicPassword}`);
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
