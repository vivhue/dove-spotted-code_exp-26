const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.log("MongoDB skipped: MONGO_URI is not set.");
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (error.message.includes("authentication failed") || error.message.includes("bad auth")) {
      console.error("Check the Atlas database username/password and URL-encode special password characters.");
    } else if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("querySrv") ||
      error.message.includes("IP")
    ) {
      console.error("Check Atlas Network Access and allow this computer's current IP address.");
    }
    return false;
  }
}

module.exports = connectDB;
