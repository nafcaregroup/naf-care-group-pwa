
"use strict";

/* ==========================================
   NAF CARE GROUP PWA
   Complete application script
   ========================================== */

const API = {
  login: "/api/login",
  check: "/api/session-check",
  member: "/api/member",
  members: "/api/members",
  payments: "/api/payments",
  logout: "/api/logout"
};

const KEY = "nafCareSessionId";

const $ = selector => document.querySelector(selector);

const loginPanel = $("#loginPanel");
const memberPanel = $("#memberPanel");
const notice = $("#notice");
const loginBtn = $("#loginBtn");

const PRIVATE_SCREENS = [
  "home",
  "members",
  "contributionInfo",
  "profilePanel",
  "settingsPanel"
];

const PUBLIC_SCREENS = [
  "noticesPanel",
  "blogPanel",
  "aboutPanel"
];

const ALL_SCREENS = [
  ...PRIVATE_SCREENS,
  ...PUBLIC_SCREENS
];

/* ==========================================
   MESSAGE
   ========================================== */

function message(title, text, error = false) {
  if (!notice) return;

  notice.replaceChildren();

  const heading = document.createElement("strong");
  const paragraph = document.createElement("p");

  heading.textContent = title;
  paragraph.textContent = text;

  notice.append(heading, paragraph);
  notice.classList.toggle("notice-error", error);
}

/* ==========================================
   SESSION AND API
   ========================================== */

function session() {
  return sessionStorage.getItem(KEY) || "";
}

function headers() {
  const sessionId = session();

  if (!sessionId) {
    throw new Error("Your session has expired. Please log in again.");
  }

  return {
    "X-Session-ID": sessionId
  };
}

function cash(value) {
  return "৳" + Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2
  });
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}

/* ==========================================
   SIDEBAR
   ========================================== */

function openMenu() {
  $("#appSidebar")?.classList.add("sidebar-open");
  $("#drawerBackdrop")?.classList.remove("hidden");
  document.body.classList.add("drawer-open");
}

function closeMenu() {
  $("#appSidebar")?.classList.remove("sidebar-open");
  $("#drawerBackdrop")?.classList.add("hidden");
  document.body.classList.remove("drawer-open");
}

/* ==========================================
   SCREEN NAVIGATION
   ========================================== */

function showLogin() {
  // Remove authenticated state.
  document.body.classList.remove("member-authenticated");

  // Show login.
  loginPanel?.classList.remove("hidden");

  // Hide private account information.
  memberPanel?.classList.add("hidden");

  PRIVATE_SCREENS.forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });

  $("#memberDetailsPanel")?.classList.add("hidden");

  // Hide authenticated controls.
  $("#logoutBtn")?.classList.add("hidden");
  $("#sidebarLogoutBtn")?.classList.add("hidden");
  $("#profileLogoutBtn")?.classList.add("hidden");

  // Clear active navigation.
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.remove("active");
  });

  closeMenu();
}

function showApp() {
  // Mark the user as authenticated only after successful API checks.
  document.body.classList.add("member-authenticated");

  loginPanel?.classList.add("hidden");

  $("#logoutBtn")?.classList.remove("hidden");
  $("#sidebarLogoutBtn")?.classList.remove("hidden");

  const requestedScreen = location.hash.replace("#", "");

  const target = ALL_SCREENS.includes(requestedScreen)
    ? requestedScreen
    : "home";

  showScreen(target);
}

function showScreen(screenId) {
  if (!ALL_SCREENS.includes(screenId)) {
    screenId = "home";
  }

  // Private screens cannot be opened without a session.
  if (
    PRIVATE_SCREENS.includes(screenId) &&
    !document.body.classList.contains("member-authenticated")
  ) {
    showLogin();
    return;
  }

  // Hide all regular app screens first.
  ALL_SCREENS.forEach(id => {
    document.getElementById(id)?.classList.toggle(
      "hidden",
      id !== screenId
    );
  });

  // The member account details and payments are part of My Profile.
  memberPanel?.classList.toggle(
    "hidden",
    screenId !== "profilePanel"
  );

  // Login is hidden while an app screen is displayed.
  loginPanel?.classList.add("hidden");

  // Hide the unused placeholder card.
  $("#memberDetailsPanel")?.classList.add("hidden");

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.nav === screenId
    );
  });

  closeMenu();

  history.replaceState(null, "", "#" + screenId);
   if (screenId === "members") {
  loadMembers();
}
}

