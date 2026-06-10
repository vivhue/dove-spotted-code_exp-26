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
const PROFESSIONAL_TEST_DOMAINS = (process.env.PROFESSIONAL_TEST_DOMAINS || "quickaid.test")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const TELEGRAM_POLLING = process.env.TELEGRAM_POLLING === "true" || !PUBLIC_BASE_URL;
const otpStore = new Map();
const adminSessionStore = new Map();
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
let mongoConnected = false;
let telegramPollOffset = 0;
let telegramPollingStarted = false;

const ONEMAP_TOKEN = process.env.ONEMAP_TOKEN || "";

const FLOOD_ALERTS_URL = "https://api-open.data.gov.sg/v2/real-time/api/weather/flood-alerts";
const ONEMAP_REVGEOCODE_URL = "https://www.onemap.gov.sg/api/public/revgeocode";
const DENGUE_CLUSTERS_DATASET_ID = "d_dbfabf16158d1b0e1c420627c0819168";
const DENGUE_CLUSTERS_POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DENGUE_CLUSTERS_DATASET_ID}/poll-download`;

const cache = new Map();
const PROFESSIONAL_AGENCY_DOMAINS = {
  SCDF: ["scdf.gov.sg"],
  SPF: ["spf.gov.sg"],
  MOH: ["moh.gov.sg"],
  NEA: ["nea.gov.sg"],
  PUB: ["pub.gov.sg"],
  LTA: ["lta.gov.sg"]
};

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

async function fetchDengueClusters() {
  const pollResponse = await fetch(DENGUE_CLUSTERS_POLL_URL);
  if (!pollResponse.ok) throw new Error(`Dengue dataset poll error: ${pollResponse.status}`);
  const pollPayload = await pollResponse.json();
  const downloadUrl = pollPayload.data?.url;
  if (!downloadUrl) throw new Error("Dengue dataset download URL missing");

  const geoResponse = await fetch(downloadUrl);
  if (!geoResponse.ok) throw new Error(`Dengue dataset download error: ${geoResponse.status}`);
  return geoResponse.json();
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

function createAdminSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  adminSessionStore.set(token, {
    userId: String(user._id),
    email: user.email,
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
  });
  return token;
}

function getAdminSession(req) {
  const authorization = String(req.headers.authorization || "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const session = adminSessionStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    adminSessionStore.delete(token);
    return null;
  }
  return { token, ...session };
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

function secureHash(value, purpose) {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${purpose}:${String(value)}`)
    .digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function generateLinkToken() {
  return crypto.randomBytes(18).toString("hex");
}

function hashLinkToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
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

