
/* =========================================
   NAF CARE GROUP PWA
   Main application script
   ========================================= */

"use strict";

const API = {
  login: "/api/login",
  check: "/api/session-check",
  member: "/api/member",
  payments: "/api/payments",
  logout: "/api/logout"
};

const KEY = "nafCareSessionId";
const $ = selector => document.querySelector(selector);

const notice = $("#notice");
const loginPanel = $("#loginPanel");
const memberPanel = $("#memberPanel");
const loginBtn = $("#loginBtn");

const PUBLIC_POSTS_URL =
  "https://script.google.com/macros/s/AKfycby_KG4rhiHL5TRPtlOlEQ8h-2hlWHMpTgy5pEmtik0ZqD863DXt74vPQyfVh1BycM0mLg/exec";

const SCREEN_IDS = [
  "home",
  "members",
  "noticesPanel",
  "blogPanel",
  "contributionInfo",
  "profilePanel",
  "aboutPanel",
  "settingsPanel"
];

/* =========================================
   MESSAGES AND API HELPERS
   ========================================= */

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

function session() {
  return sessionStorage.getItem(KEY) || "";
}

function headers() {
  const id = session();

  if (!id) {
    throw new Error("Session expired. Please log in again.");
  }

  return { "X-Session-ID": id };
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
    headers: { ...(options.headers || {}) }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Server returned an unreadable response.");
  }

  if (!response.ok || data.ok !== true) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

/* =========================================
   SCREEN NAVIGATION
   ========================================= */

function closeMenu() {
  $("#appSidebar")?.classList.remove("sidebar-open");
  $("#drawerBackdrop")?.classList.add("hidden");
  document.body.classList.remove("drawer-open");
}

function openMenu() {
  $("#appSidebar")?.classList.add("sidebar-open");
  $("#drawerBackdrop")?.classList.remove("hidden");
  document.body.classList.add("drawer-open");
}

function showScreen(screenId) {
  if (!SCREEN_IDS.includes(screenId)) {
    screenId = "home";
  }

  // Private screens require an active session.
  if (!session()) {
    showLogin();
    return;
  }

  SCREEN_IDS.forEach(id => {
    const screen = document.getElementById(id);

    if (screen) {
      screen.classList.toggle("hidden", id !== screenId);
    }
  });

  // The member panel contains the member details and payment history.
  if (memberPanel) {
    memberPanel.classList.toggle("hidden", screenId !== "profilePanel");
  }

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("active", link.dataset.nav === screenId);
  });

  history.replaceState(null, "", "#" + screenId);
  closeMenu();
}

function showLogin() {
  if (loginPanel) {
    loginPanel.classList.remove("hidden");
  }

  if (memberPanel) {
    memberPanel.classList.add("hidden");
  }

  SCREEN_IDS.forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });

  $("#logoutBtn")?.classList.add("hidden");
  $("#sidebarLogoutBtn")?.classList.add("hidden");
  $("#profileLogoutBtn")?.classList.add("hidden");

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.remove("active");
  });

  closeMenu();
  history.replaceState(null, "", location.pathname);
}

function showApp() {
  loginPanel?.classList.add("hidden");
  $("#logoutBtn")?.classList.remove("hidden");
  $("#sidebarLogoutBtn")?.classList.remove("hidden");
  $("#profileLogoutBtn")?.classList.remove("hidden");

  const requestedScreen = location.hash.replace("#", "");
  const target = SCREEN_IDS.includes(requestedScreen)
    ? requestedScreen
    : "home";

  showScreen(target);
}

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
    openMenu();
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

      if (href?.startsWith("#")) {
        const target = href.slice(1);

        if (SCREEN_IDS.includes(target)) {
          event.preventDefault();
          showScreen(target);
        }
      }

      closeMenu();
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("hashchange", () => {
    if (session()) {
      showScreen(location.hash.replace("#", "") || "home");
    } else {
      showLogin();
    }
  });

  $("#sidebarLogoutBtn")?.addEventListener("click", logout);
  $("#profileLogoutBtn")?.addEventListener("click", logout);
}

/* =========================================
   MEMBER PROFILE
   ========================================= */

function detail(box, label, value) {
  if (!box) return;

  const row = document.createElement("div");
  row.className = "profile-row";

  const labelElement = document.createElement("span");
  labelElement.className = "muted";
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent =
    value == null || value === "" ? "—" : String(value);

  row.append(labelElement, valueElement);
  box.appendChild(row);
}

