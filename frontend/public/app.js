const app = document.querySelector("#app");
const OPS_BRAND_SUBTITLE = "AI Emergency Command Centre";
const DASHBOARD_AI_PREDICTION_HASH = "#/dashboard/ai-prediction";

const routes = {
  "": renderLanding,
  "#/": renderLanding,
  "#/login": renderRoleSelection,
  "#/signup": renderSignupSelection,
  "#/login/professional": renderProfessionalLogin,
  "#/login/volunteer": renderVolunteerLogin,
  "#/signup/professional": renderProfessionalSignup,
  "#/login/public": renderVolunteerLogin,
  "#/signup/volunteer": renderVolunteerSignup,
  "#/forgot-password": renderForgotPassword,
  "#/public-status": renderPublicEmergencyStatus,
  "#/dashboard": renderDashboard,
  [DASHBOARD_AI_PREDICTION_HASH]: renderDashboard,
  "#/incidents": renderIncidentsPage,
  "#/new-incident": renderIncidentReportPage,
  "#/incident-simulator": renderIncidentReportPage,
  "#/emergency-spaces": renderEmergencySpacesPage,
  "#/volunteer-dispatch": renderVolunteerDispatchPage,
  "#/flood-map": renderFloodMap,
  "#/evacuation-routing": renderEvacuationRouting,
  "#/risk-prediction": renderRiskPrediction
};

const capabilities = [
  ["Incident Tracking", "Real-time crisis monitoring across Singapore"],
  ["Volunteer Coordination", "AI-powered responder matching and deployment"],
  ["AI Crisis Prediction", "Predict cascading infrastructure risk"],
  ["Dynamic Evacuation Routing", "Smart rerouting during emergencies"]
];

let emergencySpacesState = [];
let emergencySpacesLoaded = false;
let emergencySpacesSeed = [];
let emergencySpacesSession = null;
let emergencySpacesFilter = "all";
let emergencySpacesUserLocation = null;
let emergencyHospitalsState = [];
let simulationScenarios = [];
let opsMenuKeydownHandler = null;
let opsHeaderClockTimer = null;
let dashboardPreviewIncidents = [];
let dashboardPreviewMap = null;
let dashboardPreviewTimer = null;
let volunteerDispatchTimer = null;

const DEFAULT_DASHBOARD_STATS = {
  activeIncidents: 5,
  volunteersOnStandby: 18,
  sheltersAvailable: 3,
  riskAlert: "Low"
};

const DEFAULT_SIMULATION_BRIEFING = "Standby. Run a scenario to generate a rule-based operations briefing.";
const PASSWORD_REQUIREMENTS_MESSAGE = "Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.";
const SECURITY_QUESTION_OPTIONS = [
  { value: "first_school", label: "What was the name of your first school?" },
  { value: "childhood_nickname", label: "What was your childhood nickname?" },
  { value: "memorable_place", label: "What place is most memorable to you?" },
  { value: "first_job", label: "What was your first job or volunteer role?" }
];
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again later.";
const PROFESSIONAL_AGENCY_DOMAINS = {
  SCDF: ["scdf.gov.sg"],
  SPF: ["spf.gov.sg"],
  MOH: ["moh.gov.sg"],
  NEA: ["nea.gov.sg"],
  PUB: ["pub.gov.sg"],
  LTA: ["lta.gov.sg"]
};
const PROFESSIONAL_TEST_DOMAINS = ["quickaid.test"];
const DEFAULT_RESOURCE_SUMMARY = "No simulation is running. Resource demand summaries will appear here.";
const DEFAULT_ALERTS = ["No active simulation alerts."];
const DEFAULT_LIVE_ACTIVITY = [
  "<strong>12:42</strong> SCDF deployed to Jurong West",
  "<strong>12:47</strong> PIE congestion elevated",
  "<strong>12:51</strong> Shelter activation recommended",
  "<strong>12:53</strong> NUH occupancy exceeded threshold"
];
const simulationState = {
  activeScenario: null,
  selectedScenarioId: "",
  incidents: [],
  resources: [],
  volunteers: [],
  supplies: [],
  alerts: [],
  riskScores: [],
  briefing: "",
  stats: { ...DEFAULT_DASHBOARD_STATS }
};

const volunteerDispatchState = {
  loaded: false,
  volunteers: [],
  selectedIncidentId: "",
  filters: {
    skill: "",
    zone: "",
    availability: "",
    status: ""
  },
  smartMatchScores: new Map()
};

const VOLUNTEER_STATUSES = ["Available", "Assigned", "En Route", "On Site", "Completed", "Off Duty"];
const VOLUNTEER_SELF_AVAILABILITY = [
  { value: "Available", label: "Available" },
  { value: "Off Duty", label: "Unavailable" }
];
const DISPATCH_ZONES = ["Jurong West", "Jurong East", "Bedok", "Tampines", "Changi", "Clementi", "Bukit Timah"];
const DISPATCH_ZONE_COORDS = {
  "Jurong West": [1.3507, 103.7004],
  "Jurong East": [1.3331, 103.7422],
  Bedok: [1.3236, 103.9273],
  Tampines: [1.3496, 103.9568],
  Changi: [1.3644, 103.9915],
  Clementi: [1.3151, 103.7652],
  "Bukit Timah": [1.3294, 103.8021]
};

const SINGAPORE_HOSPITALS = [
  { id: "hospital-nuh", name: "National University Hospital", address: "5 Lower Kent Ridge Rd", lat: 1.2948, lng: 103.7836, zone: "Clementi", beds: 1200, occupancy: 860 },
  { id: "hospital-ntfgh", name: "Ng Teng Fong General Hospital", address: "1 Jurong East St 21", lat: 1.3334, lng: 103.7437, zone: "Jurong East", beds: 700, occupancy: 490 },
  { id: "hospital-sgh", name: "Singapore General Hospital", address: "Outram Rd", lat: 1.2796, lng: 103.8352, zone: "Central", beds: 1800, occupancy: 1290 },
  { id: "hospital-ttsh", name: "Tan Tock Seng Hospital", address: "11 Jalan Tan Tock Seng", lat: 1.3215, lng: 103.8465, zone: "Central", beds: 1500, occupancy: 1070 },
  { id: "hospital-cgh", name: "Changi General Hospital", address: "2 Simei St 3", lat: 1.3402, lng: 103.9490, zone: "Changi", beds: 820, occupancy: 590 },
  { id: "hospital-kkh", name: "KK Women's and Children's Hospital", address: "100 Bukit Timah Rd", lat: 1.3094, lng: 103.8467, zone: "Central", beds: 800, occupancy: 560 },
  { id: "hospital-skh", name: "Sengkang General Hospital", address: "110 Sengkang E Way", lat: 1.3906, lng: 103.8935, zone: "Tampines", beds: 1000, occupancy: 710 },
  { id: "hospital-ktph", name: "Khoo Teck Puat Hospital", address: "90 Yishun Central", lat: 1.4241, lng: 103.8371, zone: "Yishun", beds: 550, occupancy: 390 }
];

const EMERGENCY_SPACE_TYPES = [
  { value: "Temporary Shelter", label: "Shelter" },
  { value: "Hospital", label: "Hospital" }
];

function shieldIcon() {
  return `
    <img class="brand-mark" src="/assets/logo.png" alt="" aria-hidden="true" />
  `;
}

function icon(name) {
  const icons = {
    arrowRight: '<path d="M5 12h14M13 5l7 7-7 7" />',
    arrowLeft: '<path d="M19 12H5M11 19l-7-7 7-7" />',
    building: '<path d="M4 21V7l8-4 8 4v14M9 21v-8h6v8M8 9h.01M12 9h.01M16 9h.01" />',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />',
    info: '<circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />',
    alert: '<path d="M10.3 3.4 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />',
    activity: '<path d="M3 12h4l2.2-7 4.1 14 2.2-7H21" />',
    barChart: '<path d="M3 3v18h18M7 16v-5M12 16v-9M17 16v-3" />',
    close: '<path d="M18 6 6 18M6 6l12 12" />',
    droplet: '<path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11z" />',
    logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />',
    mapPin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="2.5" />',
    medical: '<path d="M8 6V4h8v2M6 8h12v12H6zM12 11v6M9 14h6" />',
    report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 12v6M9 15h6" />',
    shield: '<path d="M12 3l8 3v6c0 5-3.3 8.2-8 9-4.7-.8-8-4-8-9V6l8-3z" />',
    truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />',
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
}

function formatOpsUpdatedTime(date = new Date()) {
  return date.toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).toUpperCase();
}

function updateOpsHeaderTime() {
  document.querySelectorAll("[data-last-updated]").forEach((element) => {
    element.textContent = `Last Updated : ${formatOpsUpdatedTime()}`;
  });
  document.querySelectorAll("[data-dashboard-clock]").forEach((element) => {
    element.textContent = `${new Date().toLocaleTimeString("en-SG", { hour12: false })} SGT`;
  });
}

function startOpsHeaderClock() {
  updateOpsHeaderTime();
  if (opsHeaderClockTimer) window.clearInterval(opsHeaderClockTimer);
  opsHeaderClockTimer = window.setInterval(updateOpsHeaderTime, 1_000);
}

function header({ backHref = "", nav = false } = {}) {
  return `
    <header class="site-header">
      <a class="brand" href="#/">
        ${shieldIcon()}
        <span>
          <strong>AIECC</strong>
          <small>${OPS_BRAND_SUBTITLE}</small>
        </span>
      </a>
      ${nav ? `
        <nav class="top-nav" aria-label="Main navigation">
          <span class="nav-link-group">
            <a href="#about">About</a>
            <a href="#features">Features</a>
          </span>
          <span class="nav-auth-group">
            <a class="nav-auth-link" href="#/login">Sign in</a>
            <a class="nav-auth-link nav-signup-link" href="#/signup">Sign up</a>
          </span>
          <a class="nav-live-link" href="#/public-status"><span></span> Live Status</a>
        </nav>
      ` : `
        <a class="back-link" href="${backHref || "#/"}">${icon("arrowLeft")} Back</a>
      `}
    </header>
  `;
}

function renderLanding() {
  app.innerHTML = `
    <div class="page landing-page">
      <aside class="incident-banner" aria-label="Active incident">
        ${icon("alert")}
        <p><strong>Active incident:</strong> Critical flooding in Jurong West. SCDF deployed. 3 incidents open.</p>
      </aside>
      ${header({ nav: true })}
      <main>
        <section class="hero" id="about">
          <div class="hero-copy">
            <p class="eyebrow urgent-eyebrow"><span></span> Singapore emergency response</p>
            <h1>Helping Singapore respond faster during crisis</h1>
            <p class="hero-summary">A unified operational coordination platform for real-time emergency management and resource optimisation.</p>
            <div class="hero-actions">
              <a class="primary-button status-button" href="#/public-status">${icon("activity")} Live emergency status ${icon("arrowRight")}</a>
              <a class="secondary-button sign-in-button" href="#/login">Sign in</a>
              <a class="secondary-button sign-up-button" href="#/signup">Sign up</a>
            </div>
            <p class="access-note">For emergency professionals, residents, and volunteers.</p>
          </div>
          <div class="hero-dashboard" aria-label="Live emergency dashboard preview">
            <div class="preview-header">
              <h2>AI-assisted national resource dashboard</h2>
              <span class="live-badge"><i></i> Live</span>
            </div>
            <section class="critical-alert">
              ${icon("alert")}
              <div>
                <strong>Critical flooding detected - Jurong West</strong>
                <p>NUH occupancy high · SCDF on site · TPE accident ongoing</p>
              </div>
            </section>
            <div class="preview-metrics">
              <article>
                <span>SCDF units available</span>
                <strong>18</strong>
              </article>
              <article>
                <span>Hospital vacancy</span>
                <strong class="danger-value">82%</strong>
              </article>
            </div>
            <section class="ai-action">
              <span>AI suggestion</span>
              <p>Redirect PIE traffic · Deploy private shelter</p>
            </section>
            <div class="response-track">
              <div><span>Detected</span><strong>12:42</strong></div>
              <i></i>
              <div><span>SCDF deployed</span><strong>12:47</strong></div>
              <i></i>
              <div><span>Shelter ready</span><strong>12:51</strong></div>
            </div>
          </div>
        </section>

        <section class="capabilities-band" id="features">
          <div class="section-heading">
            <p class="eyebrow">Platform capabilities</p>
            <h2>Operational tools for fast-moving incidents</h2>
          </div>
          <div class="capability-grid">
            ${capabilities.map(([title, body]) => `
              <article class="capability-card">
                <h3>${title}</h3>
                <p>${body}</p>
              </article>
            `).join("")}
          </div>
        </section>

      </main>
    </div>
  `;
}

function renderPublicEmergencyStatus() {
  app.innerHTML = `
    <div class="page public-status-page">
      <header class="public-status-header">
        <a class="brand" href="#/">
          ${shieldIcon()}
          <span>
            <strong>AIECC</strong>
            <small>Public emergency status</small>
          </span>
        </a>
        <nav class="public-status-actions" aria-label="Public status navigation">
          <a class="secondary-button compact" href="#/">${icon("arrowLeft")} Back</a>
          <a class="secondary-button compact" href="#/login">Sign in ${icon("arrowRight")}</a>
        </nav>
      </header>

      <main class="public-status-main">
        <section class="public-status-hero" aria-labelledby="public-status-heading">
          <div class="public-status-copy">
            <p class="public-alert-pill" data-public-alert-pill><span></span> Loading live alert</p>
            <h1 id="public-status-heading" data-public-status-heading>Checking live emergency status</h1>
            <p class="public-status-summary" data-public-status-summary>Fetching the latest public advisory...</p>
          </div>

          <aside class="public-status-panel" aria-label="Public emergency details">
            <section class="public-instruction-card" aria-label="What you should do now">
              <h2>What you should do now</h2>
              <div data-public-instructions>
                <p>Stay clear of affected areas.</p>
                <p>Follow official instructions from emergency responders.</p>
              </div>
            </section>

            <div class="public-status-buttons">
              <a class="primary-button public-map-button" href="#/flood-map">${icon("mapPin")} View live flood map</a>
              <a class="secondary-button public-map-button" href="#/risk-prediction">${icon("activity")} Risk Prediction</a>
              <a class="secondary-button public-map-button" href="#/evacuation-routing">${icon("arrowRight")} Evacuation Routing</a>
              <a class="secondary-button public-guidance-button" href="https://www.scdf.gov.sg/home/community-and-volunteers/fire-emergency-guides/civil-defence-emergency--handbook---interactive-tools" target="_blank" rel="noopener noreferrer" data-public-guidance-link>${icon("arrowRight")} <span data-public-guidance-label>SCDF emergency guidance</span></a>
            </div>

            <div class="public-status-stats" aria-label="Emergency status summary">
              <article>
                <span>Overall status</span>
                <strong data-public-overall-status>Loading</strong>
              </article>
              <article>
                <span>Last updated</span>
                <strong data-public-last-updated>—</strong>
              </article>
              <article>
                <span>Responders</span>
                <strong data-public-responders>Monitoring</strong>
              </article>
            </div>

            <footer class="public-status-footer">
              <span>Public view · No sign in required</span>
              <span data-public-refresh-note>Auto-refreshes every 2 min</span>
            </footer>
          </aside>
        </section>
      </main>
    </div>
  `;

  refreshPublicEmergencyStatus();
  publicStatusTimer = window.setInterval(refreshPublicEmergencyStatus, 120_000);
}

function publicGuidanceFor(text) {
  const normalized = String(text || "").toLowerCase();
  if (normalized.includes("fire")) {
    return {
      label: "SCDF fire safety advisories",
      href: "https://www.scdf.gov.sg/home/community-and-volunteers/fire-emergency-guides/fire-safety-and-emergency-advisories"
    };
  }
  if (normalized.includes("flood") || normalized.includes("rain")) {
    return {
      label: "SCDF emergency handbook",
      href: "https://www.scdf.gov.sg/home/community-and-volunteers/fire-emergency-guides/civil-defence-emergency--handbook---interactive-tools"
    };
  }
  return {
    label: "SCDF emergency guidance",
    href: "https://www.scdf.gov.sg/home/community-and-volunteers/fire-emergency-guides/civil-defence-emergency--handbook---interactive-tools"
  };
}

function publicInstructionLines(reading) {
  if (reading?.instruction) {
    return String(reading.instruction)
      .split(/[.;]\s+/)
      .map((line) => line.replace(/[.;]\s*$/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  const eventText = `${reading?.event || ""} ${reading?.headline || ""}`.toLowerCase();
  if (eventText.includes("flood")) {
    return [
      "Avoid affected roads and low-lying areas.",
      "Do not enter or drive through flood water.",
      "Follow instructions from SCDF officers."
    ];
  }

  return [
    "Stay clear of the affected area.",
    "Allow emergency vehicles to pass.",
    "Follow official instructions from responders."
  ];
}

function publicResponderStatus(severity) {
  return ["Extreme", "Severe"].includes(severity) ? "On scene" : "Monitoring";
}

async function refreshPublicEmergencyStatus() {
  const heading = document.querySelector("[data-public-status-heading]");
  const summary = document.querySelector("[data-public-status-summary]");
  const pill = document.querySelector("[data-public-alert-pill]");
  const instructions = document.querySelector("[data-public-instructions]");
  const overall = document.querySelector("[data-public-overall-status]");
  const updated = document.querySelector("[data-public-last-updated]");
  const responders = document.querySelector("[data-public-responders]");
  const guidanceLink = document.querySelector("[data-public-guidance-link]");
  const guidanceLabel = document.querySelector("[data-public-guidance-label]");
  const refreshNote = document.querySelector("[data-public-refresh-note]");

  if (!heading || !summary || !pill || !instructions || !overall || !updated || !responders || !guidanceLink || !guidanceLabel || !refreshNote) return;

  try {
    const response = await fetch("/api/flood-alerts");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load flood alerts.");

    const [entry] = activeFloodReadings(payload.records || []);
    if (!entry) {
      pill.innerHTML = "<span></span> No active flood alerts";
      heading.innerHTML = "No active flooding reported";
      summary.textContent = "Singapore is clear of active flood alerts right now. Continue to monitor official channels for updates.";
      instructions.innerHTML = [
        "Stay alert during heavy rain.",
        "Avoid entering flooded areas if conditions change.",
        "Check the live flood map before travelling."
      ].map((line) => `<p>${escapeHtml(line)}</p>`).join("");
      overall.textContent = "Normal";
      updated.textContent = formatDateTime(payload.fetchedAt);
      responders.textContent = "Monitoring";
      const guidance = publicGuidanceFor("flood");
      guidanceLink.href = guidance.href;
      guidanceLabel.textContent = guidance.label;
      refreshNote.textContent = `Auto-refreshed ${formatDateTime(new Date())} · next check in 2 min`;
      return;
    }

    const { record, reading } = entry;
    const area = reading.area?.areaDesc || "Singapore";
    const severity = reading.severity || "Heightened";
    const eventText = `${reading.event || ""} ${reading.headline || ""} ${reading.description || ""}`;
    const guidance = publicGuidanceFor(eventText);

    pill.innerHTML = `<span></span> Active alert · ${escapeHtml(area)}`;
    heading.innerHTML = `${escapeHtml(reading.event || "Emergency")} reported in <strong>${escapeHtml(area)}</strong>`;
    summary.textContent = reading.description || "Stay away from affected roads. Do not enter flood water. Emergency services are responding.";
    instructions.innerHTML = publicInstructionLines(reading).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    overall.textContent = severity === "Minor" ? "Heightened" : severity;
    updated.textContent = formatDateTime(payload.fetchedAt || record.datetime);
    responders.textContent = publicResponderStatus(reading.severity);
    guidanceLink.href = guidance.href;
    guidanceLabel.textContent = guidance.label;
    refreshNote.textContent = `Auto-refreshed ${formatDateTime(new Date())} · next check in 2 min`;
  } catch (error) {
    pill.innerHTML = "<span></span> Live status unavailable";
    heading.innerHTML = "Unable to refresh emergency status";
    summary.textContent = "Please check the live map or official emergency channels for the latest updates.";
    overall.textContent = "Unknown";
    updated.textContent = "Unable to update";
    responders.textContent = "Check official channels";
    refreshNote.textContent = "Auto-refresh will retry in 2 min";
  }
}

function renderRoleSelection() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/" })}
      <main class="center-stage">
        <section class="role-panel" aria-labelledby="role-heading">
          <div class="auth-heading">
            <h1 id="role-heading">Select Your Role</h1>
            <p>Choose how you will be using QuickAid</p>
          </div>
          <div class="role-options">
            ${roleCard({
              href: "#/login/professional",
              iconName: "building",
              title: "Professional Access",
              subtitle: "For authorised personnel",
              items: ["Hospital & Healthcare", "Government Agencies", "Emergency Responders"],
              action: "Continue as Professional"
            })}
            ${roleCard({
              href: "#/login/volunteer",
              iconName: "users",
              title: "Volunteer Access",
              subtitle: "For registered community volunteers",
              items: ["Manage availability", "Receive dispatch tasks", "View assigned response work"],
              action: "Continue as Volunteer"
            })}
          </div>
        </section>
      </main>
    </div>
  `;
}

function roleCard({ href, iconName, title, subtitle, items, action }) {
  return `
    <a class="role-card" href="${href}">
      <div class="role-card-top">
        ${icon(iconName)}
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
      </div>
      <ul>
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <span class="role-action">${action} ${icon("arrowRight")}</span>
    </a>
  `;
}

function renderSignupSelection() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/" })}
      <main class="center-stage">
        <section class="role-panel" aria-labelledby="signup-heading">
          <div class="auth-heading">
            <h1 id="signup-heading">Create Your Account</h1>
            <p>Choose the account type that matches how you will use QuickAid</p>
          </div>
          <div class="role-options">
            ${roleCard({
              href: "#/signup/professional",
              iconName: "building",
              title: "Professional Sign Up",
              subtitle: "For authorised response teams",
              items: ["Agency approval required", "Operations dashboard access", "Resource coordination tools"],
              action: "Create Professional Account"
            })}
            ${roleCard({
              href: "#/signup/volunteer",
              iconName: "users",
              title: "Volunteer Sign Up",
              subtitle: "For community responders",
              items: ["Register availability", "Share useful skills", "Receive dispatch tasks"],
              action: "Create Volunteer Account"
            })}
          </div>
          <p class="signup-line auth-switch-line">Already have an account? <a href="#/login">Sign in</a></p>
        </section>
      </main>
    </div>
  `;
}

function renderProfessionalLogin() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login" })}
      <main class="center-stage">
        <section class="login-panel" aria-labelledby="professional-heading">
          <div class="auth-heading">
            <h1 id="professional-heading">Professional Login</h1>
            <p>Sign in with your authorised credentials</p>
          </div>
          <form class="login-form" data-role="professional" novalidate>
            <label>Email<input name="email" type="email" placeholder="irname@example.com" autocomplete="email" required /></label>
            <label>Password
              <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required minlength="8" /></span>
            </label>
            <p class="note">${icon("info")} Sign in using the password created with your authorised agency email.</p>
            <button class="form-button" type="submit">Sign In</button>
            <div class="auth-support-links">
              <a href="#/signup/professional">Sign up for a professional account</a>
              <a href="#/forgot-password">Forgot password?</a>
            </div>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;
  bindLoginForm();
}

function renderProfessionalSignup() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login/professional" })}
      <main class="center-stage signup-stage">
        <section class="login-panel wide-auth-panel" aria-labelledby="professional-signup-heading">
          <div class="auth-heading">
            <p class="eyebrow">Authorised agency access</p>
            <h1 id="professional-signup-heading">Professional Sign Up</h1>
            <p>Register with your official work email. Your agency administrator will review the request.</p>
          </div>
          <form class="login-form wide-auth-form" data-professional-signup novalidate>
            <div class="form-grid">
              <label>Full name
                <input name="name" type="text" placeholder="Your full name" autocomplete="name" required maxlength="80" />
              </label>
              <label>Work email
                <input name="email" type="email" placeholder="name@agency.gov.sg" autocomplete="email" required />
              </label>
              <label>Agency
                <select name="agency" required>
                  <option value="">Select agency</option>
                  <option value="SCDF">SCDF</option>
                  <option value="SPF">Singapore Police Force</option>
                  <option value="MOH">Ministry of Health</option>
                  <option value="NEA">National Environment Agency</option>
                  <option value="PUB">PUB</option>
                  <option value="LTA">Land Transport Authority</option>
                </select>
              </label>
              <label>Role or title
                <input name="roleTitle" type="text" placeholder="Emergency Operations Officer" required maxlength="100" />
              </label>
              <label>Password
                <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="At least 8 characters" autocomplete="new-password" required minlength="8" /></span>
              </label>
              <label>Confirm password
                <span class="input-with-icon">${icon("lock")}<input name="confirmPassword" type="password" placeholder="Re-enter your password" autocomplete="new-password" required minlength="8" /></span>
              </label>
              <label>Security question
                <select name="securityQuestion" required>
                  <option value="">Select a question</option>
                  ${SECURITY_QUESTION_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
                </select>
              </label>
              <label>Security answer
                <input name="securityAnswer" type="password" placeholder="Answer you will remember" autocomplete="off" required minlength="2" maxlength="120" />
              </label>
            </div>
            <p class="note">${icon("info")} ${PASSWORD_REQUIREMENTS_MESSAGE}</p>
            <p class="note">${icon("info")} An official email domain is required, but it does not grant access automatically. An administrator must approve the account.</p>
            <button class="form-button" type="submit">Submit Registration</button>
            <p class="signup-line">Already approved? <a href="#/login/professional">Sign in</a></p>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;

  document.querySelector("[data-professional-signup]").addEventListener("submit", submitProfessionalSignup);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmailAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function strongPassword(value) {
  const password = String(value || "");
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function emailDomain(value) {
  return normalizeEmailAddress(value).split("@")[1] || "";
}

function domainMatches(domain, allowedDomain) {
  return domain === allowedDomain || domain.endsWith(`.${allowedDomain}`);
}

function professionalEmailAllowed(email, agency) {
  const domain = emailDomain(email);
  const allowed = PROFESSIONAL_AGENCY_DOMAINS[String(agency || "").trim().toUpperCase()] || [];
  return [...allowed, ...PROFESSIONAL_TEST_DOMAINS].some((allowedDomain) => domainMatches(domain, allowedDomain));
}

function personalEmailAllowed(email) {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (domain === "gov.sg" || domain.endsWith(".gov.sg")) return false;
  const professionalDomains = Object.values(PROFESSIONAL_AGENCY_DOMAINS).flat();
  return ![...professionalDomains, ...PROFESSIONAL_TEST_DOMAINS].some((allowedDomain) => domainMatches(domain, allowedDomain));
}

function showFormError(status, message) {
  status.textContent = message;
  status.className = "form-status error";
}

function requiredFieldsPresent(data, fields) {
  return fields.every((field) => {
    const value = data[field];
    if (typeof value === "boolean") return value === true;
    return String(value || "").trim() !== "";
  });
}

function validateSignupData(type, data) {
  if (type === "professional") {
    if (!requiredFieldsPresent(data, ["name", "email", "agency", "roleTitle", "password", "confirmPassword", "securityQuestion", "securityAnswer"])) return "Please fill in all required fields.";
    if (!validEmailAddress(data.email)) return "Please enter a valid email address.";
    if (!professionalEmailAllowed(data.email, data.agency)) return "Please use an approved professional email domain.";
  } else {
    if (!requiredFieldsPresent(data, ["name", "email", "phone", "password", "confirmPassword", "securityQuestion", "securityAnswer", "availability", "acceptTerms"])) return "Please fill in all required fields.";
    if (!validEmailAddress(data.email)) return "Please enter a valid email address.";
    if (!personalEmailAllowed(data.email)) return "Please use a valid personal email address.";
  }
  if (!strongPassword(data.password)) return PASSWORD_REQUIREMENTS_MESSAGE;
  if (data.password !== data.confirmPassword) return "Passwords do not match.";
  if (String(data.securityAnswer || "").trim().length < 2) return "Security answer must contain at least 2 characters.";
  return "";
}

function validateLoginData(data) {
  if (!requiredFieldsPresent(data, ["email", "password"])) return "Please fill in all required fields.";
  if (!validEmailAddress(data.email)) return "Please enter a valid email address.";
  return "";
}

async function submitProfessionalSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());
  const validationError = validateSignupData("professional", data);
  if (validationError) {
    showFormError(status, validationError);
    return;
  }

  status.textContent = "Submitting your registration...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/professional/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to submit registration.");
      status.classList.add("error");
      return;
    }
    if (result.session) localStorage.setItem("quickaid-session", JSON.stringify(result.session));
    form.reset();
    status.textContent = result.message;
    status.classList.add("success");
    if (result.redirectTo) {
      window.setTimeout(() => {
        window.location.hash = "#/dashboard";
      }, 650);
    }
  } catch (error) {
    status.textContent = GENERIC_ERROR_MESSAGE;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

function renderVolunteerLogin() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login" })}
      <main class="center-stage">
        <section class="login-panel" aria-labelledby="volunteer-login-heading">
          <div class="auth-heading">
            <h1 id="volunteer-login-heading">Volunteer Login</h1>
            <p>Sign in with your registered volunteer account</p>
          </div>
          <form class="login-form" data-role="volunteer" novalidate>
            <label>Email<input name="email" type="email" placeholder="name@example.com" autocomplete="email" required /></label>
            <label>Password
              <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required /></span>
            </label>
            <button class="form-button" type="submit">Sign In as Volunteer</button>
            <p class="signup-line">New volunteer? <a href="#/signup/volunteer">Create a volunteer account</a></p>
            <p class="signup-line"><a href="#/forgot-password">Forgot password?</a></p>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;
  bindLoginForm();
}

