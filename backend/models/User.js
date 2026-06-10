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
    securityQuestion: {
      type: String,
      enum: ["", "first_school", "childhood_nickname", "memorable_place", "first_job"],
      default: ""
    },
    securityAnswerHash: {
      type: String,
      select: false,
      default: ""
    },
    role: {
      type: String,
      enum: ["professional", "volunteer", "public"],
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
    isVolunteer: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    postalCode: {
      type: String,
      trim: true,
      default: ""
    },
    volunteerSkills: {
      type: [String],
      default: []
    },
    volunteerAvailability: {
      type: String,
      enum: ["", "weekdays", "evenings", "weekends", "emergency"],
      default: ""
    },
    passwordResetCodeHash: {
      type: String,
      select: false,
      default: ""
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false
    },
    passwordResetAttempts: {
      type: Number,
      select: false,
      default: 0
    },
    approvedAt: {
      type: Date
    },
    lastLoginAt: {
      type: Date
    },
    failedLoginAttempts: {
      type: Number,
      select: false,
      default: 0
    },
    loginLockedUntil: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
