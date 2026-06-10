const app = document.querySelector("#app");

const routes = {
  "": renderLanding,
  "#/": renderLanding,
  "#/login": renderRoleSelection,
  "#/login/professional": renderProfessionalLogin,
  "#/signup/professional": renderProfessionalSignup,
  "#/login/public": renderPublicLogin,
  "#/signup/volunteer": renderVolunteerSignup,
  "#/public-status": renderPublicEmergencyStatus,
  "#/dashboard": renderDashboard,
  "#/flood-map": renderFloodMap,
  "#/evacuation-routing": renderEvacuationRouting,
  "#/risk-prediction": renderRiskPrediction,
  "#/analytics": renderAnalytics
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
let simulationScenarios = [];
let opsMenuKeydownHandler = null;

const DEFAULT_DASHBOARD_STATS = {
  activeIncidents: 5,
  volunteersOnStandby: 18,
  sheltersAvailable: 3,
  riskAlert: "Low"
};

const DEFAULT_SIMULATION_BRIEFING = "Standby. Run a scenario to generate a rule-based operations briefing.";
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
  smartMatchActive: false,
  smartMatchScores: new Map()
};

const VOLUNTEER_AVAILABILITY = ["Available", "Off Duty"];
const VOLUNTEER_STATUSES = ["Available", "Assigned", "En Route", "On Site", "Completed", "Off Duty"];
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