function renderForgotPassword() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login" })}
      <main class="center-stage">
        <section class="login-panel" aria-labelledby="forgot-password-heading">
          <div class="auth-heading">
            <h1 id="forgot-password-heading">Forgot Password</h1>
            <p>Verify your saved security question to choose a new password.</p>
          </div>
          <form class="login-form" data-forgot-password novalidate>
            <label>Email<input name="email" type="email" placeholder="name@example.com" autocomplete="email" required /></label>
            <button class="form-button" type="submit">Continue</button>
            <p class="signup-line"><a href="#/login">Back to sign in</a></p>
            <p class="form-status" role="status"></p>
          </form>
          <form class="login-form" data-reset-password novalidate hidden>
            <input name="email" type="hidden" />
            <p class="security-question-prompt" data-security-question></p>
            <label>Security answer
              <input name="securityAnswer" type="password" autocomplete="off" required maxlength="120" />
            </label>
            <label>New password
              <span class="input-with-icon">${icon("lock")}<input name="password" type="password" autocomplete="new-password" required minlength="8" /></span>
            </label>
            <label>Confirm new password
              <span class="input-with-icon">${icon("lock")}<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="8" /></span>
            </label>
            <p class="note">${icon("info")} ${PASSWORD_REQUIREMENTS_MESSAGE}</p>
            <button class="form-button" type="submit">Change Password</button>
            <button class="secondary-button" type="button" data-reset-password-back>Use a different email</button>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;

  document.querySelector("[data-forgot-password]").addEventListener("submit", submitForgotPassword);
  document.querySelector("[data-reset-password]").addEventListener("submit", submitPasswordReset);
  document.querySelector("[data-reset-password-back]").addEventListener("click", () => {
    document.querySelector("[data-reset-password]").hidden = true;
    document.querySelector("[data-forgot-password]").hidden = false;
  });
}

async function submitForgotPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  if (!requiredFieldsPresent(data, ["email"])) {
    showFormError(status, "Please fill in all required fields.");
    return;
  }
  if (!validEmailAddress(data.email)) {
    showFormError(status, "Please enter a valid email address.");
    return;
  }

  status.textContent = "Loading your security question...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, GENERIC_ERROR_MESSAGE);
      status.classList.add("error");
      return;
    }
    const resetForm = document.querySelector("[data-reset-password]");
    resetForm.elements.email.value = normalizeEmailAddress(data.email);
    resetForm.querySelector("[data-security-question]").textContent = result.question;
    form.hidden = true;
    resetForm.hidden = false;
    resetForm.elements.securityAnswer.focus();
  } catch (error) {
    status.textContent = GENERIC_ERROR_MESSAGE;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

async function submitPasswordReset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  if (!requiredFieldsPresent(data, ["email", "securityAnswer", "password", "confirmPassword"])) {
    showFormError(status, "Please fill in all required fields.");
    return;
  }
  if (!strongPassword(data.password)) {
    showFormError(status, PASSWORD_REQUIREMENTS_MESSAGE);
    return;
  }
  if (data.password !== data.confirmPassword) {
    showFormError(status, "Passwords do not match.");
    return;
  }

  status.textContent = "Changing your password...";
  status.className = "form-status";
  button.disabled = true;
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      showFormError(status, formatAuthError(result, GENERIC_ERROR_MESSAGE));
      return;
    }
    form.reset();
    status.textContent = result.message;
    status.classList.add("success");
    window.setTimeout(() => {
      window.location.hash = "#/login";
    }, 900);
  } catch (error) {
    showFormError(status, GENERIC_ERROR_MESSAGE);
  } finally {
    button.disabled = false;
  }
}

function renderVolunteerSignup() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login/volunteer" })}
      <main class="center-stage signup-stage">
        <section class="login-panel volunteer-signup-panel" aria-labelledby="volunteer-heading">
          <div class="auth-heading">
            <p class="eyebrow">Community response network</p>
            <h1 id="volunteer-heading">Volunteer Sign Up</h1>
            <p>Create an account to offer support and receive local emergency alerts</p>
          </div>
          <form class="login-form volunteer-signup-form" data-volunteer-signup novalidate>
            <div class="form-grid">
              <label>Full name
                <input name="name" type="text" placeholder="Your full name" autocomplete="name" required maxlength="80" />
              </label>
              <label>Email
                <input name="email" type="email" placeholder="name@example.com" autocomplete="email" required />
              </label>
              <label>Mobile number
                <input name="phone" type="tel" inputmode="tel" placeholder="8123 4567" autocomplete="tel" required />
              </label>
              <label>Postal code
                <input name="postalCode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="e.g. 600123" autocomplete="postal-code" />
              </label>
              <label>Password
                <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="At least 8 characters" autocomplete="new-password" required minlength="8" /></span>
              </label>
              <label>Confirm password
                <span class="input-with-icon">${icon("lock")}<input name="confirmPassword" type="password" placeholder="Re-enter your password" autocomplete="new-password" required minlength="8" /></span>
              </label>
              <label>Security question
                <select name="securityQuestion" required>
                  <option value="">Select a question</option>
                  ${SECURITY_QUESTION_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
                </select>
              </label>
              <label>Security answer
                <input name="securityAnswer" type="password" placeholder="Answer you will remember" autocomplete="off" required minlength="2" maxlength="120" />
              </label>
            </div>
            <p class="note">${icon("info")} ${PASSWORD_REQUIREMENTS_MESSAGE}</p>
            <label>Availability
              <select name="availability" required>
                <option value="">Select availability</option>
                <option value="weekdays">Weekdays</option>
                <option value="evenings">Weekday evenings</option>
                <option value="weekends">Weekends</option>
                <option value="emergency">On-call during emergencies</option>
              </select>
            </label>
            <label>Useful skills <span class="optional-label">Optional, separated by commas</span>
              <input name="skills" type="text" placeholder="First aid, driving, translation" maxlength="180" />
            </label>
            <label class="declaration-check">
              <input name="acceptTerms" type="checkbox" required />
              <span>I confirm that these details are accurate and understand that deployment instructions must come from authorised coordinators.</span>
            </label>
            <button class="form-button" type="submit">Create Volunteer Account</button>
            <p class="signup-line">Already registered? <a href="#/login/volunteer">Sign in as a volunteer</a></p>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;

  document.querySelector("[data-volunteer-signup]").addEventListener("submit", submitVolunteerSignup);
}

async function submitVolunteerSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());
  data.acceptTerms = form.elements.acceptTerms.checked;
  data.skills = String(data.skills || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const validationError = validateSignupData("volunteer", data);
  if (validationError) {
    showFormError(status, validationError);
    return;
  }

  status.textContent = "Creating your volunteer account...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/volunteer/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to create your account.");
      status.classList.add("error");
      return;
    }

    localStorage.setItem("quickaid-session", JSON.stringify(result.session));
    status.textContent = result.message;
    status.classList.add("success");
    window.setTimeout(() => {
      window.location.hash = "#/dashboard";
    }, 650);
  } catch (error) {
    status.textContent = GENERIC_ERROR_MESSAGE;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

function bindLoginForm() {
  const form = document.querySelector(".login-form");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const role = form.dataset.role;
    const data = Object.fromEntries(new FormData(form).entries());
    submitLogin(role, data);
  });
}

async function submitLogin(role, payload) {
  const status = document.querySelector(".form-status");
  const endpoint = role === "professional"
    ? "/api/auth/professional"
    : role === "volunteer"
      ? "/api/auth/volunteer"
      : "/api/auth/public";
  const validationError = validateLoginData(payload);
  if (validationError) {
    showFormError(status, validationError);
    return;
  }
  status.textContent = "Signing in...";
  status.className = "form-status";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to sign in.");
      status.classList.add("error");
      return;
    }
    localStorage.setItem("quickaid-session", JSON.stringify(result.session));
    status.textContent = result.message;
    status.classList.add("success");
    window.setTimeout(() => {
      window.location.hash = "#/dashboard";
    }, 450);
  } catch (error) {
    status.textContent = GENERIC_ERROR_MESSAGE;
    status.classList.add("error");
  }
}

async function renderDashboard() {
  const session = await getOpsSession();
  if (!session) return;
  if (dashboardPreviewMap) {
    dashboardPreviewMap.remove();
    dashboardPreviewMap = null;
  }
  dashboardPreviewIncidents = [];
  const isProfessional = session?.role === "professional";
  const isVolunteer = session?.role === "volunteer";
  emergencySpacesLoaded = false;
  emergencySpacesState = [];
  emergencySpacesSeed = [];
  simulationScenarios = [];
  volunteerDispatchState.loaded = false;
  volunteerDispatchState.volunteers = [];
  volunteerDispatchState.selectedIncidentId = "";
  volunteerDispatchState.filters = {
    skill: "",
    zone: "",
    availability: "",
    status: ""
  };
  volunteerDispatchState.smartMatchScores = new Map();
  simulationState.activeScenario = null;
  simulationState.selectedScenarioId = "";
  simulationState.incidents = [];
  simulationState.resources = [];
  simulationState.volunteers = [];
  simulationState.supplies = [];
  simulationState.alerts = [];
  simulationState.riskScores = [];
  simulationState.briefing = DEFAULT_SIMULATION_BRIEFING;
  simulationState.stats = { ...DEFAULT_DASHBOARD_STATS };
  app.innerHTML = `
    <div class="page dashboard-page command-center-page">
      <main class="ops-dashboard command-center-dashboard">
        <header class="ops-header command-center-header">
          <div class="command-brand-block">
            <button class="ops-menu-button" type="button" data-open-ops-menu aria-label="Open dashboard navigation" aria-expanded="false">
              <span class="hamburger-lines" aria-hidden="true"></span>
            </button>
            <img class="command-brand-logo" src="/assets/logo.png" alt="" aria-hidden="true" />
            <div>
              <h1>AIECC</h1>
              <p>${OPS_BRAND_SUBTITLE}</p>
            </div>
          </div>
          <div class="ops-actions command-header-actions">
            <a class="new-incident-button" href="#/new-incident">${icon("report")} New Incident</a>
          </div>
        </header>

        <div class="ops-menu-backdrop" data-ops-menu-backdrop hidden></div>
        <aside class="ops-navigation" data-ops-menu aria-hidden="true" aria-label="Dashboard navigation">
          <div class="ops-navigation-header">
            <div>
              <strong>AIECC</strong>
              <span>${OPS_BRAND_SUBTITLE}</span>
            </div>
            <button class="ops-menu-close" type="button" data-close-ops-menu aria-label="Close dashboard navigation">${icon("close")}</button>
          </div>
          <nav class="ops-navigation-links">
            <a class="active" href="#/dashboard">${icon("activity")}<span><strong>Overview</strong><small>Live national resource dashboard</small></span></a>
            <a href="#/flood-map">${icon("mapPin")}<span><strong>Hazard Map</strong><small>View floods and dengue areas</small></span></a>
            <a href="#/evacuation-routing">${icon("arrowRight")}<span><strong>Evacuation Routing</strong><small>Plan routes around live blockages</small></span></a>
            <a href="#/risk-prediction">${icon("activity")}<span><strong>Risk Prediction</strong><small>Review dashboard AI assessment</small></span></a>
            <a href="#/incidents">${icon("alert")}<span><strong>Incidents</strong><small>Review and manage reported incidents</small></span></a>
            <a href="#/new-incident">${icon("report")}<span><strong>Report Incident</strong><small>Create a live operational incident</small></span></a>
            <a href="#/emergency-spaces">${icon("building")}<span><strong>Emergency Spaces</strong><small>Review overflow shelter capacity</small></span></a>
            <a href="#/volunteer-dispatch">${icon("users")}<span><strong>Volunteer Dispatch</strong><small>Match and deploy volunteers</small></span></a>
          </nav>
          <section class="ops-navigation-account" aria-label="Signed-in account">
            <div class="ops-navigation-profile">
              <div class="command-avatar">${icon("users")}</div>
              <div>
                <strong>${escapeHtml(session?.name || session?.email || "QuickAid User")}</strong>
                <span>${isProfessional ? "Incident Commander" : isVolunteer ? "Registered Volunteer" : "Community User"}</span>
              </div>
            </div>
            <button class="command-signout-button" type="button" data-signout>${icon("logOut")} Sign Out</button>
          </section>
        </aside>

        <section class="dashboard-preview" aria-labelledby="dashboard-preview-title">
          <div class="dashboard-preview-heading">
            <div>
              <p class="eyebrow">Dashboard preview</p>
              <h2 id="dashboard-preview-title">Operations snapshot</h2>
              <p>A compact view of live incidents, volunteers, and emergency-space capacity.</p>
            </div>
            <span class="dashboard-preview-live"><i></i> Live data</span>
          </div>
          <div class="dashboard-preview-stats" data-dashboard-preview-stats>
            ${dashboardPreviewLoadingCards()}
          </div>
          <div class="dashboard-preview-grid">
            <section class="dashboard-preview-panel dashboard-map-panel" aria-labelledby="dashboard-live-map-title">
              <div class="dashboard-preview-panel-title">
                <div>
                  <p class="eyebrow">Multi-hazard overview</p>
                  <h3 id="dashboard-live-map-title">Singapore Hazard Map</h3>
                </div>
                <a class="dashboard-map-link" href="#/flood-map">Full map ${icon("arrowRight")}</a>
              </div>
              <div id="dashboard-preview-map" class="dashboard-preview-map dashboard-inline-map">
                <span>Loading flood, incident, and dengue data...</span>
              </div>
              <div class="dashboard-map-key" aria-label="Hazard map legend">
                <span><i class="is-flood"></i><b>PUB flood alert</b></span>
                <span><i class="is-incident"></i><b>Active incident</b></span>
                <span><i class="is-dengue"></i><b>Dengue danger area</b></span>
              </div>
            </section>
            <aside class="dashboard-preview-panel dashboard-incident-panel" aria-labelledby="dashboard-incident-feed-title">
              <div class="dashboard-preview-panel-title">
                <div>
                  <p class="eyebrow">Live response</p>
                  <h3 id="dashboard-incident-feed-title">Incident Feed</h3>
                </div>
                <span class="dashboard-feed-count" data-dashboard-feed-count>0 active</span>
              </div>
              <div class="dashboard-incident-feed" data-dashboard-incident-feed>
                <p class="dashboard-preview-empty">Loading incidents...</p>
              </div>
            </aside>
          </div>
          <section class="dashboard-preview-panel dashboard-ai-panel" id="dashboard-ai-prediction" data-dashboard-ai-panel aria-labelledby="dashboard-ai-title" tabindex="-1">
            <div class="dashboard-ai-heading">
              <div>
                <p class="eyebrow">On-demand assessment</p>
                <h3 id="dashboard-ai-title">AI Prediction</h3>
                <p>Choose an incident or zone, then run a four-hour risk analysis.</p>
              </div>
              <div class="dashboard-ai-controls">
                <label>
                  Analyze target
                  <select data-dashboard-prediction-target disabled>
                    <option value="">Loading targets...</option>
                  </select>
                </label>
                <button type="button" data-dashboard-analyze disabled>${icon("activity")} Analyze</button>
              </div>
            </div>
            <div class="dashboard-ai-result" data-dashboard-ai-result>
              <div class="dashboard-ai-idle-icon">${icon("activity")}</div>
              <div>
                <strong>Prediction waiting</strong>
                <p>No AI assessment has been run. Select a target and press Analyze.</p>
              </div>
            </div>
          </section>

          <section class="dashboard-preview-panel dashboard-strategic-panel" aria-labelledby="dashboard-strategic-title">
            <div class="dashboard-preview-heading dashboard-strategic-heading">
              <div>
                <p class="eyebrow">Analytics & insights</p>
                <h2 id="dashboard-strategic-title">Strategic analytics</h2>
                <p>Flood alerts, dengue clusters, and AI recommendations in one dashboard view.</p>
              </div>
              <span class="dashboard-preview-live"><i></i> Analytics live</span>
            </div>
            <div class="dashboard-analytics-stats" data-dashboard-analytics-stats>
              ${dashboardAnalyticsLoadingCards()}
            </div>
            <div class="dashboard-analytics-grid">
              <article class="dashboard-analytics-card">
                <div class="dashboard-preview-panel-title">
                  <div>
                    <p class="eyebrow">Flood pattern</p>
                    <h3>Active Flood Alerts by Severity</h3>
                  </div>
                </div>
                <div class="dashboard-bar-list" data-dashboard-flood-bars>
                  <p class="dashboard-preview-empty">Loading flood alert distribution...</p>
                </div>
              </article>
              <article class="dashboard-analytics-card">
                <div class="dashboard-preview-panel-title">
                  <div>
                    <p class="eyebrow">Dengue pattern</p>
                    <h3>Dengue Clusters by Case Size</h3>
                  </div>
                </div>
                <div class="dashboard-bar-list" data-dashboard-dengue-bars>
                  <p class="dashboard-preview-empty">Loading dengue cluster distribution...</p>
                </div>
              </article>
            </div>
            <div class="dashboard-analytics-grid dashboard-analytics-grid-secondary">
              <section class="dashboard-analytics-card dashboard-insights-card" aria-labelledby="dashboard-insights-title">
                <div class="dashboard-preview-panel-title">
                  <div>
                    <p class="eyebrow">AI strategic insights</p>
                    <h3 id="dashboard-insights-title">Recommendations</h3>
                  </div>
                </div>
                <div class="dashboard-insights-grid" data-dashboard-insights-grid>
                  <p class="dashboard-preview-empty">Loading strategic insights...</p>
                </div>
              </section>
            </div>
          </section>
        </section>

        <div class="dashboard-modal-backdrop" data-dashboard-modal-backdrop hidden></div>
        <section class="dashboard-modal" data-dashboard-incident-modal role="dialog" aria-modal="true" aria-labelledby="dashboard-modal-title" hidden>
          <button class="dashboard-modal-close" type="button" data-close-dashboard-modal aria-label="Close incident details">${icon("close")}</button>
          <div data-dashboard-incident-modal-content></div>
        </section>
        <footer class="command-status-bar">
          <div>
            <span class="status-dot"></span>
            <strong>Live operations monitoring</strong>
          </div>
          <span data-dashboard-clock>${new Date().toLocaleTimeString("en-SG", { hour12: false })} SGT</span>
        </footer>

        ${isVolunteer ? `<p class="public-dashboard-note">Volunteer view: manage your availability and assigned response work from Volunteer Dispatch. Professional sign-in is required for command actions.</p>` : ""}
      </main>
    </div>
  `;

  const opsMenu = document.querySelector("[data-ops-menu]");
  const opsMenuBackdrop = document.querySelector("[data-ops-menu-backdrop]");
  const opsMenuButton = document.querySelector("[data-open-ops-menu]");

  function closeOpsMenu() {
    opsMenu.classList.remove("open");
    opsMenu.setAttribute("aria-hidden", "true");
    opsMenuBackdrop.hidden = true;
    opsMenuButton.setAttribute("aria-expanded", "false");
  }

  function openOpsMenu() {
    opsMenu.classList.add("open");
    opsMenu.setAttribute("aria-hidden", "false");
    opsMenuBackdrop.hidden = false;
    opsMenuButton.setAttribute("aria-expanded", "true");
    document.querySelector("[data-close-ops-menu]").focus();
  }

  opsMenuButton.addEventListener("click", openOpsMenu);
  document.querySelector("[data-close-ops-menu]").addEventListener("click", closeOpsMenu);
  opsMenuBackdrop.addEventListener("click", closeOpsMenu);

  opsMenuKeydownHandler = (event) => {
    if (event.key === "Escape" && opsMenu.classList.contains("open")) closeOpsMenu();
  };
  document.addEventListener("keydown", opsMenuKeydownHandler);

  document.querySelector("[data-signout]").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("quickaid-session");
    window.location.hash = "#/";
  });

  bindDashboardModals();
  await loadDashboardPreview();
  await loadDashboardAnalytics();
  focusDashboardAiPredictionIfRequested();
  dashboardPreviewTimer = window.setInterval(() => {
    if (isDashboardHash(window.location.hash)) {
      loadDashboardPreview();
      loadDashboardAnalytics();
    }
  }, 30_000);
  renderQuickStats();
  renderSimulationInsights();
  startOpsHeaderClock();
}

function dashboardPreviewLoadingCards() {
  return ["Active incidents", "Critical alerts", "Volunteers available", "Shelter capacity"]
    .map((label) => `
      <article class="dashboard-preview-stat is-loading">
        <span>${label}</span>
        <strong>—</strong>
        <small>Loading...</small>
      </article>
    `)
    .join("");
}

function isDashboardHash(hash) {
  return hash === "#/dashboard" || hash === DASHBOARD_AI_PREDICTION_HASH;
}

function focusDashboardAiPredictionIfRequested() {
  if (window.location.hash !== DASHBOARD_AI_PREDICTION_HASH) return;
  const panel = document.querySelector("[data-dashboard-ai-panel]");
  if (!panel) return;

  window.requestAnimationFrame(() => {
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    panel.focus({ preventScroll: true });
    panel.classList.add("is-linked-focus");
    window.setTimeout(() => {
      panel.classList.remove("is-linked-focus");
    }, 1800);
  });
}

function dashboardAnalyticsLoadingCards() {
  return ["Active Flood Alerts", "Active Dengue Clusters", "Total Dengue Cases"]
    .map((label) => `
      <article class="dashboard-preview-stat dashboard-analytics-stat is-loading">
        <span>${label}</span>
        <strong>—</strong>
        <small>Loading...</small>
      </article>
    `)
    .join("");
}

function dashboardPreviewStat({ label, value, detail, iconName, tone }) {
  return `
    <article class="dashboard-preview-stat ${tone}">
      <div class="dashboard-preview-stat-icon">${icon(iconName)}</div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function dashboardAnalyticsStat({ label, value, detail, tone = "is-primary" }) {
  return `
    <article class="dashboard-preview-stat dashboard-analytics-stat ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function dashboardBarList(items) {
  const maxValue = Math.max(1, ...items.map((item) => Number(item.value) || 0));
  return items.map((item) => {
    const value = Number(item.value) || 0;
    const width = Math.max(value ? 8 : 2, Math.round((value / maxValue) * 100));
    return `
      <div class="dashboard-bar-row">
        <div>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
        <i style="--bar-width:${width}%;--bar-color:${escapeHtml(item.color || "#0f766e")}"></i>
      </div>
    `;
  }).join("");
}

async function loadDashboardAnalytics() {
  const stats = document.querySelector("[data-dashboard-analytics-stats]");
  const floodBars = document.querySelector("[data-dashboard-flood-bars]");
  const dengueBars = document.querySelector("[data-dashboard-dengue-bars]");
  const insightsGrid = document.querySelector("[data-dashboard-insights-grid]");
  if (!stats || !floodBars || !dengueBars || !insightsGrid) return;

  const readJson = async (url, fallback) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return fallback;
      return await response.json();
    } catch (error) {
      return fallback;
    }
  };

  const [floodPayload, denguePayload] = await Promise.all([
    readJson("/api/flood-alerts", { records: [] }),
    readJson("/api/dengue-clusters", { geojson: { features: [] } })
  ]);

  const floodEntries = activeFloodReadings(floodPayload.records || []);
  const dengueFeatures = denguePayload.geojson?.features || [];
  const totalDengueCases = dengueFeatures.reduce((sum, feature) => sum + dengueClusterInfo(feature).caseSize, 0);

  stats.innerHTML = [
    dashboardAnalyticsStat({
      label: "Active Flood Alerts",
      value: floodEntries.length,
      detail: "PUB alert readings active",
      tone: floodEntries.length ? "is-warning" : "is-success"
    }),
    dashboardAnalyticsStat({
      label: "Active Dengue Clusters",
      value: dengueFeatures.length,
      detail: "NEA cluster areas tracked",
      tone: dengueFeatures.length ? "is-warning" : "is-success"
    }),
    dashboardAnalyticsStat({
      label: "Total Dengue Cases",
      value: totalDengueCases,
      detail: "Across active clusters",
      tone: totalDengueCases >= 50 ? "is-danger" : "is-primary"
    })
  ].join("");

  const severityCounts = { Extreme: 0, Severe: 0, Moderate: 0, Minor: 0 };
  floodEntries.forEach((entry) => {
    if (severityCounts[entry.reading.severity] !== undefined) severityCounts[entry.reading.severity] += 1;
  });
  floodBars.innerHTML = dashboardBarList(Object.entries(severityCounts).map(([label, value]) => ({
    label,
    value,
    color: severityColor(label)
  })));

  const dengueBucketCounts = DENGUE_BUCKETS.map((bucket) => ({ ...bucket, value: 0 }));
  dengueFeatures.forEach((feature) => {
    const { caseSize } = dengueClusterInfo(feature);
    const bucket = dengueBucketCounts.find((entry) => caseSize <= entry.max);
    if (bucket) bucket.value += 1;
  });
  dengueBars.innerHTML = dashboardBarList(dengueBucketCounts.map((bucket) => ({
    label: bucket.label,
    value: bucket.value,
    color: bucket.color
  })));

  const insights = generateFloodDengueInsights(floodEntries, dengueFeatures).slice(0, 3);
  insightsGrid.innerHTML = insights.map((insight) => {
    const level = insight.riskLevel;
    const riskClass = level === "CRITICAL" ? "risk-critical" : level === "HIGH" ? "risk-high" : "risk-medium";
    return `
      <article class="analytics-insight-card ${riskClass}">
        <div class="analytics-insight-header">
          <h3>${escapeHtml(insight.title)}</h3>
          <span class="analytics-risk-badge analytics-risk-badge--${level.toLowerCase()}">${escapeHtml(level)}</span>
        </div>
        <h4 class="eyebrow">AI Recommendations</h4>
        <ul>${insight.recommendations.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    `;
  }).join("");
}


