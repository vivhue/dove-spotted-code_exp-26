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
