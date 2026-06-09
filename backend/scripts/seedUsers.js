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
  return User.findOneAndUpdate(
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
        approvedAt: user.status === "approved" ? new Date() : undefined
      },
      $setOnInsert: {
        telegramChatId: "",
        telegramUsername: "",
        mfaMethod: "none"
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
  const teamPassword = process.env.SEED_TEAM_PASSWORD || "QuickAidDemo2026!";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "";
  const adminName = process.env.SEED_ADMIN_NAME || "QuickAid Administrator";

  const professionalUsers = [
    {
      name: professionalName,
      email: professionalEmail,
      password: professionalPassword,
      agency: process.env.SEED_PRO_AGENCY || "SCDF",
      roleTitle: process.env.SEED_PRO_ROLE_TITLE || "Emergency Operations Officer"
    },
    {
      name: "Daniel Lim",
      email: "daniel.lim@scdf.quickaid.test",
      password: teamPassword,
      agency: "SCDF",
      roleTitle: "Response Team Commander"
    },
    {
      name: "Mei Lin Tan",
      email: "meilin.tan@moh.quickaid.test",
      password: teamPassword,
      agency: "MOH",
      roleTitle: "Hospital Capacity Coordinator"
    },
    {
      name: "Faris Rahman",
      email: "faris.rahman@spf.quickaid.test",
      password: teamPassword,
      agency: "SPF",
      roleTitle: "Incident Liaison Officer"
    },
    {
      name: "Cheryl Goh",
      email: "cheryl.goh@lta.quickaid.test",
      password: teamPassword,
      agency: "LTA",
      roleTitle: "Traffic Operations Controller"
    }
  ];

  for (const professional of professionalUsers) {
    await upsertUser({
      ...professional,
      role: "professional",
      status: "approved"
    });
  }

  await upsertUser({
    name: publicName,
    email: publicEmail,
    password: publicPassword,
    role: "public",
    status: "approved"
  });

  if (adminEmail && adminPassword) {
    await upsertUser({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      status: "approved",
      roleTitle: "Access Administrator"
    });
  }

  console.log("Seeded demo users:");
  professionalUsers.forEach((professional) => {
    console.log(`Professional (${professional.agency}): ${professional.email}`);
  });
  console.log(`Public: ${publicEmail}`);
  console.log(adminEmail && adminPassword ? `Administrator: ${adminEmail}` : "Administrator: skipped");
  console.log("Passwords were loaded from .env and stored only as bcrypt hashes.");
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
