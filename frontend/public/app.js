const app = document.querySelector("#app");

const routes = {
  "": renderLanding,
  "#/": renderLanding,
  "#/login": renderRoleSelection,
  "#/login/professional": renderProfessionalLogin,
  "#/signup/professional": renderProfessionalSignup,
  "#/reset/professional": renderProfessionalReset,
  "#/admin/login": renderAdminLogin,
  "#/admin/approvals": renderAdminApprovals,
  "#/login/public": renderPublicLogin,
  "#/signup/volunteer": renderVolunteerSignup,
  "#/dashboard": renderDashboard,
  "#/flood-map": renderFloodMap
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

function dashboardSimulationAction() {
  const template = document.querySelector("#dashboard-simulation-action");
  return template?.innerHTML.trim() || `<button class="secondary-button compact" type="button" data-open-simulator>Incident Simulator</button>`;
}

function dashboardEmergencySpacesAction() {
  const template = document.querySelector("#dashboard-emergency-spaces-action");
  return template?.innerHTML.trim() || `<button class="secondary-button compact" type="button" data-open-emergency-spaces>Emergency Spaces</button>`;
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
            <div class="auth-support-links">
              <a href="#/signup/professional">Sign up for a professional account</a>
              <a href="#/reset/professional">Forgot password?</a>
              <a href="#/admin/login">Administrator approval</a>
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

function renderProfessionalReset() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login/professional" })}
      <main class="center-stage signup-stage">
        <section class="login-panel reset-panel" aria-labelledby="professional-reset-heading">
          <div class="auth-heading">
            <p class="eyebrow">Account recovery</p>
            <h1 id="professional-reset-heading">Reset Password</h1>
            <p>The reset code will be sent only to the Telegram account already linked to your professional account.</p>
          </div>
          <form class="login-form reset-form" data-professional-reset>
            <label>Work email
              <input name="email" type="email" placeholder="name@agency.gov.sg" autocomplete="email" required />
            </label>
            <button class="code-button" type="button" data-request-reset-code>Send Reset Code</button>
            <label>Reset code
              <input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="Enter 6-digit code" required />
            </label>
            <label>New password
              <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="At least 10 characters" autocomplete="new-password" required minlength="10" /></span>
            </label>
            <label>Confirm new password
              <span class="input-with-icon">${icon("lock")}<input name="confirmPassword" type="password" placeholder="Re-enter your password" autocomplete="new-password" required minlength="10" /></span>
            </label>
            <button class="form-button" type="submit">Update Password</button>
            <p class="signup-line"><a href="#/login/professional">Return to professional login</a></p>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;

  const form = document.querySelector("[data-professional-reset]");
  form.querySelector("[data-request-reset-code]").addEventListener("click", () => requestPasswordReset(form));
  form.addEventListener("submit", submitPasswordReset);
}

function renderAdminLogin() {
  app.innerHTML = `
    <div class="page auth-page">
      ${header({ backHref: "#/login/professional" })}
      <main class="center-stage">
        <section class="login-panel reset-panel" aria-labelledby="admin-login-heading">
          <div class="auth-heading">
            <p class="eyebrow">Restricted access</p>
            <h1 id="admin-login-heading">Administrator Login</h1>
            <p>Review professional account registrations and control platform access.</p>
          </div>
          <form class="login-form" data-admin-login>
            <label>Admin email
              <input name="email" type="email" placeholder="admin@quickaid.test" autocomplete="username" required />
            </label>
            <label>Password
              <span class="input-with-icon">${icon("lock")}<input name="password" type="password" placeholder="Enter administrator password" autocomplete="current-password" required minlength="8" /></span>
            </label>
            <button class="form-button" type="submit">Sign In as Administrator</button>
            <p class="form-status" role="status"></p>
          </form>
        </section>
      </main>
    </div>
  `;

  document.querySelector("[data-admin-login]").addEventListener("submit", submitAdminLogin);
}

async function submitAdminLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());
  status.textContent = "Signing in...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to sign in.");
      status.classList.add("error");
      return;
    }
    localStorage.setItem("quickaid-admin-session", JSON.stringify(result.session));
    window.location.hash = "#/admin/approvals";
  } catch (error) {
    status.textContent = "Server unavailable. Check that QuickAid is running.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

async function renderAdminApprovals() {
  const session = JSON.parse(localStorage.getItem("quickaid-admin-session") || "null");
  if (!session?.token) {
    window.location.hash = "#/admin/login";
    return;
  }

  app.innerHTML = `
    <div class="page admin-page">
      <header class="admin-header">
        <a class="brand" href="#/">
          ${shieldIcon()}
          <span><strong>QuickAid Admin</strong><small>Access governance</small></span>
        </a>
        <button class="secondary-button compact" type="button" data-admin-signout>Sign Out</button>
      </header>
      <main class="admin-main">
        <section class="admin-title">
          <div>
            <p class="eyebrow">Professional access</p>
            <h1>Account Approvals</h1>
            <p>Review work identity and agency details before granting dashboard access.</p>
          </div>
          <span class="pending-count" data-pending-count>Loading</span>
        </section>
        <p class="form-status admin-status" role="status"></p>
        <section class="approval-list" data-approval-list>
          <p class="approval-empty">Loading pending registrations...</p>
        </section>
      </main>
    </div>
  `;

  document.querySelector("[data-admin-signout]").addEventListener("click", adminSignOut);
  await loadPendingProfessionals(session.token);
}

async function loadPendingProfessionals(token) {
  const list = document.querySelector("[data-approval-list]");
  const count = document.querySelector("[data-pending-count]");
  const status = document.querySelector(".admin-status");

  try {
    const response = await fetch("/api/admin/professionals/pending", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (response.status === 401) {
      localStorage.removeItem("quickaid-admin-session");
      window.location.hash = "#/admin/login";
      return;
    }
    if (!response.ok) throw new Error(result.error || "Unable to load registrations.");

    count.textContent = `${result.users.length} pending`;
    list.innerHTML = result.users.length
      ? result.users.map(adminApprovalCard).join("")
      : `<div class="approval-empty"><strong>All caught up</strong><span>There are no professional registrations waiting for review.</span></div>`;

    list.querySelectorAll("[data-approval-action]").forEach((button) => {
      button.addEventListener("click", () => {
        updateProfessionalStatus(button.dataset.userId, button.dataset.approvalAction, token);
      });
    });
  } catch (error) {
    count.textContent = "Unavailable";
    status.textContent = error.message;
    status.classList.add("error");
    list.innerHTML = `<p class="approval-empty">Unable to load the approval queue.</p>`;
  }
}

function adminApprovalCard(user) {
  return `
    <article class="approval-card">
      <div class="approval-identity">
        <span class="agency-badge">${escapeHtml(user.agency)}</span>
        <h2>${escapeHtml(user.name)}</h2>
        <a href="mailto:${escapeHtml(user.email)}">${escapeHtml(user.email)}</a>
      </div>
      <dl class="approval-details">
        <div><dt>Agency</dt><dd>${escapeHtml(user.agency)}</dd></div>
        <div><dt>Role / title</dt><dd>${escapeHtml(user.roleTitle)}</dd></div>
        <div><dt>Submitted</dt><dd>${formatDateTime(user.createdAt)}</dd></div>
      </dl>
      <div class="approval-actions">
        <button class="reject-button" type="button" data-approval-action="rejected" data-user-id="${user._id}">Reject</button>
        <button class="approve-button" type="button" data-approval-action="approved" data-user-id="${user._id}">Approve</button>
      </div>
    </article>
  `;
}

async function updateProfessionalStatus(userId, newStatus, token) {
  const status = document.querySelector(".admin-status");
  const buttons = document.querySelectorAll(`[data-user-id="${userId}"]`);
  buttons.forEach((button) => {
    button.disabled = true;
  });
  status.textContent = `${newStatus === "approved" ? "Approving" : "Rejecting"} account...`;
  status.className = "form-status admin-status";

  try {
    const response = await fetch(`/api/admin/professionals/${userId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to update account.");
    status.textContent = result.message;
    status.classList.add("success");
    await loadPendingProfessionals(token);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

async function adminSignOut() {
  const session = JSON.parse(localStorage.getItem("quickaid-admin-session") || "null");
  if (session?.token) {
    await fetch("/api/auth/admin/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` }
    }).catch(() => {});
  }
  localStorage.removeItem("quickaid-admin-session");
  window.location.hash = "#/admin/login";
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

async function requestPasswordReset(form) {
  const status = form.querySelector(".form-status");
  const button = form.querySelector("[data-request-reset-code]");
  const email = form.elements.email.value;
  status.textContent = "Sending reset code...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/professional/reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to send reset code.");
      status.classList.add("error");
      return;
    }
    status.textContent = result.message;
    status.classList.add("success");
  } catch (error) {
    status.textContent = "Server unavailable. Check that QuickAid is running.";
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
  status.textContent = "Updating password...";
  status.className = "form-status";
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/professional/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = formatAuthError(result, "Unable to reset password.");
      status.classList.add("error");
      return;
    }
    form.reset();
    status.textContent = result.message;
    status.classList.add("success");
    window.setTimeout(() => {
      window.location.hash = "#/login/professional";
    }, 1000);
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

    status.textContent = result.message;
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
              <span class="hamburger-lines" aria-hidden="true"></span>
              <h1>AI-assisted national resource</h1>
            </div>
            <p>Real-time emergency overview</p>
          </div>
          <div class="ops-actions">
            <span class="ops-live">${icon("activity")} Live</span>
            <span class="updated-pill">Last Updated : 5:00 PM</span>
            <a class="secondary-button compact" href="#/flood-map">${icon("alert")} Live Flood Map</a>
            ${dashboardSimulationAction()}
            ${dashboardEmergencySpacesAction()}
            <button class="secondary-button compact" type="button" data-open-volunteer-dispatch>${icon("users")} Volunteer Dispatch</button>
            <button class="secondary-button compact" data-signout>Sign Out</button>
          </div>
        </header>

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
                <div class="map-legend">
                  <span class="incident-map-marker fire legend-marker"><span></span></span> Fire
                  <span class="incident-map-marker flood legend-marker"><span></span></span> Flood
                </div>
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

  document.querySelector("[data-signout]").addEventListener("click", () => {
    localStorage.removeItem("quickaid-session");
    window.location.hash = "#/";
  });

  document.querySelector("[data-open-simulator]").addEventListener("click", showIncidentSimulatorSection);
  document.querySelector("[data-open-emergency-spaces]").addEventListener("click", showEmergencySpacesSection);
  document.querySelector("[data-open-volunteer-dispatch]").addEventListener("click", () => {
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
  L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
    detectRetina: true,
    maxZoom: 19,
    minZoom: 11,
    attribution: "OneMap | Map data &copy; contributors, <a href=\"https://www.sla.gov.sg/\">Singapore Land Authority</a>"
  }).addTo(map);

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

function renderRoute() {
  if (floodMapTimer) {
    window.clearInterval(floodMapTimer);
    floodMapTimer = null;
  }
  if (dengueMapTimer) {
    window.clearInterval(dengueMapTimer);
    dengueMapTimer = null;
  }
  const renderer = routes[window.location.hash] || renderLanding;
  renderer();
}

window.addEventListener("hashchange", renderRoute);
renderRoute();