function shieldIcon() {
  return `
    <svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.3 8.2-8 9-4.7-.8-8-4-8-9V6l8-3z" fill="none" stroke="currentColor" stroke-width="1.8" />
    </svg>
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
    close: '<path d="M18 6 6 18M6 6l12 12" />',
    mapPin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="2.5" />',
    google: '<path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4z" /><path d="M12 22c2.7 0 5-0.9 6.7-2.4L15.5 17a6 6 0 0 1-8.9-3.1H3.3v2.7A10 10 0 0 0 12 22z" /><path d="M6.6 13.9a6 6 0 0 1 0-3.8V7.4H3.3a10 10 0 0 0 0 9.2l3.3-2.7z" /><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.7 5.4l3.3 2.7A6 6 0 0 1 12 6z" />'
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
}

function header({ backHref = "", nav = false } = {}) {
  return `
    <header class="site-header">
      <a class="brand" href="#/">
        ${shieldIcon()}
        <span>
          <strong>QuickAid</strong>
          <small>AI Emergency Coordination</small>
        </span>
      </a>
      ${nav ? `
        <nav class="top-nav" aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
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
            <p class="hero-summary">A unified operational coordination platform powered by AI for real-time emergency management and resource optimisation.</p>
            <div class="hero-actions">
              <a class="primary-button status-button" href="#/public-status">${icon("activity")} Live emergency status ${icon("arrowRight")}</a>
              <a class="secondary-button sign-in-button" href="#/login">Sign in</a>
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
              <button type="button">Apply</button>
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
            <strong>QuickAid</strong>
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
              href: "#/login/public",
              iconName: "users",
              title: "Public Access",
              subtitle: "For residents and community members",
              items: ["Report incidents", "Offer volunteer support", "Receive alerts"],
              action: "Continue as Public"
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
          <form class="login-form" data-role="professional">
            <label>Email<input name="email" type="email" placeholder="irname@example.com" autocomplete="email" required /></label>
            <label>Password
              <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required minlength="8" /></span>
            </label>
            <p class="note">${icon("info")} Sign in using the password created with your authorised agency email.</p>
            <button class="form-button" type="submit">Sign In</button>
            <div class="auth-support-links">
              <a href="#/signup/professional">Sign up for a professional account</a>
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
          <form class="login-form wide-auth-form" data-professional-signup>
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
                <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="At least 10 characters" autocomplete="new-password" required minlength="10" /></span>
              </label>
              <label>Confirm password
                <span class="input-with-icon">${icon("lock")}<input name="confirmPassword" type="password" placeholder="Re-enter your password" autocomplete="new-password" required minlength="10" /></span>
              </label>
            </div>
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

async function submitProfessionalSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

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
    form.reset();
    status.textContent = result.message;
    status.classList.add("success");
  } catch (error) {
    status.textContent = "Server unavailable. Check that QuickAid is running.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

function renderPublicLogin() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login" })}
      <main class="center-stage">
        <section class="login-panel" aria-labelledby="public-heading">
          <div class="auth-heading">
            <h1 id="public-heading">Public Login</h1>
            <p>Sign in to report incidents, receive alerts, or offer support</p>
          </div>
          <form class="login-form" data-role="public">
            <button class="google-button" type="button" data-google>${icon("google")} Continue with Google</button>
            <div class="divider"><span>OR</span></div>
            <label>Email<input name="email" type="email" placeholder="irname@example.com" autocomplete="email" /></label>
            <label>Password
              <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="Enter your password" autocomplete="current-password" minlength="6" /></span>
            </label>
            <button class="form-button" type="submit">Sign In With Email</button>
            <p class="signup-line">Want to help during emergencies? <a href="#/signup/volunteer">Create a volunteer account</a></p>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;
  bindLoginForm();
}

function renderVolunteerSignup() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login/public" })}
      <main class="center-stage signup-stage">
        <section class="login-panel volunteer-signup-panel" aria-labelledby="volunteer-heading">
          <div class="auth-heading">
            <p class="eyebrow">Community response network</p>
            <h1 id="volunteer-heading">Volunteer Sign Up</h1>
            <p>Create an account to offer support and receive local emergency alerts</p>
          </div>
          <form class="login-form volunteer-signup-form" data-volunteer-signup>
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
            </div>
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
            <p class="signup-line">Already registered? <a href="#/login/public">Sign in</a></p>
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
    status.textContent = "Server unavailable. Check that QuickAid is running.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

function bindLoginForm() {
  const form = document.querySelector(".login-form");
  const google = document.querySelector("[data-google]");

  if (google) {
    google.addEventListener("click", () => {
      submitLogin("public", { provider: "google" });
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const role = form.dataset.role;
    const data = Object.fromEntries(new FormData(form).entries());
    submitLogin(role, data);
  });
}

async function submitLogin(role, payload) {
  const status = document.querySelector(".form-status");
  const endpoint = role === "professional" ? "/api/auth/professional" : "/api/auth/public";
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
    status.textContent = "Server unavailable. Check that QuickAid is running.";
    status.classList.add("error");
  }
}

async function renderDashboard() {
  let session;
  try {
    const response = await fetch("/api/auth/session");
    const result = await response.json();
    if (!response.ok) {
      localStorage.removeItem("quickaid-session");
      window.location.hash = "#/login";
      return;
    }
    session = result.session;
    localStorage.setItem("quickaid-session", JSON.stringify(session));
  } catch (error) {
    app.innerHTML = `<p class="page-load-error">Unable to verify your session. Check that QuickAid is running.</p>`;
    return;
  }
  const isProfessional = session?.role === "professional";
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
  volunteerDispatchState.smartMatchActive = false;
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
    <div class="page dashboard-page">
      <main class="ops-dashboard">
        <header class="ops-header">
          <div>
            <div class="ops-title-row">
              <button class="ops-menu-button" type="button" data-open-ops-menu aria-label="Open dashboard navigation" aria-expanded="false">
                <span class="hamburger-lines" aria-hidden="true"></span>
              </button>
              <h1>AI-assisted national resource</h1>
            </div>
            <p>Real-time emergency overview</p>
          </div>
          <div class="ops-actions">
            <span class="ops-live">${icon("activity")} Live</span>
            <span class="updated-pill">Last Updated : 5:00 PM</span>
            <button class="secondary-button compact" data-signout>Sign Out</button>
          </div>
        </header>

        <div class="ops-menu-backdrop" data-ops-menu-backdrop hidden></div>
        <aside class="ops-navigation" data-ops-menu aria-hidden="true" aria-label="Dashboard navigation">
          <div class="ops-navigation-header">
            <div>
              <strong>QuickAid Operations</strong>
              <span>Professional workspace</span>
            </div>
            <button class="ops-menu-close" type="button" data-close-ops-menu aria-label="Close dashboard navigation">${icon("close")}</button>
          </div>
          <nav class="ops-navigation-links">
            <button class="active" type="button" data-dashboard-overview>${icon("activity")}<span><strong>Overview</strong><small>Live national resource dashboard</small></span></button>
            <a href="#/flood-map">${icon("mapPin")}<span><strong>Live Flood Map</strong><small>View active flood locations</small></span></a>
            <a href="#/evacuation-routing">${icon("arrowRight")}<span><strong>Evacuation Routing</strong><small>Plan routes around live blockages</small></span></a>
            <a href="#/risk-prediction">${icon("activity")}<span><strong>Risk Prediction</strong><small>Review live API and DB report risk scores</small></span></a>
            <button type="button" data-open-simulator>${icon("alert")}<span><strong>Incident Simulator</strong><small>Run predefined response scenarios</small></span></button>
            <button type="button" data-open-emergency-spaces>${icon("building")}<span><strong>Emergency Spaces</strong><small>Review overflow shelter capacity</small></span></button>
            <button type="button" data-open-volunteer-dispatch>${icon("users")}<span><strong>Volunteer Dispatch</strong><small>Match and deploy volunteers</small></span></button>
          </nav>
        </aside>

        <section class="ops-alert">
          ${icon("alert")}
          <strong>Critical flooding detected in Jurong West. National University Hospital occupancy is high. There is an accident at TPE, currently SCDF is there rescuing the victim.</strong>
        </section>

        <section class="ops-metrics" aria-label="Live emergency metrics">
          ${opsMetric({ id: "active-incidents", label: "Active Incidents", value: String(DEFAULT_DASHBOARD_STATS.activeIncidents), tone: "danger" })}
          ${opsMetric({ id: "risk-alert", label: "Risk Alert", value: DEFAULT_DASHBOARD_STATS.riskAlert, tone: "success" })}
          ${opsMetric({ id: "volunteers-standby", label: "Volunteers On Standby", value: String(DEFAULT_DASHBOARD_STATS.volunteersOnStandby), tone: "success" })}
          ${opsMetric({ id: "shelters-available", label: "Shelters Available", value: String(DEFAULT_DASHBOARD_STATS.sheltersAvailable), tone: "success" })}
        </section>

        <section class="ops-grid">
          <div class="ops-main-column">
            <section class="live-map-card">
              <h2>Singapore Live Map</h2>
              <div class="singapore-map-wrap">
                <div id="onemap-dashboard-map" class="onemap-dashboard-map">
                  <span>Loading OneMap...</span>
                </div>
                <ul class="flood-severity-legend dashboard-map-legend" aria-label="Flood severity legend">
                  ${SEVERITY_ORDER.map((level) => `<li><i style="background:${severityColor(level)}"></i>${level}</li>`).join("")}
                </ul>
                <ul class="dengue-severity-legend dashboard-map-legend" aria-label="Dengue cluster legend">
                  ${DENGUE_BUCKETS.map((bucket) => `<li><i style="background:${bucket.color}"></i>${bucket.label}</li>`).join("")}
                </ul>
              </div>
            </section>

            <section class="live-activity">
              <h2>Live Activity</h2>
              <ul data-live-activity-list>
                ${DEFAULT_LIVE_ACTIVITY.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </section>
          </div>

          <aside class="ops-side-column">
            <section class="ops-panel threat-panel">
              <h2>Risk Score</h2>
              <strong class="critical-value risk-level-indicator risk-level-low" data-risk-score-label>LOW</strong>
              <p data-risk-score-detail>No active simulation. Current dashboard is showing base demo conditions.</p>
            </section>
            <section class="ops-panel">
              <h2>Resource Impact</h2>
              <p data-resource-summary>${DEFAULT_RESOURCE_SUMMARY}</p>
            </section>
            <section class="ops-panel">
              <h2>Alerts</h2>
              <ul data-alert-list>
                ${DEFAULT_ALERTS.map((alert) => `<li>${alert}</li>`).join("")}
              </ul>
            </section>
            <section class="ops-panel route-panel">
              <h2>AI Briefing</h2>
              <p data-ai-briefing>${DEFAULT_SIMULATION_BRIEFING}</p>
            </section>
          </aside>
        </section>

        <footer class="connected-feeds">
          <strong>Connected Feeds:</strong>
          <span>SCDF | NEA | PUB | MOH | LTA</span>
        </footer>

        <section class="simulation-suite-section" data-simulation-section hidden>
          <div class="simulation-suite-header">
            <div>
              <p class="eyebrow">Scenario operations</p>
              <h2>Incident Simulator</h2>
              <p class="simulation-suite-note">Simulation mode: This demo uses predefined disaster scenarios to model demand across incidents, resources, volunteers, supplies, alerts, and risk scores.</p>
            </div>
          </div>
          <section class="incident-simulator-card">
            <h3>Scenario Controls</h3>
            <label class="simulation-field">
              Scenario
              <select data-scenario-select disabled>
                <option value="">Loading scenarios...</option>
              </select>
            </label>
            <div class="incident-simulator-preview" data-simulation-preview>
              <p class="simulation-empty">Load a scenario to preview its demand profile.</p>
            </div>
            <div class="incident-simulator-actions">
              <button class="secondary-button compact" type="button" data-run-simulation disabled>Run Simulation</button>
              <button class="secondary-button compact" type="button" data-reset-simulation disabled>Reset Simulation</button>
            </div>
          </section>
        </section>

        <section class="emergency-spaces-panel-section" data-emergency-spaces-section hidden>
          <section class="emergency-spaces-section">
            <div class="emergency-spaces-header">
              <div>
                <p class="eyebrow">Emergency resources</p>
                <h2>Emergency Conversion Spaces</h2>
                <p class="emergency-spaces-subtitle">Shelter demand is allocated automatically from the active incident scenario. Emergency spaces remain independent from hospital data.</p>
              </div>
            </div>
            <p class="emergency-spaces-message" data-emergency-spaces-message>Run a scenario to see how emergency overflow spaces are allocated.</p>
            <div class="emergency-spaces-grid" data-emergency-spaces-grid></div>
          </section>
        </section>

        <section class="volunteer-dispatch-section" data-volunteer-dispatch-section hidden>
          <div class="volunteer-dispatch-header">
            <div>
              <p class="eyebrow">Volunteer operations</p>
              <h2>Volunteer Dispatch Workflow</h2>
              <p class="volunteer-dispatch-note">Dispatch uses seed volunteer data and simulated notifications for now. Profile updates, assignments, and status changes happen instantly without Telegram or MongoDB persistence.</p>
            </div>
          </div>
          <div data-volunteer-dispatch-content></div>
        </section>

        ${!isProfessional ? `<p class="public-dashboard-note">Public view: operational actions are shown for transparency. Professional sign-in unlocks command actions.</p>` : ""}
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

  document.querySelector("[data-dashboard-overview]").addEventListener("click", () => {
    closeOpsMenu();
    document.querySelector(".ops-alert").scrollIntoView({ behavior: "smooth" });
  });

  document.querySelector("[data-signout]").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("quickaid-session");
    window.location.hash = "#/";
  });

  document.querySelector("[data-open-simulator]").addEventListener("click", () => {
    closeOpsMenu();
    showIncidentSimulatorSection();
  });
  document.querySelector("[data-open-emergency-spaces]").addEventListener("click", () => {
    closeOpsMenu();
    showEmergencySpacesSection();
  });
  document.querySelector("[data-open-volunteer-dispatch]").addEventListener("click", () => {
    closeOpsMenu();
    showVolunteerDispatchSection(session);
  });
  document.querySelector("[data-scenario-select]").addEventListener("change", (event) => {
    simulationState.selectedScenarioId = event.currentTarget.value;
    renderIncidentSimulator();
  });
  document.querySelector("[data-run-simulation]").addEventListener("click", () => {
    runSimulation(simulationState.selectedScenarioId);
  });
  document.querySelector("[data-reset-simulation]").addEventListener("click", resetSimulation);

  initOneMapDashboard();
  renderQuickStats();
  renderSimulationInsights();
}

function formatAuthError(result, fallback) {
  if (result.fields) {
    return Object.values(result.fields).join(" ");
  }
  return result.error || fallback;
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
  if (space.currentOccupancy === 0) return "INACTIVE";
  if (space.currentOccupancy >= space.capacity) return "FULL";
  if (space.currentOccupancy >= space.capacity * 0.7) return "NEARLY FULL";
  return "READY";
}

function decorateEmergencySpace(space) {
  const currentOccupancy = Math.max(0, Math.min(space.capacity, Number(space.currentOccupancy) || 0));
  return {
    ...space,
    currentOccupancy,
    availableCapacity: Math.max(space.capacity - currentOccupancy, 0),
    status: calculateEmergencySpaceStatus({
      ...space,
      currentOccupancy
    })
  };
}

function emergencySpaceBadgeClass(status) {
  if (status === "INACTIVE") return "is-inactive";
  if (status === "FULL") return "is-full";
  if (status === "NEARLY FULL") return "is-nearly-full";
  return "is-ready";
}

function emergencySpaceCard(space) {
  return `
    <article class="emergency-space-card">
      <div class="emergency-space-card-head">
        <div>
          <h3>${space.name}</h3>
          <p>${space.type}</p>
        </div>
        <span class="emergency-space-badge ${emergencySpaceBadgeClass(space.status)}">${space.status}</span>
      </div>
      <dl class="emergency-space-stats">
        <div><dt>Region</dt><dd>${space.region}</dd></div>
        <div><dt>Current Status</dt><dd>${space.status}</dd></div>
        <div><dt>Capacity</dt><dd>${space.capacity}</dd></div>
        <div><dt>Current Occupancy</dt><dd>${space.currentOccupancy}</dd></div>
        <div><dt>Available Capacity</dt><dd>${space.availableCapacity}</dd></div>
        <div><dt>Setup Time</dt><dd>${space.setupTimeHours} hours</dd></div>
        <div><dt>Wheelchair Access</dt><dd>${space.wheelchairAccess ? "Yes" : "No"}</dd></div>
      </dl>
    </article>
  `;
}

function renderEmergencySpaces() {
  const grid = document.querySelector("[data-emergency-spaces-grid]");
  const message = document.querySelector("[data-emergency-spaces-message]");
  if (!grid || !message) return;

  if (!emergencySpacesState.length) {
    message.textContent = "Emergency space seed data is unavailable.";
    grid.innerHTML = "";
    return;
  }

  message.textContent = simulationState.activeScenario
    ? `Shelter demand from ${simulationState.activeScenario.name} has been allocated automatically across emergency spaces.`
    : "Run a scenario to see how emergency overflow spaces are allocated.";
  grid.innerHTML = emergencySpacesState.map(emergencySpaceCard).join("");
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

async function showIncidentSimulatorSection() {
  const section = document.querySelector("[data-simulation-section]");
  if (!section) return;
  section.hidden = false;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!emergencySpacesLoaded) {
    await Promise.all([fetchEmergencySpaces(), fetchSimulationScenarios()]);
    return;
  }
  renderIncidentSimulator();
}

async function showEmergencySpacesSection() {
  const section = document.querySelector("[data-emergency-spaces-section]");
  if (!section) return;
  section.hidden = false;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!emergencySpacesLoaded) {
    await fetchEmergencySpaces();
    return;
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
}

function currentVolunteerSessionProfile(session) {
  return volunteerDispatchState.volunteers.find((volunteer) => volunteer.email === session?.email) || null;
}

function volunteerStatusBadge(status) {
  return `<span class="volunteer-status-badge is-${status.toLowerCase().replace(/\s+/g, "-")}">${status}</span>`;
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
  if (skill) {
    const needle = skill.toLowerCase();
    volunteers = volunteers.filter((volunteer) => volunteer.skills.some((item) => item.toLowerCase().includes(needle)));
  }
  if (zone) volunteers = volunteers.filter((volunteer) => volunteer.zone === zone);
  if (availability) volunteers = volunteers.filter((volunteer) => volunteer.availability === availability);
  if (status) volunteers = volunteers.filter((volunteer) => volunteer.status === status);
  if (volunteerDispatchState.smartMatchActive) {
    const scenario = simulationScenarios.find((item) => item.id === volunteerDispatchState.selectedIncidentId);
    volunteerDispatchState.smartMatchScores = new Map();
    if (scenario) {
      volunteers.forEach((volunteer) => {
        volunteerDispatchState.smartMatchScores.set(volunteer.id, volunteerMatchScore(volunteer, scenario));
      });
    }
  }
  if (volunteerDispatchState.smartMatchActive && volunteerDispatchState.smartMatchScores.size) {
    volunteers.sort((a, b) => (volunteerDispatchState.smartMatchScores.get(b.id)?.score || -999) - (volunteerDispatchState.smartMatchScores.get(a.id)?.score || -999));
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

async function respondToDeployment(id, action) {
  const response = await fetch(`/api/volunteers/${id}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: action })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to respond to deployment.");
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

