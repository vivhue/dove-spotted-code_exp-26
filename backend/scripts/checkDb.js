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

  const [
    approvedProfessionalCount,
    pendingProfessionalCount,
    publicCount,
    volunteerCount,
    missingPasswordHashUsers
  ] = await Promise.all([
    User.countDocuments({ role: "professional", status: "approved" }),
    User.countDocuments({ role: "professional", status: "pending" }),
    User.countDocuments({ role: "public" }),
    User.countDocuments({ role: "public", isVolunteer: true }),
    User.find({
      $or: [
        { passwordHash: { $exists: false } },
        { passwordHash: "" },
        { passwordHash: null }
      ]
    }).select("email role isVolunteer").lean()
  ]);

  console.log(`Approved professionals found: ${approvedProfessionalCount}`);
  console.log(`Pending professionals found: ${pendingProfessionalCount}`);
  console.log(`Public accounts found: ${publicCount}`);
  console.log(`Volunteer accounts found: ${volunteerCount}`);
  if (missingPasswordHashUsers.length) {
    console.log("Users missing password hashes:");
    for (const user of missingPasswordHashUsers) {
      const type = user.role === "professional" ? "professional" : user.isVolunteer ? "volunteer" : "public";
      console.log(`- ${user.email} (${type})`);
    }
  } else {
    console.log("All user accounts have password hashes.");
  }
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
