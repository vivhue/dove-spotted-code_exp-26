const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const connectDB = require("./config/db");
const User = require("./models/User");
const { hashPassword, verifyPassword } = require("./utils/password");
const logger = require("./utils/logger");

loadEnvFile(path.join(__dirname, "..", ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "..", "frontend", "public");
const PROFESSIONAL_TEST_DOMAINS = (process.env.PROFESSIONAL_TEST_DOMAINS || "quickaid.test")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_RATE_WINDOW_MS = 60 * 1000;
const LOGIN_RATE_MAX_FAILURES = 3;
const ACCOUNT_LOCK_FAILURES = 3;
const ACCOUNT_LOCK_MS = 60 * 1000;
const PASSWORD_REQUIREMENTS_MESSAGE = "Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.";
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again later.";
const userSessionStore = new Map();
const loginRateLimitStore = new Map();
let mongoConnected = false;

const ONEMAP_TOKEN = process.env.ONEMAP_TOKEN || "";

const FLOOD_ALERTS_URL = "https://api-open.data.gov.sg/v2/real-time/api/weather/flood-alerts";
const ONEMAP_REVGEOCODE_URL = "https://www.onemap.gov.sg/api/public/revgeocode";
const ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search";
const DENGUE_CLUSTERS_DATASET_ID = "d_dbfabf16158d1b0e1c420627c0819168";
const DENGUE_CLUSTERS_POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DENGUE_CLUSTERS_DATASET_ID}/poll-download`;

const ORS_API_KEY = process.env.ORS_API_KEY || "";
const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const LTA_ACCOUNT_KEY = process.env.LTA_ACCOUNT_KEY || "";
const LTA_INCIDENTS_URL = "https://datamall2.mytransport.sg/ltaodataservice/TrafficIncidents";
const EVAC_BLOCKAGE_BUFFER_M = Number(process.env.EVAC_BLOCKAGE_BUFFER_M || 600);
const EVAC_HAZARDS_TTL_MS = 2 * 60_000;
const EVAC_DENGUE_TTL_MS = 30 * 60_000;
let evacuationDemoData = null;

const cache = new Map();
const PROFESSIONAL_AGENCY_DOMAINS = {
  SCDF: ["scdf.gov.sg"],
  SPF: ["spf.gov.sg"],
  MOH: ["moh.gov.sg"],
  NEA: ["nea.gov.sg"],
  PUB: ["pub.gov.sg"],
  LTA: ["lta.gov.sg"]
};
const risk = require("./risk");
const analytics = require("./analytics");

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

function loadEvacuationDemoData() {
  if (!evacuationDemoData) {
    const fpath = path.join(__dirname, "data", "evacuation-demo.json");
    evacuationDemoData = JSON.parse(fs.readFileSync(fpath, "utf8"));
  }
  return evacuationDemoData;
}

function squarePolygonRing(lat, lng, bufferMeters) {
  const dLat = bufferMeters / 111_320;
  const dLng = bufferMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat]
  ];
}

function extractPolygonsFromGeoJson(geojson) {
  const polygons = [];
  (geojson?.features || []).forEach((feature) => {
    const geometry = feature.geometry;
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      polygons.push(geometry.coordinates);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => polygons.push(polygon));
    }
  });
  return polygons;
}

function buildCombinedAvoidPolygons(hazards, avoid, bufferMeters) {
  const polygons = [];
  if (avoid?.flood) {
    (hazards.flood?.points || []).forEach((point) => {
      polygons.push([squarePolygonRing(point.lat, point.lng, bufferMeters)]);
    });
  }
  if (avoid?.incidents) {
    (hazards.incidents?.points || []).forEach((point) => {
      polygons.push([squarePolygonRing(point.lat, point.lng, bufferMeters)]);
    });
  }
  if (avoid?.dengue) {
    extractPolygonsFromGeoJson(hazards.dengue?.geojson).forEach((polygon) => polygons.push(polygon));
  }
  return { type: "MultiPolygon", coordinates: polygons };
}

function activeFloodPoints(records) {
  const cancelledIds = new Set();
  records.forEach((record) => {
    const item = record.item;
    if (item?.msgType === "Cancel" && item.references) {
      item.references.split(";").forEach((group) => {
        const parts = group.split(",").map((part) => part.trim());
        if (parts.length >= 2) cancelledIds.add(parts[1]);
      });
    }
  });

  const points = [];
  records
    .filter((record) => record.item?.msgType === "Alert" && !cancelledIds.has(record.item.identifier))
    .forEach((record) => {
      (record.item.readings || []).forEach((reading) => {
        if (reading.event === "Flood" && Array.isArray(reading.area?.circle)) {
          const [lat, lng] = reading.area.circle;
          points.push({ lat, lng, type: "flood", label: reading.headline || reading.description || "Flood alert" });
        }
      });
    });
  return points;
}

async function fetchLtaIncidents() {
  if (!LTA_ACCOUNT_KEY) throw new Error("LTA_ACCOUNT_KEY is not configured");
  const response = await fetch(LTA_INCIDENTS_URL, {
    headers: { AccountKey: LTA_ACCOUNT_KEY, accept: "application/json" }
  });
  if (!response.ok) throw new Error(`LTA traffic incidents upstream error: ${response.status}`);
  const payload = await response.json();
  return (payload.value || [])
    .filter((incident) => Number.isFinite(incident.Latitude) && Number.isFinite(incident.Longitude))
    .map((incident) => ({
      lat: incident.Latitude,
      lng: incident.Longitude,
      type: "incident",
      label: incident.Message || incident.Type || "Traffic incident"
    }));
}

async function getFloodHazard(demo) {
  if (demo) {
    const demoData = loadEvacuationDemoData();
    return { points: demoData.floodPoints, source: "demo" };
  }

  return cached("hazard-flood", EVAC_HAZARDS_TTL_MS, async () => {
    try {
      const points = activeFloodPoints(await fetchFloodAlerts());
      if (!points.length) {
        const demoData = loadEvacuationDemoData();
        return { points: demoData.floodPoints, source: "demo-fallback" };
      }
      return { points, source: "live" };
    } catch (error) {
      logger.logError("getFloodHazard", error);
      const demoData = loadEvacuationDemoData();
      return { points: demoData.floodPoints, source: "demo-fallback" };
    }
  });
}

async function getIncidentHazard(demo) {
  if (demo) {
    const demoData = loadEvacuationDemoData();
    return { points: demoData.incidentPoints, source: "demo" };
  }

  return cached("hazard-incidents", EVAC_HAZARDS_TTL_MS, async () => {
    try {
      const points = await fetchLtaIncidents();
      if (!points.length) {
        const demoData = loadEvacuationDemoData();
        return { points: demoData.incidentPoints, source: "demo-fallback" };
      }
      return { points, source: "live" };
    } catch (error) {
      logger.logError("getIncidentHazard", error);
      const demoData = loadEvacuationDemoData();
      return { points: demoData.incidentPoints, source: "demo-fallback" };
    }
  });
}

async function getDengueHazard(demo) {
  if (demo) {
    const demoData = loadEvacuationDemoData();
    return { geojson: demoData.dengueGeoJson, source: "demo" };
  }

  return cached("hazard-dengue", EVAC_DENGUE_TTL_MS, async () => {
    try {
      const geojson = await fetchDengueClusters();
      if (!geojson?.features?.length) {
        const demoData = loadEvacuationDemoData();
        return { geojson: demoData.dengueGeoJson, source: "demo-fallback" };
      }
      return { geojson, source: "live" };
    } catch (error) {
      logger.logError("getDengueHazard", error);
      const demoData = loadEvacuationDemoData();
      return { geojson: demoData.dengueGeoJson, source: "demo-fallback" };
    }
  });
}

async function getEvacuationHazards(demo) {
  const [flood, incidents, dengue] = await Promise.all([
    getFloodHazard(demo),
    getIncidentHazard(demo),
    getDengueHazard(demo)
  ]);
  return { flood, incidents, dengue };
}

async function fetchOrsRoute(start, end, avoidPolygons) {
  if (!ORS_API_KEY) throw new Error("ORS_API_KEY is not configured");

  const body = {
    coordinates: [
      [start.lng, start.lat],
      [end.lng, end.lat]
    ]
  };
  if (avoidPolygons && avoidPolygons.coordinates.length) {
    body.options = { avoid_polygons: avoidPolygons };
  }

  const response = await fetch(ORS_DIRECTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`ORS directions upstream error: ${response.status} ${text}`);
  }
  return response.json();
}

function routeCoordsMatch(a, b) {
  const coordsA = a?.features?.[0]?.geometry?.coordinates;
  const coordsB = b?.features?.[0]?.geometry?.coordinates;
  return JSON.stringify(coordsA) === JSON.stringify(coordsB);
}

function isValidCoord(value) {
  return value && Number.isFinite(value.lat) && Number.isFinite(value.lng);
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

async function fetchOneMapSearch(query) {
  const url = `${ONEMAP_SEARCH_URL}?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OneMap search upstream error: ${response.status}`);
  const payload = await response.json();
  return (payload.results || [])
    .map((result) => ({
      name: result.SEARCHVAL,
      address: result.ADDRESS,
      postalCode: result.POSTAL,
      lat: Number(result.LATITUDE),
      lng: Number(result.LONGITUDE)
    }))
    .filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lng));
}

function volunteerLocationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolveVolunteerLocation(locationLabel, zone) {
  const input = String(locationLabel || "").trim();
  const zoneCoordinates = ZONE_COORDINATES[zone];
  if (!/^\d{6}$/.test(input)) {
    return {
      currentLocationLabel: input,
      postalCode: "",
      locationVerified: false,
      lat: zoneCoordinates.lat,
      lng: zoneCoordinates.lng
    };
  }

  let results;
  try {
    results = await cached(`onemap-search:${input}`, 30 * 60_000, () => fetchOneMapSearch(input));
  } catch (error) {
    throw volunteerLocationError("Unable to verify that postal code with OneMap right now.", 502);
  }

  const result = results.find((item) => item.postalCode === input) || results[0];
  if (!result) {
    throw volunteerLocationError("No Singapore location was found for that postal code.");
  }

  return {
    currentLocationLabel: result.address || result.name || `Singapore ${input}`,
    postalCode: result.postalCode || input,
    locationVerified: true,
    lat: result.lat,
    lng: result.lng
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

function normalizeZone(zone) {
  const trimmed = String(zone || "").trim();
  return Object.keys(ZONE_COORDINATES).find((candidate) => candidate.toLowerCase() === trimmed.toLowerCase()) || trimmed;
}

function normalizeVolunteerSkills(skills) {
  const raw = Array.isArray(skills) ? skills : String(skills || "").split(",");
  return raw
    .map((skill) => String(skill).trim())
    .filter(Boolean)
    .slice(0, 8);
}

function volunteerBaseStatus(availability) {
  return availability === "Off Duty" ? "Off Duty" : "Available";
}

function deploymentTaskForScenario(scenario) {
  if (!scenario) return "General volunteer support";
  if (scenario.type === "Flood") return "Support shelter intake, distribution, and flood relief";
  if (scenario.type === "Fire") return "Assist evacuation support and first-aid logistics";
  if (scenario.type === "Health") return "Support triage logistics and community outreach";
  return "General volunteer support";
}

function serializeVolunteer(volunteer) {
  return {
    ...volunteer,
    skills: [...volunteer.skills]
  };
}

function volunteerActiveAssignment(volunteer) {
  return Boolean(volunteer.assignedIncidentId) && ["Assigned", "En Route", "On Site"].includes(volunteer.status);
}

function validateVolunteerProfile(body, { requireIdentity = true } = {}) {
  const errors = {};
  const name = String(body.name || "").trim();
  const zone = normalizeZone(body.zone);
  const phone = String(body.phone || "").replace(/\s+/g, "");
  const locationLabel = String(body.currentLocationLabel || "").trim();
  const availability = String(body.availability || "").trim();

  if (requireIdentity && (name.length < 2 || name.length > 80)) errors.name = "Enter the volunteer's full name.";
  if (requireIdentity && !validEmail(body.email)) errors.email = "Enter a valid volunteer email.";
  if (requireIdentity && !/^[689]\d{7}$/.test(phone)) errors.phone = "Enter a valid 8-digit Singapore phone number.";
  if (!zone || !ZONE_COORDINATES[zone]) errors.zone = "Choose a supported zone.";
  if (locationLabel.length < 2 || locationLabel.length > 120) errors.currentLocationLabel = "Enter the volunteer's current location.";
  if (!VOLUNTEER_AVAILABILITY_OPTIONS.includes(availability)) errors.availability = "Availability must be Available or Off Duty.";
  return errors;
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

let emergencySpaces = [
  {
    id: 1,
    name: "Singapore Expo Hall 3",
    type: "Temporary Shelter",
    region: "Changi",
    capacity: 1200,
    currentOccupancy: 0,
    setupTimeHours: 2,
    wheelchairAccess: true,
    status: "READY"
  },
  {
    id: 2,
    name: "Jurong East Sports Hall",
    type: "Temporary Shelter",
    region: "Jurong East",
    capacity: 500,
    currentOccupancy: 0,
    setupTimeHours: 1,
    wheelchairAccess: true,
    status: "READY"
  },
  {
    id: 3,
    name: "Our Tampines Hub",
    type: "Temporary Shelter",
    region: "Tampines",
    capacity: 800,
    currentOccupancy: 0,
    setupTimeHours: 1.5,
    wheelchairAccess: true,
    status: "READY"
  }
];
let nextEmergencySpaceId = Math.max(...emergencySpaces.map((space) => space.id)) + 1;

function serializeEmergencySpace(space) {
  const capacity = Math.max(0, Number(space.capacity) || 0);
  const currentOccupancy = Math.max(0, Math.min(capacity, Number(space.currentOccupancy ?? space.occupancy) || 0));
  const status = String(space.status || "INACTIVE").toUpperCase();
  return {
    ...space,
    capacity,
    currentOccupancy,
    occupancy: currentOccupancy,
    status
  };
}

function emergencySpaceStatusFor({ capacity, currentOccupancy, requestedStatus }) {
  const status = String(requestedStatus || "").toUpperCase();
  if (status === "INACTIVE" || status === "CLOSED") return "INACTIVE";
  if (currentOccupancy >= capacity && capacity > 0) return "FULL";
  if (currentOccupancy >= capacity * 0.7 && capacity > 0) return "NEARLY FULL";
  return "READY";
}

function validateEmergencySpace(body, { partial = false } = {}) {
  const errors = {};
  const get = (field) => body[field] !== undefined && body[field] !== null;
  const allowedTypes = new Set(["Temporary Shelter", "Hospital"]);
  if (!partial || get("name")) {
    const name = String(body.name || "").trim();
    if (name.length < 3 || name.length > 100) errors.name = "Enter a space name between 3 and 100 characters.";
  }
  if (!partial || get("type")) {
    const type = String(body.type || "").trim();
    if (!allowedTypes.has(type)) errors.type = "Choose Shelter or Hospital.";
  }
  if (!partial || get("region")) {
    const region = String(body.region || "").trim();
    if (region.length < 2 || region.length > 80) errors.region = "Enter the region or zone.";
  }
  if (!partial || get("address")) {
    const address = String(body.address || "").trim();
    if (address.length < 2 || address.length > 140) errors.address = "Enter the location or address.";
  }
  if (!partial || get("capacity")) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) errors.capacity = "Capacity must be a whole number from 1 to 10000.";
  }
  if (get("currentOccupancy")) {
    const occupancy = Number(body.currentOccupancy);
    if (!Number.isInteger(occupancy) || occupancy < 0) errors.currentOccupancy = "Occupancy must be a whole number of zero or more.";
  }
  if (get("setupTimeHours")) {
    const setupTimeHours = Number(body.setupTimeHours);
    if (!Number.isFinite(setupTimeHours) || setupTimeHours < 0 || setupTimeHours > 168) errors.setupTimeHours = "Setup time must be between 0 and 168 hours.";
  }
  const hasLat = get("lat") && String(body.lat).trim() !== "";
  const hasLng = get("lng") && String(body.lng).trim() !== "";
  if (hasLat || hasLng) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!hasLat || !hasLng || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.location = "Location coordinates must be valid latitude and longitude values.";
    }
  }
  return errors;
}

function requireProfessionalSession(req, res, action = "perform this action") {
  const session = getUserSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Professional sign-in required." });
    return null;
  }
  if (session.role !== "professional") {
    sendJson(res, 403, { error: `Only professional accounts can ${action}.` });
    return null;
  }
  return session;
}

const simulationScenarios = [
  {
    id: "flash-flood-jurong",
    name: "Flash Flood — Jurong West",
    status: "Active",
    type: "Flood",
    zone: "Jurong West",
    severity: "Critical",
    affectedPeople: 650,
    estimatedCasualties: 120,
    resourceDemand: {
      shelterSpaces: 400,
      hospitalBeds: 80,
      volunteersNeeded: 20,
      medicalKits: 60,
      foodPacks: 500
    }
  },
  {
    id: "fire-bedok",
    name: "Residential Fire — Bedok",
    status: "Active",
    type: "Fire",
    zone: "Bedok",
    severity: "High",
    affectedPeople: 180,
    estimatedCasualties: 35,
    resourceDemand: {
      shelterSpaces: 120,
      hospitalBeds: 25,
      volunteersNeeded: 8,
      medicalKits: 30,
      foodPacks: 150
    }
  },
  {
    id: "dengue-tampines",
    name: "Dengue Cluster Surge — Tampines",
    status: "Active",
    type: "Health",
    zone: "Tampines",
    severity: "Medium",
    affectedPeople: 90,
    estimatedCasualties: 15,
    resourceDemand: {
      shelterSpaces: 0,
      hospitalBeds: 20,
      volunteersNeeded: 6,
      medicalKits: 25,
      foodPacks: 0
    }
  },
  {
    id: "shelter-support-clementi",
    name: "Community Shelter Support — Clementi",
    status: "Completed",
    type: "Flood",
    zone: "Clementi",
    severity: "Medium",
    affectedPeople: 120,
    estimatedCasualties: 4,
    resourceDemand: {
      shelterSpaces: 80,
      hospitalBeds: 5,
      volunteersNeeded: 4,
      medicalKits: 10,
      foodPacks: 120
    }
  }
];

const VOLUNTEER_STATUSES = ["Available", "Assigned", "En Route", "On Site", "Completed", "Off Duty"];
const VOLUNTEER_AVAILABILITY_OPTIONS = ["Available", "Off Duty"];
const ZONE_COORDINATES = {
  "Jurong West": { lat: 1.3507, lng: 103.7004 },
  "Jurong East": { lat: 1.3331, lng: 103.7422 },
  Bedok: { lat: 1.3236, lng: 103.9273 },
  Tampines: { lat: 1.3496, lng: 103.9568 },
  Changi: { lat: 1.3644, lng: 103.9915 },
  Clementi: { lat: 1.3151, lng: 103.7652 },
  "Bukit Timah": { lat: 1.3294, lng: 103.8021 }
};

let volunteerProfiles = [
  {
    id: 1,
    name: "Aisha Rahman",
    email: "aisha.volunteer@quickaid.local",
    phone: "81234567",
    skills: ["First Aid", "Driving"],
    zone: "Jurong West",
    currentLocationLabel: "Jurong Spring Community Club",
    availability: "Available",
    status: "Available",
    assignedIncidentId: "",
    assignedIncidentName: "",
    assignedTask: "",
    notificationMessage: "",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES["Jurong West"].lat,
    lng: ZONE_COORDINATES["Jurong West"].lng
  },
  {
    id: 2,
    name: "Daniel Lim",
    email: "daniel.volunteer@quickaid.local",
    phone: "82345678",
    skills: ["Logistics", "Crowd Control"],
    zone: "Bedok",
    currentLocationLabel: "Bedok North Ave 3",
    availability: "Available",
    status: "Available",
    assignedIncidentId: "",
    assignedIncidentName: "",
    assignedTask: "",
    notificationMessage: "",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES.Bedok.lat,
    lng: ZONE_COORDINATES.Bedok.lng
  },
  {
    id: 3,
    name: "Mei Tan",
    email: "mei.volunteer@quickaid.local",
    phone: "83456789",
    skills: ["Translation", "Community Outreach"],
    zone: "Tampines",
    currentLocationLabel: "Our Tampines Hub",
    availability: "Available",
    status: "Available",
    assignedIncidentId: "",
    assignedIncidentName: "",
    assignedTask: "",
    notificationMessage: "",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES.Tampines.lat,
    lng: ZONE_COORDINATES.Tampines.lng
  },
  {
    id: 4,
    name: "Ryan Goh",
    email: "ryan.volunteer@quickaid.local",
    phone: "84567890",
    skills: ["First Aid", "Shelter Ops"],
    zone: "Jurong East",
    currentLocationLabel: "Jurong East Sports Hall",
    availability: "Off Duty",
    status: "Off Duty",
    assignedIncidentId: "",
    assignedIncidentName: "",
    assignedTask: "",
    notificationMessage: "",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES["Jurong East"].lat,
    lng: ZONE_COORDINATES["Jurong East"].lng
  },
  {
    id: 5,
    name: "Priya Nair",
    email: "priya.volunteer@quickaid.local",
    phone: "85678901",
    skills: ["First Aid", "Logistics"],
    zone: "Jurong West",
    currentLocationLabel: "Boon Lay Community Club",
    availability: "Available",
    status: "Assigned",
    assignedIncidentId: "flash-flood-jurong",
    assignedIncidentName: "Flash Flood — Jurong West",
    assignedTask: "Support shelter intake, distribution, and flood relief",
    notificationMessage: "Simulated notification: Assignment received. Awaiting departure.",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES["Jurong West"].lat,
    lng: ZONE_COORDINATES["Jurong West"].lng
  },
  {
    id: 6,
    name: "Marcus Lee",
    email: "marcus.volunteer@quickaid.local",
    phone: "86789012",
    skills: ["Driving", "Crowd Control"],
    zone: "Bedok",
    currentLocationLabel: "Bedok Community Centre",
    availability: "Available",
    status: "En Route",
    assignedIncidentId: "fire-bedok",
    assignedIncidentName: "Residential Fire — Bedok",
    assignedTask: "Assist evacuation support and first-aid logistics",
    notificationMessage: "Simulated notification: Volunteer is travelling to the incident.",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES.Bedok.lat,
    lng: ZONE_COORDINATES.Bedok.lng
  },
  {
    id: 7,
    name: "Nur Izzati",
    email: "izzati.volunteer@quickaid.local",
    phone: "87890123",
    skills: ["First Aid", "Community Outreach"],
    zone: "Tampines",
    currentLocationLabel: "Tampines West Community Club",
    availability: "Available",
    status: "On Site",
    assignedIncidentId: "dengue-tampines",
    assignedIncidentName: "Dengue Cluster Surge — Tampines",
    assignedTask: "Support triage logistics and community outreach",
    notificationMessage: "Simulated notification: Volunteer has arrived on site.",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES.Tampines.lat,
    lng: ZONE_COORDINATES.Tampines.lng
  },
  {
    id: 8,
    name: "Ethan Wong",
    email: "ethan.volunteer@quickaid.local",
    phone: "88901234",
    skills: ["Shelter Ops", "Translation"],
    zone: "Clementi",
    currentLocationLabel: "Clementi Community Centre",
    availability: "Available",
    status: "Completed",
    assignedIncidentId: "shelter-support-clementi",
    assignedIncidentName: "Community Shelter Support — Clementi",
    assignedTask: "Support shelter intake, distribution, and flood relief",
    notificationMessage: "Simulated notification: The incident has ended and all assigned deployments are complete.",
    deploymentResponsePending: false,
    lat: ZONE_COORDINATES.Clementi.lat,
    lng: ZONE_COORDINATES.Clementi.lng
  }
];
let nextVolunteerId = volunteerProfiles.length + 1;

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

function createUserSession(res, req, user) {
  const token = crypto.randomBytes(32).toString("hex");
  const issuedAt = new Date().toISOString();
  userSessionStore.set(token, {
    userId: String(user._id),
    name: user.name || "",
    email: user.email,
    role: user.role,
    issuedAt,
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  const secure = req.socket.encrypted || req.headers["x-forwarded-proto"] === "https";
  res.setHeader(
    "Set-Cookie",
    `quickaid_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure ? "; Secure" : ""}`
  );
  return {
    name: user.name || "",
    role: user.role,
    email: user.email,
    issuedAt
  };
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .reduce((cookies, pair) => {
      const separator = pair.indexOf("=");
      if (separator === -1) return cookies;
      const key = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (key) cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getUserSession(req) {
  const token = parseCookies(req).quickaid_session || "";
  const session = userSessionStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    userSessionStore.delete(token);
    return null;
  }
  return { token, ...session };
}

function clearUserSession(req, res) {
  const session = getUserSession(req);
  if (session) userSessionStore.delete(session.token);
  res.setHeader("Set-Cookie", "quickaid_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
}

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const SECURITY_QUESTIONS = {
  first_school: "What was the name of your first school?",
  childhood_nickname: "What was your childhood nickname?",
  memorable_place: "What place is most memorable to you?",
  first_job: "What was your first job or volunteer role?"
};

function normalizeSecurityAnswer(answer) {
  return String(answer || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function securityAnswerDigest(answer) {
  return crypto.createHash("sha256").update(normalizeSecurityAnswer(answer), "utf8").digest("hex");
}

function validSecurityQuestion(question) {
  return Boolean(SECURITY_QUESTIONS[String(question || "").trim()]);
}

function validSecurityAnswer(answer) {
  const normalized = normalizeSecurityAnswer(answer);
  return normalized.length >= 2 && normalized.length <= 120;
}

function invalidateUserSessions(userId) {
  const targetId = String(userId);
  userSessionStore.forEach((session, token) => {
    if (String(session.userId) === targetId) userSessionStore.delete(token);
  });
}

function hasMissingRequired(body, fields) {
  return fields.some((field) => {
    const value = body[field];
    if (typeof value === "boolean") return value !== true;
    return String(value || "").trim() === "";
  });
}

function professionalDomainList() {
  return Object.values(PROFESSIONAL_AGENCY_DOMAINS).flat();
}

function personalDomainAllowed(email) {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (domain === "gov.sg" || domain.endsWith(".gov.sg")) return false;
  return ![...professionalDomainList(), ...PROFESSIONAL_TEST_DOMAINS]
    .some((allowedDomain) => domainMatches(domain, allowedDomain));
}

function validateProfessionalCredentials(body) {
  const errors = {};
  if (hasMissingRequired(body, ["email", "password"])) {
    errors.required = "Please fill in all required fields.";
    return errors;
  }
  if (!validEmail(body.email)) errors.email = "Please enter a valid email address.";
  return errors;
}

function validateProfessionalSignup(body) {
  const errors = {};
  const name = String(body.name || "").trim();
  const agency = String(body.agency || "").trim().toUpperCase();
  const roleTitle = String(body.roleTitle || "").trim();

  if (hasMissingRequired(body, ["name", "email", "agency", "roleTitle", "password", "confirmPassword", "securityQuestion", "securityAnswer"])) {
    errors.required = "Please fill in all required fields.";
    return errors;
  }
  if (name.length < 2 || name.length > 80) errors.name = "Enter your full name.";
  if (!validEmail(body.email)) errors.email = "Please enter a valid email address.";
  if (!PROFESSIONAL_AGENCY_DOMAINS[agency]) errors.agency = "Choose a supported agency.";
  if (roleTitle.length < 2 || roleTitle.length > 100) errors.roleTitle = "Enter your role or title.";
  if (!isStrongPassword(body.password)) errors.password = PASSWORD_REQUIREMENTS_MESSAGE;
  if (body.password !== body.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!validSecurityQuestion(body.securityQuestion)) errors.securityQuestion = "Choose a security question.";
  if (!validSecurityAnswer(body.securityAnswer)) errors.securityAnswer = "Security answer must contain 2 to 120 characters.";
  return errors;
}

function validatePublicLogin(body) {
  const errors = {};
  if (hasMissingRequired(body, ["email", "password"])) {
    errors.required = "Please fill in all required fields.";
    return errors;
  }
  if (!validEmail(body.email)) errors.email = "Please enter a valid email address.";
  return errors;
}

function validateVolunteerSignup(body) {
  const errors = {};
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/\s+/g, "");
  const postalCode = String(body.postalCode || "").trim();
  const allowedAvailability = ["weekdays", "evenings", "weekends", "emergency"];

  if (hasMissingRequired(body, ["name", "email", "phone", "password", "confirmPassword", "securityQuestion", "securityAnswer", "availability", "acceptTerms"])) {
    errors.required = "Please fill in all required fields.";
    return errors;
  }
  if (name.length < 2 || name.length > 80) errors.name = "Enter your full name.";
  if (!validEmail(body.email)) errors.email = "Please enter a valid email address.";
  else if (!personalDomainAllowed(body.email)) errors.email = "Please use a valid personal email address.";
  if (!isStrongPassword(body.password)) errors.password = PASSWORD_REQUIREMENTS_MESSAGE;
  if (body.password !== body.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!validSecurityQuestion(body.securityQuestion)) errors.securityQuestion = "Choose a security question.";
  if (!validSecurityAnswer(body.securityAnswer)) errors.securityAnswer = "Security answer must contain 2 to 120 characters.";
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
  if (role === "volunteer") {
    query.$or = [
      { role: "volunteer" },
      { role: "public", isVolunteer: true }
    ];
  } else if (role) {
    query.role = role;
  }
  let result = User.findOne(query);
  if (extraSelect) result = result.select(extraSelect);
  return result;
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

function loginRateKey(req, role, email) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const address = forwarded || req.socket.remoteAddress || "unknown";
  return `${role}:${address}:${normalizeEmail(email)}`;
}

function loginRateStatus(key) {
  const record = loginRateLimitStore.get(key);
  if (!record) return null;
  if (Date.now() - record.startedAt >= LOGIN_RATE_WINDOW_MS) {
    loginRateLimitStore.delete(key);
    return null;
  }
  if (record.failures < LOGIN_RATE_MAX_FAILURES) return null;
  return Math.ceil((record.startedAt + LOGIN_RATE_WINDOW_MS - Date.now()) / 1000);
}

function recordLoginFailure(key) {
  const current = loginRateLimitStore.get(key);
  if (!current || Date.now() - current.startedAt >= LOGIN_RATE_WINDOW_MS) {
    loginRateLimitStore.set(key, { failures: 1, startedAt: Date.now() });
    return;
  }
  current.failures += 1;
}

function clearLoginFailures(key) {
  loginRateLimitStore.delete(key);
}

async function authenticateUser(req, role, email, password) {
  const key = loginRateKey(req, role, email);
  const user = await findUser(
    email,
    role,
    "+failedLoginAttempts +loginLockedUntil"
  );
  if (!user) {
    const existingAccount = await findUser(email, null);
    if (existingAccount) {
      return { statusCode: 401, error: "Invalid email or password." };
    }
  }
  if (user?.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
    return {
      statusCode: 423,
      error: "Account temporarily locked. Try again in 1 minute."
    };
  }
  const retryAfter = loginRateStatus(key);
  if (retryAfter) {
    return {
      statusCode: 429,
      error: "Too many failed login attempts. Please try again in 1 minute."
    };
  }
  if (user && !user.passwordHash) {
    return {
      statusCode: 401,
      error: "This account is missing a saved password. Create it again through QuickAid sign-up or ask the team to repair the MongoDB user record."
    };
  }

  const passwordOk = await validateUserPassword(user, password);
  if (!passwordOk) {
    recordLoginFailure(key);
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= ACCOUNT_LOCK_FAILURES) {
        user.loginLockedUntil = new Date(Date.now() + ACCOUNT_LOCK_MS);
        user.failedLoginAttempts = 0;
        await user.save();
        return {
          statusCode: 423,
          error: "Too many failed login attempts. Please try again in 1 minute."
        };
      }
      await user.save();
    }
    return { statusCode: 401, error: "Invalid email or password." };
  }

  clearLoginFailures(key);
  user.failedLoginAttempts = 0;
  user.loginLockedUntil = undefined;
  return { user };
}

async function handleApi(req, res) {
  // Route /api/risk/* to backend/risk.js
  if (req.url.startsWith("/api/risk")) {
    try {
      // DB backed endpoints should be checked before the generic handlers
      if (req.method === "GET" && req.url.startsWith("/api/risk/heatmap-db")) {
        await risk.handleHeatmapDb(req, res);
        return;
      }
      if (req.method === "POST" && req.url.startsWith("/api/risk/predict-db")) {
        await risk.handlePredictDb(req, res);
        return;
      }
      if (req.method === "GET" && req.url.startsWith("/api/risk/heatmap")) {
        // default heatmap from upstream API / mock
        await risk.handleHeatmap(req, res, cached);
        return;
      }
      if (req.method === "POST" && req.url.startsWith("/api/risk/predict")) {
        await risk.handlePredict(req, res, cached);
        return;
      }
    } catch (err) {
      logger.logError("handleApi.risk", err, { method: req.method, url: req.url, statusCode: 500 });
      sendJson(res, 500, { error: "Risk service error." });
      return;
    }
  }

  // Route /api/analytics/* to backend/analytics.js
  if (req.url.startsWith("/api/analytics")) {
    try {
      if (req.method === "GET" && req.url.startsWith("/api/analytics/summary")) {
        analytics.summaryStats(req, res);
        return;
      }
      if (req.method === "GET" && req.url.startsWith("/api/analytics/insights")) {
        analytics.aiInsights(req, res);
        return;
      }
      if (req.method === "GET" && req.url.startsWith("/api/analytics/trends")) {
        analytics.aggregateTrends(req, res);
        return;
      }
      if (req.method === "GET" && req.url.startsWith("/api/analytics/resources")) {
        analytics.resourcesUsage(req, res);
        return;
      }
    } catch (err) {
      logger.logError("handleApi.analytics", err, { method: req.method, url: req.url, statusCode: 500 });
      sendJson(res, 500, { error: "Analytics service error." });
      return;
    }
  }
  if (req.method === "GET" && req.url === "/api/status") {
    sendJson(res, 200, { ...liveStatus, lastUpdated: new Date().toISOString() });
    return;
  }

  if (req.method === "GET" && req.url === "/api/emergency-spaces") {
    sendJson(res, 200, emergencySpaces.map(serializeEmergencySpace));
    return;
  }

  if (req.method === "POST" && req.url === "/api/emergency-spaces") {
    const session = requireProfessionalSession(req, res, "add emergency conversion spaces");
    if (!session) return;
    try {
      const body = await parseBody(req);
      const errors = validateEmergencySpace(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to add emergency conversion space.", fields: errors });
        return;
      }

      const capacity = Number(body.capacity);
      const currentOccupancy = Math.max(0, Math.min(capacity, Number(body.currentOccupancy) || 0));
      const rawLat = String(body.lat ?? "").trim();
      const rawLng = String(body.lng ?? "").trim();
      const lat = Number(rawLat);
      const lng = Number(rawLng);
      const space = {
        id: nextEmergencySpaceId++,
        name: String(body.name).trim(),
        type: String(body.type).trim(),
        address: String(body.address || "").trim(),
        region: String(body.region).trim(),
        capacity,
        currentOccupancy,
        setupTimeHours: Number(body.setupTimeHours) || 0,
        wheelchairAccess: Boolean(body.wheelchairAccess),
        status: emergencySpaceStatusFor({ capacity, currentOccupancy, requestedStatus: body.status || "READY" }),
        ...(rawLat && rawLng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
        createdBy: session.email,
        createdAt: new Date().toISOString()
      };
      emergencySpaces.push(space);
      sendJson(res, 201, { space: serializeEmergencySpace(space) });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "PATCH" && /^\/api\/emergency-spaces\/\d+$/.test(req.url)) {
    const session = requireProfessionalSession(req, res, "update emergency conversion spaces");
    if (!session) return;
    try {
      const spaceId = Number(req.url.split("/")[3]);
      const space = emergencySpaces.find((item) => item.id === spaceId);
      if (!space) {
        sendJson(res, 404, { error: "Emergency conversion space not found." });
        return;
      }

      const body = await parseBody(req);
      const errors = validateEmergencySpace(body, { partial: true });
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to update emergency conversion space.", fields: errors });
        return;
      }

      if (body.name !== undefined) space.name = String(body.name).trim();
      if (body.type !== undefined) space.type = String(body.type).trim();
      if (body.address !== undefined) space.address = String(body.address || "").trim();
      if (body.region !== undefined) space.region = String(body.region).trim();
      if (body.capacity !== undefined) space.capacity = Number(body.capacity);
      if (body.setupTimeHours !== undefined) space.setupTimeHours = Number(body.setupTimeHours) || 0;
      if (body.wheelchairAccess !== undefined) space.wheelchairAccess = Boolean(body.wheelchairAccess);
      const rawLat = String(body.lat ?? "").trim();
      const rawLng = String(body.lng ?? "").trim();
      if (rawLat && rawLng) {
        space.lat = Number(rawLat);
        space.lng = Number(rawLng);
      }

      const capacity = Math.max(0, Number(space.capacity) || 0);
      const nextOccupancy = body.currentOccupancy !== undefined
        ? Number(body.currentOccupancy)
        : Number(space.currentOccupancy ?? space.occupancy) || 0;
      space.currentOccupancy = Math.max(0, Math.min(capacity, nextOccupancy));
      space.status = emergencySpaceStatusFor({
        capacity,
        currentOccupancy: space.currentOccupancy,
        requestedStatus: body.status || space.status
      });
      space.updatedBy = session.email;
      space.updatedAt = new Date().toISOString();
      sendJson(res, 200, { space: serializeEmergencySpace(space) });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/simulation/scenarios") {
    sendJson(res, 200, simulationScenarios);
    return;
  }

  if (req.method === "POST" && /^\/api\/simulation\/scenarios\/[^/]+\/complete$/.test(req.url)) {
    const session = requireProfessionalSession(req, res, "complete incidents");
    if (!session) return;
    const scenarioId = decodeURIComponent(req.url.split("/")[4]);
    const scenario = simulationScenarios.find((item) => item.id === scenarioId);
    if (!scenario) {
      sendJson(res, 404, { error: "Incident scenario not found." });
      return;
    }
    if (scenario.status === "Completed") {
      sendJson(res, 409, { error: "This incident is already completed." });
      return;
    }

    scenario.status = "Completed";
    const completedVolunteers = [];
    volunteerProfiles.forEach((volunteer) => {
      if (volunteer.assignedIncidentId !== scenario.id) return;
      volunteer.status = "Completed";
      volunteer.deploymentResponsePending = false;
      volunteer.notificationMessage = `Simulated notification: ${scenario.name} has ended. Your deployment is complete.`;
      completedVolunteers.push(serializeVolunteer(volunteer));
    });
    sendJson(res, 200, {
      scenario,
      completedVolunteers,
      message: `${scenario.name} completed.`
    });
    return;
  }

  if (req.method === "GET" && req.url === "/api/volunteers") {
    await Promise.all(volunteerProfiles.map(async (volunteer) => {
      if (volunteer.locationVerified || !/^\d{6}$/.test(volunteer.currentLocationLabel || "")) return;
      try {
        Object.assign(
          volunteer,
          await resolveVolunteerLocation(volunteer.currentLocationLabel, volunteer.zone)
        );
      } catch (error) {
        logger.logError("volunteers.locationUpgrade", error, {
          volunteerId: volunteer.id,
          location: volunteer.currentLocationLabel
        });
      }
    }));
    sendJson(res, 200, volunteerProfiles.map(serializeVolunteer));
    return;
  }

  if (req.method === "POST" && req.url === "/api/volunteers") {
    try {
      const body = await parseBody(req);
      const errors = validateVolunteerProfile(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to create volunteer profile.", fields: errors });
        return;
      }

      const email = normalizeEmail(body.email);
      if (volunteerProfiles.some((volunteer) => volunteer.email === email)) {
        sendJson(res, 409, { error: "A volunteer profile already exists for this email." });
        return;
      }

      const zone = normalizeZone(body.zone);
      const availability = String(body.availability || "Available").trim();
      const location = await resolveVolunteerLocation(body.currentLocationLabel, zone);
      const volunteer = {
        id: nextVolunteerId++,
        name: String(body.name).trim(),
        email,
        phone: String(body.phone).replace(/\s+/g, ""),
        skills: normalizeVolunteerSkills(body.skills),
        zone,
        currentLocationLabel: location.currentLocationLabel,
        postalCode: location.postalCode,
        locationVerified: location.locationVerified,
        availability,
        status: volunteerBaseStatus(availability),
        assignedIncidentId: "",
        assignedIncidentName: "",
        assignedTask: "",
        notificationMessage: "Simulated notification: Volunteer profile created successfully.",
        deploymentResponsePending: false,
        lat: location.lat,
        lng: location.lng
      };
      volunteerProfiles.push(volunteer);
      sendJson(res, 201, serializeVolunteer(volunteer));
    } catch (error) {
      sendJson(res, error.statusCode || 400, { error: error.message || "Invalid request payload." });
    }
    return;
  }

  if (req.method === "PATCH" && /^\/api\/volunteers\/\d+$/.test(req.url)) {
    try {
      const volunteerId = Number(req.url.split("/")[3]);
      const volunteer = volunteerProfiles.find((item) => item.id === volunteerId);
      if (!volunteer) {
        sendJson(res, 404, { error: "Volunteer profile not found." });
        return;
      }

      const body = await parseBody(req);
      const errors = validateVolunteerProfile({ ...volunteer, ...body }, { requireIdentity: false });
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to update volunteer profile.", fields: errors });
        return;
      }

      const nextAvailability = String(body.availability || volunteer.availability).trim();
      if (nextAvailability === "Off Duty" && volunteerActiveAssignment(volunteer)) {
        sendJson(res, 409, { error: "Assigned volunteers cannot switch to Off Duty until the task is closed." });
        return;
      }

      const nextZone = normalizeZone(body.zone || volunteer.zone);
      const nextLocationLabel = String(body.currentLocationLabel || volunteer.currentLocationLabel).trim();
      const locationChanged = body.currentLocationLabel !== undefined && nextLocationLabel !== volunteer.currentLocationLabel;
      const zoneChanged = nextZone !== volunteer.zone;
      const location = locationChanged || zoneChanged
        ? await resolveVolunteerLocation(nextLocationLabel, nextZone)
        : {
            currentLocationLabel: volunteer.currentLocationLabel,
            postalCode: volunteer.postalCode || "",
            locationVerified: Boolean(volunteer.locationVerified),
            lat: volunteer.lat,
            lng: volunteer.lng
          };
      volunteer.name = String(body.name || volunteer.name).trim();
      volunteer.phone = String(body.phone || volunteer.phone).replace(/\s+/g, "");
      volunteer.skills = normalizeVolunteerSkills(body.skills ?? volunteer.skills);
      volunteer.zone = nextZone;
      volunteer.currentLocationLabel = location.currentLocationLabel;
      volunteer.postalCode = location.postalCode;
      volunteer.locationVerified = location.locationVerified;
      volunteer.availability = nextAvailability;
      volunteer.lat = location.lat;
      volunteer.lng = location.lng;
      if (!volunteerActiveAssignment(volunteer) || volunteer.status === "Completed") {
        volunteer.status = volunteerBaseStatus(nextAvailability);
        if (volunteer.status === "Off Duty") {
          volunteer.assignedIncidentId = "";
          volunteer.assignedIncidentName = "";
          volunteer.assignedTask = "";
          volunteer.deploymentResponsePending = false;
        }
      }
      volunteer.notificationMessage = "Simulated notification: Volunteer profile updated.";
      sendJson(res, 200, serializeVolunteer(volunteer));
    } catch (error) {
      sendJson(res, error.statusCode || 400, { error: error.message || "Invalid request payload." });
    }
    return;
  }

  if (req.method === "DELETE" && /^\/api\/volunteers\/\d+$/.test(req.url)) {
    const volunteerId = Number(req.url.split("/")[3]);
    const before = volunteerProfiles.length;
    volunteerProfiles = volunteerProfiles.filter((item) => item.id !== volunteerId);
    if (volunteerProfiles.length === before) {
      sendJson(res, 404, { error: "Volunteer profile not found." });
      return;
    }
    sendJson(res, 200, { message: "Volunteer profile deleted." });
    return;
  }

  if (req.method === "POST" && /^\/api\/volunteers\/\d+\/deploy$/.test(req.url)) {
    const session = requireProfessionalSession(req, res, "deploy volunteers");
    if (!session) return;
    try {
      const volunteerId = Number(req.url.split("/")[3]);
      const volunteer = volunteerProfiles.find((item) => item.id === volunteerId);
      if (!volunteer) {
        sendJson(res, 404, { error: "Volunteer profile not found." });
        return;
      }

      const body = await parseBody(req);
      const scenario = simulationScenarios.find((item) => item.id === body.incidentId);
      if (!scenario) {
        sendJson(res, 404, { error: "Incident scenario not found." });
        return;
      }
      if (scenario.status === "Completed") {
        sendJson(res, 409, { error: "Completed incidents cannot receive new volunteer deployments." });
        return;
      }
      if (volunteer.availability !== "Available" || volunteer.status !== "Available") {
        sendJson(res, 409, { error: "Volunteer must be Available before deployment." });
        return;
      }

      volunteer.assignedIncidentId = scenario.id;
      volunteer.assignedIncidentName = scenario.name;
      volunteer.assignedTask = deploymentTaskForScenario(scenario);
      volunteer.status = "Assigned";
      volunteer.deploymentResponsePending = false;
      volunteer.notificationMessage = `Simulated notification: ${volunteer.name}, you have been selected for ${scenario.name}. Task: ${volunteer.assignedTask}`;
      sendJson(res, 200, serializeVolunteer(volunteer));
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "POST" && /^\/api\/volunteers\/\d+\/respond$/.test(req.url)) {
    try {
      const volunteerId = Number(req.url.split("/")[3]);
      const volunteer = volunteerProfiles.find((item) => item.id === volunteerId);
      if (!volunteer) {
        sendJson(res, 404, { error: "Volunteer profile not found." });
        return;
      }

      const body = await parseBody(req);
      if (!["accept", "reject"].includes(body.response)) {
        sendJson(res, 400, { error: "Response must be accept or reject." });
        return;
      }
      if (!volunteer.assignedIncidentId || !volunteer.deploymentResponsePending) {
        sendJson(res, 409, { error: "There is no pending deployment to respond to." });
        return;
      }

      if (body.response === "accept") {
        volunteer.deploymentResponsePending = false;
        volunteer.notificationMessage = `Simulated notification: Deployment accepted for ${volunteer.assignedIncidentName}.`;
      } else {
        volunteer.assignedIncidentId = "";
        volunteer.assignedIncidentName = "";
        volunteer.assignedTask = "";
        volunteer.deploymentResponsePending = false;
        volunteer.status = volunteerBaseStatus(volunteer.availability);
        volunteer.notificationMessage = "Simulated notification: Deployment rejected. Coordinator has been notified.";
      }
      sendJson(res, 200, serializeVolunteer(volunteer));
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
    return;
  }

  if (req.method === "POST" && /^\/api\/volunteers\/\d+\/status$/.test(req.url)) {
    const session = requireProfessionalSession(req, res, "update volunteer dispatch status");
    if (!session) return;
    try {
      const volunteerId = Number(req.url.split("/")[3]);
      const volunteer = volunteerProfiles.find((item) => item.id === volunteerId);
      if (!volunteer) {
        sendJson(res, 404, { error: "Volunteer profile not found." });
        return;
      }

      const body = await parseBody(req);
      const nextStatus = String(body.status || "").trim();
      if (!VOLUNTEER_STATUSES.includes(nextStatus)) {
        sendJson(res, 400, { error: "Invalid volunteer status." });
        return;
      }
      if (["Assigned", "En Route", "On Site"].includes(nextStatus) && !volunteer.assignedIncidentId) {
        sendJson(res, 409, { error: "Volunteer must be deployed before using this status." });
        return;
      }
      if (nextStatus === "Completed") {
        const assignedScenario = simulationScenarios.find((item) => item.id === volunteer.assignedIncidentId);
        if (!assignedScenario || assignedScenario.status !== "Completed") {
          sendJson(res, 409, { error: "Complete the whole incident before marking assigned volunteers as Completed." });
          return;
        }
      }

      const previousIncidentName = volunteer.assignedIncidentName;
      volunteer.status = nextStatus;
      volunteer.deploymentResponsePending = false;
      if (nextStatus === "Available") {
        volunteer.availability = "Available";
        volunteer.assignedIncidentId = "";
        volunteer.assignedIncidentName = "";
        volunteer.assignedTask = "";
      }
      if (nextStatus === "Off Duty") {
        volunteer.availability = "Off Duty";
        volunteer.assignedIncidentId = "";
        volunteer.assignedIncidentName = "";
        volunteer.assignedTask = "";
      }
      if (nextStatus === "Completed") {
        volunteer.notificationMessage = `Simulated notification: ${volunteer.assignedIncidentName} has ended. Your deployment is complete.`;
      } else if (nextStatus === "Assigned") {
        volunteer.notificationMessage = `Simulated notification: You are assigned to ${volunteer.assignedIncidentName}. Review the task and prepare to depart.`;
      } else if (nextStatus === "En Route") {
        volunteer.notificationMessage = `Simulated notification: Your status is En Route to ${volunteer.assignedIncidentName}. Travel safely and notify the coordinator if delayed.`;
      } else if (nextStatus === "On Site") {
        volunteer.notificationMessage = `Simulated notification: You are marked On Site at ${volunteer.assignedIncidentName}. Check in and begin the assigned task.`;
      } else if (nextStatus === "Available" && previousIncidentName) {
        volunteer.notificationMessage = `Simulated notification: Your deployment to ${previousIncidentName} has been recalled. Do not proceed; remain available for further instructions.`;
      } else if (nextStatus === "Off Duty") {
        volunteer.notificationMessage = "Simulated notification: You are now unavailable and will not receive new dispatches.";
      } else {
        volunteer.notificationMessage = `Simulated notification: Volunteer status changed to ${nextStatus}.`;
      }
      sendJson(res, 200, serializeVolunteer(volunteer));
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request payload." });
    }
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
      if (!geojson?.features?.length) {
        const demoData = loadEvacuationDemoData();
        sendJson(res, 200, {
          geojson: demoData.dengueGeoJson,
          fetchedAt: new Date().toISOString(),
          source: "demo-fallback"
        });
        return;
      }
      sendJson(res, 200, { geojson, fetchedAt: new Date().toISOString() });
    } catch (error) {
      const demoData = loadEvacuationDemoData();
      sendJson(res, 200, {
        geojson: demoData.dengueGeoJson,
        fetchedAt: new Date().toISOString(),
        source: "demo-fallback"
      });
    }
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/evacuation/hazards")) {
    try {
      const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const demo = params.get("demo") === "true";
      const hazards = await getEvacuationHazards(demo);
      sendJson(res, 200, { ...hazards, fetchedAt: new Date().toISOString() });
    } catch (error) {
      sendJson(res, 502, { error: "Unable to load hazard data." });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/evacuation/route") {
    try {
      const body = await parseBody(req);
      const start = body.start;
      const end = body.end;
      const requestedDemo = body.demo === true;
      const avoid = {
        flood: body.avoid?.flood !== false,
        incidents: body.avoid?.incidents !== false,
        dengue: body.avoid?.dengue === true
      };

      if (!isValidCoord(start) || !isValidCoord(end)) {
        sendJson(res, 400, { error: "start and end coordinates ({ lat, lng }) are required." });
        return;
      }

      const hazards = await getEvacuationHazards(requestedDemo);
      const avoidPolygons = buildCombinedAvoidPolygons(hazards, avoid, EVAC_BLOCKAGE_BUFFER_M);

      let baseline = null;
      let rerouted = null;
      let rerouteStatus = "not-needed";
      const demo = requestedDemo || !ORS_API_KEY;

      if (demo) {
        const demoData = loadEvacuationDemoData();
        baseline = demoData.baselineRoute;
        rerouted = demoData.reroutedRoute;
        rerouteStatus = "available";
      } else {
        baseline = await fetchOrsRoute(start, end, null);
        if (avoidPolygons.coordinates.length) {
          try {
            const reroutedRoute = await fetchOrsRoute(start, end, avoidPolygons);
            if (!routeCoordsMatch(reroutedRoute, baseline)) {
              rerouted = reroutedRoute;
              rerouteStatus = "available";
            } else {
              rerouteStatus = "same-route";
            }
          } catch (error) {
            rerouteStatus = "unavailable";
            logger.logError("evacuation.rerouting", error, {
              method: req.method,
              url: req.url,
              statusCode: 502
            });
          }
        }
      }

      sendJson(res, 200, {
        baseline,
        rerouted,
        hazards,
        avoid,
        demo,
        rerouteStatus,
        fetchedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.logError("evacuation.routing", error, { method: req.method, url: req.url, statusCode: 502 });
      sendJson(res, 502, { error: "Unable to compute a route between these locations right now." });
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/api/incidents') {
    if (!mongoConnected) {
      sendJson(res, 503, { error: 'MongoDB not connected' });
      return;
    }
    try {
      const Incident = require('./models/Incident');
      const incidents = await Incident.find().sort({ createdAt: -1 }).limit(200).lean();
      sendJson(res, 200, {
        count: incidents.length,
        incidents: incidents.map((incident) => ({
          id: incident._id.toString(),
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          areaDesc: incident.areaDesc,
          location: incident.location,
          lat: incident.lat,
          lng: incident.lng,
          note: incident.note,
          reporter: incident.reporter,
          reporterRole: incident.reporterRole,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt
        }))
      });
    } catch (error) {
      console.error('Incident read error:', error.message);
      sendJson(res, 500, { error: 'Failed to read incidents' });
    }
    return;
  }

  // Accept incident reports (stored to MongoDB when connected)
  if (req.method === 'POST' && req.url === '/api/incidents') {
    try {
      const body = await parseBody(req);
      if (!mongoConnected) {
        sendJson(res, 503, { error: 'MongoDB not connected' });
        return;
      }
      const Incident = require('./models/Incident');
      const type = String(body.type || "").trim();
      const severity = String(body.severity || "").trim();
      const postalCode = String(body.postalCode || body.postcode || "").trim();
      const note = String(body.note || "").trim();
      const submittedLat = Number(body.lat);
      const submittedLng = Number(body.lng);
      const hasSubmittedCoordinates =
        body.lat !== undefined &&
        body.lat !== "" &&
        body.lng !== undefined &&
        body.lng !== "" &&
        Number.isFinite(submittedLat) &&
        Number.isFinite(submittedLng);
      const allowedSeverities = new Set(["Critical", "High", "Medium", "Low"]);

      if (!type) {
        sendJson(res, 400, { error: "Incident type is required." });
        return;
      }
      if (!allowedSeverities.has(severity)) {
        sendJson(res, 400, { error: "Select a valid incident severity." });
        return;
      }
      let locationResult;
      if (postalCode) {
        if (!/^\d{6}$/.test(postalCode)) {
          sendJson(res, 400, { error: "Enter a valid 6-digit Singapore postal code." });
          return;
        }
        try {
          const results = await fetchOneMapSearch(postalCode);
          locationResult = results.find((result) => result.postalCode === postalCode) || results[0];
        } catch (error) {
          logger.logError("incidents.geocode", error, { postalCode });
          sendJson(res, 502, { error: "Unable to verify that postal code with OneMap right now." });
          return;
        }
      } else if (hasSubmittedCoordinates) {
        locationResult = {
          name: String(body.areaDesc || body.location || "Reported incident").trim(),
          address: String(body.location || body.areaDesc || "Reported incident").trim(),
          lat: submittedLat,
          lng: submittedLng
        };
      } else {
        sendJson(res, 400, { error: "Enter a valid 6-digit Singapore postal code." });
        return;
      }
      if (!locationResult) {
        sendJson(res, 400, { error: "No Singapore location was found for that postal code." });
        return;
      }

      const reporterSession = getUserSession(req);
      const inc = new Incident({
        reporter: reporterSession?.name || reporterSession?.email || 'anonymous',
        reporterRole: reporterSession?.role === 'professional' ? 'professional' : 'public',
        type,
        severity,
        value: body.value || 20,
        areaDesc: locationResult.name || locationResult.address || postalCode,
        location: locationResult.address || locationResult.name || postalCode,
        lat: locationResult.lat,
        lng: locationResult.lng,
        note,
        status: 'active'
      });
      console.log('Saving incident:', JSON.stringify(inc.toObject()));
      await inc.save();
      sendJson(res, 201, {
        message: 'Incident recorded',
        incident: {
          id: inc._id.toString(),
          type: inc.type,
          severity: inc.severity,
          status: inc.status,
          areaDesc: inc.areaDesc,
          location: inc.location,
          lat: inc.lat,
          lng: inc.lng,
          note: inc.note,
          reporter: inc.reporter,
          reporterRole: inc.reporterRole,
          createdAt: inc.createdAt,
          updatedAt: inc.updatedAt
        }
      });
    } catch (error) {
      logger.logError("incidents.create", error, { method: req.method, url: req.url, statusCode: 500, validationErrors: error.errors });
      sendJson(res, 500, { error: error.message || 'Failed to record incident' });
    }
    return;
  }

  const incidentUpdateMatch = req.url.match(/^\/api\/incidents\/([a-f\d]{24})$/i);
  if (req.method === 'PATCH' && incidentUpdateMatch) {
    const session = getUserSession(req);
    if (!session) {
      sendJson(res, 401, { error: 'Professional sign-in required.' });
      return;
    }
    if (session.role !== 'professional') {
      sendJson(res, 403, { error: 'Only professional accounts can edit incidents.' });
      return;
    }
    if (!mongoConnected) {
      sendJson(res, 503, { error: 'MongoDB not connected' });
      return;
    }

    try {
      const body = await parseBody(req);
      const status = String(body.status || '').trim().toLowerCase();
      const allowedStatuses = new Set(['active', 'monitoring', 'contained', 'resolved']);
      if (!allowedStatuses.has(status)) {
        sendJson(res, 400, { error: 'Select a valid incident status.' });
        return;
      }

      const Incident = require('./models/Incident');
      const incident = await Incident.findByIdAndUpdate(
        incidentUpdateMatch[1],
        { status },
        { new: true, runValidators: true }
      ).lean();
      if (!incident) {
        sendJson(res, 404, { error: 'Incident not found.' });
        return;
      }

      sendJson(res, 200, {
        message: 'Incident updated.',
        incident: {
          id: incident._id.toString(),
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          areaDesc: incident.areaDesc,
          location: incident.location,
          lat: incident.lat,
          lng: incident.lng,
          note: incident.note,
          reporter: incident.reporter,
          reporterRole: incident.reporterRole,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt
        }
      });
    } catch (error) {
      logger.logError('incidents.update', error, {
        method: req.method,
        url: req.url,
        statusCode: 500
      });
      sendJson(res, 500, { error: 'Failed to update incident.' });
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

  if (req.method === "GET" && req.url.startsWith("/api/onemap/search")) {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const query = (params.get("q") || "").trim();
    if (!query) {
      sendJson(res, 400, { error: "q query parameter is required." });
      return;
    }
    try {
      const key = `onemap-search:${query.toLowerCase()}`;
      const results = await cached(key, 30 * 60_000, () => fetchOneMapSearch(query));
      sendJson(res, 200, { results });
    } catch (error) {
      sendJson(res, 502, { error: "Unable to reach the OneMap search service." });
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/auth/session") {
    const session = getUserSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Sign in required." });
      return;
    }
    let sessionName = session.name || "";
    if (!sessionName && mongoConnected && session.userId) {
      try {
        const user = await User.findById(session.userId).select("name").lean();
        sessionName = user?.name || "";
        const storedSession = userSessionStore.get(session.token);
        if (storedSession) storedSession.name = sessionName;
      } catch (error) {
        sessionName = "";
      }
    }
    sendJson(res, 200, {
      session: {
        name: sessionName,
        role: session.role,
        email: session.email,
        issuedAt: session.issuedAt
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/logout") {
    clearUserSession(req, res);
    sendJson(res, 200, { message: "Signed out." });
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/forgot-password") {
    try {
      const body = await parseBody(req);
      if (!validEmail(body.email)) {
        sendJson(res, 400, { error: "Please enter a valid email address." });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: GENERIC_ERROR_MESSAGE });
        return;
      }
      const user = await User.findOne({ email: normalizeEmail(body.email) }).select("securityQuestion").lean();
      const securityQuestion = user?.securityQuestion && SECURITY_QUESTIONS[user.securityQuestion]
        ? user.securityQuestion
        : "memorable_place";
      sendJson(res, 200, {
        securityQuestion,
        question: SECURITY_QUESTIONS[securityQuestion]
      });
    } catch (error) {
      sendJson(res, 500, { error: GENERIC_ERROR_MESSAGE });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/reset-password") {
    try {
      const body = await parseBody(req);
      if (hasMissingRequired(body, ["email", "securityAnswer", "password", "confirmPassword"])) {
        sendJson(res, 400, { error: "Please fill in all required fields." });
        return;
      }
      if (!validEmail(body.email)) {
        sendJson(res, 400, { error: "Please enter a valid email address." });
        return;
      }
      if (!validSecurityAnswer(body.securityAnswer)) {
        sendJson(res, 400, { error: "Enter your security answer." });
        return;
      }
      if (!isStrongPassword(body.password)) {
        sendJson(res, 400, { error: PASSWORD_REQUIREMENTS_MESSAGE });
        return;
      }
      if (body.password !== body.confirmPassword) {
        sendJson(res, 400, { error: "Passwords do not match." });
        return;
      }
      if (!mongoConnected) {
        sendJson(res, 503, { error: GENERIC_ERROR_MESSAGE });
        return;
      }

      const user = await User.findOne({ email: normalizeEmail(body.email) })
        .select("+securityAnswerHash +passwordResetAttempts +passwordResetExpiresAt");
      if (!user?.securityAnswerHash) {
        sendJson(res, 401, { error: "The email or security answer is incorrect." });
        return;
      }
      if ((user.passwordResetAttempts || 0) >= 5) {
        if (user.passwordResetExpiresAt && user.passwordResetExpiresAt.getTime() > Date.now()) {
          sendJson(res, 429, { error: "Too many incorrect security answers. Please try again in 15 minutes." });
          return;
        }
        user.passwordResetAttempts = 0;
        user.passwordResetExpiresAt = undefined;
      }

      const answerOk = await verifyPassword(securityAnswerDigest(body.securityAnswer), user.securityAnswerHash);
      if (!answerOk) {
        user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
        if (user.passwordResetAttempts >= 5) {
          user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60_000);
        }
        await user.save();
        sendJson(res, 401, { error: "The email or security answer is incorrect." });
        return;
      }
      if (await verifyPassword(body.password, user.passwordHash)) {
        sendJson(res, 409, { error: "Your new password must be different from your current password." });
        return;
      }

      user.passwordHash = await hashPassword(body.password);
      user.passwordResetAttempts = 0;
      user.passwordResetExpiresAt = undefined;
      user.failedLoginAttempts = 0;
      user.loginLockedUntil = undefined;
      await user.save();
      invalidateUserSessions(user._id);
      sendJson(res, 200, { message: "Password changed successfully. Sign in with your new password." });
    } catch (error) {
      logger.logError("auth.resetPassword", error, { method: req.method, url: req.url, statusCode: 500 });
      sendJson(res, 500, { error: GENERIC_ERROR_MESSAGE });
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
        sendJson(res, 503, { error: GENERIC_ERROR_MESSAGE });
        return;
      }

      const email = normalizeEmail(body.email);
      const agency = String(body.agency).trim().toUpperCase();
      if (!professionalDomainAllowed(email, agency)) {
        sendJson(res, 403, {
          error: "Please use an approved professional email domain."
        });
        return;
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        sendJson(res, 409, { error: "An account with this email already exists." });
        return;
      }

      const user = await User.create({
        name: String(body.name).trim(),
        email,
        passwordHash: await hashPassword(body.password),
        securityQuestion: String(body.securityQuestion).trim(),
        securityAnswerHash: await hashPassword(securityAnswerDigest(body.securityAnswer)),
        role: "professional",
        status: "approved",
        agency,
        roleTitle: String(body.roleTitle).trim(),
        approvedAt: new Date()
      });

      sendJson(res, 201, {
        message: "Professional account created successfully.",
        session: createUserSession(res, req, user),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      if (error?.code === 11000) {
        sendJson(res, 409, { error: "An account with this email already exists." });
        return;
      }
      logger.logError("auth.professionalSignup", error, { method: req.method, url: req.url, statusCode: 500 });
      sendJson(res, 500, { error: GENERIC_ERROR_MESSAGE });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/professional") {
    try {
      const body = await parseBody(req);
      const errors = validateProfessionalCredentials(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to sign in.", fields: errors });
        return;
      }

      if (!mongoConnected) {
        sendJson(res, 503, { error: GENERIC_ERROR_MESSAGE });
        return;
      }

      const email = normalizeEmail(body.email);
      const authentication = await authenticateUser(req, "professional", email, body.password);
      if (!authentication.user) {
        sendJson(res, authentication.statusCode, { error: authentication.error });
        return;
      }

      const { user } = authentication;
      user.status = "approved";
      user.approvedAt ||= new Date();
      user.lastLoginAt = new Date();
      await user.save();
      sendJson(res, 200, {
        message: "Professional access approved.",
        session: createUserSession(res, req, user),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      sendJson(res, 500, { error: GENERIC_ERROR_MESSAGE });
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

      if (!mongoConnected) {
        sendJson(res, 503, { error: GENERIC_ERROR_MESSAGE });
        return;
      }
      const email = normalizeEmail(body.email);
      const authentication = await authenticateUser(req, "public", email, body.password);
      if (!authentication.user) {
        sendJson(res, authentication.statusCode, { error: authentication.error });
        return;
      }
      const user = authentication.user;
      user.lastLoginAt = new Date();
      await user.save();

      sendJson(res, 200, {
        message: "Public access approved.",
        session: createUserSession(res, req, user),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      sendJson(res, 500, { error: GENERIC_ERROR_MESSAGE });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/volunteer") {
    try {
      const body = await parseBody(req);
      const errors = validatePublicLogin(body);
      if (Object.keys(errors).length) {
        sendJson(res, 400, { error: "Unable to sign in.", fields: errors });
        return;
      }

      if (!mongoConnected) {
        sendJson(res, 503, { error: GENERIC_ERROR_MESSAGE });
        return;
      }
      const email = normalizeEmail(body.email);
      const authentication = await authenticateUser(req, "volunteer", email, body.password);
      if (!authentication.user) {
        sendJson(res, authentication.statusCode, { error: authentication.error });
        return;
      }
      const user = authentication.user;
      user.role = "volunteer";
      user.isVolunteer = true;
      user.lastLoginAt = new Date();
      await user.save();

      sendJson(res, 200, {
        message: "Volunteer access approved.",
        session: createUserSession(res, req, user),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      sendJson(res, 500, { error: GENERIC_ERROR_MESSAGE });
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
        sendJson(res, 503, { error: GENERIC_ERROR_MESSAGE });
        return;
      }

      const email = normalizeEmail(body.email);
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        sendJson(res, 409, { error: "An account with this email already exists." });
        return;
      }

      const skills = Array.isArray(body.skills)
        ? body.skills
        : String(body.skills || "").split(",");
      const volunteerSkills = skills
        .map((skill) => String(skill).trim())
        .filter(Boolean)
        .slice(0, 8);

      const user = await User.create({
        name: String(body.name).trim(),
        email,
        passwordHash: await hashPassword(body.password),
        securityQuestion: String(body.securityQuestion).trim(),
        securityAnswerHash: await hashPassword(securityAnswerDigest(body.securityAnswer)),
        role: "volunteer",
        status: "approved",
        isVolunteer: true,
        phone: String(body.phone).replace(/\s+/g, ""),
        postalCode: String(body.postalCode || "").trim(),
        volunteerSkills,
        volunteerAvailability: body.availability,
        approvedAt: new Date(),
        lastLoginAt: new Date()
      });

      sendJson(res, 201, {
        message: "Volunteer account created successfully.",
        session: createUserSession(res, req, user),
        redirectTo: "/#/dashboard"
      });
    } catch (error) {
      if (error?.code === 11000) {
        sendJson(res, 409, { error: "An account with this email already exists." });
        return;
      }
      logger.logError("auth.volunteerSignup", error, { method: req.method, url: req.url, statusCode: 500 });
      sendJson(res, 500, { error: GENERIC_ERROR_MESSAGE });
    }
    return;
  }

  // --- Debug endpoints for local development ---
  if (req.url.startsWith('/api/debug/incidents')) {
    if (req.method === 'GET') {
      if (!mongoConnected) {
        sendJson(res, 503, { error: 'MongoDB not connected' });
        return;
      }
      try {
        const Incident = require('./models/Incident');
        const items = await Incident.find().sort({ createdAt: -1 }).limit(200).lean();
        sendJson(res, 200, { count: items.length, incidents: items });
      } catch (err) {
        logger.logError("debug.readIncidents", err, { method: req.method, url: req.url, statusCode: 500 });
        sendJson(res, 500, { error: 'Failed to read incidents' });
      }
      return;
    }
  }

  if (req.method === 'POST' && req.url === '/api/debug/import') {
    if (!mongoConnected) {
      sendJson(res, 503, { error: 'MongoDB not connected' });
      return;
    }
    try {
      const fpath = path.join(__dirname, 'data', 'compass-incidents.json');
      if (!fs.existsSync(fpath)) {
        sendJson(res, 404, { error: 'Import file not found', path: fpath });
        return;
      }
      const raw = fs.readFileSync(fpath, 'utf8');
      const arr = JSON.parse(raw);
      const Incident = require('./models/Incident');
      const docs = arr.map((r) => ({
        reporter: r.reporter || 'anonymous',
        reporterRole: r.reporterRole || 'public',
        type: r.type || 'report',
        severity: r.severity || 'Low',
        value: r.value || 20,
        areaDesc: r.areaDesc || r.location || '',
        location: r.location || r.areaDesc || '',
        lat: r.lat,
        lng: r.lng,
        note: r.note || '',
        status: r.status || 'open'
      }));
      const resInsert = await Incident.insertMany(docs, { ordered: false });
      sendJson(res, 200, { inserted: Array.isArray(resInsert) ? resInsert.length : 0 });
    } catch (err) {
      logger.logError("debug.importIncidents", err, { method: req.method, url: req.url, statusCode: 500 });
      sendJson(res, 500, { error: 'Import failed', message: err.message });
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

process.on('uncaughtException', (err) => {
  logger.logError('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  logger.logError('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});

connectDB().then((connected) => {
  mongoConnected = connected;
}).finally(() => {
  server.listen(PORT, HOST, () => {
    console.log(`QuickAid running at http://${HOST}:${PORT}`);
  });
});