function volunteerZoneOptions(selected = "") {
  return `<option value="">All zones</option>${DISPATCH_ZONES.map((zone) => `<option value="${zone}"${zone === selected ? " selected" : ""}>${zone}</option>`).join("")}`;
}

function professionalDispatchCard(volunteer) {
  const score = volunteerDispatchState.smartMatchScores.get(volunteer.id);
  const incidentSelected = Boolean(volunteerDispatchState.selectedIncidentId);
  const canDeploy = incidentSelected && volunteer.availability === "Available" && volunteer.status === "Available";
  return `
    <article class="dispatch-volunteer-card">
      <div class="dispatch-volunteer-top">
        <div>
          <h3>${volunteer.name}</h3>
          <p>${volunteer.zone} · ${volunteer.currentLocationLabel}</p>
        </div>
        <div class="dispatch-volunteer-badges">
          ${volunteerStatusBadge(volunteer.availability)}
          ${volunteerStatusBadge(volunteer.status)}
        </div>
      </div>
      <p class="dispatch-volunteer-skills"><strong>Skills:</strong> ${volunteer.skills.length ? volunteer.skills.join(", ") : "General support"}</p>
      ${score ? `<p class="dispatch-volunteer-match"><strong>Smart Match:</strong> ${score.score} pts · ${score.skillMatches} skill matches · ${score.distanceKm} km away</p>` : ""}
      ${volunteer.assignedIncidentName ? `<div class="dispatch-assignment-box"><strong>Assigned:</strong> ${volunteer.assignedIncidentName}<br /><span>${volunteer.assignedTask || "Task pending"}</span></div>` : ""}
      ${volunteer.notificationMessage ? `<p class="dispatch-notification">${volunteer.notificationMessage}</p>` : ""}
      <div class="dispatch-volunteer-actions">
        <button class="secondary-button compact" type="button" data-deploy-volunteer="${volunteer.id}"${canDeploy ? "" : " disabled"}>Deploy</button>
        <select data-professional-status-select="${volunteer.id}">
          ${VOLUNTEER_STATUSES.map((status) => `<option value="${status}"${status === volunteer.status ? " selected" : ""}>${status}</option>`).join("")}
        </select>
        <button class="secondary-button compact" type="button" data-update-volunteer-status="${volunteer.id}">Update Status</button>
      </div>
    </article>
  `;
}