function normalizeDashboardIncident(incident, index) {
  const severity = String(incident.severity || "Medium").toLowerCase();
  const status = String(incident.status || "open").trim().toLowerCase();
  const title = incident.areaDesc || incident.location || incident.name || `${incident.type || "Emergency"} incident`;
  const location = incident.location || incident.areaDesc || "Location under verification";
  const zone = Object.keys(DISPATCH_ZONE_COORDS).find((name) =>
    `${title} ${location}`.toLowerCase().includes(name.toLowerCase())
  );
  const fallbackCoordinates = zone ? DISPATCH_ZONE_COORDS[zone] : null;
  const hasLatitude = incident.lat !== null && incident.lat !== undefined && incident.lat !== "";
  const hasLongitude = incident.lng !== null && incident.lng !== undefined && incident.lng !== "";
  return {
    id: String(incident.id || `preview-${index + 1}`),
    title,
    type: incident.type || "Emergency",
    severity,
    status,
    createdAt: incident.createdAt || null,
    location,
    note: incident.note || "",
    response: incident.response || incident.status || "Emergency teams are assessing the situation.",
    source: incident._dashboardSource || "mongodb",
    lat: hasLatitude && Number.isFinite(Number(incident.lat)) ? Number(incident.lat) : fallbackCoordinates?.[0],
    lng: hasLongitude && Number.isFinite(Number(incident.lng)) ? Number(incident.lng) : fallbackCoordinates?.[1]
  };
}

function dashboardIncidentGuidance(incident) {
  const type = incident.type.toLowerCase();
  if (type.includes("flood")) {
    return {
      action: "Drainage and response teams are monitoring water levels and redirecting traffic.",
      prevention: "Avoid flooded roads, underpasses, canals, and low-lying areas. Never walk or drive through moving water."
    };
  }
  if (type.includes("fire")) {
    return {
      action: "SCDF response units are securing the site and checking nearby buildings.",
      prevention: "Keep clear of the smoke plume and access roads. Close windows and follow evacuation instructions."
    };
  }
  if (type.includes("medical") || type.includes("dengue") || type.includes("health")) {
    return {
      action: "Health teams are coordinating surveillance, treatment capacity, and community outreach.",
      prevention: "Avoid the affected zone where possible, remove stagnant water, use repellent, and seek care for symptoms."
    };
  }
  if (type.includes("power")) {
    return {
      action: "Utility teams are isolating the fault and prioritising essential services.",
      prevention: "Avoid damaged cables, use lifts only when cleared, and conserve phone battery."
    };
  }
  return {
    action: "Emergency coordinators are validating reports and dispatching the appropriate response.",
    prevention: "Keep away from the affected area, leave access routes clear, and follow official instructions."
  };
}

function dashboardSeverityLabel(severity) {
  if (severity === "critical" || severity === "high") return "High priority";
  if (severity === "medium") return "Moderate";
  return "Advisory";
}

function bindDashboardModals() {
  const backdrop = document.querySelector("[data-dashboard-modal-backdrop]");
  const incidentModal = document.querySelector("[data-dashboard-incident-modal]");
  if (!backdrop || !incidentModal) return;

  const closeModals = () => {
    backdrop.hidden = true;
    incidentModal.hidden = true;
    document.body.classList.remove("dashboard-modal-open");
  };

  document.querySelectorAll("[data-close-dashboard-modal]").forEach((button) => {
    button.addEventListener("click", closeModals);
  });
  backdrop.addEventListener("click", closeModals);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !backdrop.hidden) closeModals();
  });
}

function openDashboardIncident(incidentId) {
  const incident = dashboardPreviewIncidents.find((item) => item.id === incidentId);
  const modal = document.querySelector("[data-dashboard-incident-modal]");
  const backdrop = document.querySelector("[data-dashboard-modal-backdrop]");
  const content = document.querySelector("[data-dashboard-incident-modal-content]");
  if (!incident || !modal || !backdrop || !content) return;

  const guidance = dashboardIncidentGuidance(incident);
  content.dataset.incidentId = incident.id;
  content.innerHTML = `
    <div class="dashboard-incident-modal-heading is-${escapeHtml(incident.severity)}">
      <p>${escapeHtml(dashboardSeverityLabel(incident.severity))} · ${escapeHtml(incident.type)}</p>
      <h2 id="dashboard-modal-title">${escapeHtml(incident.title)}</h2>
      <span>${icon("mapPin")} ${escapeHtml(incident.location)}</span>
    </div>
    <div class="dashboard-incident-modal-grid">
      <section>
        <h3>What is happening</h3>
        <p>${escapeHtml(incident.note || `${incident.type} response remains active at ${incident.location}.`)}</p>
      </section>
      <section>
        <h3>Response underway</h3>
        <p><strong>Current status: ${escapeHtml(incident.response)}.</strong> ${escapeHtml(guidance.action)}</p>
      </section>
      <section class="dashboard-public-advisory">
        <h3>${icon("shield")} Public safety advisory</h3>
        <p>${escapeHtml(guidance.prevention)}</p>
      </section>
    </div>
    <footer class="dashboard-incident-modal-footer">
      <span>Status: <strong>${escapeHtml(incident.status)}</strong></span>
      <time>${dashboardIncidentTime(incident.createdAt)}</time>
    </footer>
  `;
  backdrop.hidden = false;
  modal.hidden = false;
  document.body.classList.add("dashboard-modal-open");
  modal.querySelector("[data-close-dashboard-modal]")?.focus();
}

function dashboardMapMarkerClass(severity) {
  if (["critical", "high", "extreme", "severe"].includes(String(severity).toLowerCase())) return "is-critical";
  if (["medium", "moderate"].includes(String(severity).toLowerCase())) return "is-warning";
  return "is-advisory";
}

async function renderDashboardPreviewMap() {
  const mapElement = document.querySelector("#dashboard-preview-map");
  if (!mapElement || typeof L === "undefined") return;
  if (dashboardPreviewMap) {
    dashboardPreviewMap.invalidateSize();
    return;
  }

  mapElement.innerHTML = "";
  dashboardPreviewMap = L.map("dashboard-preview-map", { scrollWheelZoom: false }).setView([1.3521, 103.8198], 11);
  addOneMapTileLayer(dashboardPreviewMap);
  const bounds = L.latLngBounds([]);
  let hazardCount = 0;

  const addGlowingMarker = ({ lat, lng, severity, title, detail, incidentId = "" }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const markerClass = dashboardMapMarkerClass(severity);
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "dashboard-map-marker-shell",
        html: `<button class="dashboard-map-marker ${markerClass}" type="button" aria-label="${escapeHtml(title)}"><span></span></button>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    }).addTo(dashboardPreviewMap);
    marker.bindPopup(`
      <div class="dashboard-map-popup">
        <span class="dashboard-map-popup-level ${markerClass}">${escapeHtml(dashboardSeverityLabel(String(severity).toLowerCase()))}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(detail)}</p>
        ${incidentId ? `<button type="button" data-map-incident="${escapeHtml(incidentId)}">View full response details</button>` : ""}
      </div>
    `);
    if (incidentId) {
      marker.on("popupopen", () => {
        const detailButton = document.querySelector("[data-map-incident]");
        if (detailButton?.dataset.mapIncident === incidentId) detailButton.addEventListener("click", () => {
          dashboardPreviewMap.closePopup();
          openDashboardIncident(incidentId);
        });
      });
    }
    bounds.extend([lat, lng]);
    hazardCount += 1;
  };

  const addFloodMarker = ({ record, reading }) => {
    const circle = reading.area?.circle;
    if (!Array.isArray(circle)) return;
    const lat = Number(circle[0]);
    const lng = Number(circle[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const severity = String(reading.severity || "Minor").toLowerCase();
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "dashboard-flood-marker-shell",
        html: `<button class="dashboard-flood-marker is-${escapeHtml(severity)}" type="button" aria-label="${escapeHtml(reading.headline || "PUB flood alert")}">${icon("droplet")}<span></span></button>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      })
    }).addTo(dashboardPreviewMap);
    marker.bindPopup(floodPopup({ record, reading }));
    bounds.extend([lat, lng]);
    hazardCount += 1;
  };

  const locatedIncidents = dashboardPreviewIncidents.filter((incident) =>
    incident.source === "mongodb" && Number.isFinite(incident.lat) && Number.isFinite(incident.lng)
  );
  locatedIncidents.forEach((incident) => {
    addGlowingMarker({
      lat: incident.lat,
      lng: incident.lng,
      severity: incident.severity,
      title: incident.title,
      detail: `${incident.type} · ${incident.status}`,
      incidentId: incident.id
    });
  });

  const [floodResult, dengueResult] = await Promise.allSettled([
    fetch("/api/flood-alerts").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Flood alerts unavailable.");
      return payload;
    }),
    fetch("/api/dengue-clusters").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Dengue clusters unavailable.");
      return payload;
    })
  ]);

  if (floodResult.status === "fulfilled") {
    activeFloodReadings(floodResult.value.records || []).forEach(addFloodMarker);
  }

  if (dengueResult.status === "fulfilled") {
    (dengueResult.value.geojson?.features || []).forEach((feature) => {
      const info = dengueClusterInfo(feature);
      const color = dengueColor(info.caseSize);
      const layer = geoJsonFeatureToLayer(feature, {
        style: () => ({
          color,
          weight: info.caseSize >= 10 ? 3 : 2,
          fillColor: color,
          fillOpacity: info.caseSize >= 10 ? 0.38 : 0.25,
          dashArray: info.caseSize >= 10 ? "" : "5 5"
        })
      })
        .bindPopup(denguePopup(info))
        .addTo(dashboardPreviewMap);
      if (layer.getBounds) bounds.extend(layer.getBounds());
      hazardCount += 1;
    });
  }

  if (bounds.isValid() && hazardCount > 1) {
    dashboardPreviewMap.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
  } else if (!hazardCount) {
    mapElement.insertAdjacentHTML("beforeend", `<p class="dashboard-map-empty">No located hazards are currently available.</p>`);
  }
}

function dashboardPredictionMarkup(prediction, targetLabel) {
  const severity = String(prediction.severity || "Low");
  const tone = dashboardMapMarkerClass(severity);
  return `
    <div class="dashboard-ai-score ${tone}">
      <span>Predicted risk</span>
      <strong>${escapeHtml(prediction.riskScore ?? "—")}</strong>
      <small>${escapeHtml(severity)}</small>
    </div>
    <div class="dashboard-ai-summary">
      <p class="eyebrow">Four-hour outlook</p>
      <h4>${escapeHtml(targetLabel)}</h4>
      <div class="dashboard-ai-meta">
        <span>Confidence <strong>${Math.round((prediction.confidence || 0) * 100)}%</strong></span>
        <span>Time to impact <strong>${escapeHtml(prediction.timeToImpact || "Unknown")}</strong></span>
      </div>
      <p>${escapeHtml(prediction.explanation || "Prediction completed from available observations.")}</p>
    </div>
    <div class="dashboard-ai-actions">
      <h4>Recommended actions</h4>
      <ul>${(prediction.recommendations || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Continue monitoring official data feeds.</li>"}</ul>
    </div>
  `;
}

function bindDashboardPrediction() {
  const select = document.querySelector("[data-dashboard-prediction-target]");
  const button = document.querySelector("[data-dashboard-analyze]");
  const result = document.querySelector("[data-dashboard-ai-result]");
  if (!select || !button || !result) return;

  button.onclick = async () => {
    const option = select.options[select.selectedIndex];
    if (!option?.value) return;
    button.disabled = true;
    button.innerHTML = `${icon("activity")} Analyzing...`;
    result.classList.remove("has-result");
    result.innerHTML = `<p class="dashboard-preview-empty">Analyzing observations for ${escapeHtml(option.textContent)}...</p>`;

    try {
      const endpoint = option.dataset.source === "db" ? "/api/risk/predict-db" : "/api/risk/predict";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone: option.value, hours: 4 })
      });
      const prediction = await response.json();
      if (!response.ok) throw new Error(prediction.error || "Prediction failed.");
      result.classList.add("has-result");
      result.innerHTML = dashboardPredictionMarkup(prediction, option.textContent);
    } catch (error) {
      result.classList.remove("has-result");
      result.innerHTML = `
        <div class="dashboard-ai-idle-icon is-error">${icon("alert")}</div>
        <div><strong>Analysis unavailable</strong><p>${escapeHtml(error.message)}</p></div>
      `;
    } finally {
      button.disabled = false;
      button.innerHTML = `${icon("activity")} Analyze`;
    }
  };
}

async function loadDashboardPredictionTargets({ autoAnalyze = false } = {}) {
  const predictionSelect = document.querySelector("[data-dashboard-prediction-target]");
  const predictionButton = document.querySelector("[data-dashboard-analyze]");
  if (!predictionSelect || !predictionButton) return;

  const selectedPredictionTarget = predictionSelect.value;
  const readJson = async (url, fallback) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return fallback;
      return await response.json();
    } catch (error) {
      return fallback;
    }
  };

  const [incidentPayload, riskHeatmap] = await Promise.all([
    readJson("/api/incidents", null),
    readJson("/api/risk/heatmap?region=all&window=4", null)
  ]);
  const inactiveStatuses = new Set(["closed", "resolved", "completed"]);
  const activeIncidents = (incidentPayload?.incidents || [])
    .map((incident) => normalizeDashboardIncident({ ...incident, _dashboardSource: "mongodb" }))
    .filter((incident) => !inactiveStatuses.has(incident.status));
  const predictionTargets = activeIncidents.length
    ? activeIncidents.map((incident) => ({
      value: incident.id,
      label: incident.title,
      source: "db"
    }))
    : (riskHeatmap?.features || []).map((feature) => ({
      value: feature.properties?.zoneId,
      label: feature.properties?.zoneName || feature.properties?.zoneId || "Live flood zone",
      source: "api"
    })).filter((target) => target.value);

  predictionSelect.innerHTML = predictionTargets.length
    ? predictionTargets.map((target) => `
      <option value="${escapeHtml(target.value)}" data-source="${target.source}">
        ${escapeHtml(target.label)}
      </option>
    `).join("")
    : `<option value="Singapore" data-source="api">Singapore monitoring baseline</option>`;
  if ([...predictionSelect.options].some((option) => option.value === selectedPredictionTarget)) {
    predictionSelect.value = selectedPredictionTarget;
  }
  predictionSelect.disabled = false;
  predictionButton.disabled = false;
  bindDashboardPrediction();

  if (autoAnalyze && predictionSelect.value) {
    predictionButton.click();
  }
}

function dashboardIncidentTime(value) {
  if (!value) return "Live";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Live";
  return date.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

async function loadDashboardPreview() {
  const stats = document.querySelector("[data-dashboard-preview-stats]");
  const feed = document.querySelector("[data-dashboard-incident-feed]");
  const feedCount = document.querySelector("[data-dashboard-feed-count]");
  const predictionSelect = document.querySelector("[data-dashboard-prediction-target]");
  const predictionButton = document.querySelector("[data-dashboard-analyze]");
  if (!stats || !feed || !predictionSelect || !predictionButton) return;
  const selectedPredictionTarget = predictionSelect.value;

  const readJson = async (url, fallback) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return fallback;
      return await response.json();
    } catch (error) {
      return fallback;
    }
  };

  const [incidentPayload, spaces, volunteers, status, riskHeatmap] = await Promise.all([
    readJson("/api/incidents", null),
    readJson("/api/emergency-spaces", []),
    readJson("/api/volunteers", []),
    readJson("/api/status", null),
    readJson("/api/risk/heatmap?region=all&window=4", null)
  ]);

  const fallbackIncidents = (status?.alerts || []).map((alert) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.priority,
    status: alert.status,
    areaDesc: `${alert.type}: ${alert.location}`,
    _dashboardSource: "status-fallback"
  }));
  const incidentRecords = incidentPayload?.incidents?.length
    ? incidentPayload.incidents.map((incident) => ({ ...incident, _dashboardSource: "mongodb" }))
    : fallbackIncidents;
  const incidents = incidentRecords
    .map(normalizeDashboardIncident);
  const inactiveStatuses = new Set(["closed", "resolved", "completed"]);
  const active = incidents.filter((incident) => !inactiveStatuses.has(incident.status));
  dashboardPreviewIncidents = active;
  const incidentModal = document.querySelector("[data-dashboard-incident-modal]");
  const incidentModalContent = document.querySelector("[data-dashboard-incident-modal-content]");
  if (
    incidentModal &&
    !incidentModal.hidden &&
    incidentModalContent?.dataset.incidentId &&
    !active.some((incident) => incident.id === incidentModalContent.dataset.incidentId)
  ) {
    incidentModal.hidden = true;
    const modalBackdrop = document.querySelector("[data-dashboard-modal-backdrop]");
    if (modalBackdrop) modalBackdrop.hidden = true;
    document.body.classList.remove("dashboard-modal-open");
  }
  const critical = active.filter((incident) => ["critical", "high"].includes(incident.severity));
  const availableVolunteers = volunteers.filter((volunteer) =>
    String(volunteer.status || volunteer.availability).toLowerCase() === "available"
  );
  const totalCapacity = spaces.reduce((sum, space) => sum + (Number(space.capacity) || 0), 0);
  const totalOccupancy = spaces.reduce((sum, space) => sum + (Number(space.currentOccupancy ?? space.occupancy) || 0), 0);
  const availableCapacity = Math.max(totalCapacity - totalOccupancy, 0);
  const availableCapacityPercent = totalCapacity ? Math.round((availableCapacity / totalCapacity) * 100) : null;

  stats.innerHTML = [
    dashboardPreviewStat({
      label: "Active incidents",
      value: active.length,
      detail: `${active.length} currently reported`,
      iconName: "activity",
      tone: "is-danger"
    }),
    dashboardPreviewStat({
      label: "Critical alerts",
      value: critical.length,
      detail: "Requiring escalation",
      iconName: "alert",
      tone: "is-warning"
    }),
    dashboardPreviewStat({
      label: "Volunteers available",
      value: availableVolunteers.length,
      detail: `${volunteers.length} registered`,
      iconName: "users",
      tone: "is-success"
    }),
    dashboardPreviewStat({
      label: "Shelter capacity",
      value: availableCapacityPercent == null ? "—" : `${availableCapacityPercent}%`,
      detail: totalCapacity ? `${availableCapacity} of ${totalCapacity} places available` : "Capacity data unavailable",
      iconName: "building",
      tone: "is-primary"
    })
  ].join("");

  feed.innerHTML = active.length
    ? active.map((incident) => `
      <article class="dashboard-incident-item is-${escapeHtml(incident.severity)}">
        <button class="dashboard-incident-main" type="button" data-dashboard-incident="${escapeHtml(incident.id)}">
          <span class="dashboard-severity-dot is-${escapeHtml(incident.severity)}"></span>
          <span>
            <strong>${escapeHtml(incident.title)}</strong>
            <small>${escapeHtml(incident.type)} · ${escapeHtml(incident.status)}</small>
          </span>
          <time>${dashboardIncidentTime(incident.createdAt)}</time>
        </button>
        <button class="dashboard-incident-alert is-${escapeHtml(incident.severity)}" type="button" data-dashboard-incident="${escapeHtml(incident.id)}" aria-label="Open urgent details for ${escapeHtml(incident.title)}">
          ${icon("alert")}
        </button>
      </article>
    `).join("")
    : `<p class="dashboard-preview-empty">No active incidents are currently reported.</p>`;
  if (feedCount) feedCount.textContent = `${active.length} active`;

  feed.querySelectorAll("[data-dashboard-incident]").forEach((button) => {
    button.addEventListener("click", () => openDashboardIncident(button.dataset.dashboardIncident));
  });

  const predictionTargets = incidentPayload?.incidents?.length
    ? active.map((incident) => ({
      value: incident.id,
      label: incident.title,
      source: "db"
    }))
    : (riskHeatmap?.features || []).map((feature) => ({
      value: feature.properties?.zoneId,
      label: feature.properties?.zoneName || feature.properties?.zoneId || "Live flood zone",
      source: "api"
    })).filter((target) => target.value);
  predictionSelect.innerHTML = predictionTargets.length
    ? predictionTargets.map((target) => `
      <option value="${escapeHtml(target.value)}" data-source="${target.source}">
        ${escapeHtml(target.label)}
      </option>
    `).join("")
    : `<option value="Singapore" data-source="api">Singapore monitoring baseline</option>`;
  if ([...predictionSelect.options].some((option) => option.value === selectedPredictionTarget)) {
    predictionSelect.value = selectedPredictionTarget;
  }
  predictionSelect.disabled = false;
  predictionButton.disabled = false;
  bindDashboardPrediction();
  if (dashboardPreviewMap) {
    dashboardPreviewMap.remove();
    dashboardPreviewMap = null;
  }
  await renderDashboardPreviewMap();
}

async function renderIncidentReportPage() {
  const session = await getOpsSession({ redirect: false });

  app.innerHTML = opsShellMarkup({
    active: "report",
    session,
    content: `
      <section class="incident-report-section ops-standalone-section">
        <div class="simulation-suite-header">
          <div>
            <p class="eyebrow">Live operations</p>
            <h2>Report New Incident</h2>
          </div>
        </div>
        <section class="incident-report-card">
          <form class="incident-report-form" data-incident-report-form>
            <div class="incident-report-grid">
              <label>
                Type of incident
                <select name="type" data-incident-type required>
                  <option value="">Select incident type</option>
                  <option value="Flood">Flood</option>
                  <option value="Dengue Cluster">Dengue cluster</option>
                  <option value="Fire">Fire</option>
                  <option value="Medical">Medical emergency</option>
                  <option value="Traffic">Traffic accident</option>
                  <option value="Power outage">Power outage</option>
                  <option value="Resource shortage">Resource shortage</option>
                  <option value="Structural">Structural hazard</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Severity
                <select name="severity" required>
                  <option value="">Select severity</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
            </div>
            <label class="incident-other-field" data-incident-other-field hidden>
              Other incident type
              <input name="otherType" type="text" maxlength="80" placeholder="Describe the incident type" />
            </label>
            <label>
              Location postal code
              <input name="postalCode" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="postal-code" placeholder="e.g. 600123" required />
              <small>The backend uses OneMap to convert this postal code into latitude and longitude.</small>
            </label>
            <label>
              Notes
              <textarea name="note" rows="5" maxlength="1000" placeholder="Add hazards, access restrictions, response details, or other useful information"></textarea>
            </label>
            <div class="incident-report-actions">
              <button class="form-button" type="submit" data-incident-submit>${icon("alert")} Submit Incident</button>
              <p class="form-status" data-incident-status role="status"></p>
            </div>
          </form>
        </section>
      </section>
    `
  });
  bindOpsShell();
  const form = document.querySelector("[data-incident-report-form]");
  const typeSelect = document.querySelector("[data-incident-type]");
  const otherField = document.querySelector("[data-incident-other-field]");
  const otherInput = otherField.querySelector("input");
  const status = document.querySelector("[data-incident-status]");
  const submitButton = document.querySelector("[data-incident-submit]");

  typeSelect.addEventListener("change", () => {
    const showOther = typeSelect.value === "Other";
    otherField.hidden = !showOther;
    otherInput.required = showOther;
    if (!showOther) otherInput.value = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Verifying location and submitting incident...";
    status.classList.remove("error", "success");
    submitButton.disabled = true;

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.type === "Other") data.type = String(data.otherType || "").trim();
      delete data.otherType;
      if (!data.type) throw new Error("Enter the other incident type.");

      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit the incident.");

      status.textContent = "Incident submitted. Updating the dashboard...";
      status.classList.add("success");
      window.setTimeout(() => {
        window.location.hash = session ? "#/dashboard" : "#/incidents";
      }, 700);
    } catch (error) {
      status.textContent = error.message || "Unable to submit the incident.";
      status.classList.add("error");
      submitButton.disabled = false;
    }
  });
}

function displayIncidentStatus(status) {
  const normalized = String(status || "active").toLowerCase();
  if (normalized === "open") return "active";
  if (normalized === "investigating") return "monitoring";
  if (normalized === "closed") return "resolved";
  return normalized;
}