/* ==========================================
   NAVIGATION EVENTS
   ========================================== */

function setupNavigation() {
  $("#menuBtn")?.addEventListener("click", () => {
    const sidebar = $("#appSidebar");

    if (sidebar?.classList.contains("sidebar-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  $("#moreMenuBtn")?.addEventListener("click", event => {
    event.preventDefault();

    if (document.body.classList.contains("member-authenticated")) {
      openMenu();
    }
  });

  $("#drawerBackdrop")?.addEventListener("click", closeMenu);

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showScreen(link.dataset.nav);
    });
  });

  document.querySelectorAll(
    ".quick-action, .panel-head a, .profile-menu a"
  ).forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");

      if (href && href.startsWith("#")) {
        const target = href.slice(1);

        if (ALL_SCREENS.includes(target)) {
          event.preventDefault();
          showScreen(target);
        }
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("hashchange", () => {
    const target = location.hash.replace("#", "") || "home";

    if (
      PRIVATE_SCREENS.includes(target) &&
      !document.body.classList.contains("member-authenticated")
    ) {
      showLogin();
      return;
    }

    if (ALL_SCREENS.includes(target)) {
      showScreen(target);
    }
  });

  $("#sidebarLogoutBtn")?.addEventListener("click", logout);
  $("#profileLogoutBtn")?.addEventListener("click", logout);
  $("#logoutBtn")?.addEventListener("click", logout);
}

/* ==========================================
   MEMBER PROFILE
   ========================================== */

function detail(box, label, value) {
  if (!box) return;

  const row = document.createElement("div");
  row.className = "profile-row";

  const labelElement = document.createElement("span");
  labelElement.className = "muted";
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  row.append(labelElement, valueElement);
  box.appendChild(row);
}

function renderProfile(member) {
  const name = member.name || "Member";

  if ($("#welcomeTitle")) {
    $("#welcomeTitle").textContent = "Welcome, " + name;
  }

  if ($("#homeGreeting")) {
    $("#homeGreeting").textContent = "Welcome, " + name;
  }

  if ($("#profileName")) {
    $("#profileName").textContent = name;
  }

  if ($("#capitalPaid")) {
    $("#capitalPaid").textContent = cash(member.capitalPaid);
  }

  if ($("#capitalDue")) {
    $("#capitalDue").textContent = cash(member.capitalDue);
  }

  if ($("#monthlyDue")) {
    $("#monthlyDue").textContent = cash(member.monthlyDue);
  }

  if ($("#infoMonthlyAmount")) {
    $("#infoMonthlyAmount").textContent =
      cash(member.monthlyContribution);
  }

  const box = $("#profileDetails");

  if (box) {
    box.replaceChildren();

    [
      ["Member ID", member.id],
      ["Full name", member.name],
      ["Email", member.email],
      ["Phone", member.phone],
      ["Ward / Area", member.area],
      ["Status", member.status],
      ["Capital required", cash(member.capitalRequired)],
      ["Capital paid", cash(member.capitalPaid)],
      ["Capital due", cash(member.capitalDue)],
      ["Monthly contribution", cash(member.monthlyContribution)],
      ["Monthly paid", cash(member.monthlyPaid)],
      ["Months with due", member.monthsDue],
      ["Total due", cash(member.totalDue)]
    ].forEach(item => {
      detail(box, item[0], item[1]);
    });
  }
}

/* ==========================================
   PAYMENT HISTORY
   ========================================== */