function renderProfessionalVolunteerDispatch() {
  const incidentOptions = simulationScenarios.length
    ? simulationScenarios.map((scenario) => `<option value="${scenario.id}"${scenario.id === volunteerDispatchState.selectedIncidentId ? " selected" : ""}>${scenario.name}</option>`).join("")
    : `<option value="">No incidents loaded</option>`;
  const volunteers = filteredVolunteers();
  return `
    <section class="volunteer-dispatch-panel">
      <div class="dispatch-toolbar">
        <div class="dispatch-toolbar-grid">
          <label>Active incident
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
              ${VOLUNTEER_AVAILABILITY.map((value) => `<option value="${value}"${value === volunteerDispatchState.filters.availability ? " selected" : ""}>${value}</option>`).join("")}
            </select>
          </label>
          <label>Status
            <select data-filter-status>
              <option value="">All</option>
              ${VOLUNTEER_STATUSES.map((value) => `<option value="${value}"${value === volunteerDispatchState.filters.status ? " selected" : ""}>${value}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="dispatch-toolbar-actions">
          <button class="secondary-button compact" type="button" data-smart-match${volunteerDispatchState.selectedIncidentId ? "" : " disabled"}>Smart Match</button>
          <button class="secondary-button compact" type="button" data-reset-volunteer-filters>Reset Filters</button>
        </div>
      </div>
      <p class="dispatch-panel-note">Smart Match ranks volunteers by current availability, scenario skill fit, and zone-based distance.</p>
      <div class="dispatch-volunteer-grid">
        ${volunteers.length ? volunteers.map(professionalDispatchCard).join("") : `<p class="dispatch-empty">No volunteers match the current filters.</p>`}
      </div>
    </section>
  `;
}

function publicVolunteerProfileForm(session, volunteer) {
  const isExisting = Boolean(volunteer);
  const availability = volunteer?.availability || "Available";
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
              <input name="currentLocationLabel" type="text" value="${escapeHtml(volunteer?.currentLocationLabel || "")}" placeholder="Community club or landmark" required />
            </label>
            <label class="dispatch-form-span">Skills
              <input name="skills" type="text" value="${escapeHtml((volunteer?.skills || []).join(", "))}" placeholder="First aid, driving, translation" />
            </label>
          </div>
          <div class="dispatch-form-row">
            <label>Availability
              <select name="availability">
                ${VOLUNTEER_AVAILABILITY.map((value) => `<option value="${value}"${value === availability ? " selected" : ""}>${value}</option>`).join("")}
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
  const task = volunteer.assignedIncidentName
    ? `
      <div class="dispatch-assignment-box">
        <strong>${volunteer.assignedIncidentName}</strong>
        <p>${volunteer.assignedTask || "Task pending assignment details."}</p>
        <p><strong>Status:</strong> ${volunteer.status}</p>
        ${volunteer.notificationMessage ? `<p class="dispatch-notification">${volunteer.notificationMessage}</p>` : ""}
      </div>
    `
    : `<p class="dispatch-empty">No active deployment. Coordinators will assign tasks here when needed.</p>`;
  return `${task}${publicVolunteerAssignmentActions(volunteer)}`;
}

function publicVolunteerAssignmentActions(volunteer) {
  if (!volunteer.assignedIncidentId) return "";
  if (volunteer.deploymentResponsePending) {
    return `
      <div class="dispatch-inline-actions">
        <button class="secondary-button compact" type="button" data-volunteer-respond="accept" data-volunteer-id="${volunteer.id}">Accept Deployment</button>
        <button class="secondary-button compact" type="button" data-volunteer-respond="reject" data-volunteer-id="${volunteer.id}">Reject Deployment</button>
      </div>
    `;
  }
  if (volunteer.status === "Assigned") return `<button class="secondary-button compact" type="button" data-volunteer-progress="En Route" data-volunteer-id="${volunteer.id}">Mark En Route</button>`;
  if (volunteer.status === "En Route") return `<button class="secondary-button compact" type="button" data-volunteer-progress="On Site" data-volunteer-id="${volunteer.id}">Mark Arrived / On Site</button>`;
  if (volunteer.status === "On Site") return `<button class="secondary-button compact" type="button" data-volunteer-progress="Completed" data-volunteer-id="${volunteer.id}">Mark Completed</button>`;
  if (volunteer.status === "Completed") return `<button class="secondary-button compact" type="button" data-volunteer-progress="Available" data-volunteer-id="${volunteer.id}">Set Available Again</button>`;
  return "";
}

function bindProfessionalVolunteerDispatch() {
  document.querySelector("[data-dispatch-incident-select]")?.addEventListener("change", (event) => {
    volunteerDispatchState.selectedIncidentId = event.currentTarget.value;
    volunteerDispatchState.smartMatchActive = false;
    volunteerDispatchState.smartMatchScores = new Map();
    renderVolunteerDispatchSection(JSON.parse(localStorage.getItem("quickaid-session") || "null"));
  });
  document.querySelector("[data-filter-skill]")?.addEventListener("input", (event) => {
    volunteerDispatchState.filters.skill = event.currentTarget.value.trim();
    renderVolunteerDispatchSection(JSON.parse(localStorage.getItem("quickaid-session") || "null"));
  });
  ["zone", "availability", "status"].forEach((filterName) => {
    document.querySelector(`[data-filter-${filterName}]`)?.addEventListener("change", (event) => {
      volunteerDispatchState.filters[filterName] = event.currentTarget.value;
      renderVolunteerDispatchSection(JSON.parse(localStorage.getItem("quickaid-session") || "null"));
    });
  });
  document.querySelector("[data-smart-match]")?.addEventListener("click", () => {
    const scenario = simulationScenarios.find((item) => item.id === volunteerDispatchState.selectedIncidentId);
    volunteerDispatchState.smartMatchScores = new Map();
    if (scenario) {
      volunteerDispatchState.volunteers.forEach((volunteer) => {
        volunteerDispatchState.smartMatchScores.set(volunteer.id, volunteerMatchScore(volunteer, scenario));
      });
      volunteerDispatchState.smartMatchActive = true;
    }
    renderVolunteerDispatchSection(JSON.parse(localStorage.getItem("quickaid-session") || "null"));
  });
  document.querySelector("[data-reset-volunteer-filters]")?.addEventListener("click", () => {
    volunteerDispatchState.filters = { skill: "", zone: "", availability: "", status: "" };
    volunteerDispatchState.smartMatchActive = false;
    volunteerDispatchState.smartMatchScores = new Map();
    renderVolunteerDispatchSection(JSON.parse(localStorage.getItem("quickaid-session") || "null"));
  });
  document.querySelectorAll("[data-deploy-volunteer]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await deployVolunteerToIncident(Number(button.dataset.deployVolunteer), volunteerDispatchState.selectedIncidentId);
        renderVolunteerDispatchSection(JSON.parse(localStorage.getItem("quickaid-session") || "null"));
      } catch (error) {
        const content = document.querySelector("[data-volunteer-dispatch-content]");
        if (content) content.prepend(Object.assign(document.createElement("p"), { className: "dispatch-banner error", textContent: error.message }));
      }
    });
  });
  document.querySelectorAll("[data-update-volunteer-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const volunteerId = Number(button.dataset.updateVolunteerStatus);
      const select = document.querySelector(`[data-professional-status-select="${volunteerId}"]`);
      if (!select) return;
      try {
        await updateVolunteerWorkflowStatus(volunteerId, select.value);
        renderVolunteerDispatchSection(JSON.parse(localStorage.getItem("quickaid-session") || "null"));
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

  document.querySelectorAll("[data-volunteer-respond]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await respondToDeployment(Number(button.dataset.volunteerId), button.dataset.volunteerRespond);
        renderVolunteerDispatchSection(session);
      } catch (error) {
        const status = document.querySelector(".dispatch-status-message");
        if (status) {
          status.textContent = error.message;
          status.classList.add("error");
        }
      }
    });
  });

  document.querySelectorAll("[data-volunteer-progress]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await updateVolunteerWorkflowStatus(Number(button.dataset.volunteerId), button.dataset.volunteerProgress);
        renderVolunteerDispatchSection(session);
      } catch (error) {
        const status = document.querySelector(".dispatch-status-message");
        if (status) {
          status.textContent = error.message;
          status.classList.add("error");
        }
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
  if (!volunteerDispatchState.selectedIncidentId && simulationScenarios.length) {
    volunteerDispatchState.selectedIncidentId = simulationScenarios[0].id;
  }
  renderVolunteerDispatchSection(session);
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

function severityColor(severity) {
  return SEVERITY_COLORS[severity] || "#5e655f";
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

  try {
    mapEl.innerHTML = "";

    const map = L.map("onemap-dashboard-map", { scrollWheelZoom: true }).setView([1.3521, 103.8198], 12);
    addOneMapTileLayer(map);

    const floodLayer = L.layerGroup().addTo(map);
    const dengueLayer = L.layerGroup().addTo(map);

    const [floodResponse, dengueResponse] = await Promise.all([
      fetch("/api/flood-alerts"),
      fetch("/api/dengue-clusters")
    ]);
    const floodPayload = await floodResponse.json();
    const denguePayload = await dengueResponse.json();
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

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
    }

    window.setTimeout(() => map.invalidateSize(), 100);
    window.addEventListener("resize", () => map.invalidateSize());
  } catch (error) {
    mapEl.innerHTML = `<span>${error.message || "Unable to load OneMap. Check internet connection."}</span>`;
  }
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
  app.innerHTML = `
    <div class="page flood-map-page">
      ${header({ backHref: "#/dashboard" })}
      <main class="flood-map-shell">
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
            <h2>Active Alerts</h2>
            <div class="flood-alert-list" data-alert-list><p class="map-empty">Loading…</p></div>
            <h2>Active Dengue Clusters</h2>
            <div class="flood-alert-list" data-dengue-list><p class="map-empty">Loading…</p></div>
          </aside>
        </div>
      </main>
    </div>
  `;

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

      updatedLabel.textContent = `Last updated ${formatDateTime(payload.fetchedAt)} · ${entries.length} active alert${entries.length === 1 ? "" : "s"}`;
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
  return type === "flood" ? "#0f766e" : "#c53d32";
}

function blockagePopup({ type, label }) {
  return `
    <div class="flood-popup">
      <span class="severity-pill" style="background:${blockageColor(type)}">${type === "flood" ? "Flood" : "Traffic Incident"}</span>
      <p>${label || "Blocked area"}</p>
    </div>
  `;
}

function evacuationRouteSummary({ baseline, rerouted, demo }) {
  const baseSummary = baseline?.features?.[0]?.properties?.summary;
  const reroutedSummary = rerouted?.features?.[0]?.properties?.summary;
  if (!baseSummary || !reroutedSummary) return "";

  const fmt = (summary) =>
    `${(summary.distance / 1000).toFixed(1)} km · ${Math.round(summary.duration / 60)} min`;

  return `
    <article class="flood-alert-card evac-summary-card">
      <div>
        <strong>Normal route</strong>
        <p>${fmt(baseSummary)}</p>
      </div>
    </article>
    <article class="flood-alert-card evac-summary-card">
      <div>
        <strong>Re-routed (avoiding blockages)</strong>
        <p>${fmt(reroutedSummary)}</p>
      </div>
    </article>
    ${demo ? `<p class="map-empty">Showing demo route data.</p>` : ""}
  `;
}

async function renderEvacuationRouting() {
  app.innerHTML = `
    <div class="page flood-map-page">
      ${header({ backHref: "#/dashboard" })}
      <main class="flood-map-shell">
        <section class="dashboard-title">
          <div>
            <p class="eyebrow">OneMap basemap · openrouteservice · live traffic & flood blockages</p>
            <h1>Dynamic Evacuation Routing</h1>
          </div>
          <p class="map-updated" data-evac-updated>Click the map to set a start point, then a destination.</p>
        </section>
        <div class="flood-map-layout">
          <div class="flood-map-canvas">
            <div id="evacuation-map" aria-label="Map for planning an evacuation route around current blockages"></div>
            <div class="map-layer-toggle evac-controls" aria-label="Routing controls">
              <label><input type="checkbox" data-evac-demo /> Demo mode</label>
              <button type="button" class="secondary-button compact" data-evac-calculate>Calculate Route</button>
              <button type="button" class="secondary-button compact" data-evac-clear>Clear</button>
            </div>
            <ul class="dengue-severity-legend evac-legend" aria-label="Evacuation route legend">
              <li><i style="background:#1d4ed8"></i>Normal route</li>
              <li><i style="background:#c53d32"></i>Re-routed</li>
              <li><i style="background:#0f766e"></i>Blocked area</li>
            </ul>
          </div>
          <aside class="flood-alert-rail" aria-label="Route summary and blockages">
            <h2>Route Summary</h2>
            <div class="flood-alert-list" data-evac-summary><p class="map-empty">Set a start and destination on the map, then press Calculate Route.</p></div>
            <h2>Active Blockages</h2>
            <div class="flood-alert-list" data-evac-blockages><p class="map-empty">Loading…</p></div>
          </aside>
        </div>
      </main>
    </div>
  `;

  const map = L.map("evacuation-map", { scrollWheelZoom: true }).setView([1.3521, 103.8198], 12);
  L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
    detectRetina: true,
    maxZoom: 19,
    minZoom: 11,
    attribution: "OneMap | Map data &copy; contributors, <a href=\"https://www.sla.gov.sg/\">Singapore Land Authority</a>"
  }).addTo(map);

  const blockageLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const markerLayer = L.layerGroup().addTo(map);

  const evac = {
    start: null,
    end: null,
    blockages: null
  };

  const updatedLabel = document.querySelector("[data-evac-updated]");
  const summaryEl = document.querySelector("[data-evac-summary]");
  const blockagesEl = document.querySelector("[data-evac-blockages]");
  const demoToggle = document.querySelector("[data-evac-demo]");

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
    return marker;
  }

  map.on("click", (event) => {
    if (!evac.start || (evac.start && evac.end)) {
      markerLayer.clearLayers();
      routeLayer.clearLayers();
      summaryEl.innerHTML = `<p class="map-empty">Set a start and destination on the map, then press Calculate Route.</p>`;
      evac.start = { lat: event.latlng.lat, lng: event.latlng.lng };
      evac.end = null;
      placeMarker(event.latlng, "start");
      updatedLabel.textContent = "Start point set. Click the map again to set a destination.";
      return;
    }

    evac.end = { lat: event.latlng.lat, lng: event.latlng.lng };
    placeMarker(event.latlng, "end");
    updatedLabel.textContent = "Start and destination set. Press Calculate Route.";
  });

  document.querySelector("[data-evac-clear]").addEventListener("click", () => {
    evac.start = null;
    evac.end = null;
    markerLayer.clearLayers();
    routeLayer.clearLayers();
    summaryEl.innerHTML = `<p class="map-empty">Set a start and destination on the map, then press Calculate Route.</p>`;
    updatedLabel.textContent = "Click the map to set a start point, then a destination.";
  });

  async function refreshBlockages() {
    try {
      const demo = demoToggle.checked;
      const response = await fetch(`/api/evacuation/blockages?demo=${demo}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load blockage data.");

      evac.blockages = payload;
      blockageLayer.clearLayers();
      (payload.points || []).forEach((point) => {
        L.circle([point.lat, point.lng], {
          radius: 250,
          color: blockageColor(point.type),
          weight: 1.5,
          fillColor: blockageColor(point.type),
          fillOpacity: 0.25
        })
          .bindPopup(blockagePopup(point))
          .addTo(blockageLayer);
      });

      blockagesEl.innerHTML = payload.points?.length
        ? payload.points
            .map(
              (point) => `
                <article class="flood-alert-card">
                  <span class="severity-pill" style="background:${blockageColor(point.type)}">${point.type === "flood" ? "Flood" : "Incident"}</span>
                  <div>
                    <strong>${point.type === "flood" ? "Flood alert" : "Traffic incident"}</strong>
                    <p>${point.label || ""}</p>
                  </div>
                </article>
              `
            )
            .join("")
        : `<p class="map-empty">No active blockages reported right now.</p>`;
    } catch (error) {
      blockagesEl.innerHTML = `<p class="map-empty error">${error.message}</p>`;
    }
  }

  async function calculateRoute() {
    if (!evac.start || !evac.end) {
      updatedLabel.textContent = "Set a start and destination on the map first.";
      return;
    }

    summaryEl.innerHTML = `<p class="map-empty">Calculating route…</p>`;

    try {
      const response = await fetch("/api/evacuation/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: evac.start, end: evac.end, demo: demoToggle.checked })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to compute a route.");

      evac.blockages = payload.blockages;
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
      summaryEl.innerHTML = `<p class="map-empty error">${error.message}</p>`;
    }
  }

  document.querySelector("[data-evac-calculate]").addEventListener("click", calculateRoute);
  demoToggle.addEventListener("change", () => {
    refreshBlockages();
    if (evac.start && evac.end) calculateRoute();
  });

  await refreshBlockages();
  evacuationMapTimer = window.setInterval(async () => {
    await refreshBlockages();
    if (evac.start && evac.end) await calculateRoute();
  }, EVACUATION_POLL_MS);
}