function incidentStatusLabel(status) {
  const normalized = displayIncidentStatus(status);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function incidentTypeValue(type) {
  const normalized = String(type || "other").trim().toLowerCase();
  if (normalized.includes("flood")) return "flood";
  if (normalized.includes("dengue")) return "dengue_cluster";
  if (normalized.includes("fire")) return "fire";
  if (normalized.includes("traffic") || normalized.includes("road")) return "traffic";
  if (normalized.includes("medical") || normalized.includes("health")) return "medical";
  if (normalized.includes("power") || normalized.includes("utility")) return "power_outage";
  if (normalized.includes("resource") || normalized.includes("shortage")) return "resource_shortage";
  if (normalized.includes("structur") || normalized.includes("building")) return "structural";
  return "other";
}

function incidentManagementCard(incident, isProfessional) {
  const status = displayIncidentStatus(incident.status);
  const title = incident.areaDesc || incident.location || "Location pending";
  return `
    <article class="incident-management-card is-${escapeHtml(String(incident.severity || "low").toLowerCase())}">
      <div class="incident-management-card-head">
        <div>
          <div class="incident-management-badges">
            <span class="incident-severity-badge">${escapeHtml(incident.severity || "Low")}</span>
            <span class="incident-status-badge is-${escapeHtml(status)}">${escapeHtml(incidentStatusLabel(status))}</span>
          </div>
          <h3>${escapeHtml(incident.type || "Other incident")}</h3>
          <p>${escapeHtml(title)}</p>
        </div>
        <time>${dashboardIncidentTime(incident.createdAt)}</time>
      </div>
      ${incident.note ? `<p class="incident-management-note">${escapeHtml(incident.note)}</p>` : ""}
      <div class="incident-management-meta">
        <span>Reported by ${escapeHtml(incident.reporter || "anonymous")}</span>
        ${Number.isFinite(Number(incident.lat)) && Number.isFinite(Number(incident.lng))
          ? `<span>${Number(incident.lat).toFixed(4)}, ${Number(incident.lng).toFixed(4)}</span>`
          : ""}
      </div>
      ${isProfessional ? `
        <label class="incident-status-control">
          Update status
          <select data-incident-status="${escapeHtml(incident.id)}">
            ${["active", "monitoring", "contained", "resolved"].map((option) => `
              <option value="${option}"${option === status ? " selected" : ""}>${incidentStatusLabel(option)}</option>
            `).join("")}
          </select>
        </label>
      ` : ""}
    </article>
  `;
}

async function renderIncidentsPage() {
  const session = await getOpsSession({ redirect: false });
  const isProfessional = session?.role === "professional";

  app.innerHTML = opsShellMarkup({
    active: "incidents",
    session,
    content: `
      <section class="incidents-page ops-standalone-section">
        <div class="incidents-page-header">
          <div>
            <h2>Incidents</h2>
            <p data-incidents-count>Loading reported incidents...</p>
          </div>
          <a class="form-button incidents-report-button" href="#/new-incident">${icon("report")} Report Incident</a>
        </div>
        <div class="incidents-filter-bar">
          <label>
            Incident type
            <select data-incident-type-filter>
              <option value="all">All types</option>
              <option value="flood">Flood</option>
              <option value="dengue_cluster">Dengue Cluster</option>
              <option value="fire">Fire</option>
              <option value="traffic">Traffic Disruption</option>
              <option value="medical">Medical Emergency</option>
              <option value="power_outage">Power Outage</option>
              <option value="resource_shortage">Resource Shortage</option>
              <option value="structural">Structural Hazard</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Status
            <select data-incident-status-filter>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="monitoring">Monitoring</option>
              <option value="contained">Contained</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
        </div>
        ${isProfessional
          ? `<p class="incidents-access-note">${icon("shield")} Professional access: incident statuses can be updated here.</p>`
          : `<p class="incidents-access-note">Anyone can report an incident. Only signed-in professional accounts can edit reported incidents.</p>`}
        <div class="incidents-list" data-incidents-list>
          <p class="incidents-empty">Loading incidents...</p>
        </div>
        <p class="form-status incidents-page-status" data-incidents-status role="status"></p>
      </section>
    `
  });
  bindOpsShell();

  const list = document.querySelector("[data-incidents-list]");
  const count = document.querySelector("[data-incidents-count]");
  const typeFilter = document.querySelector("[data-incident-type-filter]");
  const statusFilter = document.querySelector("[data-incident-status-filter]");
  const pageStatus = document.querySelector("[data-incidents-status]");
  let incidents = [];

  function renderFilteredIncidents() {
    const filtered = incidents.filter((incident) => {
      const matchesType = typeFilter.value === "all" || incidentTypeValue(incident.type) === typeFilter.value;
      const matchesStatus = statusFilter.value === "all" || displayIncidentStatus(incident.status) === statusFilter.value;
      return matchesType && matchesStatus;
    });
    count.textContent = `${filtered.length} incident${filtered.length === 1 ? "" : "s"} shown`;
    list.innerHTML = filtered.length
      ? filtered.map((incident) => incidentManagementCard(incident, isProfessional)).join("")
      : `<p class="incidents-empty">No incidents match the current filters.</p>`;

    if (!isProfessional) return;
    list.querySelectorAll("[data-incident-status]").forEach((select) => {
      select.addEventListener("change", async () => {
        const incident = incidents.find((item) => item.id === select.dataset.incidentStatus);
        const previousStatus = displayIncidentStatus(incident?.status);
        select.disabled = true;
        pageStatus.textContent = "Updating incident status...";
        pageStatus.classList.remove("error", "success");
        try {
          const response = await fetch(`/api/incidents/${encodeURIComponent(select.dataset.incidentStatus)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: select.value })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Unable to update incident.");
          incidents = incidents.map((item) => item.id === result.incident.id ? result.incident : item);
          pageStatus.textContent = "Incident status updated.";
          pageStatus.classList.add("success");
          renderFilteredIncidents();
        } catch (error) {
          select.value = previousStatus;
          select.disabled = false;
          pageStatus.textContent = error.message || "Unable to update incident.";
          pageStatus.classList.add("error");
        }
      });
    });
  }

  typeFilter.addEventListener("change", renderFilteredIncidents);
  statusFilter.addEventListener("change", renderFilteredIncidents);

  try {
    const response = await fetch("/api/incidents");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load incidents.");
    incidents = result.incidents || [];
    renderFilteredIncidents();
  } catch (error) {
    count.textContent = "Incidents unavailable";
    list.innerHTML = `<p class="incidents-empty error">${escapeHtml(error.message || "Unable to load incidents.")}</p>`;
  }
}

async function renderEmergencySpacesPage() {
  const session = await getOpsSession({ redirect: false });
  emergencySpacesSession = session;
  emergencySpacesLoaded = false;
  emergencySpacesState = [];
  emergencySpacesSeed = [];
  emergencySpacesFilter = "all";
  emergencySpacesUserLocation = null;
  emergencyHospitalsState = SINGAPORE_HOSPITALS.map((hospital) => ({ ...hospital }));

  const isProfessional = session?.role === "professional";

  app.innerHTML = opsShellMarkup({
    active: "spaces",
    session,
    content: `
      <section class="emergency-spaces-panel-section ops-standalone-section" data-emergency-spaces-section>
        <section class="emergency-spaces-section">
          <div class="emergency-spaces-header">
            <div>
              <h2>Emergency Spaces</h2>
              <p class="emergency-spaces-subtitle">Shelters and hospitals with live capacity tracking</p>
            </div>
            ${isProfessional ? `<button class="form-button emergency-space-add-toggle" type="button" data-toggle-space-form>${icon("building")} Add Conversion Space</button>` : ""}
          </div>

          <section class="emergency-spaces-toolbar" aria-label="Emergency spaces filters">
            <div class="emergency-space-tabs" role="tablist" aria-label="Emergency space category">
              <button class="active" type="button" data-space-filter="all">All</button>
              <button type="button" data-space-filter="shelter">Shelters</button>
              <button type="button" data-space-filter="hospital">Hospitals</button>
            </div>
            <button class="secondary-button compact" type="button" data-locate-hospitals>${icon("mapPin")} Nearest to me</button>
          </section>
          <p class="nearest-hospitals-status" data-nearest-hospitals-status>Click “Nearest to me” to sort hospitals and spaces by distance from your location.</p>

          ${isProfessional ? `
            <form class="emergency-space-form" data-add-emergency-space hidden novalidate>
              <input name="spaceId" type="hidden" />
              <input name="hospitalId" type="hidden" />
              <input name="lat" type="hidden" />
              <input name="lng" type="hidden" />
              <div class="emergency-space-form-heading">
                <div>
                  <h3 data-space-form-title>Add Emergency Conversion Space</h3>
                  <p data-space-form-description>Register a shelter or hospital conversion space for live capacity tracking.</p>
                </div>
                <span class="emergency-space-form-lock">${icon("shield")} Professionals only</span>
              </div>
              <div class="emergency-space-form-grid">
                <label>Space name
                  <input name="name" type="text" placeholder="e.g. Pasir Ris Sports Hall" required maxlength="100" />
                </label>
                <label>Type
                  <select name="type" required>
                    ${EMERGENCY_SPACE_TYPES.map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`).join("")}
                  </select>
                </label>
                <label>Location / address
                  <input name="address" type="text" placeholder="Street address or landmark" required maxlength="140" />
                </label>
                <label>Region / zone
                  <input name="region" type="text" placeholder="e.g. Pasir Ris" required maxlength="80" />
                </label>
                <label>Capacity
                  <input name="capacity" type="number" min="1" max="10000" step="1" placeholder="300" required />
                </label>
                <label>Setup time (hours)
                  <input name="setupTimeHours" type="number" min="0" max="168" step="0.5" placeholder="2" />
                </label>
              </div>
              <button class="secondary-button compact" type="button" data-space-use-location>${icon("mapPin")} Use my current location</button>
              <label class="emergency-space-checkbox">
                <input name="wheelchairAccess" type="checkbox" />
                Wheelchair accessible
              </label>
              <div class="emergency-space-form-actions">
                <button class="form-button" type="submit" data-space-form-submit>${icon("building")} Add Space</button>
                <button class="secondary-button compact" type="button" data-reset-space-form>Reset</button>
                <p class="form-status" data-emergency-space-form-status role="status"></p>
              </div>
            </form>
          ` : ""}
          <p class="emergency-spaces-message" data-emergency-spaces-message>Loading emergency conversion spaces...</p>
          <div class="emergency-spaces-grid" data-emergency-spaces-grid></div>
        </section>
      </section>
    `
  });
  bindOpsShell();
  await fetchEmergencySpaces();
  bindEmergencySpaceForm();
  bindEmergencySpaceControls();

  document.querySelector("[data-locate-hospitals]")?.addEventListener("click", () => {
    const statusEl = document.querySelector("[data-nearest-hospitals-status]");
    if (!statusEl) return;
    if (!navigator.geolocation) {
      statusEl.textContent = "Geolocation is not supported by this browser.";
      return;
    }
    statusEl.textContent = "Getting your location…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        emergencySpacesUserLocation = { lat: latitude, lng: longitude };
        statusEl.textContent = "Sorted by nearest hospitals, shelters, and conversion spaces from your location.";
        renderEmergencySpaces();
      },
      () => {
        statusEl.textContent = "Unable to get your location. Please enable location access in your browser.";
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  });
}

async function renderVolunteerDispatchPage() {
  const session = await getOpsSession();
  if (!session) return;

  volunteerDispatchState.loaded = false;
  volunteerDispatchState.volunteers = [];
  volunteerDispatchState.selectedIncidentId = "";
  volunteerDispatchState.filters = {
    skill: "",
    zone: "",
    availability: "",
    status: ""
  };
  volunteerDispatchState.smartMatchScores = new Map();

  app.innerHTML = opsShellMarkup({
    active: "dispatch",
    session,
    content: `
      <section class="volunteer-dispatch-section ops-standalone-section" data-volunteer-dispatch-section>
        <div class="volunteer-dispatch-header">
          <div>
            <p class="eyebrow">Volunteer operations</p>
            <h2>Volunteer Dispatch Workflow</h2>
            <p class="volunteer-dispatch-note">Dispatch uses seed volunteer data and simulated notifications for now. Profile updates, assignments, and status changes happen instantly.</p>
          </div>
        </div>
        <div data-volunteer-dispatch-content></div>
      </section>
    `
  });
  bindOpsShell();
  await showVolunteerDispatchSection(session);
}

function formatAuthError(result, fallback) {
  if (result.fields) {
    return Object.values(result.fields).join(" ");
  }
  return result.error || fallback;
}

async function getOpsSession({ redirect = true } = {}) {
  const storedSession = readStoredSession();
  try {
    const response = await fetch("/api/auth/session", { credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to verify session.");
    localStorage.setItem("quickaid-session", JSON.stringify(result.session));
    return result.session;
  } catch (error) {
    if (storedSession) return storedSession;
    if (redirect) window.location.hash = "#/login";
    return null;
  }
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem("quickaid-session") || "null");
  } catch (error) {
    localStorage.removeItem("quickaid-session");
    return null;
  }
}

function opsNavigationMarkup(active = "overview", session = null) {
  const navItems = [
    { key: "overview", href: "#/dashboard", iconName: "activity", title: "Overview", detail: "Live national resource dashboard" },
    { key: "flood", href: "#/flood-map", iconName: "mapPin", title: "Hazard Map", detail: "View floods and dengue areas" },
    { key: "evacuation", href: "#/evacuation-routing", iconName: "arrowRight", title: "Evacuation Routing", detail: "Plan routes around live blockages" },
    { key: "risk", href: "#/risk-prediction", iconName: "activity", title: "Risk Prediction", detail: "Review dashboard AI assessment" },
    { key: "incidents", href: "#/incidents", iconName: "alert", title: "Incidents", detail: "Review and manage reported incidents" },
    { key: "report", href: "#/new-incident", iconName: "report", title: "Report Incident", detail: "Create a live operational incident" },
    { key: "spaces", href: "#/emergency-spaces", iconName: "building", title: "Emergency Spaces", detail: "Review overflow shelter capacity" },
    { key: "dispatch", href: "#/volunteer-dispatch", iconName: "users", title: "Volunteer Dispatch", detail: "Match and deploy volunteers" }
  ];
  return `
    <div class="ops-menu-backdrop" data-ops-menu-backdrop hidden></div>
    <aside class="ops-navigation" data-ops-menu aria-hidden="true" aria-label="Dashboard navigation">
      <div class="ops-navigation-header">
        <img class="ops-navigation-logo" src="/assets/logo.png" alt="" aria-hidden="true" />
        <div>
          <strong>AIECC</strong>
          <span>${OPS_BRAND_SUBTITLE}</span>
        </div>
        <button class="ops-menu-close" type="button" data-close-ops-menu aria-label="Close dashboard navigation">${icon("close")}</button>
      </div>
      <nav class="ops-navigation-links">
        ${navItems.map((item) => `
          <a class="${item.key === active ? "active" : ""}" href="${item.href}">
            ${icon(item.iconName)}
            <span><strong>${item.title}</strong><small>${item.detail}</small></span>
          </a>
        `).join("")}
      </nav>
      ${session ? `
        <section class="ops-navigation-account" aria-label="Signed-in account">
          <div class="ops-navigation-profile">
            <div class="command-avatar">${icon("users")}</div>
            <div>
              <strong>${escapeHtml(session.name || session.email || "QuickAid User")}</strong>
              <span>${session.role === "professional" ? "Incident Commander" : session.role === "volunteer" ? "Registered Volunteer" : "Community User"}</span>
            </div>
          </div>
          <button class="command-signout-button" type="button" data-signout>${icon("logOut")} Sign Out</button>
        </section>
      ` : ""}
    </aside>
  `;
}

function opsShellMarkup({ active = "overview", session = null, content = "" } = {}) {
  const isSignedIn = Boolean(session);
  const useFullWidth = active === "incidents" || active === "report";
  return `
    <div class="page dashboard-page">
      <main class="ops-dashboard${useFullWidth ? " is-full-width-operations" : ""}">
        <header class="ops-header">
          <div class="ops-title-row">
            <button class="ops-menu-button" type="button" data-open-ops-menu aria-label="Open dashboard navigation" aria-expanded="false">
              <span class="hamburger-lines" aria-hidden="true"></span>
            </button>
            <img class="ops-title-logo" src="/assets/logo.png" alt="" aria-hidden="true" />
            <div class="ops-brand-copy">
              <h1>AIECC</h1>
              <p>${OPS_BRAND_SUBTITLE}</p>
            </div>
          </div>
          <div class="ops-actions">
            <span class="updated-pill" data-last-updated>Last Updated : ${formatOpsUpdatedTime()}</span>
            ${isSignedIn
              ? ""
              : `<button class="secondary-button compact" data-auth-action>Sign in</button><a class="secondary-button compact ops-signup-button" href="#/signup">Sign up</a>`}
          </div>
        </header>
        ${opsNavigationMarkup(active, session)}
        ${content}
        <footer class="command-status-bar feature-status-bar">
          <div>
            <span class="status-dot"></span>
            <strong>Live operations monitoring</strong>
          </div>
          <span data-dashboard-clock>${new Date().toLocaleTimeString("en-SG", { hour12: false })} SGT</span>
        </footer>
      </main>
    </div>
  `;
}

function bindOpsShell() {
  const opsMenu = document.querySelector("[data-ops-menu]");
  const opsMenuBackdrop = document.querySelector("[data-ops-menu-backdrop]");
  const opsMenuButton = document.querySelector("[data-open-ops-menu]");
  const closeButton = document.querySelector("[data-close-ops-menu]");
  if (!opsMenu || !opsMenuBackdrop || !opsMenuButton || !closeButton) return;

  function closeOpsMenu() {
    opsMenu.classList.remove("open");
    opsMenu.setAttribute("aria-hidden", "true");
    opsMenuBackdrop.hidden = true;
    opsMenuButton.setAttribute("aria-expanded", "false");
  }

  function openOpsMenu() {
    opsMenu.classList.add("open");
    opsMenu.setAttribute("aria-hidden", "false");
    opsMenuBackdrop.hidden = false;
    opsMenuButton.setAttribute("aria-expanded", "true");
    closeButton.focus();
  }

  opsMenuButton.addEventListener("click", openOpsMenu);
  closeButton.addEventListener("click", closeOpsMenu);
  opsMenuBackdrop.addEventListener("click", closeOpsMenu);
  document.querySelectorAll(".ops-navigation-links a").forEach((link) => {
    link.addEventListener("click", closeOpsMenu);
  });

  opsMenuKeydownHandler = (event) => {
    if (event.key === "Escape" && opsMenu.classList.contains("open")) closeOpsMenu();
  };
  document.addEventListener("keydown", opsMenuKeydownHandler);

  document.querySelector("[data-auth-action]")?.addEventListener("click", async () => {
    const session = readStoredSession();
    if (!session) {
      window.location.hash = "#/login";
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("quickaid-session");
    window.location.hash = "#/";
  });
  document.querySelector("[data-signout]")?.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("quickaid-session");
    window.location.hash = "#/";
  });
  startOpsHeaderClock();
}

function metric(label, value) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function opsMetric({ id, label, value, tone }) {
  return `
    <article class="ops-metric">
      <span>${label}</span>
      <strong class="${tone}" data-stat-id="${id}">${value}</strong>
    </article>
  `;
}

function calculateEmergencySpaceStatus(space) {
  const requestedStatus = String(space.status || "").toUpperCase();
  if (space._active === false || requestedStatus === "INACTIVE" || requestedStatus === "CLOSED") return "INACTIVE";
  if (space.currentOccupancy >= space.capacity && space.capacity > 0) return "FULL";
  if (space.currentOccupancy >= space.capacity * 0.7 && space.capacity > 0) return "NEARLY FULL";
  return "READY";
}

function decorateEmergencySpace(space) {
  const currentOccupancy = Math.max(0, Math.min(space.capacity, Number(space.currentOccupancy) || 0));
  const active = !["INACTIVE", "CLOSED"].includes(String(space.status || "").toUpperCase());
  return {
    ...space,
    _active: active,
    currentOccupancy,
    availableCapacity: Math.max(space.capacity - currentOccupancy, 0),
    status: calculateEmergencySpaceStatus({
      ...space,
      currentOccupancy,
      _active: active
    })
  };
}

function emergencySpaceBadgeClass(status) {
  if (status === "INACTIVE") return "is-inactive";
  if (status === "FULL") return "is-full";
  if (status === "NEARLY FULL") return "is-nearly-full";
  return "is-ready";
}

function emergencySpaceCategory(space) {
  const type = String(space.type || "").toLowerCase();
  if (type.includes("hospital")) return "hospital";
  return "shelter";
}

function emergencySpaceStatusLabel(status) {
  if (status === "INACTIVE") return "closed";
  if (status === "FULL") return "full";
  return "open";
}

function emergencySpaceCoordinates(space) {
  if (Number.isFinite(Number(space.lat)) && Number.isFinite(Number(space.lng))) {
    return { lat: Number(space.lat), lng: Number(space.lng) };
  }
  const coords = DISPATCH_ZONE_COORDS[space.region];
  return coords ? { lat: coords[0], lng: coords[1] } : null;
}

function distanceFromUser(point) {
  if (!emergencySpacesUserLocation || !point) return null;
  return haversineKm(emergencySpacesUserLocation.lat, emergencySpacesUserLocation.lng, point.lat, point.lng);
}

function formatReverseGeocodeAddress(address) {
  if (!address) return "";
  return [address.building, address.block, address.road, address.postalCode ? `Singapore ${address.postalCode}` : ""]
    .filter((part) => part && String(part).toLowerCase() !== "nil")
    .join(", ");
}

function hospitalCard(hospital, { isNearest = false } = {}) {
  const distanceKm = distanceFromUser({ lat: hospital.lat, lng: hospital.lng });
  const occupancy = Math.max(0, Math.min(hospital.beds, Number(hospital.occupancy) || 0));
  const occupancyPercent = hospital.beds ? Math.min(100, Math.round((occupancy / hospital.beds) * 100)) : 0;
  const isProfessional = emergencySpacesSession?.role === "professional";
  return `
    <article class="emergency-space-card hospital-card">
      <div class="emergency-space-card-head">
        <div>
          <h3>${escapeHtml(hospital.name)}</h3>
          <p>${icon("mapPin")} ${escapeHtml(hospital.address || hospital.zone)}${distanceKm == null ? "" : ` · ${distanceKm.toFixed(1)} km away`}</p>
        </div>
        <div class="emergency-space-card-actions">
          ${isNearest ? `<span class="nearest-space-badge">Nearest</span>` : ""}
          <span class="emergency-space-badge is-ready">open</span>
          ${isProfessional ? `<button class="secondary-button compact" type="button" data-edit-hospital="${escapeHtml(hospital.id)}">Edit</button>` : ""}
        </div>
      </div>
      <p class="emergency-space-type">Hospital</p>
      <div class="emergency-space-progress ${occupancyPercent > 85 ? "is-high" : ""}" aria-label="${occupancyPercent}% occupied">
        <span style="width:${occupancyPercent}%"></span>
      </div>
      <div class="emergency-space-capacity-row">
        <p><strong>${escapeHtml(occupancy)}</strong><span> / ${escapeHtml(hospital.beds)} occupied</span></p>
      </div>
      <dl class="emergency-space-stats">
        <div><dt>Zone</dt><dd>${escapeHtml(hospital.zone)}</dd></div>
        <div><dt>Distance</dt><dd>${distanceKm == null ? "Sort by location" : `${distanceKm.toFixed(2)} km`}</dd></div>
      </dl>
    </article>
  `;
}

function emergencySpaceCard(space, { isNearest = false } = {}) {
  const isProfessional = emergencySpacesSession?.role === "professional";
  const isActive = space._active !== false;
  const occupancyPercent = space.capacity ? Math.min(100, Math.round((space.currentOccupancy / space.capacity) * 100)) : 0;
  const typeLabel = EMERGENCY_SPACE_TYPES.find((type) => type.value === space.type)?.label || space.type;
  const distanceKm = distanceFromUser(emergencySpaceCoordinates(space));
  const isHospital = emergencySpaceCategory(space) === "hospital";
  return `
    <article class="emergency-space-card${isActive ? "" : " space-inactive-dim"}">
      <div class="emergency-space-card-head">
        <div>
          <h3>${escapeHtml(space.name)}</h3>
          <p>${icon("mapPin")} ${space.address ? `${escapeHtml(space.address)} · ` : ""}${escapeHtml(space.region)}${distanceKm == null ? "" : ` · ${distanceKm.toFixed(1)} km away`}</p>
        </div>
        <div class="emergency-space-card-actions">
          ${isNearest ? `<span class="nearest-space-badge">Nearest</span>` : ""}
          <span class="emergency-space-badge ${emergencySpaceBadgeClass(space.status)}">${escapeHtml(emergencySpaceStatusLabel(space.status))}</span>
          ${isProfessional ? `
            <button class="secondary-button compact" type="button" data-edit-space="${space.id}">Edit</button>
            ${isHospital ? "" : `<button class="secondary-button compact" type="button" data-toggle-space="${space.id}">${isActive ? "Set Inactive" : "Set Active"}</button>`}
          ` : ""}
        </div>
      </div>
      <p class="emergency-space-type">${escapeHtml(typeLabel)}</p>
      <div class="emergency-space-progress ${occupancyPercent > 85 ? "is-high" : ""}" aria-label="${occupancyPercent}% occupied">
        <span style="width:${occupancyPercent}%"></span>
      </div>
      <div class="emergency-space-capacity-row">
        <p><strong>${escapeHtml(space.currentOccupancy)}</strong><span> / ${escapeHtml(space.capacity)} occupied</span></p>
        ${isProfessional ? `
          <div class="emergency-space-stepper" aria-label="Update occupancy for ${escapeHtml(space.name)}">
            <button type="button" data-space-occupancy="${space.id}" data-delta="-10" aria-label="Decrease occupancy for ${escapeHtml(space.name)}">−</button>
            <button type="button" data-space-occupancy="${space.id}" data-delta="10" aria-label="Increase occupancy for ${escapeHtml(space.name)}">+</button>
          </div>
        ` : ""}
      </div>
      <dl class="emergency-space-stats">
        <div><dt>Available Capacity</dt><dd>${escapeHtml(isActive ? space.availableCapacity : 0)}</dd></div>
        <div><dt>Setup Time</dt><dd>${escapeHtml(space.setupTimeHours)} hours</dd></div>
        <div><dt>Distance</dt><dd>${distanceKm == null ? "Sort by location" : `${distanceKm.toFixed(2)} km`}</dd></div>
      </dl>
    </article>
  `;
}

async function saveEmergencySpaceUpdate(spaceId, data) {
  const response = await fetch(`/api/emergency-spaces/${encodeURIComponent(spaceId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to update emergency space.");
  const updated = decorateEmergencySpace(result.space);
  emergencySpacesSeed = emergencySpacesSeed.map((space) => space.id === updated.id ? { ...updated } : space);
  emergencySpacesState = emergencySpacesState.map((space) => space.id === updated.id ? { ...updated } : space);
  return updated;
}

function bindEmergencySpaceForm() {
  const form = document.querySelector("[data-add-emergency-space]");
  if (!form) return;
  const status = document.querySelector("[data-emergency-space-form-status]");
  const title = form.querySelector("[data-space-form-title]");
  const description = form.querySelector("[data-space-form-description]");
  const submit = form.querySelector("[data-space-form-submit]");
  const typeSelect = form.elements.type;
  const useLocationButton = form.querySelector("[data-space-use-location]");

  const setTypeOptions = (types, selectedValue = "Temporary Shelter") => {
    if (!typeSelect) return;
    typeSelect.innerHTML = types.map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`).join("");
    typeSelect.value = selectedValue;
  };

  const resetForm = () => {
    form.reset();
    form.elements.spaceId.value = "";
    form.elements.hospitalId.value = "";
    form.elements.lat.value = "";
    form.elements.lng.value = "";
    setTypeOptions(EMERGENCY_SPACE_TYPES);
    form.elements.type.disabled = false;
    if (title) title.textContent = "Add Emergency Conversion Space";
    if (description) description.textContent = "Add a shelter or hospital conversion space for live capacity tracking.";
    if (submit) submit.innerHTML = `${icon("building")} Add Space`;
    if (status) {
      status.textContent = "";
      status.classList.remove("error", "success");
    }
  };

  form.querySelector("[data-reset-space-form]")?.addEventListener("click", resetForm);
  useLocationButton?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      if (status) {
        status.textContent = "Geolocation is not supported by this browser.";
        status.classList.add("error");
      }
      return;
    }
    if (status) {
      status.textContent = "Getting your location...";
      status.classList.remove("error", "success");
    }
    useLocationButton.disabled = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        form.elements.lat.value = String(lat);
        form.elements.lng.value = String(lng);
        emergencySpacesUserLocation = { lat, lng };
        try {
          const response = await fetch(`/api/onemap/revgeocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
          const result = await response.json();
          if (response.ok && result.address) {
            const address = formatReverseGeocodeAddress(result.address);
            if (address) form.elements.address.value = address;
          } else if (!form.elements.address.value) {
            form.elements.address.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          }
        } catch (error) {
          if (!form.elements.address.value) form.elements.address.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
        if (!form.elements.region.value) form.elements.region.value = "Current location";
        if (status) {
          status.textContent = "Location added to this space.";
          status.classList.remove("error");
          status.classList.add("success");
        }
        useLocationButton.disabled = false;
      },
      () => {
        if (status) {
          status.textContent = "Unable to get your location. Please enable location access or enter it manually.";
          status.classList.add("error");
        }
        useLocationButton.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const spaceId = String(formData.get("spaceId") || "");
    const hospitalId = String(formData.get("hospitalId") || "");
    const payload = {
      name: formData.get("name"),
      type: formData.get("type") || "Temporary Shelter",
      address: formData.get("address"),
      region: formData.get("region"),
      capacity: Number(formData.get("capacity")),
      setupTimeHours: Number(formData.get("setupTimeHours") || 0),
      wheelchairAccess: formData.get("wheelchairAccess") === "on",
      status: "READY"
    };
    const rawLat = String(formData.get("lat") || "").trim();
    const rawLng = String(formData.get("lng") || "").trim();
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (rawLat && rawLng && Number.isFinite(lat) && Number.isFinite(lng)) {
      payload.lat = lat;
      payload.lng = lng;
    }
    if (status) {
      status.textContent = spaceId || hospitalId ? "Saving changes..." : "Adding emergency conversion space...";
      status.classList.remove("error", "success");
    }
    if (submitButton) submitButton.disabled = true;
    try {
      if (hospitalId) {
        emergencyHospitalsState = emergencyHospitalsState.map((hospital) => hospital.id === hospitalId
          ? {
            ...hospital,
            name: String(payload.name || hospital.name).trim(),
            address: String(payload.address || hospital.address || "").trim(),
            zone: String(payload.region || hospital.zone).trim(),
            beds: payload.capacity,
            occupancy: Math.max(0, Math.min(payload.capacity, Number(formData.get("currentOccupancy")) || hospital.occupancy || 0)),
            lat: payload.lat ?? hospital.lat,
            lng: payload.lng ?? hospital.lng
          }
          : hospital);
      } else {
        const response = await fetch(spaceId ? `/api/emergency-spaces/${encodeURIComponent(spaceId)}` : "/api/emergency-spaces", {
          method: spaceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
          const fieldErrors = result.fields ? Object.values(result.fields).filter(Boolean).join(" ") : "";
          throw new Error(fieldErrors || result.error || "Unable to save emergency conversion space.");
        }
        const space = decorateEmergencySpace(result.space);
        if (spaceId) {
          emergencySpacesSeed = emergencySpacesSeed.map((item) => item.id === space.id ? { ...space } : item);
          emergencySpacesState = emergencySpacesState.map((item) => item.id === space.id ? { ...space } : item);
        } else {
          emergencySpacesSeed = [...emergencySpacesSeed, { ...space }];
          emergencySpacesState = [...emergencySpacesState, { ...space }];
        }
      }
      resetForm();
      form.hidden = true;
      const toggle = document.querySelector("[data-toggle-space-form]");
      if (toggle) toggle.innerHTML = `${icon("building")} Add Conversion Space`;
      if (status) {
        status.textContent = "";
        status.classList.add("success");
      }
      renderEmergencySpaces();
    } catch (error) {
      if (status) {
        status.textContent = error.message || "Unable to add emergency conversion space.";
        status.classList.add("error");
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function openEmergencySpaceFormForEdit(space) {
  const form = document.querySelector("[data-add-emergency-space]");
  const toggle = document.querySelector("[data-toggle-space-form]");
  if (!form) return;
  form.hidden = false;
  if (toggle) toggle.innerHTML = `${icon("close")} Close Form`;
  form.elements.spaceId.value = space.id;
  form.elements.hospitalId.value = "";
  form.elements.lat.value = Number.isFinite(Number(space.lat)) ? String(space.lat) : "";
  form.elements.lng.value = Number.isFinite(Number(space.lng)) ? String(space.lng) : "";
  form.elements.name.value = space.name || "";
  form.elements.type.innerHTML = EMERGENCY_SPACE_TYPES.map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`).join("");
  form.elements.type.value = space.type || EMERGENCY_SPACE_TYPES[0].value;
  form.elements.type.disabled = false;
  form.elements.address.value = space.address || "";
  form.elements.region.value = space.region || "";
  form.elements.capacity.value = space.capacity || "";
  form.elements.setupTimeHours.value = space.setupTimeHours || 0;
  form.elements.wheelchairAccess.checked = Boolean(space.wheelchairAccess);
  form.querySelector("[data-space-form-title]").textContent = "Edit Emergency Conversion Space";
  form.querySelector("[data-space-form-description]").textContent = "Update this conversion space profile and save it back to operations.";
  form.querySelector("[data-space-form-submit]").innerHTML = `${icon("building")} Save Changes`;
  const status = document.querySelector("[data-emergency-space-form-status]");
  if (status) {
    status.textContent = "";
    status.classList.remove("error", "success");
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openHospitalFormForEdit(hospital) {
  const form = document.querySelector("[data-add-emergency-space]");
  const toggle = document.querySelector("[data-toggle-space-form]");
  if (!form) return;
  form.hidden = false;
  if (toggle) toggle.innerHTML = `${icon("close")} Close Form`;
  form.elements.spaceId.value = "";
  form.elements.hospitalId.value = hospital.id;
  form.elements.lat.value = Number.isFinite(Number(hospital.lat)) ? String(hospital.lat) : "";
  form.elements.lng.value = Number.isFinite(Number(hospital.lng)) ? String(hospital.lng) : "";
  form.elements.name.value = hospital.name || "";
  form.elements.type.innerHTML = EMERGENCY_SPACE_TYPES.map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`).join("");
  form.elements.type.value = "Hospital";
  form.elements.type.disabled = true;
  form.elements.address.value = hospital.address || "";
  form.elements.region.value = hospital.zone || "";
  form.elements.capacity.value = hospital.beds || "";
  form.elements.setupTimeHours.value = 0;
  form.elements.wheelchairAccess.checked = true;
  form.querySelector("[data-space-form-title]").textContent = "Edit Hospital";
  form.querySelector("[data-space-form-description]").textContent = "Update hospital details and bed capacity shown in Emergency Spaces.";
  form.querySelector("[data-space-form-submit]").innerHTML = `${icon("building")} Save Changes`;
  const status = document.querySelector("[data-emergency-space-form-status]");
  if (status) {
    status.textContent = "";
    status.classList.remove("error", "success");
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindEmergencySpaceControls() {
  document.querySelector("[data-toggle-space-form]")?.addEventListener("click", () => {
    const form = document.querySelector("[data-add-emergency-space]");
    const button = document.querySelector("[data-toggle-space-form]");
    if (!form || !button) return;
    const willOpen = form.hidden;
    form.hidden = !form.hidden;
    if (willOpen) {
      form.reset();
      form.elements.spaceId.value = "";
      form.elements.hospitalId.value = "";
      form.elements.lat.value = "";
      form.elements.lng.value = "";
      form.elements.type.innerHTML = EMERGENCY_SPACE_TYPES.map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`).join("");
      form.elements.type.value = "Temporary Shelter";
      form.elements.type.disabled = false;
      form.querySelector("[data-space-form-title]").textContent = "Add Emergency Conversion Space";
      form.querySelector("[data-space-form-description]").textContent = "Add a shelter or hospital conversion space for live capacity tracking.";
      form.querySelector("[data-space-form-submit]").innerHTML = `${icon("building")} Add Space`;
    }
    button.innerHTML = form.hidden
      ? `${icon("building")} Add Conversion Space`
      : `${icon("close")} Close Form`;
  });

  document.querySelectorAll("[data-space-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      emergencySpacesFilter = button.dataset.spaceFilter || "all";
      document.querySelectorAll("[data-space-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderEmergencySpaces();
    });
  });
}

