const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const connectDB = require("./config/db");
const User = require("./models/User");
const { hashPassword, verifyPassword } = require("./utils/password");

loadEnvFile(path.join(__dirname, "..", ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "..", "frontend", "public");
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SECRET = process.env.OTP_SECRET || "quickaid-local-demo-otp-secret";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const otpStore = new Map();
const telegramLinkStore = new Map();
let mongoConnected = false;

const ONEMAP_TOKEN = process.env.ONEMAP_TOKEN || "";

const FLOOD_ALERTS_URL = "https://api-open.data.gov.sg/v2/real-time/api/weather/flood-alerts";
const ONEMAP_REVGEOCODE_URL = "https://www.onemap.gov.sg/api/public/revgeocode";

const cache = new Map();

async function cached(key, ttlMs, fetcher) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < ttlMs) return hit.value;
  const value = await fetcher();
  cache.set(key, { value, time: Date.now() });
  return value;
}

async function fetchFloodAlerts() {
  const response = await fetch(FLOOD_ALERTS_URL);
  if (!response.ok) throw new Error(`Flood alert upstream error: ${response.status}`);
  const payload = await response.json();
  return payload.data?.records || [];
}

async function fetchNearestAddress(lat, lng) {
  const url = `${ONEMAP_REVGEOCODE_URL}?location=${lat},${lng}&buffer=50&addressType=All&otherFeatures=N`;
  if (!ONEMAP_TOKEN) {
    throw new Error("ONEMAP_TOKEN is not configured");
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ONEMAP_TOKEN}` }
  });
  if (!response.ok) throw new Error(`OneMap upstream error: ${response.status}`);
  const payload = await response.json();
  const result = payload.GeocodeInfo?.[0];
  if (!result) return null;
  return {
    building: result.BUILDINGNAME,
    block: result.BLOCK,
    road: result.ROAD,
    postalCode: result.POSTALCODE
  };
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

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

const liveStatus = {
  activeIncidents: 18,
  availableResponders: 74,
  sheltersOnline: 12,
  avgDispatchMinutes: 6.4,
  lastUpdated: new Date().toISOString(),
  alerts: [
    {
      id: "INC-2041",
      type: "Flooding",
      location: "Bukit Timah",
      priority: "High",
      status: "Routing volunteers"
    },
    {
      id: "INC-2042",
      type: "Medical",
      location: "Tampines",
      priority: "Medium",
      status: "Responder dispatched"
    },
    {
      id: "INC-2043",
      type: "Power outage",
      location: "Jurong East",
      priority: "Medium",
      status: "Agency review"
    }
  ]
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendNotFound(res) {
  sendJson(res, 404, { error: "Not found" });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function buildSession(role, email) {
  return {
    token: crypto.randomBytes(18).toString("hex"),
    role,
    email,
    issuedAt: new Date().toISOString()
  };
}

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashOtp(email, otp) {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${normalizeEmail(email)}:${otp}`)
    .digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function generateLinkToken() {
  return crypto.randomBytes(18).toString("hex");
}

