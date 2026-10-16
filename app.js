/* NAF CARE GROUP PWA - app.js */

const API = {
  login: "/api/login",
  check: "/api/session-check",
  member: "/api/member",
  payments: "/api/payments",
  members: "/api/members",
  logout: "/api/logout"
};

const $ = selector => document.querySelector(selector);
const KEY = "nafCareSessionId";
const notice = $("#notice");
const loginPanel = $("#loginPanel");
const memberPanel = $("#memberPanel");
const loginForm = $("#loginForm");
const loginBtn = $("#loginBtn");

const SCREEN_IDS = [
  "home", "members", "memberPanel", "noticesPanel", "blogPanel",
  "contributionInfo", "profilePanel", "aboutPanel", "settingsPanel"
];
const PRIVATE_SCREENS = new Set([
  "home", "members", "memberPanel", "contributionInfo",
  "profilePanel", "settingsPanel"
]);
const PUBLIC_SCREENS = new Set(["noticesPanel", "blogPanel", "aboutPanel"]);

function message(title, text, error = false) {
  if (!notice) return;
  notice.replaceChildren();
  const heading = document.createElement("strong");
  const paragraph = document.createElement("p");
  heading.textContent = title;
  paragraph.textContent = text;
  notice.append(heading, paragraph);
  notice.classList.toggle("notice-error", error);
  notice.classList.remove("hidden");
}

function session() {
  return sessionStorage.getItem(KEY) || "";
}

function headers() {
  const id = session();
  if (!id) throw new Error("Session expired. Please log in again.");
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

function setScreenVisibility(screenId) {
  SCREEN_IDS.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.classList.toggle("hidden", id !== screenId);
  });
}

function showScreen(screenId, updateUrl = true) {
  if (!SCREEN_IDS.includes(screenId)) screenId = "home";
  if (session()) document.body.classList.add("member-authenticated");

  if (PRIVATE_SCREENS.has(screenId) && !session()) {
    SCREEN_IDS.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.add("hidden");
    });
    loginPanel?.classList.remove("hidden");
    message("Member access", "Please log in to view member information.");
    closeMenu();
    return;
  }

  setScreenVisibility(screenId);
  if (session()) loginPanel?.classList.add("hidden");
  if (screenId === "members" && session()) loadMembers();
  else loginPanel?.classList.remove("hidden");

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("active", link.dataset.nav === screenId);
  });

  if (updateUrl) history.replaceState(null, "", `#${screenId}`);
  closeMenu();
}

function loggedOut(showMessage = false) {
  sessionStorage.removeItem(KEY);
  document.body.classList.remove("member-authenticated");
  loginPanel?.classList.remove("hidden");
  memberPanel?.classList.add("hidden");
  ["logoutBtn", "sidebarLogoutBtn", "profileLogoutBtn"].forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });

  SCREEN_IDS.forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });
  document.querySelectorAll("[data-nav]").forEach(link => link.classList.remove("active"));
  history.replaceState(null, "", location.pathname);
  closeMenu();
  if (showMessage) message("Logged out", "You have been signed out.");
  else message("Member portal", "Sign in to view your own member information.");
}

function detail(container, label, value) {
  if (!container) return;
  const row = document.createElement("div");
  row.className = "profile-row";
  const name = document.createElement("span");
  const content = document.createElement("strong");
  name.className = "muted";
  name.textContent = label;
  content.textContent = value == null || value === "" ? "—" : String(value);
  row.append(name, content);
  container.append(row);
}

function safePhoto(value) {
  try {
    const url = new URL(String(value || ""), location.href);
    return url.protocol === "https:" ? url.href : "";
  } catch (_) { return ""; }
}

function setPhotoOrInitial(img, photoUrl, name) {
  if (!img) return;
  const initial = String(name || "M").trim().charAt(0).toUpperCase() || "M";
  const fallback = () => {
    const avatar = document.createElement("div");
    avatar.id = img.id;
    avatar.className = img.id === "profilePhoto" ? "profile-initial-avatar" : "avatar-mark member-initial-avatar";
    avatar.setAttribute("role", "img");
    avatar.setAttribute("aria-label", `${name || "Member"} initials`);
    avatar.textContent = initial;
    img.replaceWith(avatar);
  };
  if (!photoUrl) { fallback(); return; }
  img.src = photoUrl;
  img.alt = `${name || "Member"} photo`;
  img.classList.remove("no-photo");
  img.onerror = () => { img.onerror = null; fallback(); };
}