function emergencySpaceGridItems() {
  const hospitals = emergencyHospitalsState.map((hospital) => ({
    kind: "hospital",
    category: "hospital",
    distanceKm: distanceFromUser({ lat: hospital.lat, lng: hospital.lng }),
    value: hospital
  }));
  const spaces = emergencySpacesState.map((space) => ({
    kind: "space",
    category: emergencySpaceCategory(space),
    distanceKm: distanceFromUser(emergencySpaceCoordinates(space)),
    value: space
  }));

  const sortedItems = [...hospitals, ...spaces]
    .filter((item) => emergencySpacesFilter === "all" || item.category === emergencySpacesFilter)
    .sort((a, b) => {
      const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;
      const priority = { hospital: 0, shelter: 1 };
      return (priority[a.category] ?? 9) - (priority[b.category] ?? 9);
    });
  const nearestHospitalIndex = emergencySpacesUserLocation
    ? sortedItems.findIndex((item) => item.kind === "hospital")
    : -1;
  const nearestShelterIndex = emergencySpacesUserLocation
    ? sortedItems.findIndex((item) => item.kind === "space" && item.category === "shelter")
    : -1;

  return sortedItems.map((item, index) => ({
    ...item,
    markup: item.kind === "hospital"
      ? hospitalCard(item.value, { isNearest: index === nearestHospitalIndex })
      : emergencySpaceCard(item.value, { isNearest: index === nearestShelterIndex })
  }));
}

function renderEmergencySpaces() {
  const grid = document.querySelector("[data-emergency-spaces-grid]");
  const message = document.querySelector("[data-emergency-spaces-message]");
  if (!grid || !message) return;

  const items = emergencySpaceGridItems();
  if (!items.length) {
    message.textContent = "No spaces in this category.";
    grid.innerHTML = "";
    return;
  }

  const filterLabel = emergencySpacesFilter === "all" ? "all emergency spaces" : `${emergencySpacesFilter} spaces`;
  message.textContent = simulationState.activeScenario
    ? `Shelter demand from ${simulationState.activeScenario.name} has been allocated automatically across emergency spaces.`
    : emergencySpacesUserLocation
      ? `Showing ${filterLabel}, ordered by nearest first.`
      : `Showing ${filterLabel}. Use “Nearest to me” to sort by your location.`;
  grid.innerHTML = items.map((item) => item.markup).join("");

  grid.querySelectorAll("[data-edit-space]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.editSpace);
      const space = emergencySpacesState.find((s) => s.id === id);
      if (space) openEmergencySpaceFormForEdit(space);
    });
  });

  grid.querySelectorAll("[data-edit-hospital]").forEach((button) => {
    button.addEventListener("click", () => {
      const hospital = emergencyHospitalsState.find((item) => item.id === button.dataset.editHospital);
      if (hospital) openHospitalFormForEdit(hospital);
    });
  });

  grid.querySelectorAll("[data-toggle-space]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.toggleSpace);
      const space = emergencySpacesState.find((s) => s.id === id);
      if (space) {
        button.disabled = true;
        try {
          await saveEmergencySpaceUpdate(id, {
            status: space._active === false ? "READY" : "INACTIVE",
            currentOccupancy: space.currentOccupancy
          });
          renderEmergencySpaces();
        } catch (error) {
          message.textContent = error.message || "Unable to update emergency space.";
        }
      }
    });
  });

  grid.querySelectorAll("[data-space-occupancy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.spaceOccupancy);
      const delta = Number(button.dataset.delta) || 0;
      const space = emergencySpacesState.find((s) => s.id === id);
      if (!space) return;
      const currentOccupancy = Math.max(0, Math.min(space.capacity, space.currentOccupancy + delta));
      button.disabled = true;
      try {
        await saveEmergencySpaceUpdate(id, {
          status: space._active === false ? "INACTIVE" : "READY",
          currentOccupancy
        });
        renderEmergencySpaces();
      } catch (error) {
        message.textContent = error.message || "Unable to update emergency space.";
      }
    });
  });
}

