const app = document.querySelector("#app");

const routes = {
  "": renderLanding,
  "#/": renderLanding,
  "#/login": renderRoleSelection,
  "#/login/professional": renderProfessionalLogin,
  "#/login/public": renderPublicLogin,
  "#/dashboard": renderDashboard,
  "#/flood-map": renderFloodMap,
  "#/risk-prediction": renderRiskPrediction,
  "#/analytics": renderAnalytics
};

const capabilities = [
  ["Incident Tracking", "Real-time crisis monitoring across Singapore"],
  ["Volunteer Coordination", "AI-powered responder matching and deployment"],
  ["AI Crisis Prediction", "Predict cascading infrastructure risk"],
  ["Dynamic Evacuation Routing", "Smart rerouting during emergencies"]
];

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
          <a class="nav-live-link" href="#/dashboard"><span></span> Live Dashboard</a>
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
              <a class="primary-button status-button" href="#/dashboard">${icon("activity")} Live emergency status ${icon("arrowRight")}</a>
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

        <section class="contact-band" id="contact">
          <div>
            <p class="eyebrow">Coordination desk</p>
            <h2>Connect agencies, responders, and volunteers in one shared view.</h2>
          </div>
          <div class="contact-action">
            <a class="access-button" href="#/login">
              Choose your role
              ${icon("arrowRight")}
            </a>
            <span>Professional or public access</span>
          </div>
        </section>
      </main>
    </div>
  `;
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
            <div class="login-action-row">
              <button class="code-button" type="button" data-connect-telegram>Connect Telegram</button>
              <button class="code-button" type="button" data-request-code>Send 6-digit code</button>
            </div>
            <label>Verification<input name="verification" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="Enter 6-digit code" required /></label>
            <p class="note">${icon("info")} Professional accounts require approval before activation. Contact your agency administrator for access.</p>
            <button class="form-button" type="submit">Sign In</button>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;
  bindLoginForm();
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
            <p class="signup-line">Don't have an account? <a href="#/login/public">Sign up</a></p>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;
  bindLoginForm();
}

function bindLoginForm() {
  const form = document.querySelector(".login-form");
  const google = document.querySelector("[data-google]");
  const requestCode = document.querySelector("[data-request-code]");
  const connectTelegram = document.querySelector("[data-connect-telegram]");

  if (google) {
    google.addEventListener("click", () => {
      submitLogin("public", { provider: "google" });
    });
  }

  if (requestCode) {
    requestCode.addEventListener("click", () => {
      const data = Object.fromEntries(new FormData(form).entries());
      requestProfessionalCode(data);
    });
  }

  if (connectTelegram) {
    connectTelegram.addEventListener("click", () => {
      const data = Object.fromEntries(new FormData(form).entries());
      connectProfessionalTelegram(data);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const role = form.dataset.role;
    const data = Object.fromEntries(new FormData(form).entries());
    submitLogin(role, data);
  });
}

async function connectProfessionalTelegram(payload) {
  const status = document.querySelector(".form-status");
  const button = document.querySelector("[data-connect-telegram]");
  status.textContent = "Preparing Telegram connection...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/telegram/link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password
      })
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to connect Telegram.");
      status.classList.add("error");
      return;
    }
    if (!result.connectUrl) {
      status.textContent = "Telegram bot username is missing. Add TELEGRAM_BOT_USERNAME to .env.";
      status.classList.add("error");
      return;
    }
    status.textContent = "Opening Telegram. Tap Start in the bot to finish linking.";
    status.classList.add("success");
    window.open(result.connectUrl, "_blank", "noopener");
  } catch (error) {
    status.textContent = "Server unavailable. Check that QuickAid is running.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

async function requestProfessionalCode(payload) {
  const status = document.querySelector(".form-status");
  const button = document.querySelector("[data-request-code]");
  status.textContent = "Generating verification code...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/professional/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password
      })
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to generate code.");
      status.classList.add("error");
      return;
    }

    if (result.demoCode) {
      status.textContent = `Demo code: ${result.demoCode}. It expires in 5 minutes.`;
    } else {
      status.textContent = result.message;
    }
    status.classList.add("success");
  } catch (error) {
    status.textContent = "Server unavailable. Check that QuickAid is running.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
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
  const session = JSON.parse(localStorage.getItem("quickaid-session") || "null");
  const isProfessional = session?.role === "professional";
  app.innerHTML = `
    <div class="page dashboard-page">
      <main class="ops-dashboard">
        <header class="ops-header">
          <div>
            <div class="ops-title-row">
              <span class="hamburger-lines" aria-hidden="true"></span>
              <h1>AI-assisted national resource</h1>
            </div>
            <p>Real-time emergency overview</p>
          </div>
          <div class="ops-actions">
            <span class="ops-live">${icon("activity")} Live</span>
            <span class="updated-pill">Last Updated : 5:00 PM</span>
            <a class="secondary-button compact" href="#/flood-map">${icon("alert")} Live Flood Map</a>
            <a class="secondary-button compact" href="#/risk-prediction">${icon("activity")} Risk Prediction</a>
            <button class="secondary-button compact" data-signout>Sign Out</button>
          </div>
        </header>

        <section class="ops-alert">
          ${icon("alert")}
          <strong>Critical flooding detected in Jurong West. National University Hospital occupancy is high. There is an accident at TPE, currently SCDF is there rescuing the victim.</strong>
        </section>

        <section class="ops-metrics" aria-label="Live emergency metrics">
          ${opsMetric("Active Accidents", "5", "danger")}
          ${opsMetric("Emergency Alerts", "3", "danger")}
          ${opsMetric("SCDF Volunteers Available", "18", "success")}
          ${opsMetric("Hospital Vacancy", "82%", "warning")}
        </section>

        <section class="ops-grid">
          <div class="ops-main-column">
            <section class="live-map-card">
              <h2>Singapore Live Map</h2>
              <div class="singapore-map-wrap">
                <div id="onemap-dashboard-map" class="onemap-dashboard-map">
                  <span>Loading OneMap...</span>
                </div>
                <div class="map-legend">
                  <span class="incident-map-marker fire legend-marker"><span></span></span> Fire
                  <span class="incident-map-marker flood legend-marker"><span></span></span> Flood
                </div>
              </div>
            </section>

            <section class="live-activity">
              <h2>Live Activity</h2>
              <ul>
                <li><strong>12:42</strong> SCDF deployed to Jurong West</li>
                <li><strong>12:47</strong> PIE congestion elevated</li>
                <li><strong>12:51</strong> Shelter activation recommended</li>
                <li><strong>12:53</strong> NUH occupancy exceeded threshold</li>
              </ul>
            </section>
          </div>

          <aside class="ops-side-column">
            <section class="ops-panel threat-panel">
              <h2>Threat Level:</h2>
              <strong class="critical-value">HIGH</strong>
            </section>
            <section class="ops-panel">
              <h2>Escalation Forecast:</h2>
              <p><strong>PIE congestion risk↑</strong><br /><strong>NUH overloaded</strong><br /><span>Flood spreading to Clementi</span></p>
            </section>
            <section class="ops-panel">
              <h2>Response Queue:</h2>
              <ul>
                <li><strong>Redirect PIE traffic</strong> to AYE</li>
                <li><strong>Deploy SCDF unit</strong> to Jurong West</li>
              </ul>
            </section>
            <section class="ops-panel route-panel">
              <h2>Dynamic Evacuation Route Updated</h2>
              <p><strong>AYE rerouted</strong> toward Jurong East CC</p>
              <strong class="eta-value">ETA: 18 min</strong>
            </section>
          </aside>
        </section>

        <footer class="connected-feeds">
          <strong>Connected Feeds:</strong>
          <span>SCDF | NEA | PUB | MOH | LTA</span>
        </footer>

        ${!isProfessional ? `<p class="public-dashboard-note">Public view: operational actions are shown for transparency. Professional sign-in unlocks command actions.</p>` : ""}
      </main>
    </div>
  `;

  document.querySelector("[data-signout]").addEventListener("click", () => {
    localStorage.removeItem("quickaid-session");
    window.location.hash = "#/";
  });

  initOneMapDashboard();
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

function opsMetric(label, value, tone) {
  return `
    <article class="ops-metric">
      <span>${label}</span>
      <strong class="${tone}">${value}</strong>
    </article>
  `;
}

const SEVERITY_ORDER = ["Extreme", "Severe", "Moderate", "Minor"];
const SEVERITY_COLORS = {
  Extreme: "#a92525",
  Severe: "#c53d32",
  Moderate: "#c47a1b",
  Minor: "#0f766e"
};

let floodMapTimer = null;

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

async function initOneMapDashboard() {
  const mapEl = document.querySelector("#onemap-dashboard-map");
  if (!mapEl) return;

  try {
    await loadStylesheet("https://www.onemap.gov.sg/web-assets/libs/leaflet/leaflet.css");
    await loadScript("https://www.onemap.gov.sg/web-assets/libs/leaflet/onemap-leaflet.js");
    await loadScript("https://www.onemap.gov.sg/web-assets/libs/leaflet/leaflet-tilejson.js");

    const tileJsonResponse = await fetch("https://www.onemap.gov.sg/maps/json/raster/tilejson/2.2.0/Default.json");
    const tileJson = await tileJsonResponse.json();
    mapEl.innerHTML = "";

    const sw = L.latLng(1.144, 103.535);
    const ne = L.latLng(1.494, 104.502);
    const bounds = L.latLngBounds(sw, ne);
    const map = L.TileJSON.createMap("onemap-dashboard-map", tileJson);
    map.setMaxBounds(bounds);
    map.setView(L.latLng(1.345, 103.705), 11);
    map.attributionControl.setPrefix('<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>');

    addIncidentMarker(map, [1.344, 103.704], "flood", "Flood - Jurong West");
    addIncidentMarker(map, [1.333, 103.742], "flood", "Flood - Jurong East");
    addIncidentMarker(map, [1.305, 103.833], "fire", "Fire - TPE response");

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
  app.innerHTML = `
    <div class="page flood-map-page">
      ${header({ backHref: "#/dashboard" })}
      <main class="flood-map-shell">
        <section class="dashboard-title">
          <div>
            <p class="eyebrow">Live map · OneMap basemap + PUB flood alerts</p>
            <h1>Flooding Areas Across Singapore</h1>
          </div>
          <p class="map-updated" data-updated>Loading live flood data…</p>
        </section>
        <div class="flood-map-layout">
          <div class="flood-map-canvas">
            <div id="flood-map" aria-label="Map of active flood alerts in Singapore"></div>
            <ul class="flood-severity-legend" aria-label="Severity legend">
              ${SEVERITY_ORDER.map((level) => `<li><i style="background:${severityColor(level)}"></i>${level}</li>`).join("")}
            </ul>
          </div>
          <aside class="flood-alert-rail" aria-label="Active flood alerts">
            <h2>Active Alerts</h2>
            <div class="flood-alert-list" data-alert-list><p class="map-empty">Loading…</p></div>
          </aside>
        </div>
      </main>
    </div>
  `;

  const map = L.map("flood-map", { scrollWheelZoom: true }).setView([1.3521, 103.8198], 12);
  L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
    detectRetina: true,
    maxZoom: 19,
    minZoom: 11,
    attribution: "OneMap | Map data &copy; contributors, <a href=\"https://www.sla.gov.sg/\">Singapore Land Authority</a>"
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);

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

  await refresh();
  floodMapTimer = window.setInterval(refresh, 60_000);
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
  if (floodMapTimer) {
    window.clearInterval(floodMapTimer);
    floodMapTimer = null;
  }
  const renderer = routes[window.location.hash] || renderLanding;
  renderer();
}

window.addEventListener("hashchange", renderRoute);
renderRoute();