function renderPayments(rows, result) {
  const body = $("#paymentsBody");

  if (!body) return;

  body.replaceChildren();

  if ($("#paymentSummary")) {
    $("#paymentSummary").textContent =
      `Monthly paid: ${cash(result.monthlyPaid)} · ` +
      `Monthly due: ${cash(result.monthlyDue)} · ` +
      `Months with due: ${result.monthsDue ?? 0}`;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.textContent = "No payment history available.";

    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  rows.slice().reverse().forEach(payment => {
    const row = document.createElement("tr");

    const values = [
      `${payment.monthName || payment.month || ""} ${payment.year || ""}`.trim(),
      cash(payment.required),
      cash(payment.paid),
      cash(payment.due),
      payment.status || "—"
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });

    body.appendChild(row);
  });
}





async function loadMembers() {
  const container = $("#membersList");
  const searchInput = $("#memberSearch");

  if (!container) return;

  container.replaceChildren();

  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Loading members...";
  container.appendChild(loading);

  try {
    const result = await request(API.members, {
      method: "POST",
      headers: {
        ...headers()
      }
    });

    const members = Array.isArray(result.members)
      ? result.members
      : [];

    function renderList(query = "") {
      container.replaceChildren();

      const filtered = members.filter(member => {
        const text = `${member.name} ${member.id} ${member.area}`
          .toLowerCase();

        return text.includes(query.trim().toLowerCase());
      });

      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No members found.";
        container.appendChild(empty);
        return;
      }

      filtered.forEach(member => {
        const card = document.createElement("article");
        card.className = "member-card";

        const name = document.createElement("h3");
        name.textContent = member.name || "Unnamed member";

        const id = document.createElement("p");
        id.textContent = `Member ID: ${member.id || "—"}`;

        const area = document.createElement("p");
        area.textContent = `Area: ${member.area || "—"}`;

        const status = document.createElement("p");
        status.textContent = `Status: ${member.status || "—"}`;

        card.append(name, id, area, status);

        if (member.photoUrl) {
          try {
            const photoUrl = new URL(member.photoUrl);

            if (photoUrl.protocol === "https:") {
              const image = document.createElement("img");
              image.src = photoUrl.href;
              image.alt = member.name || "Member";
              image.loading = "lazy";
              image.referrerPolicy = "no-referrer";
              image.width = 64;
              image.height = 64;
              card.prepend(image);
            }
          } catch {
            // Ignore an invalid photo URL.
          }
        }

        container.appendChild(card);
      });
    }

    renderList(searchInput?.value || "");

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.addEventListener("input", () => {
        renderList(searchInput.value);
      });

      searchInput.dataset.bound = "true";
    }
  } catch (error) {
    container.replaceChildren();

    const errorText = document.createElement("p");
    errorText.className = "muted";
    errorText.textContent =
      error.message || "Member list could not be loaded.";

    container.appendChild(errorText);
  }
}


/* ==========================================
   LOAD AUTHENTICATED MEMBER DATA
   ========================================== */

async function loadData() {
  if (!session()) {
    showLogin();
    return;
  }

  try {
    // Verify session before fetching private data.
    await request(API.check, {
      headers: headers()
    });

    const [memberResult, paymentResult] = await Promise.all([
      request(API.member, {
        headers: headers()
      }),
      request(API.payments, {
        headers: headers()
      })
    ]);

    if (!memberResult.member) {
      throw new Error("Member data is missing.");
    }

    renderProfile(memberResult.member);
    renderPayments(paymentResult.payments, paymentResult);

    showApp();
    message("Signed in", "Your account information has loaded.");
  } catch (error) {
    await endSession();

    message(
      "Unable to load account",
      error.message || "Please log in again.",
      true
    );
  }
}

/* ==========================================
   LOGIN
   ========================================== */