function renderLiveActivity() {
  const list = document.querySelector("[data-live-activity-list]");
  if (!list) return;
  const items = simulationState.incidents.length
    ? [
      `<strong>Sim</strong> ${simulationState.activeScenario.name} activated`,
      `<strong>Ops</strong> ${simulationState.alerts[0] || "Resource demand updated."}`,
      ...DEFAULT_LIVE_ACTIVITY.slice(0, 2)
    ]
    : DEFAULT_LIVE_ACTIVITY;
  list.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function quickStatTone(value, type) {
  if (type === "risk") {
    if (String(value).startsWith("High")) return "danger";
    if (String(value).startsWith("Medium")) return "warning";
    return "success";
  }
  return type;
}

function renderQuickStats() {
  const activeIncidents = document.querySelector('[data-stat-id="active-incidents"]');
  const riskAlert = document.querySelector('[data-stat-id="risk-alert"]');
  const volunteers = document.querySelector('[data-stat-id="volunteers-standby"]');
  const shelters = document.querySelector('[data-stat-id="shelters-available"]');
  if (!activeIncidents || !riskAlert || !volunteers || !shelters) return;

  activeIncidents.textContent = String(simulationState.stats.activeIncidents);
  activeIncidents.className = quickStatTone(simulationState.stats.activeIncidents, "danger");
  riskAlert.textContent = simulationState.stats.riskAlert;
  riskAlert.className = quickStatTone(simulationState.stats.riskAlert, "risk");
  volunteers.textContent = String(simulationState.stats.volunteersOnStandby);
  volunteers.className = simulationState.stats.volunteersOnStandby > 0 ? "success" : "warning";
  shelters.textContent = String(simulationState.stats.sheltersAvailable);
  shelters.className = simulationState.stats.sheltersAvailable > 0 ? "success" : "warning";
}

function renderSimulationInsights() {
  const riskLabel = document.querySelector("[data-risk-score-label]");
  const riskDetail = document.querySelector("[data-risk-score-detail]");
  const resourceSummary = document.querySelector("[data-resource-summary]");
  const alertList = document.querySelector("[data-alert-list]");
  const aiBriefing = document.querySelector("[data-ai-briefing]");
  if (!riskLabel || !riskDetail || !resourceSummary || !alertList || !aiBriefing) return;

  const activeRisk = simulationState.riskScores[0];
  riskLabel.textContent = activeRisk?.level?.toUpperCase() || "LOW";
  riskLabel.className = `critical-value risk-level-indicator ${activeRisk?.level === "High" ? "risk-level-high" : activeRisk?.level === "Medium" ? "risk-level-medium" : "risk-level-low"}`;
  riskDetail.textContent = activeRisk
    ? `${activeRisk.zone} risk has been raised to ${activeRisk.level.toUpperCase()} for this simulation.`
    : "No active simulation. Current dashboard is showing base demo conditions.";
  resourceSummary.textContent = simulationState.resources[0]?.summary || DEFAULT_RESOURCE_SUMMARY;
  alertList.innerHTML = (simulationState.alerts.length ? simulationState.alerts : DEFAULT_ALERTS).map((alert) => `<li>${alert}</li>`).join("");
  aiBriefing.textContent = simulationState.briefing || DEFAULT_SIMULATION_BRIEFING;
}

function scenarioPreviewMarkup(scenario) {
  if (!scenario) {
    return `<p class="simulation-empty">Choose a scenario to preview severity, affected people, casualties, and demand.</p>`;
  }
  return `
    <dl class="simulation-preview-grid">
      <div><dt>Severity</dt><dd>${scenario.severity}</dd></div>
      <div><dt>Affected People</dt><dd>${scenario.affectedPeople}</dd></div>
      <div><dt>Estimated Casualties</dt><dd>${scenario.estimatedCasualties}</dd></div>
      <div><dt>Shelter Demand</dt><dd>${scenario.resourceDemand.shelterSpaces}</dd></div>
      <div><dt>Hospital Beds</dt><dd>${scenario.resourceDemand.hospitalBeds}</dd></div>
      <div><dt>Volunteers Needed</dt><dd>${scenario.resourceDemand.volunteersNeeded}</dd></div>
    </dl>
  `;
}

function renderIncidentSimulator() {
  const select = document.querySelector("[data-scenario-select]");
  const preview = document.querySelector("[data-simulation-preview]");
  const runButton = document.querySelector("[data-run-simulation]");
  const resetButton = document.querySelector("[data-reset-simulation]");
  if (!select || !preview || !runButton || !resetButton) return;

  if (!simulationScenarios.length) {
    select.innerHTML = `<option value="">Loading scenarios...</option>`;
    select.disabled = true;
    preview.innerHTML = `<p class="simulation-empty">Load a scenario to preview its demand profile.</p>`;
    runButton.disabled = true;
    resetButton.disabled = !simulationState.activeScenario;
    return;
  }

  if (!simulationState.selectedScenarioId) simulationState.selectedScenarioId = simulationScenarios[0].id;
  select.innerHTML = simulationScenarios.map((scenario) => `<option value="${scenario.id}"${scenario.id === simulationState.selectedScenarioId ? " selected" : ""}>${scenario.name}</option>`).join("");
  select.disabled = false;
  const scenario = simulationScenarios.find((item) => item.id === simulationState.selectedScenarioId) || null;
  preview.innerHTML = scenarioPreviewMarkup(scenario);
  runButton.disabled = !scenario;
  resetButton.disabled = !simulationState.activeScenario;
}

async function fetchSimulationScenarios() {
  try {
    const response = await fetch("/api/simulation/scenarios");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load simulation scenarios.");
    simulationScenarios = Array.isArray(payload) ? payload : [];
  } catch (error) {
    simulationScenarios = [];
    const preview = document.querySelector("[data-simulation-preview]");
    if (preview) preview.innerHTML = `<p class="simulation-empty error">${error.message}</p>`;
  }
  renderIncidentSimulator();
}

async function fetchEmergencySpaces() {
  try {
    const response = await fetch("/api/emergency-spaces");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load emergency spaces.");
    emergencySpacesSeed = (payload || []).map(decorateEmergencySpace);
    emergencySpacesState = emergencySpacesSeed.map((space) => ({ ...space }));
    emergencySpacesLoaded = true;
  } catch (error) {
    emergencySpacesSeed = [];
    emergencySpacesState = [];
    emergencySpacesLoaded = false;
    const message = document.querySelector("[data-emergency-spaces-message]");
    if (message) message.textContent = error.message || "Unable to load emergency spaces.";
  }
  renderEmergencySpaces();
}

function normaliseTokens(value) {
  return String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function emergencySpacePriority(space, scenario) {
  const zoneTokens = new Set(normaliseTokens(scenario.zone));
  const regionTokens = normaliseTokens(space.region);
  const regionMatchScore = regionTokens.reduce((score, token) => score + (zoneTokens.has(token) ? 1 : 0), 0);
  return { regionMatchScore, capacity: space.capacity };
}

function updateEmergencySpacesFromScenario(scenario) {
  const orderedSpaces = [...emergencySpacesSeed].sort((a, b) => {
    const aPriority = emergencySpacePriority(a, scenario);
    const bPriority = emergencySpacePriority(b, scenario);
    if (bPriority.regionMatchScore !== aPriority.regionMatchScore) return bPriority.regionMatchScore - aPriority.regionMatchScore;
    if (bPriority.capacity !== aPriority.capacity) return bPriority.capacity - aPriority.capacity;
    return a.id - b.id;
  });

  let remainingShelterDemand = scenario.resourceDemand.shelterSpaces;
  const allocations = new Map();
  orderedSpaces.forEach((space) => {
    const allocated = Math.min(space.capacity, remainingShelterDemand);
    allocations.set(space.id, allocated);
    remainingShelterDemand -= allocated;
  });

  emergencySpacesState = emergencySpacesSeed.map((space) => decorateEmergencySpace({
    ...space,
    currentOccupancy: allocations.get(space.id) || 0
  }));

  simulationState.resources = [{
    type: "summary",
    summary: `${scenario.resourceDemand.shelterSpaces} shelter spaces requested, ${scenario.resourceDemand.hospitalBeds} hospital beds requested, ${scenario.resourceDemand.volunteersNeeded} volunteers needed, ${scenario.resourceDemand.medicalKits} medical kits, and ${scenario.resourceDemand.foodPacks} food packs required.${remainingShelterDemand > 0 ? ` ${remainingShelterDemand} shelter spaces remain unmet.` : " All shelter demand has been allocated."}`
  }];

  renderEmergencySpaces();
}

function updateQuickStatsFromScenario(scenario) {
  simulationState.stats = {
    activeIncidents: DEFAULT_DASHBOARD_STATS.activeIncidents + 1,
    volunteersOnStandby: Math.max(0, DEFAULT_DASHBOARD_STATS.volunteersOnStandby - scenario.resourceDemand.volunteersNeeded),
    sheltersAvailable: emergencySpacesState.filter((space) => space.availableCapacity > 0).length,
    riskAlert: `${scenario.severity === "Medium" ? "Medium" : "High"} (${scenario.zone})`
  };
  simulationState.riskScores = [{ zone: scenario.zone, level: scenario.severity === "Medium" ? "Medium" : "High" }];
  renderQuickStats();
}

function updateAlertsFromScenario(scenario) {
  simulationState.alerts = [
    `${scenario.severity} ${scenario.type.toLowerCase()} reported in ${scenario.zone}. ${scenario.affectedPeople} people affected. ${scenario.resourceDemand.shelterSpaces} shelter spaces required.`,
    `${scenario.resourceDemand.hospitalBeds} hospital beds and ${scenario.resourceDemand.volunteersNeeded} volunteers have been requested for ${scenario.zone}.`,
    `${scenario.resourceDemand.medicalKits} medical kits and ${scenario.resourceDemand.foodPacks} food packs are now tagged for scenario response.`
  ];
}

function updateBriefingFromScenario(scenario) {
  simulationState.briefing = `Simulation Update: ${scenario.severity} ${scenario.type.toLowerCase()} in ${scenario.zone} affecting ${scenario.affectedPeople} people. Estimated demand: ${scenario.resourceDemand.shelterSpaces} shelter spaces, ${scenario.resourceDemand.hospitalBeds} hospital beds, and ${scenario.resourceDemand.volunteersNeeded} volunteers. Emergency spaces have been allocated automatically.`;
}

function buildSimulationResponseMarkup(scenario) {
  const zoneCoords = DISPATCH_ZONE_COORDS[scenario.zone];
  const hospitalsWithDistance = SINGAPORE_HOSPITALS.map((h) => ({
    ...h,
    distanceKm: zoneCoords ? haversineKm(zoneCoords[0], zoneCoords[1], h.lat, h.lng) : 999
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearestHospitals = hospitalsWithDistance.slice(0, 3);
  const bedsRequired = scenario.resourceDemand.hospitalBeds;
  let bedsAllocated = 0;
  const hospitalAllocations = nearestHospitals.map((h) => {
    const canAllocate = Math.round(h.beds * 0.15);
    const allocated = Math.min(canAllocate, Math.max(0, bedsRequired - bedsAllocated));
    bedsAllocated += allocated;
    return { ...h, allocated, overwhelmed: allocated >= canAllocate };
  });
  const unmetBeds = Math.max(0, bedsRequired - bedsAllocated);

  const overflowSpaces = emergencySpacesState.filter((s) => s.availableCapacity > 0 && s._active !== false).slice(0, 3);

  const nextRiskText = scenario.type === "Flood"
    ? `Continued rainfall is likely to extend flooding to adjacent zones near ${scenario.zone}. Secondary flash flood risk is elevated for the next 4–6 hours. Low-lying roads and underpasses should be monitored.`
    : scenario.type === "Fire"
    ? `Wind conditions may accelerate fire spread in ${scenario.zone}. Adjacent residential areas are at elevated risk within the next 2 hours.`
    : `Disease vector risk is elevated in ${scenario.zone}. Secondary transmission clusters are likely within 48 hours. NEA surveillance should be increased.`;

  const adjZones = Object.keys(DISPATCH_ZONE_COORDS).filter((z) => z !== scenario.zone).slice(0, 2).join(", ");

  return `
    <section class="simulation-response-panel">
      <h3>Simulation Response Plan</h3>

      <div class="sim-response-section">
        <h4>Hospital Allocation — ${scenario.zone}</h4>
        <ul class="sim-hospital-list">
          ${hospitalAllocations.map((h) => `
            <li>
              <strong>${h.name}</strong>
              <span class="sim-distance">${h.distanceKm.toFixed(1)} km</span>
              — ${h.allocated} bed${h.allocated !== 1 ? "s" : ""} allocated
              ${h.overwhelmed ? `<span class="sim-warning-badge">Near capacity</span>` : ""}
            </li>
          `).join("")}
        </ul>
        ${unmetBeds > 0 ? `<p class="sim-warning">⚠ ${unmetBeds} hospital bed${unmetBeds !== 1 ? "s" : ""} cannot be met by nearest hospitals — overflow spaces activated below.</p>` : `<p class="sim-ok">✓ All ${bedsRequired} hospital bed requests allocated across nearest facilities.</p>`}
      </div>

      ${unmetBeds > 0 ? `
        <div class="sim-response-section">
          <h4>Overflow Spaces Activated</h4>
          ${overflowSpaces.length ? `
            <ul class="sim-overflow-list">
              ${overflowSpaces.map((s) => `<li><strong>${s.name}</strong> (${s.region}) — ${s.availableCapacity} spaces available · ${s.setupTimeHours}h setup</li>`).join("")}
            </ul>
          ` : `<p class="sim-warning">No overflow spaces available. All spaces are at capacity.</p>`}
        </div>
      ` : ""}

      <div class="sim-response-section">
        <h4>Risk Prediction</h4>
        <p class="sim-prediction-text">${nextRiskText}</p>
        <ul class="sim-prediction-actions">
          <li>Pre-position additional medical teams at <strong>${nearestHospitals[0]?.name || "nearest hospital"}</strong></li>
          <li>Alert ${scenario.zone} zone volunteers for potential secondary wave</li>
          <li>Monitor adjacent zones: <strong>${adjZones}</strong> for spillover incidents</li>
          ${scenario.type === "Flood" ? `<li>Issue public advisory: avoid underpasses and low-lying roads in ${scenario.zone}</li>` : ""}
          ${scenario.type === "Fire" ? `<li>Evacuate residents within 500m radius of fire origin</li>` : ""}
        </ul>
      </div>
    </section>
  `;
}

function renderIncidentSimulatorResponse(scenario) {
  const panel = document.querySelector("[data-simulation-response]");
  if (!panel) return;
  panel.innerHTML = buildSimulationResponseMarkup(scenario);
  panel.hidden = false;
}

function applyScenarioImpact(scenario) {
  simulationState.activeScenario = scenario;
  simulationState.incidents = [{ id: `sim-${scenario.id}`, name: scenario.name, zone: scenario.zone, severity: scenario.severity }];
  simulationState.volunteers = [{ zone: scenario.zone, required: scenario.resourceDemand.volunteersNeeded }];
  simulationState.supplies = [{ medicalKits: scenario.resourceDemand.medicalKits, foodPacks: scenario.resourceDemand.foodPacks }];
  updateEmergencySpacesFromScenario(scenario);
  updateQuickStatsFromScenario(scenario);
  updateAlertsFromScenario(scenario);
  updateBriefingFromScenario(scenario);
  renderSimulationInsights();
  renderLiveActivity();
  renderIncidentSimulator();
  renderIncidentSimulatorResponse(scenario);
}

function runSimulation(scenarioId) {
  const scenario = simulationScenarios.find((item) => item.id === scenarioId);
  if (!scenario) return;
  applyScenarioImpact(scenario);
}

function resetSimulation() {
  simulationState.activeScenario = null;
  simulationState.incidents = [];
  simulationState.resources = [];
  simulationState.volunteers = [];
  simulationState.supplies = [];
  simulationState.alerts = [];
  simulationState.riskScores = [];
  simulationState.briefing = DEFAULT_SIMULATION_BRIEFING;
  simulationState.stats = { ...DEFAULT_DASHBOARD_STATS };
  emergencySpacesState = emergencySpacesSeed.map((space) => decorateEmergencySpace({ ...space, currentOccupancy: 0 }));
  renderQuickStats();
  renderSimulationInsights();
  renderLiveActivity();
  renderEmergencySpaces();
  renderIncidentSimulator();
  const panel = document.querySelector("[data-simulation-response]");
  if (panel) { panel.hidden = true; panel.innerHTML = ""; }
}

function currentVolunteerSessionProfile(session) {
  return volunteerDispatchState.volunteers.find((volunteer) => volunteer.email === session?.email) || null;
}

function volunteerStatusLabel(status) {
  return status === "Off Duty" ? "Unavailable" : status;
}

function volunteerIsDispatched(volunteer) {
  return Boolean(volunteer.assignedIncidentId) && ["Assigned", "En Route", "On Site"].includes(volunteer.status);
}

function volunteerStatusBadge(status) {
  return `<span class="volunteer-status-badge is-${status.toLowerCase().replace(/\s+/g, "-")}">${volunteerStatusLabel(status).toLowerCase()}</span>`;
}

function volunteerLocationText(volunteer) {
  if (volunteer.locationVerified) return volunteer.currentLocationLabel;
  return volunteer.currentLocationLabel
    ? `${volunteer.zone} · ${volunteer.currentLocationLabel}`
    : volunteer.zone;
}

function volunteerDistanceKm(volunteer, scenario) {
  const volunteerPoint = volunteer.lat && volunteer.lng ? [Number(volunteer.lat), Number(volunteer.lng)] : DISPATCH_ZONE_COORDS[volunteer.zone];
  const scenarioPoint = DISPATCH_ZONE_COORDS[scenario.zone];
  if (!volunteerPoint || !scenarioPoint) return 25;
  const dx = volunteerPoint[0] - scenarioPoint[0];
  const dy = volunteerPoint[1] - scenarioPoint[1];
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 111);
}

function scenarioSkillHints(scenario) {
  if (scenario.type === "Flood") return ["First Aid", "Shelter Ops", "Driving", "Logistics"];
  if (scenario.type === "Fire") return ["First Aid", "Crowd Control", "Driving", "Logistics"];
  if (scenario.type === "Health") return ["First Aid", "Translation", "Community Outreach"];
  return ["First Aid", "Logistics"];
}

function volunteerMatchScore(volunteer, scenario) {
  const availabilityScore = volunteer.availability === "Available" && volunteer.status === "Available" ? 45 : volunteer.availability === "Available" ? 10 : -30;
  const desiredSkills = scenarioSkillHints(scenario).map((skill) => skill.toLowerCase());
  const volunteerSkills = (volunteer.skills || []).map((skill) => String(skill).toLowerCase());
  const skillMatches = volunteerSkills.filter((skill) => desiredSkills.includes(skill)).length;
  const skillScore = skillMatches * 18;
  const distanceKm = volunteerDistanceKm(volunteer, scenario);
  const distanceScore = Math.max(0, 30 - distanceKm);
  return { score: availabilityScore + skillScore + distanceScore, distanceKm, skillMatches };
}

function filteredVolunteers() {
  const { skill, zone, availability, status } = volunteerDispatchState.filters;
  let volunteers = [...volunteerDispatchState.volunteers];
  const scenario = simulationScenarios.find((item) => item.id === volunteerDispatchState.selectedIncidentId);

  if (scenario && !status) {
    volunteers = scenario.status === "Completed"
      ? volunteers.filter((volunteer) => volunteer.status === "Completed" && volunteer.assignedIncidentId === scenario.id)
      : volunteers.filter((volunteer) => volunteer.status !== "Completed");
  }
  if (skill) {
    const needle = skill.toLowerCase();
    volunteers = volunteers.filter((volunteer) => volunteer.skills.some((item) => item.toLowerCase().includes(needle)));
  }
  if (zone) volunteers = volunteers.filter((volunteer) => volunteer.zone === zone);
  if (availability) volunteers = volunteers.filter((volunteer) => volunteer.availability === availability);
  if (status) volunteers = volunteers.filter((volunteer) => volunteer.status === status);
  volunteerDispatchState.smartMatchScores = new Map();
  if (scenario) {
    volunteers.forEach((volunteer) => {
      if (volunteer.availability === "Available" && volunteer.status === "Available") {
        volunteerDispatchState.smartMatchScores.set(volunteer.id, volunteerMatchScore(volunteer, scenario));
      }
    });
  }
  if (scenario && volunteerDispatchState.smartMatchScores.size) {
    volunteers.sort((a, b) => (volunteerDispatchState.smartMatchScores.get(b.id)?.score ?? -999) - (volunteerDispatchState.smartMatchScores.get(a.id)?.score ?? -999));
  } else {
    volunteers.sort((a, b) => a.name.localeCompare(b.name));
  }
  return volunteers;
}

async function fetchVolunteers() {
  const response = await fetch("/api/volunteers");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to load volunteers.");
  volunteerDispatchState.volunteers = Array.isArray(result) ? result : [];
  volunteerDispatchState.loaded = true;
}

async function createVolunteerProfile(payload) {
  const response = await fetch("/api/volunteers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(formatAuthError(result, "Unable to create volunteer profile."));
  await fetchVolunteers();
  return result;
}

async function patchVolunteerProfile(id, payload) {
  const response = await fetch(`/api/volunteers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(formatAuthError(result, "Unable to update volunteer profile."));
  await fetchVolunteers();
  return result;
}

async function deployVolunteerToIncident(id, incidentId) {
  const response = await fetch(`/api/volunteers/${id}/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incidentId })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to deploy volunteer.");
  await fetchVolunteers();
  return result;
}

async function updateVolunteerWorkflowStatus(id, status) {
  const response = await fetch(`/api/volunteers/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to update volunteer status.");
  await fetchVolunteers();
  return result;
}

async function completeDispatchIncident(incidentId) {
  const response = await fetch(`/api/simulation/scenarios/${encodeURIComponent(incidentId)}/complete`, {
    method: "POST"
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to complete incident.");
  await Promise.all([fetchSimulationScenarios(), fetchVolunteers()]);
  return result;
}

function volunteerZoneOptions(selected = "") {
  const incidentZones = [...new Set(simulationScenarios.map((scenario) => scenario.zone).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  return `<option value="">All incident zones</option>${incidentZones.map((zone) => `<option value="${zone}"${zone === selected ? " selected" : ""}>${zone}</option>`).join("")}`;
}

function professionalDispatchCard(volunteer) {
  const score = volunteerDispatchState.smartMatchScores.get(volunteer.id);
  const selectedIncident = simulationScenarios.find((scenario) => scenario.id === volunteerDispatchState.selectedIncidentId);
  const incidentSelected = Boolean(selectedIncident);
  const incidentCompleted = selectedIncident?.status === "Completed";
  const canDeploy = incidentSelected && !incidentCompleted && volunteer.availability === "Available" && volunteer.status === "Available";
  const isDispatched = volunteerIsDispatched(volunteer);
  const location = volunteerLocationText(volunteer);
  const dispatchUnavailableReason = !incidentSelected
    ? "Select an incident to dispatch this volunteer."
    : incidentCompleted
      ? "This incident is completed and no longer accepts dispatches."
    : volunteer.availability !== "Available"
      ? "Unavailable volunteers cannot be dispatched."
      : volunteer.status !== "Available"
        ? `This volunteer is currently ${volunteerStatusLabel(volunteer.status).toLowerCase()}.`
        : "";
  return `
    <article class="dispatch-volunteer-card">
      <div class="dispatch-volunteer-top">
        <div>
          <h3>${escapeHtml(volunteer.name)}</h3>
          <p>${icon("mapPin")} ${escapeHtml(location)}</p>
        </div>
        ${volunteerStatusBadge(volunteer.status)}
      </div>
      <div class="dispatch-skill-list">
        ${(volunteer.skills.length ? volunteer.skills : ["General support"]).map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
      </div>
      ${score ? `<p class="dispatch-volunteer-match"><strong>Auto match:</strong> ${escapeHtml(score.score)} pts · ${escapeHtml(score.skillMatches)} skill matches · ${escapeHtml(score.distanceKm)} km away</p>` : ""}
      ${volunteer.assignedIncidentName ? `<p class="dispatch-assigned-line">${icon("arrowRight")} Dispatched to: ${escapeHtml(volunteer.assignedIncidentName)}</p>` : ""}
      ${volunteer.notificationMessage ? `<p class="dispatch-notification">${volunteer.notificationMessage}</p>` : ""}
      <div class="dispatch-volunteer-actions">
        ${isDispatched
          ? `<button class="secondary-button compact dispatch-recall-button" type="button" data-recall-volunteer="${volunteer.id}">${icon("activity")} Recall</button>`
          : volunteer.status === "Completed"
            ? `<p class="dispatch-unavailable-note">Deployment completed when ${escapeHtml(volunteer.assignedIncidentName || "the incident")} ended.</p>`
          : canDeploy
            ? `<button class="form-button dispatch-deploy-button" type="button" data-deploy-volunteer="${volunteer.id}">${icon("arrowRight")} Dispatch</button>`
            : `<p class="dispatch-unavailable-note">${escapeHtml(dispatchUnavailableReason)}</p>`}
      </div>
    </article>
  `;
}

function renderProfessionalVolunteerDispatch() {
  const selectedIncident = simulationScenarios.find((scenario) => scenario.id === volunteerDispatchState.selectedIncidentId);
  const incidentOptions = simulationScenarios.length
    ? simulationScenarios.map((scenario) => `<option value="${scenario.id}"${scenario.id === volunteerDispatchState.selectedIncidentId ? " selected" : ""}>${scenario.name}${scenario.status === "Completed" ? " — Completed" : ""}</option>`).join("")
    : `<option value="">No incidents loaded</option>`;
  const volunteers = filteredVolunteers();
  const availableCount = volunteerDispatchState.volunteers.filter((volunteer) => volunteer.availability === "Available" && volunteer.status === "Available").length;
  const dispatchedCount = volunteerDispatchState.volunteers.filter(volunteerIsDispatched).length;
  return `
    <section class="volunteer-dispatch-panel">
      <div class="dispatch-board-heading">
        <div>
          <h3>Volunteer Dispatch</h3>
          <p>${availableCount} available · ${dispatchedCount} dispatched · ${volunteerDispatchState.volunteers.length} registered</p>
        </div>
      </div>
      <div class="dispatch-toolbar">
        <div class="dispatch-toolbar-grid">
          <label>Incident
            <select data-dispatch-incident-select>
              <option value="">Select incident</option>
              ${incidentOptions}
            </select>
          </label>
          <label>Filter skill
            <input type="text" value="${escapeHtml(volunteerDispatchState.filters.skill)}" placeholder="First aid, logistics" data-filter-skill />
          </label>
          <label>Zone
            <select data-filter-zone>${volunteerZoneOptions(volunteerDispatchState.filters.zone)}</select>
          </label>
          <label>Availability
            <select data-filter-availability>
              <option value="">All</option>
              ${VOLUNTEER_SELF_AVAILABILITY.map((option) => `<option value="${option.value}"${option.value === volunteerDispatchState.filters.availability ? " selected" : ""}>${option.label}</option>`).join("")}
            </select>
          </label>
          <label>Status
            <select data-filter-status>
              <option value="">All</option>
              ${VOLUNTEER_STATUSES.map((value) => `<option value="${value}"${value === volunteerDispatchState.filters.status ? " selected" : ""}>${volunteerStatusLabel(value)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="dispatch-toolbar-actions">
          ${selectedIncident && selectedIncident.status !== "Completed"
            ? `<button class="secondary-button compact" type="button" data-complete-dispatch-incident>Complete Incident</button>`
            : ""}
          <button class="secondary-button compact" type="button" data-reset-volunteer-filters>Reset Filters</button>
        </div>
      </div>
      <p class="dispatch-panel-note">Selecting an incident automatically ranks volunteers by availability, relevant skills, and distance. Completed appears only after the whole incident is ended, which completes every assigned volunteer deployment together.</p>
      <div class="dispatch-volunteer-grid">
        ${volunteers.length ? volunteers.map(professionalDispatchCard).join("") : `<p class="dispatch-empty">No volunteers match the current filters.</p>`}
      </div>
    </section>
  `;
}

function publicVolunteerProfileForm(session, volunteer) {
  const isExisting = Boolean(volunteer);
  const availability = volunteer?.availability || "Available";
  if (isExisting) {
    return `
      <section class="volunteer-dispatch-panel">
        <div class="dispatch-public-layout">
          <article class="dispatch-volunteer-card dispatch-self-card">
            <div class="dispatch-volunteer-top">
              <div>
                <h3>${escapeHtml(volunteer.name)}</h3>
                <p>${icon("mapPin")} ${escapeHtml(volunteerLocationText(volunteer))}</p>
              </div>
              ${volunteerStatusBadge(volunteer.availability)}
            </div>
            <div class="dispatch-skill-list">
              ${(volunteer.skills.length ? volunteer.skills : ["General support"]).map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
            </div>
            <div class="dispatch-self-status">
              <h4>My availability</h4>
              <p>Choose one status. Coordinators can dispatch you only when you are available.</p>
              <div class="dispatch-availability-toggle" role="group" aria-label="Volunteer availability">
                ${VOLUNTEER_SELF_AVAILABILITY.map((option) => `
                  <button
                    class="${option.value === volunteer.availability ? "active" : ""}"
                    type="button"
                    data-self-availability="${escapeHtml(option.value)}"
                    data-volunteer-id="${volunteer.id}">
                    ${escapeHtml(option.label)}
                  </button>
                `).join("")}
              </div>
              <p class="form-status dispatch-status-message" role="status"></p>
            </div>
          </article>
          <div class="dispatch-assignment-panel">
            <h3>Assigned Task</h3>
            ${publicVolunteerAssignment(volunteer)}
          </div>
        </div>
      </section>
    `;
  }
  return `
    <section class="volunteer-dispatch-panel">
      <div class="dispatch-public-layout">
        <form class="dispatch-public-form" data-public-volunteer-form${isExisting ? ` data-volunteer-id="${volunteer.id}"` : ""}>
          <h3>${isExisting ? "Volunteer Profile" : "Register Volunteer Profile"}</h3>
          <div class="dispatch-form-grid">
            <label>Full name
              <input name="name" type="text" value="${escapeHtml(volunteer?.name || "")}" required maxlength="80" />
            </label>
            <label>Email
              <input name="email" type="email" value="${escapeHtml(volunteer?.email || session.email || "")}" ${session.email ? "readonly" : ""} required />
            </label>
            <label>Phone
              <input name="phone" type="tel" value="${escapeHtml(volunteer?.phone || "")}" required />
            </label>
            <label>Zone
              <select name="zone" required>
                ${DISPATCH_ZONES.map((zone) => `<option value="${zone}"${zone === (volunteer?.zone || "") ? " selected" : ""}>${zone}</option>`).join("")}
              </select>
            </label>
            <label class="dispatch-form-span">Current location
              <input name="currentLocationLabel" type="text" value="${escapeHtml(volunteer?.currentLocationLabel || "")}" placeholder="6-digit postal code, community club, or landmark" required />
              <small>Enter a Singapore postal code for precise OneMap coordinates and dispatch distance.</small>
            </label>
            <label class="dispatch-form-span">Skills
              <input name="skills" type="text" value="${escapeHtml((volunteer?.skills || []).join(", "))}" placeholder="First aid, driving, translation" />
            </label>
          </div>
          <div class="dispatch-form-row">
            <label>Availability
              <select name="availability">
                ${VOLUNTEER_SELF_AVAILABILITY.map((option) => `<option value="${option.value}"${option.value === availability ? " selected" : ""}>${option.label}</option>`).join("")}
              </select>
            </label>
            <button class="secondary-button compact" type="submit">${isExisting ? "Save Profile" : "Create Profile"}</button>
          </div>
          <p class="form-status dispatch-status-message" role="status"></p>
        </form>
        <div class="dispatch-assignment-panel">
          <h3>Assigned Task</h3>
          ${volunteer ? publicVolunteerAssignment(volunteer) : `<p class="dispatch-empty">Create a volunteer profile to receive dispatch tasks.</p>`}
        </div>
      </div>
    </section>
  `;
}

function publicVolunteerAssignment(volunteer) {
  const guidance = {
    Assigned: {
      heading: "What to do now",
      text: "Review the assigned task, prepare the required equipment, and wait for departure instructions from the coordinator."
    },
    "En Route": {
      heading: "What to do now",
      text: "Travel safely to the incident location. Follow the recommended route and notify the coordinator if you are delayed."
    },
    "On Site": {
      heading: "What to do now",
      text: "Check in with the on-site coordinator, follow safety instructions, and begin the assigned task."
    },
    Completed: {
      heading: "Deployment completed",
      text: "The whole incident has ended. No further action is required for this deployment."
    }
  }[volunteer.status];
  const task = volunteer.assignedIncidentName
    ? `
      <div class="dispatch-assignment-box">
        <p class="dispatch-banner success">${volunteer.status === "Completed" ? "Deployment update received." : "Dispatch update received from the emergency coordination team."}</p>
        <strong>${volunteer.assignedIncidentName}</strong>
        <p>${volunteer.assignedTask || "Task pending assignment details."}</p>
        <p><strong>Status:</strong> ${volunteerStatusLabel(volunteer.status)}</p>
        ${guidance ? `
          <div class="dispatch-volunteer-guidance">
            <strong>${guidance.heading}</strong>
            <p>${guidance.text}</p>
          </div>
        ` : ""}
        ${volunteer.notificationMessage ? `<p class="dispatch-notification">${volunteer.notificationMessage}</p>` : ""}
      </div>
    `
    : `
      <p class="dispatch-empty">No active deployment. Coordinators will assign tasks here when needed.</p>
      ${volunteer.notificationMessage ? `<p class="dispatch-notification dispatch-latest-update">${volunteer.notificationMessage}</p>` : ""}
    `;
  return task;
}

function volunteerAssignmentSignature(volunteer) {
  if (!volunteer) return "";
  return JSON.stringify({
    assignedIncidentId: volunteer.assignedIncidentId,
    assignedIncidentName: volunteer.assignedIncidentName,
    assignedTask: volunteer.assignedTask,
    status: volunteer.status,
    notificationMessage: volunteer.notificationMessage
  });
}

async function refreshPublicVolunteerDispatch(session) {
  if (window.location.hash !== "#/volunteer-dispatch" || session?.role === "professional") return;
  const before = volunteerAssignmentSignature(currentVolunteerSessionProfile(session));
  try {
    await fetchVolunteers();
    const after = volunteerAssignmentSignature(currentVolunteerSessionProfile(session));
    if (before !== after) renderVolunteerDispatchSection(session);
  } catch (error) {
    // Keep the current profile visible and retry on the next poll.
  }
}

function bindProfessionalVolunteerDispatch() {
  document.querySelector("[data-dispatch-incident-select]")?.addEventListener("change", (event) => {
    volunteerDispatchState.selectedIncidentId = event.currentTarget.value;
    volunteerDispatchState.smartMatchScores = new Map();
    renderVolunteerDispatchSection(readStoredSession());
  });
  document.querySelector("[data-filter-skill]")?.addEventListener("input", (event) => {
    volunteerDispatchState.filters.skill = event.currentTarget.value.trim();
    renderVolunteerDispatchSection(readStoredSession());
  });
  ["zone", "availability", "status"].forEach((filterName) => {
    document.querySelector(`[data-filter-${filterName}]`)?.addEventListener("change", (event) => {
      volunteerDispatchState.filters[filterName] = event.currentTarget.value;
      renderVolunteerDispatchSection(readStoredSession());
    });
  });
  document.querySelector("[data-reset-volunteer-filters]")?.addEventListener("click", () => {
    volunteerDispatchState.selectedIncidentId = "";
    volunteerDispatchState.filters = { skill: "", zone: "", availability: "", status: "" };
    volunteerDispatchState.smartMatchScores = new Map();
    renderVolunteerDispatchSection(readStoredSession());
  });
  document.querySelector("[data-complete-dispatch-incident]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Completing incident...";
    try {
      await completeDispatchIncident(volunteerDispatchState.selectedIncidentId);
      renderVolunteerDispatchSection(readStoredSession());
    } catch (error) {
      button.disabled = false;
      button.textContent = "Complete Incident";
      const content = document.querySelector("[data-volunteer-dispatch-content]");
      if (content) content.prepend(Object.assign(document.createElement("p"), { className: "dispatch-banner error", textContent: error.message }));
    }
  });
  document.querySelectorAll("[data-deploy-volunteer]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await deployVolunteerToIncident(Number(button.dataset.deployVolunteer), volunteerDispatchState.selectedIncidentId);
        renderVolunteerDispatchSection(readStoredSession());
      } catch (error) {
        const content = document.querySelector("[data-volunteer-dispatch-content]");
        if (content) content.prepend(Object.assign(document.createElement("p"), { className: "dispatch-banner error", textContent: error.message }));
      }
    });
  });
  document.querySelectorAll("[data-recall-volunteer]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await updateVolunteerWorkflowStatus(Number(button.dataset.recallVolunteer), "Available");
        renderVolunteerDispatchSection(readStoredSession());
      } catch (error) {
        const content = document.querySelector("[data-volunteer-dispatch-content]");
        if (content) content.prepend(Object.assign(document.createElement("p"), { className: "dispatch-banner error", textContent: error.message }));
      }
    });
  });
}

function bindPublicVolunteerDispatch(session) {
  document.querySelector("[data-public-volunteer-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector(".dispatch-status-message");
    const volunteerId = form.dataset.volunteerId ? Number(form.dataset.volunteerId) : null;
    const data = Object.fromEntries(new FormData(form).entries());
    data.skills = String(data.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
    status.textContent = volunteerId ? "Updating volunteer profile..." : "Creating volunteer profile...";
    status.className = "form-status dispatch-status-message";
    try {
      if (volunteerId) await patchVolunteerProfile(volunteerId, data);
      else await createVolunteerProfile(data);
      renderVolunteerDispatchSection(session);
      const refreshedStatus = document.querySelector(".dispatch-status-message");
      if (refreshedStatus) {
        refreshedStatus.textContent = volunteerId ? "Volunteer profile updated." : "Volunteer profile created.";
        refreshedStatus.classList.add("success");
      }
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  });

  document.querySelectorAll("[data-self-availability]").forEach((button) => {
    button.addEventListener("click", async () => {
      const volunteerId = Number(button.dataset.volunteerId);
      try {
        await patchVolunteerProfile(volunteerId, { availability: button.dataset.selfAvailability });
        renderVolunteerDispatchSection(session);
      } catch (error) {
        const statusEl = document.querySelector(".dispatch-status-message");
        if (statusEl) { statusEl.textContent = error.message; statusEl.classList.add("error"); }
      }
    });
  });
}

function renderVolunteerDispatchSection(session) {
  const container = document.querySelector("[data-volunteer-dispatch-content]");
  if (!container) return;
  if (!volunteerDispatchState.loaded) {
    container.innerHTML = `<p class="dispatch-empty">Loading volunteer workflow...</p>`;
    return;
  }
  if (session?.role === "professional") {
    container.innerHTML = renderProfessionalVolunteerDispatch();
    bindProfessionalVolunteerDispatch();
    return;
  }
  if (session?.role !== "volunteer") {
    container.innerHTML = `<p class="dispatch-empty">Sign in with a volunteer account to manage availability and assignments.</p>`;
    return;
  }
  container.innerHTML = publicVolunteerProfileForm(session, currentVolunteerSessionProfile(session));
  bindPublicVolunteerDispatch(session);
}

async function showVolunteerDispatchSection(session) {
  const section = document.querySelector("[data-volunteer-dispatch-section]");
  if (!section) return;
  section.hidden = false;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    if (!volunteerDispatchState.loaded) await fetchVolunteers();
    if (!simulationScenarios.length) await fetchSimulationScenarios();
  } catch (error) {
    const container = document.querySelector("[data-volunteer-dispatch-content]");
    if (container) container.innerHTML = `<p class="dispatch-empty error">${error.message}</p>`;
    return;
  }
  renderVolunteerDispatchSection(session);
  if (session?.role === "volunteer") {
    if (volunteerDispatchTimer) window.clearInterval(volunteerDispatchTimer);
    volunteerDispatchTimer = window.setInterval(
      () => refreshPublicVolunteerDispatch(session),
      3_000
    );
  }
}

const SEVERITY_ORDER = ["Extreme", "Severe", "Moderate", "Minor"];
const SEVERITY_COLORS = {
  Extreme: "#a92525",
  Severe: "#c53d32",
  Moderate: "#c47a1b",
  Minor: "#0f766e"
};

const DENGUE_BUCKETS = [
  { max: 5, color: "#ffd166", label: "1–5 cases" },
  { max: 10, color: "#f4a259", label: "6–10 cases" },
  { max: 20, color: "#ef6351", label: "11–20 cases" },
  { max: Infinity, color: "#a92525", label: "21+ cases" }
];