function validateProfessionalSignup(body) {
  const errors = {};
  const name = String(body.name || "").trim();
  const agency = String(body.agency || "").trim().toUpperCase();
  const roleTitle = String(body.roleTitle || "").trim();

  if (name.length < 2 || name.length > 80) errors.name = "Enter your full name.";
  if (!validEmail(body.email)) errors.email = "Enter a valid work email.";
  if (!PROFESSIONAL_AGENCY_DOMAINS[agency]) errors.agency = "Choose a supported agency.";
  if (roleTitle.length < 2 || roleTitle.length > 100) errors.roleTitle = "Enter your role or title.";
  if (typeof body.password !== "string" || body.password.length < 10) {
    errors.password = "Password must be at least 10 characters.";
  }
  if (body.password !== body.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

function validatePasswordReset(body) {
  const errors = {};
  if (!validEmail(body.email)) errors.email = "Enter a valid work email.";
  if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
    errors.code = "Enter the 6-digit reset code.";
  }
  if (typeof body.password !== "string" || body.password.length < 10) {
    errors.password = "Password must be at least 10 characters.";
  }
  if (body.password !== body.confirmPassword) errors.confirmPassword = "Passwords do not match.";
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

async function findUser(email, role, extraSelect = "") {
  if (!mongoConnected) return null;
  const query = { email: normalizeEmail(email) };
  if (role) query.role = role;
  let result = User.findOne(query);
  if (extraSelect) result = result.select(extraSelect);
  return result;
}

function professionalStatusError(user) {
  if (!user) return { statusCode: 404, error: "Professional account not found." };
  if (user.status === "pending") {
    return {
      statusCode: 403,
      error: "Your professional account is pending administrator approval."
    };
  }
  if (user.status === "rejected") {
    return {
      statusCode: 403,
      error: "Your professional account application was rejected. Contact your agency administrator."
    };
  }
  return null;
}

function emailDomain(email) {
  return normalizeEmail(email).split("@")[1] || "";
}

function domainMatches(domain, allowedDomain) {
  return domain === allowedDomain || domain.endsWith(`.${allowedDomain}`);
}

function professionalDomainAllowed(email, agency) {
  const domain = emailDomain(email);
  const agencyDomains = PROFESSIONAL_AGENCY_DOMAINS[agency] || [];
  return [...agencyDomains, ...PROFESSIONAL_TEST_DOMAINS]
    .some((allowedDomain) => domainMatches(domain, allowedDomain));
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

async function processTelegramUpdate(update) {
  const message = update.message;
  const text = message?.text || "";
  const chat = message?.chat;
  const from = message?.from || {};
  const match = text.match(/^\/start(?:\s+(.+))?$/);
  if (!match || !match[1] || !chat?.id) return;

  if (!mongoConnected) {
    await sendTelegramMessage("QuickAid cannot link Telegram right now because MongoDB is not connected.", chat.id);
    return;
  }

  const tokenHash = hashLinkToken(match[1].trim());
  const user = await User.findOne({
    telegramLinkTokenHash: tokenHash,
    telegramLinkExpiresAt: { $gt: new Date() }
  }).select("+telegramLinkTokenHash +telegramLinkExpiresAt");

  if (!user) {
    await sendTelegramMessage("QuickAid Telegram link expired. Please request a new link from the app.", chat.id);
    return;
  }

  await User.updateMany(
    {
      _id: { $ne: user._id },
      telegramChatId: String(chat.id)
    },
    {
      $set: {
        telegramChatId: "",
        telegramUsername: "",
        mfaMethod: "none"
      },
      $unset: {
        telegramLinkedAt: ""
      }
    }
  );

  user.telegramChatId = String(chat.id);
  user.telegramUsername = from.username || chat.username || "";
  user.telegramLinkedAt = new Date();
  user.telegramLinkTokenHash = "";
  user.telegramLinkExpiresAt = undefined;
  user.mfaMethod = "telegram";
  await user.save();

  await sendTelegramMessage(
    `Telegram connected for QuickAid account ${user.email}. You can now receive OTP codes here.`,
    chat.id
  );
  console.log(`Telegram linked for ${user.email}.`);
}

async function pollTelegramUpdates() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_POLLING || telegramPollingStarted) return;
  telegramPollingStarted = true;
  console.log("Telegram local polling enabled.");

  while (telegramPollingStarted) {
    try {
      const params = new URLSearchParams({
        timeout: "20",
        offset: String(telegramPollOffset),
        allowed_updates: JSON.stringify(["message"])
      });
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?${params}`
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.description || `Telegram returned ${response.status}`);
      }

      for (const update of payload.result || []) {
        telegramPollOffset = Math.max(telegramPollOffset, update.update_id + 1);
        await processTelegramUpdate(update);
      }
    } catch (error) {
      console.error("Telegram polling failed:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
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

  if (req.method === "GET" && req.url.startsWith("/api/dengue-clusters")) {
    try {
      const geojson = await cached("dengue-clusters", 30 * 60_000, fetchDengueClusters);
      sendJson(res, 200, { geojson, fetchedAt: new Date().toISOString() });
    } catch (error) {
      sendJson(res, 502, { error: "Unable to reach the dengue clusters service." });
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
      const user = await findUser(email, "professional");
      const statusError = professionalStatusError(user);
      if (statusError) {
        sendJson(res, statusError.statusCode, { error: statusError.error });
        return;
      }
      const passwordOk = await validateUserPassword(user, body.password);
      if (!passwordOk) {
        sendJson(res, 401, { error: "Invalid email or password." });
        return;
      }

      const token = generateLinkToken();
      user.telegramChatId = "";
      user.telegramUsername = "";
      user.telegramLinkedAt = undefined;
      user.telegramLinkTokenHash = hashLinkToken(token);
      user.telegramLinkExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.mfaMethod = "none";
      await user.save();

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
      await processTelegramUpdate(update);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error("Telegram webhook failed:", error.message);
      sendJson(res, 200, { ok: true });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/professional/signup") {
    try {
      const body = await parseBody(req);
      const errors = validateProfessionalSignup(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to submit professional registration.", fields: errors });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: "MongoDB must be connected before creating an account." });
        return;
      }

      const email = normalizeEmail(body.email);
      const agency = String(body.agency).trim().toUpperCase();
      if (!professionalDomainAllowed(email, agency)) {
        sendJson(res, 403, {
          error: `This email domain is not authorised for ${agency}. Use your official agency email.`
        });
        return;
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        sendJson(res, 409, { error: "An account with this email already exists." });
        return;
      }

      await User.create({
        name: String(body.name).trim(),
        email,
        passwordHash: await hashPassword(body.password),
        role: "professional",
        status: "pending",
        agency,
        roleTitle: String(body.roleTitle).trim(),
        mfaMethod: "none"
      });

      sendJson(res, 201, {
        message: "Registration submitted. An administrator must approve your account before you can sign in."
      });
    } catch (error) {
      if (error?.code === 11000) {
        sendJson(res, 409, { error: "An account with this email already exists." });
        return;
      }
      console.error("Professional signup failed:", error.message);
      sendJson(res, 500, { error: "Unable to submit the registration right now." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/admin") {
    try {
      const body = await parseBody(req);
      const errors = validateProfessionalCredentials(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to sign in.", fields: errors });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: "MongoDB is not connected. Admin sign-in is unavailable." });
        return;
      }

      const user = await findUser(body.email, "admin");
      if (!user || user.status !== "approved") {
        sendJson(res, 401, { error: "Invalid administrator email or password." });
        return;
      }
      const passwordOk = await validateUserPassword(user, body.password);
      if (!passwordOk) {
        sendJson(res, 401, { error: "Invalid administrator email or password." });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();
      sendJson(res, 200, {
        message: "Administrator access approved.",
        session: {
          token: createAdminSession(user),
          role: "admin",
          email: user.email,
          issuedAt: new Date().toISOString()
        },
        redirectTo: "/#/admin/approvals"
      });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/admin/logout") {
    const session = getAdminSession(req);
    if (session) adminSessionStore.delete(session.token);
    sendJson(res, 200, { message: "Signed out." });
    return;
  }

  if (req.method === "GET" && req.url === "/api/admin/professionals/pending") {
    const session = getAdminSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Administrator sign-in required." });
      return;
    }
    if (!mongoConnected) {
      sendJson(res, 503, { error: "MongoDB is not connected." });
      return;
    }

    const users = await User.find({ role: "professional", status: "pending" })
      .select("name email agency roleTitle status createdAt")
      .sort({ createdAt: 1 })
      .lean();
    sendJson(res, 200, { users });
    return;
  }

  if (req.method === "PATCH" && /^\/api\/admin\/professionals\/[^/]+\/status$/.test(req.url)) {
    const session = getAdminSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Administrator sign-in required." });
      return;
    }
    if (!mongoConnected) {
      sendJson(res, 503, { error: "MongoDB is not connected." });
      return;
    }

    try {
      const userId = req.url.split("/")[4];
      const body = await parseBody(req);
      if (!["approved", "rejected"].includes(body.status)) {
        sendJson(res, 400, { error: "Status must be approved or rejected." });
        return;
      }

      const update = {
        status: body.status,
        approvedAt: body.status === "approved" ? new Date() : undefined
      };
      const user = await User.findOneAndUpdate(
        { _id: userId, role: "professional", status: "pending" },
        { $set: update },
        { returnDocument: "after" }
      ).select("name email agency roleTitle status");

      if (!user) {
        sendJson(res, 404, { error: "Pending professional account not found." });
        return;
      }
      sendJson(res, 200, {
        message: `${user.name}'s account was ${body.status}.`,
        user
      });
    } catch (error) {
      sendJson(res, 400, { error: "Unable to update this professional account." });
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

      if (!mongoConnected) {
        sendJson(res, 503, {
          error: "MongoDB is not connected. Professional OTP cannot be sent safely."
        });
        return;
      }

      const email = normalizeEmail(body.email);
      const user = await findUser(email, "professional");
      const statusError = professionalStatusError(user);
      if (statusError) {
        sendJson(res, statusError.statusCode, { error: statusError.error });
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
        delivery = await sendTelegramMessage(message, user.telegramChatId);
      } catch (error) {
        console.error("Telegram OTP delivery failed:", error.message);
        delivery = { delivered: false, reason: "telegram_failed" };
      }

      if (!delivery.delivered) {
        otpStore.delete(email);
        sendJson(res, 502, {
          error: "Telegram could not deliver the code. Reconnect Telegram and try again."
        });
        return;
      }

      console.log(`QuickAid OTP for ${email}: ${otp}`);
      sendJson(res, 200, {
        message: "Verification code sent to the Telegram account linked to this professional.",
        expiresInSeconds: OTP_TTL_MS / 1000,
        delivery: "telegram"
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

      if (!mongoConnected) {
        sendJson(res, 503, { error: "MongoDB is not connected. Professional sign-in is unavailable." });
        return;
      }

      const email = normalizeEmail(body.email);
      const user = await findUser(email, "professional");
      const statusError = professionalStatusError(user);
      if (statusError) {
        sendJson(res, statusError.statusCode, { error: statusError.error });
        return;
      }
      const passwordOk = await validateUserPassword(user, body.password);
      if (!passwordOk) {
        sendJson(res, 401, { error: "Invalid email or password." });
        return;
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
      user.lastLoginAt = new Date();
      await user.save();
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

  if (req.method === "POST" && req.url === "/api/auth/professional/reset/request") {
    try {
      const body = await parseBody(req);
      if (!validEmail(body.email)) {
        sendJson(res, 400, { error: "Enter a valid work email." });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: "MongoDB is not connected. Password reset is unavailable." });
        return;
      }

      const email = normalizeEmail(body.email);
      const user = await findUser(
        email,
        "professional",
        "+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts"
      );
      const statusError = professionalStatusError(user);
      if (statusError) {
        sendJson(res, statusError.statusCode, { error: statusError.error });
        return;
      }
      if (!user.telegramChatId) {
        sendJson(res, 409, {
          error: "Telegram is not linked to this account. Contact your agency administrator for password assistance."
        });
        return;
      }

      const code = generateOtp();
      user.passwordResetCodeHash = secureHash(`${email}:${code}`, "password-reset");
      user.passwordResetExpiresAt = new Date(Date.now() + OTP_TTL_MS);
      user.passwordResetAttempts = 0;
      await user.save();

      try {
        const delivery = await sendTelegramMessage(
          `QuickAid password reset code for ${email}: ${code}. It expires in 5 minutes. If you did not request this, ignore this message.`,
          user.telegramChatId
        );
        if (!delivery.delivered) throw new Error("Telegram is not configured");
      } catch (error) {
        user.passwordResetCodeHash = "";
        user.passwordResetExpiresAt = undefined;
        user.passwordResetAttempts = 0;
        await user.save();
        console.error("Telegram password reset delivery failed:", error.message);
        sendJson(res, 502, { error: "Telegram could not deliver the reset code. Try again later." });
        return;
      }

      sendJson(res, 200, {
        message: "A password reset code was sent to the Telegram account linked to this professional."
      });
    } catch (error) {
      console.error("Password reset request failed:", error.message);
      sendJson(res, 400, { error: "Unable to request a password reset." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/professional/reset/confirm") {
    try {
      const body = await parseBody(req);
      const errors = validatePasswordReset(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to reset password.", fields: errors });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: "MongoDB is not connected. Password reset is unavailable." });
        return;
      }

      const email = normalizeEmail(body.email);
      const user = await findUser(
        email,
        "professional",
        "+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts"
      );
      const statusError = professionalStatusError(user);
      if (statusError) {
        sendJson(res, statusError.statusCode, { error: statusError.error });
        return;
      }
      if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
        sendJson(res, 400, { error: "Request a password reset code first." });
        return;
      }
      if (Date.now() > user.passwordResetExpiresAt.getTime()) {
        user.passwordResetCodeHash = "";
        user.passwordResetExpiresAt = undefined;
        user.passwordResetAttempts = 0;
        await user.save();
        sendJson(res, 400, { error: "Reset code expired. Request a new code." });
        return;
      }
      if (user.passwordResetAttempts >= OTP_MAX_ATTEMPTS) {
        user.passwordResetCodeHash = "";
        user.passwordResetExpiresAt = undefined;
        user.passwordResetAttempts = 0;
        await user.save();
        sendJson(res, 429, { error: "Too many incorrect attempts. Request a new code." });
        return;
      }

      const suppliedHash = secureHash(`${email}:${body.code}`, "password-reset");
      const expected = Buffer.from(user.passwordResetCodeHash, "hex");
      const supplied = Buffer.from(suppliedHash, "hex");
      if (!crypto.timingSafeEqual(expected, supplied)) {
        user.passwordResetAttempts += 1;
        await user.save();
        sendJson(res, 400, {
          error: `Incorrect reset code. ${OTP_MAX_ATTEMPTS - user.passwordResetAttempts} attempts left.`
        });
        return;
      }

      user.passwordHash = await hashPassword(body.password);
      user.passwordResetCodeHash = "";
      user.passwordResetExpiresAt = undefined;
      user.passwordResetAttempts = 0;
      await user.save();
      sendJson(res, 200, { message: "Password updated. You can now sign in with your new password." });
    } catch (error) {
      console.error("Password reset confirmation failed:", error.message);
      sendJson(res, 400, { error: "Unable to reset password." });
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
    pollTelegramUpdates();
  });
});