async function renderRiskPrediction() {
  app.innerHTML = `
    <div class="page risk-page">
      ${header({ backHref: "#/dashboard" })}
      <main class="risk-shell">
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
          <div class="risk-filter-panel">
            <input class="risk-filter-search" placeholder="Select Filters..." readonly aria-label="Filter selector hint" />
            <div class="risk-checkbox-grid">
              <fieldset class="risk-filter-group">
                <legend>Risk Type</legend>
                <label><input type="checkbox" name="riskType" value="Flood" checked /> Flood</label>
                <label><input type="checkbox" name="riskType" value="Disease" /> Disease</label>
                <label><input type="checkbox" name="riskType" value="Fire" /> Fire</label>
              </fieldset>
              <fieldset class="risk-filter-group">
                <legend>Region</legend>
                <label><input type="checkbox" name="region" value="Jurong" checked /> Jurong</label>
                <label><input type="checkbox" name="region" value="Tampines" /> Tampines</label>
                <label><input type="checkbox" name="region" value="Central" /> Central</label>
              </fieldset>
              <fieldset class="risk-filter-group">
                <legend>Severity</legend>
                <label><input type="checkbox" name="severity" value="Critical" /> Critical</label>
                <label><input type="checkbox" name="severity" value="High" checked /> High</label>
                <label><input type="checkbox" name="severity" value="Medium" /> Medium</label>
              </fieldset>
              <fieldset class="risk-filter-group">
                <legend>Time Prediction</legend>
                <label><input type="checkbox" name="window" value="1" /> Next 1 hour</label>
                <label><input type="checkbox" name="window" value="6" checked /> Next 6 hours</label>
                <label><input type="checkbox" name="window" value="24" /> Next 24 hours</label>
              </fieldset>
            </div>
            <button id="filter-apply" class="secondary-button compact" style="margin-top:10px">Apply Filters</button>
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
      </main>
    </div>
  `;

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

    // Apply filter button
    document.getElementById('filter-apply').addEventListener('click', async () => {
      const region = [...document.querySelectorAll('input[name="region"]:checked')].map(cb => cb.value)[0] || 'all';
      const wnd = [...document.querySelectorAll('input[name="window"]:checked')].map(cb => cb.value)[0] || '4';
      const sev = [...document.querySelectorAll('input[name="severity"]:checked')].map(cb => cb.value)[0] || 'all';
      const newPayload = await loadHeatmap({ region, window: wnd }, currentSource);
      layer.clearLayers();
      (newPayload.features || []).forEach((ff) => {
        const [lng2, lat2] = ff.geometry.coordinates;
        const color2 = ff.properties.severity === 'Critical' ? '#a92525' : ff.properties.severity === 'High' ? '#c53d32' : '#c47a1b';
        const m2 = L.circle([lat2, lng2], { radius: 400, color: color2, fillColor: color2, fillOpacity: 0.25 }).addTo(layer);
        m2.on('click', async () => {
          const panel = document.getElementById('ai-prediction');
          if (currentSource === 'db') {
            const displayName = getZoneDisplayName(ff);
            const zoneId = getZoneIdentifier(ff);
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
              const pResp2 = await fetch(selectEndpoint(currentSource, 'predict'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone: zoneId, hours: wnd }) });
              const p2 = await pResp2.json();
              const aiSection = panel.querySelector('.ai-section');
              if (aiSection) {
                aiSection.innerHTML = `
                  <h4>AI Predictions</h4>
                  <p><strong>Severity:</strong> ${p2.severity} · <strong>Confidence:</strong> ${Math.round((p2.confidence||0)*100)}%</p>
                  <p><strong>Time to impact:</strong> ${p2.timeToImpact}</p>
                  <h5>Recommendations</h5>
                  <ul>${(p2.recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
                  <h5>Why</h5>
                  <p class="ai-explanation">${p2.explanation || ''}</p>
                `;
              }
            } catch (e) {
              const aiSection = panel.querySelector('.ai-section');
              if (aiSection) aiSection.textContent = 'Prediction failed.';
            }
          } else {
            const displayName = getZoneDisplayName(ff);
            panel.innerHTML = `<p>Loading prediction for <strong>${displayName}</strong>…</p>`;
            try {
              const pResp2 = await fetch(selectEndpoint(currentSource, 'predict'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone: displayName, hours: wnd }) });
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
          }
        });
      });
    });
  } catch (error) {
    const el = document.getElementById('risk-map');
    if (el) el.innerHTML = '<span>Unable to load map.</span>';
  }
}