let floodMapTimer = null;
let dengueMapTimer = null;
let evacuationMapTimer = null;
let publicStatusTimer = null;
let oneMapLeafletBundle = null;

function severityColor(severity) {
  return SEVERITY_COLORS[severity] || "#5e655f";
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" });
}

function activeFloodReadings(records) {
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

  const entries = [];
  records
    .filter((record) => record.item?.msgType === "Alert" && !cancelledIds.has(record.item.identifier))
    .forEach((record) => {
      (record.item.readings || []).forEach((reading) => {
        if (reading.event === "Flood" && Array.isArray(reading.area?.circle)) {
          entries.push({ record, reading });
        }
      });
    });
  return entries;
}

function floodPopup({ record, reading }) {
  return `
    <div class="flood-popup">
      <span class="severity-pill" style="background:${severityColor(reading.severity)}">${reading.severity || "Unknown"}</span>
      <h3>${reading.headline || reading.event}</h3>
      <p>${reading.description || reading.area?.areaDesc || ""}</p>
      ${reading.instruction ? `<p class="flood-popup-instruction">${reading.instruction}</p>` : ""}
      <p class="flood-popup-time">Issued ${formatDateTime(record.datetime)}</p>
    </div>
  `;
}

function dengueColor(caseSize) {
  const bucket = DENGUE_BUCKETS.find((entry) => caseSize <= entry.max);
  return bucket ? bucket.color : DENGUE_BUCKETS[DENGUE_BUCKETS.length - 1].color;
}

function parseHtmlTable(html) {
  const fields = {};
  if (!html) return fields;
  const rowRegex = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  while ((match = rowRegex.exec(html))) {
    const key = match[1].replace(/<[^>]+>/g, "").trim();
    const value = match[2].replace(/<[^>]+>/g, "").trim();
    if (key) fields[key] = value;
  }
  return fields;
}

function dengueClusterInfo(feature) {
  const props = feature.properties || {};
  const fields = parseHtmlTable(props.Description);
  const caseSize = Number(
    fields.CASE_SIZE ?? fields.Case_Size ?? props.CASE_SIZE ?? 0
  ) || 0;
  const locality = fields.LOCALITY || fields.Locality || props.LOCALITY || props.Name || "Unknown locality";
  return { caseSize, locality };
}

function denguePopup({ caseSize, locality }) {
  return `
    <div class="flood-popup">
      <span class="severity-pill" style="background:${dengueColor(caseSize)}">${caseSize} case${caseSize === 1 ? "" : "s"}</span>
      <h3>${locality}</h3>
      <p>Active dengue cluster reported by NEA.</p>
    </div>
  `;
}

function dengueListItem({ caseSize, locality }, index) {
  return `
    <article class="flood-alert-card">
      <span class="severity-pill" style="background:${dengueColor(caseSize)}">${caseSize}</span>
      <div>
        <strong>${locality}</strong>
        <p>Active dengue cluster</p>
      </div>
      <button type="button" class="map-locate-button" data-locate-dengue="${index}">Locate</button>
    </article>
  `;
}

function ringToLatLngs(ring) {
  return ring.map(([lng, lat]) => [lat, lng]);
}

function lineStringToLatLngs(coordinates) {
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

function geoJsonFeatureToLayer(feature, options) {
  if (typeof L.geoJSON === "function") {
    return L.geoJSON(feature, options);
  }

  const geometry = feature.geometry || {};
  const style = typeof options?.style === "function" ? options.style(feature) : options?.style;

  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates.map(ringToLatLngs);
    return L.polygon(rings, style);
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates.map((polygon) => polygon.map(ringToLatLngs));
    return L.polygon(polygons, style);
  }

  return L.layerGroup();
}

function floodListItem({ record, reading }, index) {
  return `
    <article class="flood-alert-card">
      <span class="severity-pill" style="background:${severityColor(reading.severity)}">${reading.severity || "Unknown"}</span>
      <div>
        <strong>${reading.headline || reading.event}</strong>
        <p>${reading.area?.areaDesc || reading.description || ""}</p>
        <time>${formatDateTime(record.datetime)}</time>
      </div>
      <button type="button" class="map-locate-button" data-locate="${index}">Locate</button>
    </article>
  `;
}

function addOneMapTileLayer(map) {
  return L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
    detectRetina: true,
    maxZoom: 19,
    minZoom: 11,
    attribution: "OneMap | Map data &copy; contributors, <a href=\"https://www.sla.gov.sg/\">Singapore Land Authority</a>"
  }).addTo(map);
}

async function initOneMapDashboard() {
  const mapEl = document.querySelector("#onemap-dashboard-map");
  if (!mapEl) return;

  // OneMap's bundle replaces window.L with its own Leaflet build, which would
  // break other pages relying on the standard Leaflet loaded in index.html.
  const standardLeaflet = window.L;

  try {
    await loadStylesheet("https://www.onemap.gov.sg/web-assets/libs/leaflet/leaflet.css");
    await loadScript("https://www.onemap.gov.sg/web-assets/libs/leaflet/onemap-leaflet.js");
    await loadScript("https://www.onemap.gov.sg/web-assets/libs/leaflet/leaflet-tilejson.js");

    const tileJsonResponse = await fetch("https://www.onemap.gov.sg/maps/json/raster/tilejson/2.2.0/Default.json");
    const tileJson = await tileJsonResponse.json();
    mapEl.innerHTML = "";

    const map = L.map("onemap-dashboard-map", { scrollWheelZoom: true }).setView([1.3521, 103.8198], 12);
    addOneMapTileLayer(map);

    const floodLayer = L.layerGroup().addTo(map);
    const dengueLayer = L.layerGroup().addTo(map);

    const [floodResponse, dengueResponse, incidentsResponse] = await Promise.all([
      fetch("/api/flood-alerts"),
      fetch("/api/dengue-clusters"),
      fetch("/api/incidents").catch(() => null)
    ]);
    const floodPayload = await floodResponse.json();
    const denguePayload = await dengueResponse.json();
    const incidentsPayload = incidentsResponse?.ok ? await incidentsResponse.json() : { incidents: [] };
    if (!floodResponse.ok) throw new Error(floodPayload.error || "Unable to load flood alerts.");
    if (!dengueResponse.ok) throw new Error(denguePayload.error || "Unable to load dengue clusters.");

    const bounds = L.latLngBounds([]);

    activeFloodReadings(floodPayload.records || []).forEach((entry) => {
      const [lat, lng, radiusKm] = entry.reading.area.circle;
      const color = severityColor(entry.reading.severity);
      const circle = L.circle([lat, lng], {
        radius: Math.max(radiusKm, 0.15) * 1000,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.22
      })
        .bindPopup(floodPopup(entry))
        .addTo(floodLayer);
      bounds.extend(circle.getBounds());
    });

    (denguePayload.geojson?.features || []).forEach((feature) => {
      const info = dengueClusterInfo(feature);
      const layer = geoJsonFeatureToLayer(feature, {
        style: () => ({
          color: dengueColor(info.caseSize),
          weight: 1.5,
          fillColor: dengueColor(info.caseSize),
          fillOpacity: 0.35
        })
      })
        .bindPopup(denguePopup(info))
        .addTo(dengueLayer);
      if (layer.getBounds) bounds.extend(layer.getBounds());
    });

    (incidentsPayload.incidents || []).forEach((incident) => {
      const lat = Number(incident.lat);
      const lng = Number(incident.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const label = `
        <div class="flood-popup">
          <h3>${escapeHtml(incident.type || "Incident")} · ${escapeHtml(incident.severity || "Reported")}</h3>
          <p>${escapeHtml(incident.areaDesc || incident.location || "Reported incident")}</p>
          ${incident.note ? `<p class="flood-popup-instruction">${escapeHtml(incident.note)}</p>` : ""}
          <p class="flood-popup-time">${incident.createdAt ? `Reported ${formatDateTime(incident.createdAt)}` : "Stored in MongoDB"}</p>
        </div>
      `;
      addIncidentMarker(map, [lat, lng], incident.severity === "High" ? "critical" : "incident", label);
      bounds.extend([lat, lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
    }

    window.setTimeout(() => map.invalidateSize(), 100);
    window.addEventListener("resize", () => map.invalidateSize());
  } catch (error) {
    mapEl.innerHTML = "<span>Unable to load OneMap. Check internet connection.</span>";
  }
}

function addIncidentMarker(map, latLng, type, label) {
  const marker = L.divIcon({
    className: `incident-map-marker ${type}`,
    html: `<span title="${label}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });
  L.marker(latLng, { icon: marker }).addTo(map).bindPopup(label);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

async function renderFloodMap() {
  const session = await getOpsSession({ redirect: false });
  app.innerHTML = opsShellMarkup({
    active: "flood",
    session,
    content: `
      <section class="flood-map-shell hazard-map-shell ops-feature-shell">
        <section class="dashboard-title">
          <div>
            <p class="eyebrow">Live map · OneMap basemap + PUB flood alerts + NEA dengue clusters</p>
            <h1>Flooding & Dengue Clusters Across Singapore</h1>
          </div>
          <p class="map-updated" data-updated>Loading live flood data…</p>
        </section>
        <div class="flood-map-layout">
          <div class="flood-map-canvas">
            <div id="flood-map" aria-label="Map of active flood alerts and dengue clusters in Singapore"></div>
            <div class="map-layer-toggle" aria-label="Map layers">
              <label><input type="checkbox" data-layer-toggle="flood" checked /> Flood Alerts</label>
              <label><input type="checkbox" data-layer-toggle="dengue" checked /> Dengue Clusters</label>
            </div>
            <ul class="flood-severity-legend" aria-label="Flood severity legend">
              ${SEVERITY_ORDER.map((level) => `<li><i style="background:${severityColor(level)}"></i>${level}</li>`).join("")}
            </ul>
            <ul class="dengue-severity-legend" aria-label="Dengue cluster legend">
              ${DENGUE_BUCKETS.map((bucket) => `<li><i style="background:${bucket.color}"></i>${bucket.label}</li>`).join("")}
            </ul>
          </div>
          <aside class="flood-alert-rail" aria-label="Active flood alerts and dengue clusters">
            <h2>Active Flood Alert</h2>
            <div class="flood-alert-list" data-alert-list><p class="map-empty">Loading…</p></div>
            <h2>Active Dengue Clusters</h2>
            <div class="flood-alert-list" data-dengue-list><p class="map-empty">Loading…</p></div>
          </aside>
        </div>
      </section>
    `
  });
  bindOpsShell();

  const map = L.map("flood-map", { scrollWheelZoom: true }).setView([1.3521, 103.8198], 12);
  addOneMapTileLayer(map);

  const markerLayer = L.layerGroup().addTo(map);
  const dengueLayer = L.layerGroup().addTo(map);

  document.querySelectorAll("[data-layer-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const layer = checkbox.dataset.layerToggle === "flood" ? markerLayer : dengueLayer;
      if (checkbox.checked) {
        map.addLayer(layer);
      } else {
        map.removeLayer(layer);
      }
    });
  });

  async function refreshDengue() {
    const list = document.querySelector("[data-dengue-list]");
    if (!list) return;

    try {
      const response = await fetch("/api/dengue-clusters");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load dengue clusters.");

      const features = payload.geojson?.features || [];
      dengueLayer.clearLayers();
      const entries = features.map((feature) => {
        const info = dengueClusterInfo(feature);
        const layer = geoJsonFeatureToLayer(feature, {
          style: () => ({
            color: dengueColor(info.caseSize),
            weight: 1.5,
            fillColor: dengueColor(info.caseSize),
            fillOpacity: 0.35
          })
        })
          .bindPopup(denguePopup(info))
          .addTo(dengueLayer);
        return { layer, info };
      });

      list.innerHTML = entries.length
        ? entries.map(({ info }, index) => dengueListItem(info, index)).join("")
        : `<p class="map-empty">No active dengue clusters reported right now.</p>`;

      list.querySelectorAll("[data-locate-dengue]").forEach((button) => {
        button.addEventListener("click", () => {
          const { layer } = entries[Number(button.dataset.locateDengue)];
          if (!layer.getBounds) return;

          const bounds = layer.getBounds();
          if (!bounds.isValid()) return;

          if (!map.hasLayer(dengueLayer)) {
            const dengueToggle = document.querySelector('[data-layer-toggle="dengue"]');
            if (dengueToggle) dengueToggle.checked = true;
            map.addLayer(dengueLayer);
          }

          if (typeof map.flyToBounds === "function") {
            map.flyToBounds(bounds, { duration: 0.6, maxZoom: 16 });
          } else {
            map.fitBounds(bounds, { maxZoom: 16 });
          }
          layer.openPopup(bounds.getCenter());
        });
      });
    } catch (error) {
      list.innerHTML = `<p class="map-empty error">${error.message}</p>`;
    }
  }

  async function refresh() {
    const updatedLabel = document.querySelector("[data-updated]");
    const list = document.querySelector("[data-alert-list]");
    if (!updatedLabel || !list) return;

    try {
      const response = await fetch("/api/flood-alerts");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load flood alerts.");

      const entries = activeFloodReadings(payload.records || []);

      markerLayer.clearLayers();
      const circles = entries.map((entry) => {
        const [lat, lng, radiusKm] = entry.reading.area.circle;
        const color = severityColor(entry.reading.severity);
        return L.circle([lat, lng], {
          radius: Math.max(radiusKm, 0.15) * 1000,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.22
        })
          .bindPopup(floodPopup(entry))
          .addTo(markerLayer);
      });

      list.innerHTML = entries.length
        ? entries.map((entry, index) => floodListItem(entry, index)).join("")
        : `<p class="map-empty">No active flood alerts reported right now — Singapore is clear.</p>`;

      list.querySelectorAll("[data-locate]").forEach((button) => {
        button.addEventListener("click", () => {
          const circle = circles[Number(button.dataset.locate)];
          map.flyTo(circle.getLatLng(), 15, { duration: 0.6 });
          circle.openPopup();
        });
      });

      updatedLabel.textContent = `Last updated ${formatDateTime(new Date())} · ${entries.length} active flood alert${entries.length === 1 ? "" : "s"}`;
    } catch (error) {
      updatedLabel.textContent = "Unable to load live flood alerts.";
      list.innerHTML = `<p class="map-empty error">${error.message}</p>`;
    }
  }

  await Promise.all([refresh(), refreshDengue()]);
  floodMapTimer = window.setInterval(refresh, 60_000);
  dengueMapTimer = window.setInterval(refreshDengue, 5 * 60_000);
}

const EVACUATION_POLL_MS = 2 * 60_000;

function blockageColor(type) {
  if (type === "flood") return "#0f766e";
  if (type === "incident") return "#c53d32";
  return "#a92525";
}

function blockagePopup({ type, label }) {
  const title = type === "flood" ? "Flood" : type === "incident" ? "Traffic Incident" : "Dengue Cluster";
  return `
    <div class="flood-popup">
      <span class="severity-pill" style="background:${blockageColor(type)}">${title}</span>
      <p>${label || "Hazard area"}</p>
    </div>
  `;
}

function evacuationRouteSummary({ baseline, rerouted, rerouteStatus, demo, hazards }) {
  const baseSummary = baseline?.features?.[0]?.properties?.summary;
  const reroutedSummary = rerouted?.features?.[0]?.properties?.summary;
  if (!baseSummary) return "";

  const fmt = (summary) =>
    `${(summary.distance / 1000).toFixed(1)} km · ${Math.round(summary.duration / 60)} min`;

  const fallbackLayers = hazards
    ? Object.entries(hazards)
        .filter(([, layer]) => layer?.source === "demo-fallback")
        .map(([key]) => key)
    : [];

  return `
    <article class="flood-alert-card evac-summary-card">
      <div>
        <strong>Normal route</strong>
        <p>${fmt(baseSummary)}</p>
      </div>
    </article>
    ${reroutedSummary
      ? `
        <article class="flood-alert-card evac-summary-card">
          <div>
            <strong>Incident-aware route</strong>
            <p>${fmt(reroutedSummary)}</p>
            <p>Considers road incidents and other selected Avoid layers.</p>
          </div>
        </article>
      `
      : rerouteStatus === "unavailable"
        ? `<p class="map-empty">The normal route is available, but a hazard-avoiding alternative could not be calculated right now.</p>`
        : rerouteStatus === "same-route"
          ? `<p class="map-empty">The normal route already avoids the selected hazards, so no different route is needed.</p>`
          : `<p class="map-empty">No selected hazards require a different route.</p>`}
    ${demo ? `<p class="map-empty">Showing demo route data.</p>` : ""}
    ${fallbackLayers.length ? `<p class="map-empty">Using cached/demo data for: ${fallbackLayers.join(", ")}.</p>` : ""}
  `;
}

function evacGeolocationErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission denied. Enter an address manually instead.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location is unavailable right now. Enter an address manually instead.";
  }
  if (error.code === error.TIMEOUT) {
    return "Getting your location timed out. Enter an address manually instead.";
  }
  return "Unable to get your location. Enter an address manually instead.";
}

async function renderEvacuationRouting() {
  const session = await getOpsSession({ redirect: false });
  app.innerHTML = opsShellMarkup({
    active: "evacuation",
    session,
    content: `
      <section class="flood-map-shell evacuation-routing-shell ops-feature-shell">
        <section class="dashboard-title">
          <div>
            <p class="eyebrow">OneMap basemap · openrouteservice · live flood, dengue & traffic hazards</p>
            <h1>Dynamic Evacuation Routing</h1>
          </div>
          <p class="map-updated" data-evac-updated>Set a start and destination, or click the map to choose points.</p>
        </section>
        <div class="flood-map-layout">
          <div class="flood-map-canvas">
            <div id="evacuation-map" aria-label="Map for planning an evacuation route around current hazards"></div>
            <div class="map-layer-toggle evac-hazard-toggles" aria-label="Hazard layers">
              <p class="evac-toggle-heading">Hazard layers</p>
              <div class="evac-hazard-row">
                <span>Flood alerts</span>
                <label><input type="checkbox" data-evac-show="flood" checked /> Show</label>
                <label><input type="checkbox" data-evac-avoid="flood" checked /> Avoid</label>
              </div>
              <div class="evac-hazard-row">
                <span>Road incidents</span>
                <label><input type="checkbox" data-evac-show="incidents" checked /> Show</label>
                <label><input type="checkbox" data-evac-avoid="incidents" checked /> Avoid</label>
              </div>
              <div class="evac-hazard-row">
                <span>Dengue clusters</span>
                <label><input type="checkbox" data-evac-show="dengue" checked /> Show</label>
                <label><input type="checkbox" data-evac-avoid="dengue" /> Avoid</label>
              </div>
            </div>
            <div class="map-layer-toggle evac-controls" aria-label="Routing controls">
              <label><input type="checkbox" data-evac-demo /> Demo mode</label>
              <button type="button" class="secondary-button compact" data-evac-calculate disabled>Find Safe Route</button>
              <button type="button" class="secondary-button compact" data-evac-clear>Clear</button>
            </div>
            <ul class="dengue-severity-legend evac-legend" aria-label="Evacuation route legend">
              <li><i class="evac-route-key is-normal"></i>Normal route</li>
              <li><i class="evac-route-key is-incident-aware"></i>Route considering incidents</li>
              <li><i style="background:#0f766e"></i>Flood alert</li>
              <li><i style="background:#a92525"></i>Dengue cluster</li>
            </ul>
          </div>
          <aside class="flood-alert-rail" aria-label="Route planner and hazards">
            <h2>Plan a route</h2>
            <div class="evac-location-form">
              <div class="evac-location-field">
                <label for="evac-start-input">Start</label>
                <div class="evac-input-row">
                  <input type="text" id="evac-start-input" data-evac-input="start" placeholder="Address, postal code, or building" />
                  <button type="button" class="secondary-button compact" data-evac-search="start">Search</button>
                </div>
                <button type="button" class="secondary-button compact evac-location-button" data-evac-locate="start">${icon("mapPin")} Use my location</button>
                <ul class="evac-geocode-results" data-evac-results="start" hidden></ul>
                <p class="evac-field-status" data-evac-status="start"></p>
              </div>
              <div class="evac-location-field">
                <label for="evac-end-input">Destination</label>
                <div class="evac-input-row">
                  <input type="text" id="evac-end-input" data-evac-input="end" placeholder="Address, postal code, or building" />
                  <button type="button" class="secondary-button compact" data-evac-search="end">Search</button>
                </div>
                <button type="button" class="secondary-button compact evac-location-button" data-evac-locate="end">${icon("mapPin")} Use my location</button>
                <ul class="evac-geocode-results" data-evac-results="end" hidden></ul>
                <p class="evac-field-status" data-evac-status="end"></p>
              </div>
            </div>
            <h2>Route Summary</h2>
            <div class="flood-alert-list" data-evac-summary><p class="map-empty">Set a start and destination, then press Find Safe Route.</p></div>
            <h2>Active Hazards</h2>
            <div class="flood-alert-list" data-evac-hazards><p class="map-empty">Loading…</p></div>
          </aside>
        </div>
      </section>
    `
  });
  bindOpsShell();

  const map = L.map("evacuation-map", { scrollWheelZoom: true }).setView([1.3521, 103.8198], 12);
  addOneMapTileLayer(map);

  const floodLayer = L.layerGroup().addTo(map);
  const incidentLayer = L.layerGroup().addTo(map);
  const dengueLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const markerLayer = L.layerGroup().addTo(map);
  const hazardLayers = { flood: floodLayer, incidents: incidentLayer, dengue: dengueLayer };

  const evac = {
    start: null,
    end: null,
    hazards: null,
    show: { flood: true, incidents: true, dengue: true },
    avoid: { flood: true, incidents: true, dengue: false }
  };

  let startMarker = null;
  let endMarker = null;

  const updatedLabel = document.querySelector("[data-evac-updated]");
  const summaryEl = document.querySelector("[data-evac-summary]");
  const hazardsEl = document.querySelector("[data-evac-hazards]");
  const demoToggle = document.querySelector("[data-evac-demo]");
  const calculateButton = document.querySelector("[data-evac-calculate]");

  function placeMarker(latlng, kind) {
    const color = kind === "start" ? "#0f766e" : "#c53d32";
    const marker = L.circleMarker(latlng, {
      radius: 9,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.85
    })
      .bindPopup(kind === "start" ? "Start" : "Destination")
      .addTo(markerLayer);

    if (kind === "start") {
      if (startMarker) markerLayer.removeLayer(startMarker);
      startMarker = marker;
    } else {
      if (endMarker) markerLayer.removeLayer(endMarker);
      endMarker = marker;
    }
    return marker;
  }

  function updateCalculateButtonState() {
    calculateButton.disabled = !(evac.start && evac.end);
  }

  function resetSummary() {
    summaryEl.innerHTML = `<p class="map-empty">Set a start and destination, then press Find Safe Route.</p>`;
  }

  // OneMap/geolocation give {lat, lng}; ORS/GeoJSON need [lng, lat] — converted in lineStringToLatLngs and on the backend.
  async function reverseGeocodeToInput(kind, coord) {
    const input = document.querySelector(`[data-evac-input="${kind}"]`);
    if (!input) return;
    try {
      const response = await fetch(`/api/onemap/revgeocode?lat=${coord.lat}&lng=${coord.lng}`);
      const payload = await response.json();
      const address = payload.address;
      const label = address ? [address.block, address.road, address.building].filter(Boolean).join(" ").trim() : "";
      input.value = label || `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`;
    } catch (error) {
      input.value = `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`;
    }
  }

  function focusOnPoints() {
    if (evac.start && evac.end) {
      const bounds = L.latLngBounds([evac.start.lat, evac.start.lng], [evac.end.lat, evac.end.lng]);
      if (typeof map.flyToBounds === "function") {
        map.flyToBounds(bounds, { duration: 0.6, padding: [60, 60] });
      } else {
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    } else if (evac.start) {
      map.flyTo([evac.start.lat, evac.start.lng], 15, { duration: 0.6 });
    } else if (evac.end) {
      map.flyTo([evac.end.lat, evac.end.lng], 15, { duration: 0.6 });
    }
  }

  map.on("click", (event) => {
    if (!evac.start || (evac.start && evac.end)) {
      evac.start = { lat: event.latlng.lat, lng: event.latlng.lng };
      evac.end = null;
      if (endMarker) {
        markerLayer.removeLayer(endMarker);
        endMarker = null;
      }
      placeMarker(event.latlng, "start");
      routeLayer.clearLayers();
      resetSummary();
      updatedLabel.textContent = "Start point set. Click the map again to set a destination, or use the search fields.";
      reverseGeocodeToInput("start", evac.start);
      updateCalculateButtonState();
      return;
    }

    evac.end = { lat: event.latlng.lat, lng: event.latlng.lng };
    placeMarker(event.latlng, "end");
    updatedLabel.textContent = "Start and destination set. Press Find Safe Route.";
    reverseGeocodeToInput("end", evac.end);
    updateCalculateButtonState();
  });

  document.querySelector("[data-evac-clear]").addEventListener("click", () => {
    evac.start = null;
    evac.end = null;
    startMarker = null;
    endMarker = null;
    markerLayer.clearLayers();
    routeLayer.clearLayers();
    resetSummary();
    updatedLabel.textContent = "Set a start and destination, or click the map to choose points.";
    document.querySelectorAll("[data-evac-input]").forEach((input) => {
      input.value = "";
    });
    document.querySelectorAll("[data-evac-status]").forEach((status) => {
      status.textContent = "";
    });
    document.querySelectorAll("[data-evac-results]").forEach((list) => {
      list.hidden = true;
      list.innerHTML = "";
    });
    updateCalculateButtonState();
  });

  function applyGeocodeResult(kind, result) {
    const coord = { lat: result.lat, lng: result.lng };
    evac[kind] = coord;
    placeMarker(L.latLng(coord.lat, coord.lng), kind);
    routeLayer.clearLayers();
    resetSummary();
    updateCalculateButtonState();
    focusOnPoints();
    updatedLabel.textContent =
      evac.start && evac.end
        ? "Start and destination set. Press Find Safe Route."
        : `${kind === "start" ? "Start" : "Destination"} point set.`;
  }

  async function geocodeAddress(kind) {
    const input = document.querySelector(`[data-evac-input="${kind}"]`);
    const status = document.querySelector(`[data-evac-status="${kind}"]`);
    const resultsEl = document.querySelector(`[data-evac-results="${kind}"]`);
    const query = input.value.trim();
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";

    if (!query) {
      status.textContent = "Enter an address, postal code, or building name.";
      return;
    }

    status.textContent = "Searching…";
    try {
      const response = await fetch(`/api/onemap/search?q=${encodeURIComponent(query)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Search failed.");

      const results = payload.results || [];
      if (!results.length) {
        status.textContent = "No matching locations found. Try a different search.";
        return;
      }

      if (results.length === 1) {
        applyGeocodeResult(kind, results[0]);
        status.textContent = `Set to ${results[0].address || results[0].name}.`;
        return;
      }

      resultsEl.hidden = false;
      resultsEl.innerHTML = results
        .slice(0, 6)
        .map((result, index) => `<li><button type="button" data-evac-result="${index}">${result.address || result.name}</button></li>`)
        .join("");
      resultsEl.querySelectorAll("[data-evac-result]").forEach((button) => {
        button.addEventListener("click", () => {
          const result = results[Number(button.dataset.evacResult)];
          applyGeocodeResult(kind, result);
          resultsEl.hidden = true;
          resultsEl.innerHTML = "";
          status.textContent = `Set to ${result.address || result.name}.`;
        });
      });
      status.textContent = `Found ${results.length} matches — choose one below.`;
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function useMyLocation(kind) {
    const status = document.querySelector(`[data-evac-status="${kind}"]`);
    if (!navigator.geolocation) {
      status.textContent = "Geolocation is not supported by this browser. Enter an address instead.";
      return;
    }

    status.textContent = "Getting your location…";
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coord = { lat: position.coords.latitude, lng: position.coords.longitude };
        applyGeocodeResult(kind, coord);
        status.textContent = "Using your current location.";
        await reverseGeocodeToInput(kind, coord);
      },
      (error) => {
        status.textContent = evacGeolocationErrorMessage(error);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }

  document.querySelectorAll("[data-evac-search]").forEach((button) => {
    button.addEventListener("click", () => geocodeAddress(button.dataset.evacSearch));
  });
  document.querySelectorAll("[data-evac-input]").forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        geocodeAddress(input.dataset.evacInput);
      }
    });
  });
  document.querySelectorAll("[data-evac-locate]").forEach((button) => {
    button.addEventListener("click", () => useMyLocation(button.dataset.evacLocate));
  });

  function applyShowToggles() {
    Object.entries(hazardLayers).forEach(([key, layer]) => {
      if (evac.show[key]) {
        if (!map.hasLayer(layer)) map.addLayer(layer);
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
  }

  function renderHazardLayers() {
    const hazards = evac.hazards;
    if (!hazards) return;

    floodLayer.clearLayers();
    (hazards.flood?.points || []).forEach((point) => {
      L.circle([point.lat, point.lng], {
        radius: 250,
        color: blockageColor("flood"),
        weight: 1.5,
        fillColor: blockageColor("flood"),
        fillOpacity: 0.25
      })
        .bindPopup(blockagePopup(point))
        .addTo(floodLayer);
    });

    incidentLayer.clearLayers();
    (hazards.incidents?.points || []).forEach((point) => {
      L.circle([point.lat, point.lng], {
        radius: 250,
        color: blockageColor("incident"),
        weight: 1.5,
        fillColor: blockageColor("incident"),
        fillOpacity: 0.25
      })
        .bindPopup(blockagePopup(point))
        .addTo(incidentLayer);
    });

    dengueLayer.clearLayers();
    (hazards.dengue?.geojson?.features || []).forEach((feature) => {
      const info = dengueClusterInfo(feature);
      geoJsonFeatureToLayer(feature, {
        style: () => ({
          color: dengueColor(info.caseSize),
          weight: 1.5,
          fillColor: dengueColor(info.caseSize),
          fillOpacity: 0.3
        })
      })
        .bindPopup(denguePopup(info))
        .addTo(dengueLayer);
    });

    applyShowToggles();
  }

  function renderHazardList() {
    const hazards = evac.hazards;
    if (!hazards) return;

    const items = [];
    (hazards.flood?.points || []).forEach((point) => items.push({ type: "flood", title: "Flood alert", label: point.label }));
    (hazards.incidents?.points || []).forEach((point) => items.push({ type: "incident", title: "Traffic incident", label: point.label }));
    (hazards.dengue?.geojson?.features || []).forEach((feature) => {
      const info = dengueClusterInfo(feature);
      items.push({
        type: "dengue",
        title: "Dengue cluster",
        label: `${info.locality} — ${info.caseSize} case${info.caseSize === 1 ? "" : "s"}`
      });
    });

    hazardsEl.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <article class="flood-alert-card">
                <span class="severity-pill" style="background:${blockageColor(item.type)}">${item.title}</span>
                <div><p>${item.label || ""}</p></div>
              </article>
            `
          )
          .join("")
      : `<p class="map-empty">No active hazards reported right now.</p>`;
  }

  async function refreshHazards() {
    try {
      const demo = demoToggle.checked;
      const response = await fetch(`/api/evacuation/hazards?demo=${demo}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load hazard data.");

      evac.hazards = payload;
      renderHazardLayers();
      renderHazardList();
    } catch (error) {
      hazardsEl.innerHTML = `<p class="map-empty error">${error.message}</p>`;
    }
  }

  async function calculateRoute() {
    if (!evac.start || !evac.end) {
      updatedLabel.textContent = "Set a start and destination first.";
      return;
    }

    summaryEl.innerHTML = `<p class="map-empty">Calculating route…</p>`;

    try {
      const response = await fetch("/api/evacuation/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: evac.start, end: evac.end, demo: demoToggle.checked, avoid: evac.avoid })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to compute a route.");

      evac.hazards = payload.hazards;
      renderHazardLayers();
      renderHazardList();
      routeLayer.clearLayers();

      const baselineCoords = payload.baseline?.features?.[0]?.geometry?.coordinates;
      const reroutedCoords = payload.rerouted?.features?.[0]?.geometry?.coordinates;

      let bounds = null;
      if (baselineCoords) {
        const latlngs = lineStringToLatLngs(baselineCoords);
        const line = L.polyline(latlngs, { color: "#1d4ed8", weight: 5, opacity: 0.85 }).addTo(routeLayer);
        bounds = line.getBounds();
      }
      if (reroutedCoords) {
        const latlngs = lineStringToLatLngs(reroutedCoords);
        const line = L.polyline(latlngs, {
          color: "#c53d32",
          weight: 4,
          opacity: 0.9,
          dashArray: "8 8"
        }).addTo(routeLayer);
        bounds = bounds ? bounds.extend(line.getBounds()) : line.getBounds();
      }

      if (bounds && bounds.isValid()) {
        if (typeof map.flyToBounds === "function") {
          map.flyToBounds(bounds, { duration: 0.6, padding: [40, 40] });
        } else {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      }

      summaryEl.innerHTML =
        evacuationRouteSummary(payload) ||
        `<p class="map-empty">Route computed${payload.demo ? " (demo data)" : ""}.</p>`;

      updatedLabel.textContent = `Last updated ${formatDateTime(payload.fetchedAt)}${payload.demo ? " · demo data" : ""}`;
    } catch (error) {
      routeLayer.clearLayers();
      summaryEl.innerHTML = `<p class="map-empty error">${error.message}</p>`;
    }
  }

  calculateButton.addEventListener("click", calculateRoute);

  document.querySelectorAll("[data-evac-show]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      evac.show[checkbox.dataset.evacShow] = checkbox.checked;
      applyShowToggles();
    });
  });

  document.querySelectorAll("[data-evac-avoid]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      evac.avoid[checkbox.dataset.evacAvoid] = checkbox.checked;
      if (evac.start && evac.end) calculateRoute();
    });
  });

  demoToggle.addEventListener("change", () => {
    refreshHazards();
    if (evac.start && evac.end) calculateRoute();
  });

  updateCalculateButtonState();
  await refreshHazards();
  evacuationMapTimer = window.setInterval(async () => {
    await refreshHazards();
    if (evac.start && evac.end) await calculateRoute();
  }, EVACUATION_POLL_MS);
}

