const fs = require("fs");
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

async function checkDatabase() {
  const connected = await connectDB();
  if (!connected) {
    process.exitCode = 1;
    return;
  }

  const [professionalCount, publicCount] = await Promise.all([
    User.countDocuments({ role: "professional" }),
    User.countDocuments({ role: "public" })
  ]);

  console.log(`Approved/test professionals found: ${professionalCount}`);
  console.log(`Public accounts found: ${publicCount}`);
  console.log("MongoDB connection check passed.");
}

checkDatabase()
  .catch((error) => {
    console.error("MongoDB check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