async function renderAnalytics() {
  app.innerHTML = `
    <div class="page analytics-page">
      ${header({ backHref: "#/dashboard" })}
      <main class="analytics-shell">
        <section class="analytics-header">
          <p class="eyebrow">Analytics & Insights</p>
          <h1>Strategic Analytics &amp; Insights</h1>
        </section>

        <section class="analytics-summary">
          <div class="analytics-summary-grid">
            <article class="metric-card">
              <span>Total Incidents</span>
              <strong id="stat-incidents">—</strong>
            </article>
            <article class="metric-card">
              <span>Avg. Response Time</span>
              <strong id="stat-response">—</strong>
            </article>
            <article class="metric-card">
              <span>High Risk Zones</span>
              <strong id="stat-zones">—</strong>
            </article>
            <article class="metric-card">
              <span>Shelter Utilisation</span>
              <strong id="stat-shelter">—</strong>
            </article>
          </div>
        </section>

        <section class="analytics-charts">
          <div class="analytics-charts-grid">
            <div class="analytics-chart-card">
              <p>Flood Incidents</p>
              <canvas id="chart-flood" height="180"></canvas>
            </div>
            <div class="analytics-chart-card">
              <p>Fire Incidents</p>
              <canvas id="chart-fire" height="180"></canvas>
            </div>
          </div>
        </section>

        <section class="analytics-shelters">
          <div class="analytics-section-head">
            <h2>Shelter Utilisation</h2>
            <p class="muted">Generated 5 mins ago</p>
          </div>
          <div class="analytics-shelter-grid">
            <article class="analytics-shelter-card"><span>NUHS</span><strong>90%</strong></article>
            <article class="analytics-shelter-card"><span>NHG</span><strong>82%</strong></article>
            <article class="analytics-shelter-card"><span>SH</span><strong>90%</strong></article>
            <article class="analytics-shelter-card"><span>Schools</span><strong>90%</strong></article>
            <article class="analytics-shelter-card"><span>Facilities</span><strong>90%</strong></article>
            <article class="analytics-shelter-card"><span>Others</span><strong>90%</strong></article>
          </div>
        </section>

        <section class="analytics-insights">
          <h2>AI Strategic Insights Panel</h2>
          <div id="insights-grid" class="analytics-insights-grid"></div>
        </section>
      </main>
    </div>
  `;

  try {
    await loadScript('https://cdn.jsdelivr.net/npm/chart.js');

    const [sResp, tResp, iResp] = await Promise.all([
      fetch('/api/analytics/summary'),
      fetch('/api/analytics/trends'),
      fetch('/api/analytics/insights')
    ]);

    const stats = await sResp.json();
    document.getElementById('stat-incidents').textContent = stats.totalIncidents;
    document.getElementById('stat-response').textContent = stats.avgResponseMins + ' mins';
    document.getElementById('stat-zones').textContent = stats.highRiskZones;
    document.getElementById('stat-shelter').textContent = stats.shelterUtilisation + '%';

    const tPayload = await tResp.json();
    const labels = (tPayload.series || []).map(s => s.date);
    const floodData = (tPayload.series || []).map(s => s.count);
    new Chart(document.getElementById('chart-flood').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Flood Incidents',
          data: floodData,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15,118,110,0.08)',
          tension: 0.3,
          fill: true
        }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const fireData = labels.map((_, i) => Math.max(0, Math.round(2 + Math.sin(i * 0.8) * 2)));
    new Chart(document.getElementById('chart-fire').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Fire Incidents',
          data: fireData,
          borderColor: '#c53d32',
          backgroundColor: 'rgba(197,61,50,0.08)',
          tension: 0.3,
          fill: true
        }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const iPayload = await iResp.json();
    const grid = document.getElementById('insights-grid');
    grid.innerHTML = (iPayload.insights || []).map(ins => {
      const lvl = ins.riskLevel;
      const riskClass = lvl === 'CRITICAL' ? 'risk-critical' : lvl === 'HIGH' ? 'risk-high' : 'risk-medium';
      return `
        <article class="analytics-insight-card ${riskClass}">
          <div class="analytics-insight-header">
            <h3>${ins.title}</h3>
            <span class="analytics-risk-badge analytics-risk-badge--${lvl.toLowerCase()}">${lvl}</span>
          </div>
          <h4 class="eyebrow" style="margin-top:12px">AI Recommendations</h4>
          <ul>${ins.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
        </article>
      `;
    }).join('');

  } catch (error) {
    const el = document.querySelector('.analytics-shell');
    if (el) el.insertAdjacentHTML('beforeend', '<p class="muted">Unable to load analytics data.</p>');
  }
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
  const renderer = routes[window.location.hash] || renderLanding;
  renderer();
}

window.addEventListener("hashchange", renderRoute);
renderRoute();