async function renderRiskPrediction() {
  const riskSession = await getOpsSession({ redirect: false });
  app.innerHTML = opsShellMarkup({
    active: "risk",
    session: riskSession,
    content: `
      <section class="risk-shell ops-feature-shell risk-ai-shell">
        <section class="dashboard-preview-panel dashboard-ai-panel" data-dashboard-ai-panel aria-labelledby="risk-ai-title">
          <div class="dashboard-ai-heading">
            <div>
              <p class="eyebrow">On-demand assessment</p>
              <h1 id="risk-ai-title">AI Prediction</h1>
              <p>Choose an incident or zone, then run a four-hour risk analysis.</p>
            </div>
            <div class="dashboard-ai-controls">
              <label>
                Analyze target
                <select data-dashboard-prediction-target disabled>
                  <option value="">Loading targets...</option>
                </select>
              </label>
              <button type="button" data-dashboard-analyze disabled>${icon("activity")} Analyze</button>
            </div>
          </div>
          <div class="dashboard-ai-result" data-dashboard-ai-result>
            <div class="dashboard-ai-idle-icon">${icon("activity")}</div>
            <div>
              <strong>Prediction waiting</strong>
              <p>No AI assessment has been run. Select a target and press Analyze.</p>
            </div>
          </div>
        </section>
      </section>
    `
  });
  bindOpsShell();
  await loadDashboardPredictionTargets({ autoAnalyze: true });
  return;

  const session = await getOpsSession({ redirect: false });
  app.innerHTML = opsShellMarkup({
    active: "risk",
    session,
    content: `
      <section class="risk-shell ops-feature-shell">
        <section class="risk-title">
          <p class="eyebrow">Risk Prediction</p>
          <h1>Singapore Live Risk Map</h1>
        </section>
        <div class="risk-controls">
          <div class="risk-tabs" style="margin-bottom:8px">
            <button id="tab-api" class="secondary-button compact">Live API</button>
            <button id="tab-db" class="secondary-button compact">DB Reports</button>
            <button id="btn-report" class="secondary-button compact">Report Incident</button>
          </div>
        </div>

        <div class="risk-layout">
          <div class="risk-map" id="risk-map" style="height:520px; background:#f4f4f4; display:flex;align-items:center;justify-content:center">Loading map…</div>
          <aside class="risk-panel" id="risk-panel">
            <h2 id="panel-title">AI Predictions</h2>
            <div id="ai-prediction" class="ai-box">
              <p class="muted">Select a zone on the map to see targeted predictions and recommended actions.</p>
            </div>
          </aside>
        </div>
      </section>
    `
  });
  bindOpsShell();

  // Load Leaflet and fetch heatmap
  try {
    await loadStylesheet("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");

    const map = L.map("risk-map").setView([1.3521, 103.8198], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    const layer = L.layerGroup().addTo(map);

    let currentSource = 'api'; // 'api' or 'db'

    function selectEndpoint(source, kind) {
      if (source === 'db') {
        return kind === 'heatmap' ? '/api/risk/heatmap-db' : '/api/risk/predict-db';
      }
      return kind === 'heatmap' ? '/api/risk/heatmap' : '/api/risk/predict';
    }

    function getZoneIdentifier(feature) {
      return (feature && feature.properties && (feature.properties.zoneId || feature.properties.zoneName)) || null;
    }

    function getZoneDisplayName(feature) {
      if (!feature || !feature.properties) return '';
      // Prefer a human friendly zone name or incident area description
      if (currentSource === 'db') {
        const inc = feature.properties.incident || {};
        return feature.properties.zoneName || inc.areaDesc || inc.location || feature.properties.zoneId || '';
      }
      return feature.properties.zoneName || feature.properties.zoneId || '';
    }

    async function loadHeatmap(filters = {}, source = 'api') {
      if (source === 'api') {
        // Fetch upstream flood alerts via server proxy and convert to FeatureCollection
        const resp = await fetch('/api/flood-alerts');
        const payload = await resp.json();
        const records = payload.records || payload.data?.records || [];
        const features = records.map((rec, idx) => {
          const zoneId = rec.datetime || `record-${idx}`;
          const zoneName = rec.item?.type || `Alert ${idx + 1}`;
          const description = rec.item?.description || rec.item?.type || `Upstream alert ${rec.datetime || ''}`;
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [103.7 + (idx % 10) * 0.01, 1.30 + Math.floor(idx / 10) * 0.01] },
            properties: { zoneId, zoneName, description, severity: 'High', confidence: 0.5 }
          };
        });
        return { type: 'FeatureCollection', features, fetchedAt: new Date().toISOString() };
      }
      const q = new URLSearchParams();
      q.set('region', filters.region || 'all');
      q.set('window', filters.window || '4');
      const url = selectEndpoint(source, 'heatmap') + '?' + q.toString();
      const resp = await fetch(url);
      return resp.json();
    }

    const payload = await loadHeatmap({}, currentSource);
    const features = payload.features || [];
    // mark API tab as active by default
    document.getElementById('tab-api').classList.add('active');
    document.getElementById('tab-api').setAttribute('aria-pressed', 'true');

    features.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const color = f.properties.severity === 'Critical' ? '#a92525' : f.properties.severity === 'High' ? '#c53d32' : '#c47a1b';
      const marker = L.circle([lat, lng], { radius: 400, color, fillColor: color, fillOpacity: 0.25 }).addTo(layer);
      marker.on('click', async () => {
        const displayName = getZoneDisplayName(f);
        const zoneId = getZoneIdentifier(f);
        const panel = document.getElementById('ai-prediction');
          if (currentSource === 'db') {
          const inc = f.properties.incident || {};
          panel.innerHTML = `
            <h3>${displayName}</h3>
            <div class="incident-details">
              <p><strong>Description:</strong> ${f.properties.description || inc.note || 'No description provided'}</p>
              <p><strong>Reporter:</strong> ${inc.reporter || 'anonymous'} (${inc.reporterRole || 'public'})</p>
              <p><strong>Type:</strong> ${inc.type || 'report'}</p>
              <p><strong>Severity:</strong> ${inc.severity || f.properties.severity}</p>
              <p><strong>Value:</strong> ${inc.value ?? '—'}</p>
              <p><strong>Location:</strong> ${inc.location || inc.areaDesc || '—'}</p>
              <p><strong>Status:</strong> ${inc.status || 'open'}</p>
            </div>
            <hr />
            <div class="ai-section"><p>Loading AI prediction…</p></div>
          `;

          try {
            const pResp = await fetch(selectEndpoint(currentSource, 'predict'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone: zoneId, hours: 4 }) });
            const p = await pResp.json();
            const aiSection = panel.querySelector('.ai-section');
            if (aiSection) {
              aiSection.innerHTML = `
                <h4>AI Predictions</h4>
                <p><strong>Severity:</strong> ${p.severity} · <strong>Confidence:</strong> ${Math.round((p.confidence||0)*100)}%</p>
                <p><strong>Time to impact:</strong> ${p.timeToImpact}</p>
                <h5>Recommendations</h5>
                <ul>${(p.recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
                <h5>Why</h5>
                <p class="ai-explanation">${p.explanation || ''}</p>
              `;
            }
          } catch (e) {
            const aiSection = panel.querySelector('.ai-section');
            if (aiSection) aiSection.textContent = 'Prediction failed.';
          }
        } else {
          panel.innerHTML = `<p>Loading prediction for <strong>${displayName}</strong>…</p>`;
          try {
            const predictUrl = selectEndpoint(currentSource, 'predict');
            const pResp = await fetch(predictUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone: displayName, hours: 4 }) });
            const p = await pResp.json();
            panel.innerHTML = `
              <h3>${displayName}</h3>
              <p><strong>Severity:</strong> ${p.severity} · <strong>Confidence:</strong> ${Math.round((p.confidence||0)*100)}%</p>
              <p><strong>Time to impact:</strong> ${p.timeToImpact}</p>
              <h4>Expected Impact</h4>
              <ul class="ai-impact-list">
                <li>Road congestion</li>
                <li>Shelter demand increase</li>
                <li>Hospital occupancy strain</li>
              </ul>
              <h4>Recommendations</h4>
              <ul>${(p.recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
              <h5>Why</h5>
              <p class="ai-explanation">${p.explanation || ''}</p>
            `;
          } catch (e) {
            panel.textContent = 'Prediction failed.';
          }
        }
      });
    });
    // Wire filter controls
    // Report incident button -> show simple form in the right panel
    document.getElementById('btn-report').addEventListener('click', () => {
      const panel = document.getElementById('ai-prediction');
      panel.innerHTML = `
        <h3>Report Incident</h3>
        <form id="report-form">
          <label>Type<input name="type" value="flood" required /></label>
          <label>Severity<select name="severity"><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label>Area description<input name="areaDesc" placeholder="Area description" required /></label>
          <label>Location<input name="location" placeholder="Location (optional)" /></label>
          <label>Latitude<input name="lat" type="number" step="0.0001" /></label>
          <label>Longitude<input name="lng" type="number" step="0.0001" /></label>
          <label>Note<textarea name="note" rows="3" /></label>
          <div style="margin-top:8px"><button type="submit" class="form-button">Submit Report</button></div>
        </form>
        <p class="form-status" role="status"></p>
      `;

      const form = document.getElementById('report-form');
      const status = panel.querySelector('.form-status');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = 'Submitting...';
        try {
          const data = Object.fromEntries(new FormData(form).entries());
          // Convert lat/lng and value if present
          if (data.lat) data.lat = Number(data.lat);
          if (data.lng) data.lng = Number(data.lng);
          const resp = await fetch('/api/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          const result = await resp.json();
          if (!resp.ok) throw new Error(result.error || 'Failed');
          status.textContent = 'Report submitted';
          // If DB tab is active, refresh markers
          if (currentSource === 'db') {
            const newPayload = await loadHeatmap({ region: 'all' }, currentSource);
            layer.clearLayers();
            (newPayload.features || []).forEach((ff) => {
              const [lng2, lat2] = ff.geometry.coordinates;
              const color2 = ff.properties.severity === 'Critical' ? '#a92525' : ff.properties.severity === 'High' ? '#c53d32' : '#c47a1b';
              const m2 = L.circle([lat2, lng2], { radius: 400, color: color2, fillColor: color2, fillOpacity: 0.25 }).addTo(layer);
            });
          }
        } catch (err) {
          status.textContent = err.message || 'Submission failed';
        }
      });
    });
    // Tab controls
    document.getElementById('tab-api').addEventListener('click', async () => {
      currentSource = 'api';
      // Show AI panel title for Live API
      const titleEl = document.getElementById('panel-title');
      if (titleEl) { titleEl.style.display = ''; titleEl.textContent = 'AI Predictions'; }
      document.getElementById('tab-api').classList.add('active');
      document.getElementById('tab-db').classList.remove('active');
      const newPayload = await loadHeatmap({ region: 'all' }, currentSource);
      layer.clearLayers();
      (newPayload.features || []).forEach((ff) => {
        const [lng2, lat2] = ff.geometry.coordinates;
        const color2 = ff.properties.severity === 'Critical' ? '#a92525' : ff.properties.severity === 'High' ? '#c53d32' : '#c47a1b';
        const m2 = L.circle([lat2, lng2], { radius: 400, color: color2, fillColor: color2, fillOpacity: 0.25 }).addTo(layer);
        m2.on('click', async () => {
          const displayName = getZoneDisplayName(ff);
          const panel = document.getElementById('ai-prediction');
          panel.innerHTML = `<p>Loading prediction for <strong>${displayName}</strong>…</p>`;
          try {
            const pResp2 = await fetch(selectEndpoint(currentSource, 'predict'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone: displayName, hours: 4 }) });
            const p2 = await pResp2.json();
            panel.innerHTML = `
              <h3>${displayName}</h3>
              <p><strong>Description:</strong> ${ff.properties.description || ''}</p>
              <p><strong>Severity:</strong> ${p2.severity} · <strong>Confidence:</strong> ${Math.round((p2.confidence||0)*100)}%</p>
              <p><strong>Time to impact:</strong> ${p2.timeToImpact}</p>
              <h4>Expected Impact</h4>
              <ul class="ai-impact-list">
                <li>Road congestion</li>
                <li>Shelter demand increase</li>
                <li>Hospital occupancy strain</li>
              </ul>
              <h4>Recommendations</h4>
              <ul>${(p2.recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
              <h5>Why</h5>
              <p class="ai-explanation">${p2.explanation || ''}</p>
            `;
          } catch (e) {
            panel.textContent = 'Prediction failed.';
          }
        });
      });
    });

    document.getElementById('tab-db').addEventListener('click', async () => {
      currentSource = 'db';
      // Hide the global AI header when showing DB incident details
      const titleEl = document.getElementById('panel-title');
      if (titleEl) { titleEl.style.display = 'none'; }
      document.getElementById('tab-db').classList.add('active');
      document.getElementById('tab-api').classList.remove('active');
      const newPayload = await loadHeatmap({ region: 'all' }, currentSource);
      layer.clearLayers();
      (newPayload.features || []).forEach((ff) => {
        const [lng2, lat2] = ff.geometry.coordinates;
        const color2 = ff.properties.severity === 'Critical' ? '#a92525' : ff.properties.severity === 'High' ? '#c53d32' : '#c47a1b';
        const m2 = L.circle([lat2, lng2], { radius: 400, color: color2, fillColor: color2, fillOpacity: 0.25 }).addTo(layer);
        m2.on('click', async () => {
          const displayName = getZoneDisplayName(ff);
          const zoneId = getZoneIdentifier(ff);
          const panel = document.getElementById('ai-prediction');
          const inc = ff.properties.incident || {};
          panel.innerHTML = `
            <h3>${displayName}</h3>
            <div class="incident-details">
              <p><strong>Reporter:</strong> ${inc.reporter || 'anonymous'} (${inc.reporterRole || 'public'})</p>
              <p><strong>Type:</strong> ${inc.type || 'report'}</p>
              <p><strong>Severity:</strong> ${inc.severity || ff.properties.severity}</p>
              <p><strong>Value:</strong> ${inc.value ?? '—'}</p>
              <p><strong>Location:</strong> ${inc.location || inc.areaDesc || '—'}</p>
              ${inc.note ? `<p><strong>Note:</strong> ${inc.note}</p>` : ''}
              <p><strong>Status:</strong> ${inc.status || 'open'}</p>
            </div>
            <hr />
            <div class="ai-section"><p>Loading AI prediction…</p></div>
          `;
          try {
            const pResp2 = await fetch(selectEndpoint(currentSource, 'predict'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone: zoneId, hours: 4 }) });
            const p2 = await pResp2.json();
            const aiSection = panel.querySelector('.ai-section');
            if (aiSection) {
              aiSection.innerHTML = `
                <h4>AI Predictions</h4>
                <p><strong>Severity:</strong> ${p2.severity} · <strong>Confidence:</strong> ${Math.round((p2.confidence||0)*100)}%</p>
                <p><strong>Time to impact:</strong> ${p2.timeToImpact}</p>
                <h5>Recommendations</h5>
                <ul>${(p2.recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
              `;
            }
          } catch (e) {
            const aiSection = panel.querySelector('.ai-section');
            if (aiSection) aiSection.textContent = 'Prediction failed.';
          }
        });
      });
    });

  } catch (error) {
    const el = document.getElementById('risk-map');
    if (el) el.innerHTML = '<span>Unable to load map.</span>';
  }
}

function generateFloodDengueInsights(floodEntries, dengueFeatures) {
  const insights = [];
  const highFlood = floodEntries.filter((e) => ["Extreme", "Severe"].includes(e.reading.severity));
  if (highFlood.length > 0) {
    const zones = [...new Set(highFlood.map((e) => e.reading.area?.areaDesc || e.reading.headline || "affected area"))].slice(0, 2).join(", ");
    insights.push({
      title: `Active Flood Alert: ${zones}`,
      riskLevel: highFlood.some((e) => e.reading.severity === "Extreme") ? "CRITICAL" : "HIGH",
      recommendations: [
        "Deploy SCDF teams to flood-affected zones immediately",
        "Activate emergency shelters in high-risk areas",
        "Issue public advisory: avoid flood-prone roads and underpasses",
        "Pre-position medical teams at nearest hospitals to the affected zone"
      ]
    });
  } else if (floodEntries.length > 0) {
    insights.push({
      title: `${floodEntries.length} Active Flood Alert${floodEntries.length !== 1 ? "s" : ""} — Monitor Closely`,
      riskLevel: "MEDIUM",
      recommendations: [
        "Continue SCDF monitoring of active flood zones",
        "Keep emergency shelters on standby readiness",
        "Update public advisory channels with latest flood status"
      ]
    });
  }

  const largeClusters = dengueFeatures.filter((f) => dengueClusterInfo(f).caseSize >= 10);
  const totalDengueCases = dengueFeatures.reduce((sum, f) => sum + dengueClusterInfo(f).caseSize, 0);
  if (largeClusters.length > 0) {
    const localities = largeClusters.slice(0, 2).map((f) => dengueClusterInfo(f).locality).join(", ");
    insights.push({
      title: `Dengue Surge: ${largeClusters.length} Large Cluster${largeClusters.length !== 1 ? "s" : ""} Active`,
      riskLevel: largeClusters.length >= 5 ? "CRITICAL" : "HIGH",
      recommendations: [
        `Intensify NEA vector control operations in ${localities}`,
        `Advise residents to eliminate stagnant water sources in affected areas`,
        `Monitor ${totalDengueCases} total active dengue cases across all clusters`,
        "Mobilise community health volunteers for cluster awareness campaigns"
      ]
    });
  } else if (dengueFeatures.length > 0) {
    insights.push({
      title: `${dengueFeatures.length} Active Dengue Cluster${dengueFeatures.length !== 1 ? "s" : ""} — Routine Surveillance`,
      riskLevel: "MEDIUM",
      recommendations: [
        "Maintain NEA dengue surveillance across all active clusters",
        "Remind residents in affected areas to check for breeding habitats",
        `${totalDengueCases} total cases currently active — no surge detected`
      ]
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "No Active Flood or Dengue Alerts — Conditions Normal",
      riskLevel: "MEDIUM",
      recommendations: [
        "Maintain standard dengue surveillance across all zones",
        "Continue flood monitoring for low-lying and high-rain areas",
        "Ensure emergency shelters and medical resources remain at readiness"
      ]
    });
  }
  return insights;
}

function renderRoute() {
  if (opsMenuKeydownHandler) {
    document.removeEventListener("keydown", opsMenuKeydownHandler);
    opsMenuKeydownHandler = null;
  }
  if (floodMapTimer) {
    window.clearInterval(floodMapTimer);
    floodMapTimer = null;
  }
  if (dengueMapTimer) {
    window.clearInterval(dengueMapTimer);
    dengueMapTimer = null;
  }
  if (evacuationMapTimer) {
    window.clearInterval(evacuationMapTimer);
    evacuationMapTimer = null;
  }
  if (publicStatusTimer) {
    window.clearInterval(publicStatusTimer);
    publicStatusTimer = null;
  }
  if (opsHeaderClockTimer) {
    window.clearInterval(opsHeaderClockTimer);
    opsHeaderClockTimer = null;
  }
  if (dashboardPreviewTimer) {
    window.clearInterval(dashboardPreviewTimer);
    dashboardPreviewTimer = null;
  }
  if (volunteerDispatchTimer) {
    window.clearInterval(volunteerDispatchTimer);
    volunteerDispatchTimer = null;
  }
  const renderer = routes[window.location.hash] || renderLanding;
  renderer();
}

function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("quickaid-theme", next);
  });
}

initThemeToggle();
window.addEventListener("hashchange", renderRoute);
renderRoute();
