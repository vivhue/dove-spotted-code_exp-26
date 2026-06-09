const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["professional", "public", "admin"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },
    agency: {
      type: String,
      trim: true,
      default: ""
    },
    roleTitle: {
      type: String,
      trim: true,
      default: ""
    },
    telegramChatId: {
      type: String,
      trim: true,
      default: ""
    },
    telegramUsername: {
      type: String,
      trim: true,
      default: ""
    },
    telegramLinkedAt: {
      type: Date
    },
    mfaMethod: {
      type: String,
      enum: ["telegram", "demo", "none"],
      default: "demo"
    },
    approvedAt: {
      type: Date
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