async function loadMembers() {
  const box = $("#membersList");
  if (!box) return;
  box.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Loading members…";
  box.append(loading);
  try {
    const data = await request(API.members, { headers: headers() });
    const members = Array.isArray(data.members) ? data.members : [];
    box.replaceChildren();
    if (!members.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No members found.";
      box.append(empty);
      return;
    }
    const query = ($("#memberSearch")?.value || "").trim().toLowerCase();
    members.filter(m => [m.name, m.id, m.area, m.status].some(v => String(v || "").toLowerCase().includes(query))).forEach(member => {
      const card = document.createElement("article");
      card.className = "member-list-card";
      const avatar = document.createElement("div");
      avatar.className = "member-list-avatar";
      const photoUrl = safePhoto(member.photoUrl || "");
      if (photoUrl) {
        const image = document.createElement("img");
        image.src = photoUrl;
        image.alt = `${member.name || "Member"} photo`;
        image.loading = "lazy";
        image.onerror = () => { image.remove(); avatar.textContent = String(member.name || "M").trim().charAt(0).toUpperCase() || "M"; };
        avatar.append(image);
      } else avatar.textContent = String(member.name || "M").trim().charAt(0).toUpperCase() || "M";
      const info = document.createElement("div"); info.className = "member-list-info";
      const name = document.createElement("strong"); name.textContent = member.name || "Member";
      const meta = document.createElement("p"); meta.textContent = `${member.id || ""}${member.area ? " · " + member.area : ""}`;
      info.append(name, meta);
      const badge = document.createElement("span");
      badge.className = "member-status" + (/inactive|নিষ্ক্রিয়/i.test(String(member.status || "")) ? " inactive" : "");
      badge.textContent = member.status || "Member";
      card.append(avatar, info, badge); box.append(card);
    });
    if (!box.children.length) { const empty = document.createElement("p"); empty.className="muted"; empty.textContent="No matching members."; box.append(empty); }
  } catch (error) {
    box.replaceChildren(); const failed = document.createElement("p"); failed.className="muted";
    failed.textContent = error.message || "Members could not be loaded."; box.append(failed);
  }
}

function renderProfile(member) {
  const welcome = $("#welcomeTitle");
  if (welcome) welcome.textContent = "Welcome, " + (member.name || "Member");

  const homeGreeting = $("#homeGreeting");
  if (homeGreeting) homeGreeting.textContent = "Welcome, " + (member.name || "Member");

  const capitalPaid = $("#capitalPaid");
  const capitalDue = $("#capitalDue");
  const monthlyDue = $("#monthlyDue");
  if (capitalPaid) capitalPaid.textContent = cash(member.capitalPaid);
  if (capitalDue) capitalDue.textContent = cash(member.capitalDue);
  if (monthlyDue) monthlyDue.textContent = cash(member.monthlyDue);

  const profileName = $("#profileName");
  if (profileName) profileName.textContent = member.name || "Member";
  const photo = safePhoto(member.photoUrl || member.photoURL || member.photo || "");
  setPhotoOrInitial($("#homeAvatar"), photo, member.name || "Member");
  setPhotoOrInitial($("#profilePhoto"), photo, member.name || "Member");

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

  const monthlyAmount = $("#infoMonthlyAmount");
  if (monthlyAmount) monthlyAmount.textContent = cash(member.monthlyContribution);
}

function renderPayments(rows, result) {
  const body = $("#paymentsBody");
  const summary = $("#paymentSummary");
  if (summary) {
    summary.textContent = `Monthly paid: ${cash(result.monthlyPaid)} · Monthly due: ${cash(result.monthlyDue)} · Months with due: ${result.monthsDue ?? 0}`;
  }
  if (!body) return;
  body.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No payment history available.";
    row.append(cell);
    body.append(row);
    return;
  }

  rows.slice().reverse().forEach(payment => {
    const row = document.createElement("tr");
    [
      `${payment.monthName || payment.month || ""} ${payment.year || ""}`.trim(),
      cash(payment.required),
      cash(payment.paid),
      cash(payment.due),
      payment.status || "—"
    ].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.append(cell);
    });
    body.append(row);
  });
}

async function loadData() {
  if (!session()) {
    loggedOut();
    return;
  }

  try {
    await request(API.check, { headers: headers() });
    const [memberData, paymentData] = await Promise.all([
      request(API.member, { headers: headers() }),
      request(API.payments, { headers: headers() })
    ]);

    if (!memberData.member) throw new Error("Member data is missing.");
    renderProfile(memberData.member);
    renderPayments(paymentData.payments, paymentData);

    loginPanel?.classList.add("hidden");
    $("#logoutBtn")?.classList.remove("hidden");
    $("#sidebarLogoutBtn")?.classList.remove("hidden");
    $("#profileLogoutBtn")?.classList.remove("hidden");

    const wanted = location.hash.slice(1);
    showScreen(SCREEN_IDS.includes(wanted) && PRIVATE_SCREENS.has(wanted) ? wanted : "home");
    message("Signed in", "Your account information has loaded.");
  } catch (error) {
    loggedOut();
    message("Unable to load account", error.message || "Please try again.", true);
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loginBtn) return;

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";

    try {
      const memberId = $("#memberIdInput")?.value.trim() || "";
      const email = $("#emailInput")?.value.trim() || "";
      const data = await request(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, email })
      });

      if (!data.sessionId) throw new Error("No session returned by the server.");
      sessionStorage.setItem(KEY, data.sessionId);
      await loadData();
    } catch (error) {
      message("Login failed", error.message || "Please check your details.", true);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Log in";
    }
  });
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
  } catch (_) {
    // Clear the local session even if the network request fails.
  }
  loggedOut(true);
}