function validateProfessionalCredentials(body) {
  const errors = {};
  if (!validEmail(body.email)) errors.email = "Enter a valid authorised email.";
  if (typeof body.password !== "string" || body.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
}

function validateProfessionalLogin(body) {
  const errors = validateProfessionalCredentials(body);
  if (typeof body.verification !== "string" || !/^\d{6}$/.test(body.verification)) {
    errors.verification = "Enter the 6-digit verification code.";
  }
  return errors;
}

function validatePublicLogin(body) {
  const errors = {};
  if (body.provider === "google") return errors;
  if (!validEmail(body.email)) errors.email = "Enter a valid email.";
  if (typeof body.password !== "string" || body.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  return errors;
}

function validateVolunteerSignup(body) {
  const errors = {};
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/\s+/g, "");
  const postalCode = String(body.postalCode || "").trim();
  const allowedAvailability = ["weekdays", "evenings", "weekends", "emergency"];

  if (name.length < 2 || name.length > 80) errors.name = "Enter your full name.";
  if (!validEmail(body.email)) errors.email = "Enter a valid email.";
  if (typeof body.password !== "string" || body.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (body.password !== body.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!/^[689]\d{7}$/.test(phone)) errors.phone = "Enter a valid 8-digit Singapore phone number.";
  if (postalCode && !/^\d{6}$/.test(postalCode)) errors.postalCode = "Postal code must contain 6 digits.";
  if (!allowedAvailability.includes(body.availability)) {
    errors.availability = "Choose when you are generally available.";
  }
  if (body.acceptTerms !== true && body.acceptTerms !== "on") {
    errors.acceptTerms = "You must confirm the volunteer declaration.";
  }
  return errors;
}

async function findApprovedUser(email, role) {
  if (!mongoConnected) return null;
  const query = {
    email: normalizeEmail(email),
    status: "approved"
  };
  if (role) query.role = role;
  return User.findOne(query);
}

async function validateUserPassword(user, password) {
  if (!user) return false;
  return verifyPassword(password, user.passwordHash);
}

function sendTelegramMessage(text, chatId) {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      resolve({ delivered: false, reason: "telegram_not_configured" });
      return;
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text
    });

    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        },
        timeout: 7000
      },
      (telegramRes) => {
        let body = "";
        telegramRes.on("data", (chunk) => {
          body += chunk;
        });
        telegramRes.on("end", () => {
          if (telegramRes.statusCode >= 200 && telegramRes.statusCode < 300) {
            resolve({ delivered: true });
            return;
          }
          reject(new Error(`Telegram returned ${telegramRes.statusCode}: ${body}`));
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("Telegram request timed out")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/status") {
    sendJson(res, 200, { ...liveStatus, lastUpdated: new Date().toISOString() });
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/flood-alerts")) {
    try {
      const records = await cached("flood-alerts", 60_000, fetchFloodAlerts);
      sendJson(res, 200, { records, fetchedAt: new Date().toISOString() });
    } catch (error) {
      sendJson(res, 502, { error: "Unable to reach the flood alert service." });
    }
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/onemap/revgeocode")) {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      sendJson(res, 400, { error: "lat and lng query parameters are required." });
      return;
    }
    try {
      const key = `revgeocode:${lat.toFixed(4)},${lng.toFixed(4)}`;
      const address = await cached(key, 30 * 60_000, () => fetchNearestAddress(lat, lng));
      sendJson(res, 200, { address });
    } catch (error) {
      sendJson(res, 502, { error: "Unable to reach the OneMap service." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/telegram/link-token") {
    try {
      const body = await parseBody(req);
      const email = normalizeEmail(body.email);
      const errors = validateProfessionalCredentials(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to create Telegram link.", fields: errors });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: "MongoDB is required to link Telegram accounts." });
        return;
      }
      const user = await findApprovedUser(email, "professional");
      if (!user) {
        sendJson(res, 404, { error: "Approved professional user not found." });
        return;
      }
      const passwordOk = await validateUserPassword(user, body.password);
      if (!passwordOk) {
        sendJson(res, 401, { error: "Invalid email or password." });
        return;
      }

      const token = generateLinkToken();
      telegramLinkStore.set(token, {
        userId: String(user._id),
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      sendJson(res, 200, {
        message: "Telegram link token created.",
        token,
        connectUrl: TELEGRAM_BOT_USERNAME
          ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`
          : "",
        note: "Open the bot and tap Start to link this account to that Telegram chat."
      });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/telegram/webhook") {
    try {
      if (TELEGRAM_WEBHOOK_SECRET) {
        const receivedSecret = req.headers["x-telegram-bot-api-secret-token"];
        if (receivedSecret !== TELEGRAM_WEBHOOK_SECRET) {
          sendJson(res, 401, { error: "Invalid Telegram webhook secret." });
          return;
        }
      }

      const update = await parseBody(req);
      const message = update.message;
      const text = message?.text || "";
      const chat = message?.chat;
      const from = message?.from || {};
      const match = text.match(/^\/start(?:\s+(.+))?$/);
      if (!match || !match[1] || !chat?.id) {
        sendJson(res, 200, { ok: true });
        return;
      }

      const token = match[1].trim();
      const link = telegramLinkStore.get(token);
      if (!link || Date.now() > link.expiresAt) {
        await sendTelegramMessage("QuickAid Telegram link expired. Please request a new link from the app.", chat.id);
        telegramLinkStore.delete(token);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (!mongoConnected) {
        await sendTelegramMessage("QuickAid cannot link Telegram right now because MongoDB is not connected.", chat.id);
        sendJson(res, 200, { ok: true });
        return;
      }

      const user = await User.findById(link.userId);
      if (!user) {
        await sendTelegramMessage("QuickAid could not find the account for this link.", chat.id);
        telegramLinkStore.delete(token);
        sendJson(res, 200, { ok: true });
        return;
      }

      user.telegramChatId = String(chat.id);
      user.telegramUsername = from.username || chat.username || "";
      user.telegramLinkedAt = new Date();
      user.mfaMethod = "telegram";
      await user.save();
      telegramLinkStore.delete(token);
      await sendTelegramMessage(`Telegram connected for QuickAid account ${user.email}. You can now receive OTP codes here.`, chat.id);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error("Telegram webhook failed:", error.message);
      sendJson(res, 200, { ok: true });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/professional/request-code") {
    try {
      const body = await parseBody(req);
      const errors = validateProfessionalCredentials(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to send verification code.", fields: errors });
        return;
      }

      const email = normalizeEmail(body.email);
      const user = await findApprovedUser(email, "professional");
      if (mongoConnected) {
        if (!user) {
          sendJson(res, 403, { error: "Professional account is not approved or does not exist." });
          return;
        }
        const passwordOk = await validateUserPassword(user, body.password);
        if (!passwordOk) {
          sendJson(res, 401, { error: "Invalid email or password." });
          return;
        }
        if (!user.telegramChatId) {
          sendJson(res, 409, {
            error: "Telegram is not linked to this account. Click Connect Telegram and tap Start in the bot first."
          });
          return;
        }
      }

      const otp = generateOtp();
      const expiresAt = Date.now() + OTP_TTL_MS;
      otpStore.set(email, {
        hash: hashOtp(email, otp),
        expiresAt,
        attempts: 0
      });

      const message = `QuickAid verification code for ${email}: ${otp}. It expires in 5 minutes.`;
      let delivery = { delivered: false, reason: "telegram_not_configured" };
      try {
        const destinationChatId = mongoConnected ? user.telegramChatId : TELEGRAM_CHAT_ID;
        delivery = await sendTelegramMessage(message, destinationChatId);
      } catch (error) {
        console.error("Telegram OTP delivery failed:", error.message);
        delivery = { delivered: false, reason: "telegram_failed" };
      }

      if (mongoConnected && !delivery.delivered) {
        otpStore.delete(email);
        sendJson(res, 502, {
          error: "Telegram could not deliver the code. Reconnect Telegram and try again."
        });
        return;
      }

      console.log(`QuickAid OTP for ${email}: ${otp}`);
      sendJson(res, 200, {
        message: delivery.delivered
          ? "Verification code sent to Telegram."
          : "Verification code generated for local demo.",
        expiresInSeconds: OTP_TTL_MS / 1000,
        delivery: delivery.delivered ? "telegram" : "demo",
        demoCode: delivery.delivered ? undefined : otp
      });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/professional") {
    try {
      const body = await parseBody(req);
      const errors = validateProfessionalLogin(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to sign in.", fields: errors });
        return;
      }

      const email = normalizeEmail(body.email);
      const user = await findApprovedUser(email, "professional");
      if (mongoConnected) {
        if (!user) {
          sendJson(res, 403, { error: "Professional account is not approved or does not exist." });
          return;
        }
        const passwordOk = await validateUserPassword(user, body.password);
        if (!passwordOk) {
          sendJson(res, 401, { error: "Invalid email or password." });
          return;
        }
      }

      const record = otpStore.get(email);
      if (!record) {
        sendJson(res, 400, { error: "Request a verification code first." });
        return;
      }
      if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        sendJson(res, 400, { error: "Verification code expired. Request a new code." });
        return;
      }
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        otpStore.delete(email);
        sendJson(res, 429, { error: "Too many incorrect attempts. Request a new code." });
        return;
      }

      const providedHash = hashOtp(email, body.verification);
      const expected = Buffer.from(record.hash, "hex");
      const provided = Buffer.from(providedHash, "hex");
      if (!crypto.timingSafeEqual(expected, provided)) {
        record.attempts += 1;
        sendJson(res, 400, {
          error: `Incorrect verification code. ${OTP_MAX_ATTEMPTS - record.attempts} attempts left.`
        });
        return;
      }

      otpStore.delete(email);
      if (mongoConnected && user) {
        user.lastLoginAt = new Date();
        await user.save();
      }
      sendJson(res, 200, {
        message: "Professional access approved.",
        session: buildSession("professional", email),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/public") {
    try {
      const body = await parseBody(req);
      const errors = validatePublicLogin(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to sign in.", fields: errors });
        return;
      }

      if (mongoConnected && body.provider !== "google") {
        const email = normalizeEmail(body.email);
        const user = await User.findOne({ email });
        if (user && user.role !== "public") {
          sendJson(res, 403, { error: "Use the professional login for this account." });
          return;
        }
        if (!user) {
          sendJson(res, 404, { error: "Account not found. Create a volunteer account first." });
          return;
        }
        const passwordOk = await validateUserPassword(user, body.password);
        if (!passwordOk) {
          sendJson(res, 401, { error: "Invalid email or password." });
          return;
        }
        user.lastLoginAt = new Date();
        await user.save();
      }

      sendJson(res, 200, {
        message: body.provider === "google" ? "Google demo sign-in approved." : "Public access approved.",
        session: buildSession("public", body.email || "google-user@quickaid.local"),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/volunteer/signup") {
    try {
      const body = await parseBody(req);
      const errors = validateVolunteerSignup(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to create volunteer account.", fields: errors });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: "MongoDB must be connected before creating an account." });
        return;
      }

      const email = normalizeEmail(body.email);
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        sendJson(res, 409, { error: "An account with this email already exists. Sign in instead." });
        return;
      }

      const skills = Array.isArray(body.skills)
        ? body.skills
        : String(body.skills || "").split(",");
      const volunteerSkills = skills
        .map((skill) => String(skill).trim())
        .filter(Boolean)
        .slice(0, 8);

      await User.create({
        name: String(body.name).trim(),
        email,
        passwordHash: await hashPassword(body.password),
        role: "public",
        status: "approved",
        isVolunteer: true,
        phone: String(body.phone).replace(/\s+/g, ""),
        postalCode: String(body.postalCode || "").trim(),
        volunteerSkills,
        volunteerAvailability: body.availability,
        mfaMethod: "none",
        approvedAt: new Date(),
        lastLoginAt: new Date()
      });

      sendJson(res, 201, {
        message: "Volunteer account created successfully.",
        session: buildSession("public", email),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      if (error?.code === 11000) {
        sendJson(res, 409, { error: "An account with this email already exists." });
        return;
      }
      console.error("Volunteer signup failed:", error.message);
      sendJson(res, 500, { error: "Unable to create the account right now." });
    }
    return;
  }

  sendNotFound(res);
}

function serveStatic(req, res) {
  const rawPath = decodeURIComponent(req.url.split("?")[0]);
  const requestedPath = rawPath === "/" ? "/index.html" : rawPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendNotFound(res);
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallbackData) => {
        if (fallbackError) {
          sendNotFound(res);
          return;
        }
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(fallbackData);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

connectDB().then((connected) => {
  mongoConnected = connected;
}).finally(() => {
  server.listen(PORT, HOST, () => {
    console.log(`QuickAid running at http://${HOST}:${PORT}`);
  });
});