$("#loginForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!loginBtn) return;

  const memberId = $("#memberIdInput")?.value.trim();
  const email = $("#emailInput")?.value.trim();

  if (!memberId || !email) {
    message(
      "Login required",
      "Enter your Member ID and registered email.",
      true
    );
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";

  try {
    const result = await request(API.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        memberId,
        email
      })
    });

    if (!result.sessionId) {
      throw new Error("The server did not return a session.");
    }

    sessionStorage.setItem(KEY, result.sessionId);

    await loadData();
  } catch (error) {
    message("Login failed", error.message, true);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});

/* ==========================================
   LOGOUT
   ========================================== */

async function endSession() {
  sessionStorage.removeItem(KEY);
  showLogin();
}

async function logout() {
  try {
    if (session()) {
      await fetch(API.logout, {
        method: "POST",
        headers: headers(),
        cache: "no-store"
      });
    }
  } catch {
    // Local session will still be cleared.
  }

  await endSession();

  message("Logged out", "You have been signed out.");
}

/* ==========================================
   REFRESH
   ========================================== */

$("#refreshBtn")?.addEventListener("click", () => {
  if (session()) {
    loadData();
  } else {
    showLogin();
    message("Member portal", "Sign in to view your account.");
  }
});

/* ==========================================
   PUBLIC BLOGGER POSTS
   Uses Blogger's public JSON feed.
   ========================================== */

const BLOGGER_BASE = "https://nafcaregroup.blogspot.com";

async function loadBloggerPosts(label, containerId, limit = 5) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.replaceChildren();

  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Loading posts...";
  container.appendChild(loading);

  try {
    const feedUrl = new URL(
      `${BLOGGER_BASE}/feeds/posts/default/-/${encodeURIComponent(label)}`
    );

    feedUrl.searchParams.set("alt", "json");
    feedUrl.searchParams.set("max-results", String(limit));

    const response = await fetch(feedUrl.toString(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load posts.");
    }

    const data = await response.json();
    const entries = data?.feed?.entry || [];

    container.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No posts available right now.";
      container.appendChild(empty);
      return;
    }

    entries.forEach(entry => {
      const article = document.createElement("article");
      article.className = "update-item";

      const title = document.createElement("h3");
      title.textContent = entry.title?.$t || "Untitled post";
      article.appendChild(title);

      const published = entry.published?.$t;

      if (published) {
        const date = document.createElement("p");
        date.className = "muted";
        date.textContent = new Date(published).toLocaleDateString();
        article.appendChild(date);
      }

      const content = entry.summary?.$t || entry.content?.$t || "";

      if (content) {
        const summary = document.createElement("p");
        const plainText = content.replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        summary.textContent = plainText.slice(0, 240);
        article.appendChild(summary);
      }

      const alternate = (entry.link || []).find(
        item => item.rel === "alternate"
      );

      if (alternate?.href) {
        const link = document.createElement("a");
        link.href = alternate.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Read more →";
        article.appendChild(link);
      }

      container.appendChild(article);
    });
  } catch {
    container.replaceChildren();

    const errorText = document.createElement("p");
    errorText.className = "muted";
    errorText.textContent =
      "Posts could not be loaded. Please visit our Blogger site.";

    const link = document.createElement("a");
    link.href = label === "Notice"
      ? `${BLOGGER_BASE}/search/label/Notice`
      : BLOGGER_BASE;

    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = " Open Blogger →";

    errorText.appendChild(link);
    container.appendChild(errorText);
  }
}

/* ==========================================
   INITIALIZE
   ========================================== */

function initializeApp() {
  setupNavigation();

  if ($("#year")) {
    $("#year").textContent = String(new Date().getFullYear());
  }

  // Public content does not require a member session.
  loadBloggerPosts("Notice", "noticesList");
  loadBloggerPosts("Blog", "blogList");
  loadBloggerPosts("Notice", "recentNoticesList", 3);
  loadBloggerPosts("Blog", "recentBlogList", 3);

  if (
    "serviceWorker" in navigator &&
    location.protocol.startsWith("http")
  ) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .catch(() => {});
    });
  }

  if (session()) {
    loadData();
  } else {
    showLogin();
    message(
      "Member portal",
      "Sign in to view your own member information."
    );
  }
}

initializeApp();