$("#logoutBtn")?.addEventListener("click", logout);
$("#sidebarLogoutBtn")?.addEventListener("click", logout);
$("#profileLogoutBtn")?.addEventListener("click", logout);

$("#memberSearch")?.addEventListener("input", () => loadMembers());

$("#refreshBtn")?.addEventListener("click", () => {
  if (session()) loadData();
  else message("Please log in", "There is no active member session.");
});

/* Public notices and blog posts */
async function loadPublicPosts(action, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Loading posts...";
  container.append(loading);

  try {
    const url = new URL("https://script.google.com/macros/s/AKfycby_KG4rhiHL5TRPtlOlEQ8h-2hlWHMpTgy5pEmtik0ZqD863DXt74vPQyfVh1BycM0mLg/exec");
    url.searchParams.set("action", action);
    const response = await fetch(url.toString(), { cache: "no-store", redirect: "follow" });
    if (!response.ok) throw new Error("Unable to load posts.");

    const data = await response.json();
    if (!data || data.ok === false) throw new Error("Posts are temporarily unavailable.");
    const posts = Array.isArray(data) ? data : Array.isArray(data.posts) ? data.posts : Array.isArray(data.items) ? data.items : [];

    container.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No posts available right now.";
      container.append(empty);
      return;
    }

    posts.slice(0, 5).forEach(post => {
      const article = document.createElement("article");
      article.className = "update-item";
      const title = document.createElement("h3");
      title.textContent = post.title || post.name || "Untitled post";
      article.append(title);

      const dateValue = post.published || post.date || post.publishedDate;
      if (dateValue) {
        const date = document.createElement("p");
        date.className = "muted";
        date.textContent = dateValue;
        article.append(date);
      }

      const summary = document.createElement("p");
      summary.textContent = post.summary || post.snippet || post.content || "";
      article.append(summary);

      const imageUrl = post.thumbnail || post.image || post.imageUrl || post.featuredImage;
      if (imageUrl && /^https:\/\//i.test(imageUrl)) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = post.title || "Post image";
        image.loading = "lazy";
        image.className = "post-thumbnail";
        article.prepend(image);
      }

      const postUrl = post.url || post.link;
      if (postUrl && /^https:\/\//i.test(postUrl)) {
        const link = document.createElement("a");
        link.href = postUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Read more ↗";
        article.append(link);
      }
      container.append(article);
    });
  } catch (_) {
    container.replaceChildren();
    const errorText = document.createElement("p");
    errorText.className = "muted";
    errorText.textContent = "Posts could not be loaded. Please try again later.";
    container.append(errorText);
  }
}

loadPublicPosts("notices", "noticesList");
loadPublicPosts("blog", "blogList");

/* Sidebar drawer */
const sidebar = document.getElementById("appSidebar");
const menuBtn = document.getElementById("menuBtn");
const moreBtn = document.getElementById("moreMenuBtn");
const backdrop = document.getElementById("drawerBackdrop");

function closeMenu() {
  sidebar?.classList.remove("sidebar-open");
  backdrop?.classList.add("hidden");
  document.body.classList.remove("drawer-open");
}

function openMenu() {
  sidebar?.classList.add("sidebar-open");
  backdrop?.classList.remove("hidden");
  document.body.classList.add("drawer-open");
}

menuBtn?.addEventListener("click", () => {
  if (sidebar?.classList.contains("sidebar-open")) closeMenu();
  else openMenu();
});
moreBtn?.addEventListener("click", event => {
  event.preventDefault();
  openMenu();
});
backdrop?.addEventListener("click", closeMenu);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMenu();
});

document.querySelectorAll("[data-nav]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    showScreen(link.dataset.nav);
  });
});

document.querySelectorAll(".quick-action, .panel-head a, .profile-menu a").forEach(link => {
  link.addEventListener("click", event => {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    const target = href.slice(1);
    if (SCREEN_IDS.includes(target)) {
      event.preventDefault();
      showScreen(target);
    }
  });
});

window.addEventListener("hashchange", () => {
  showScreen(location.hash.slice(1) || (session() ? "home" : "noticesPanel"), false);
});

const year = $("#year");
if (year) year.textContent = String(new Date().getFullYear());

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

if (session()) {
  loadData();
} else {
  loggedOut();
}
