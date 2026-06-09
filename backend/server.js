const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "..", "frontend", "public");

// Short-lived demo token (expires 2026-06-11). Override with ONEMAP_TOKEN for
// longer-term use — generate one at https://www.onemap.gov.sg/apidocs/.
const ONEMAP_TOKEN = process.env.ONEMAP_TOKEN ||
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNTgyOSwiZm9yZXZlciI6ZmFsc2UsImlzcyI6Ik9uZU1hcCIsImlhdCI6MTc4MDkxMTI1OCwibmJmIjoxNzgwOTExMjU4LCJleHAiOjE3ODExNzA0NTgsImp0aSI6IjM0NTlkMWFmLTdmNTItNGI2MS05YjA3LTA5ZGRlNDdmODBjZiJ9.QkDlLIGZoxRlV_fMWw0MStTjSieJqqpIAqeypWlv8JXZ1A5CKBc6Lacanobnatk18NJ3AC62pJ-FOFJIE1KWY2xWE97aAigBykl9knq80kgnQGi6tTtxXu7-qmvjh9WfQob5KbYkzAYLsl-B7EjeNVk4Dq1dPsh4QnfB9NMEmX84r--PYgImLIARclbY09chVsPsFyDBn07jKBgkwh6Y6sykhCQO4BeysAT2np3USnF_XTltU1Jauiy59hT7BiTE0BYc13vLmCh_HO5YcRKqm9yyUG8zNaau6jUnH09amZ_uuP_B4HkuxLyQZ6rajZBTlJoKsnaHaH3wyVDceK7cgQ";

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

function validateProfessionalLogin(body) {
  const errors = {};
  if (!validEmail(body.email)) errors.email = "Enter a valid authorised email.";
  if (typeof body.password !== "string" || body.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
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

  if (req.method === "POST" && req.url === "/api/auth/professional") {
    try {
      const body = await parseBody(req);
      const errors = validateProfessionalLogin(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to sign in.", fields: errors });
        return;
      }
      sendJson(res, 200, {
        message: "Professional access approved.",
        session: buildSession("professional", body.email),
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

server.listen(PORT, HOST, () => {
  console.log(`QuickAid running at http://${HOST}:${PORT}`);
});