function renderProfile(member) {
  $("#welcomeTitle")?.replaceChildren(
    document.createTextNode("Welcome, " + (member.name || "Member"))
  );

  $("#homeGreeting")?.replaceChildren(
    document.createTextNode("Welcome, " + (member.name || "Member"))
  );

  const capitalPaid = $("#capitalPaid");
  const capitalDue = $("#capitalDue");
  const monthlyDue = $("#monthlyDue");

  if (capitalPaid) capitalPaid.textContent = cash(member.capitalPaid);
  if (capitalDue) capitalDue.textContent = cash(member.capitalDue);
  if (monthlyDue) monthlyDue.textContent = cash(member.monthlyDue);

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
    ].forEach(item => detail(box, item[0], item[1]));
  }

  if ($("#profileName")) {
    $("#profileName").textContent = member.name || "Member";
  }

  if ($("#infoMonthlyAmount")) {
    $("#infoMonthlyAmount").textContent =
      cash(member.monthlyContribution);
  }
}

/* =========================================
   PAYMENT HISTORY
   ========================================= */

function renderPayments(rows, result) {
  const body = $("#paymentsBody");

  if (!body) return;

  body.replaceChildren();

  const summary = $("#paymentSummary");

  if (summary) {
    summary.textContent =
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

/* =========================================
   LOAD PRIVATE MEMBER DATA
   ========================================= */

async function loadData() {
  if (!session()) {
    showLogin();
    return;
  }

  try {
    await request(API.check, {
      headers: headers()
    });

    const [memberResult, paymentResult] = await Promise.all([
      request(API.member, { headers: headers() }),
      request(API.payments, { headers: headers() })
    ]);

    if (!memberResult.member) {
      throw new Error("Member data missing.");
    }

    renderProfile(memberResult.member);
    renderPayments(paymentResult.payments, paymentResult);

    showApp();
    message("Signed in", "Your account information has loaded.");
  } catch (error) {
    if (/session|required|expired|unauthorized/i.test(error.message)) {
      await endSession();
    }

    message("Unable to load account", error.message, true);
  }
}

/* =========================================
   LOGIN AND LOGOUT
   ========================================= */

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
    // Clear the local session even if the logout request fails.
  }

  await endSession();
  message("Logged out", "You have been signed out.");
}

$("#loginForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!loginBtn) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";

  try {
    const result = await request(API.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: $("#memberIdInput")?.value.trim(),
        email: $("#emailInput")?.value.trim()
      })
    });

    if (!result.sessionId) {
      throw new Error("No session returned.");
    }

    sessionStorage.setItem(KEY, result.sessionId);
    await loadData();
  } catch (error) {
    message("Login failed", error.message, true);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log in";
  }
});

$("#logoutBtn")?.addEventListener("click", logout);

$("#refreshBtn")?.addEventListener("click", () => {
  if (session()) {
    loadData();
  } else {
    message("Please log in", "No active session.");
  }
});

/* =========================================
   PUBLIC NOTICES AND BLOG
   ========================================= */

async function loadPublicPosts(action, containerId) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.replaceChildren();

  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Loading posts...";
  container.appendChild(loading);

  try {
    const url = new URL(PUBLIC_POSTS_URL);
    url.searchParams.set("action", action);

    const response = await fetch(url.toString(), {
      cache: "no-store",
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error("Unable to load posts.");
    }

    const data = await response.json();

    if (!data || data.ok === false) {
      throw new Error("Posts are temporarily unavailable.");
    }

    const posts = Array.isArray(data)
      ? data
      : Array.isArray(data.posts)
        ? data.posts
        : Array.isArray(data.items)
          ? data.items
          : [];

    container.replaceChildren();

    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No posts available right now.";
      container.appendChild(empty);
      return;
    }

    posts.slice(0, 5).forEach(post => {
      const article = document.createElement("article");
      article.className = "update-item";

      const title = document.createElement("h3");
      title.textContent = post.title || post.name || "Untitled post";
      article.appendChild(title);

      const dateValue = post.published || post.date || post.publishedDate;

      if (dateValue) {
        const date = document.createElement("p");
        date.className = "muted";
        date.textContent = dateValue;
        article.appendChild(date);
      }

      const summary = document.createElement("p");
      summary.textContent =
        post.summary || post.snippet || post.content || "";
      article.appendChild(summary);

      const postUrl = post.url || post.link;

      if (postUrl) {
        const link = document.createElement("a");
        link.href = postUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Read more ↗";
        article.appendChild(link);
      }

      container.appendChild(article);
    });
  } catch {
    container.replaceChildren();

    const errorMessage = document.createElement("p");
    errorMessage.className = "muted";
    errorMessage.textContent =
      "Posts could not be loaded. Please try again later.";

    container.appendChild(errorMessage);
  }
}

/* =========================================
   INITIALIZE APP
   ========================================= */

function initializeApp() {
  setupNavigation();

  const year = $("#year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  loadPublicPosts("notices", "noticesList");
  loadPublicPosts("blog", "blogList");

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
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
    message("Member portal", "Sign in to view your own member information.");
  }
}

initializeApp();
