/* NAF CARE GROUP PWA - app.js */

const API = {
  login: "/api/login",
  check: "/api/session-check",
  member: "/api/member",
  payments: "/api/payments",
  logout: "/api/logout",
  members: "/api/members"
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
    if (!response.ok) throw new Error(`Server request failed (${response.status}). Check the API endpoint and Cloudflare logs.`);
    throw new Error("Server returned an unreadable response. The API must return JSON.");
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
  else loginPanel?.classList.remove("hidden");

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("active", link.dataset.nav === screenId);
  });

  if (updateUrl) history.replaceState(null, "", `#${screenId}`);
  closeMenu();
}

function loggedOut(showMessage = false) {
  document.body.classList.remove("member-authenticated");
  sessionStorage.removeItem(KEY);
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


const FEEDS = {
  notices: "https://nafcaregroup.blogspot.com/feeds/posts/default/-/Notice",
  blog: "https://nafcaregroup.blogspot.com/feeds/posts/default/-/Blog"
};
function safeText(entry, key) {
  const v = entry?.[key];
  if (Array.isArray(v)) return v[0]?.term || "";
  return v?.$t || "";
}
function postTitle(entry) { return entry?.title?.$t || "Untitled"; }
function postLink(entry) { return (entry?.link || []).find(x => x.rel === "alternate")?.href || "https://nafcaregroup.blogspot.com/"; }
function postDate(entry) {
  const d = new Date(entry?.published?.$t || "");
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
}
function renderPosts(target, entries, emptyText) {
  const el = $(target); if (!el) return;
  el.replaceChildren();
  if (!entries.length) { const p=document.createElement("p"); p.className="muted"; p.textContent=emptyText; el.append(p); return; }
  entries.slice(0,4).forEach(entry => {
    const a=document.createElement("a"); a.className="update-item"; a.href=postLink(entry); a.target="_blank"; a.rel="noopener noreferrer";
    const title=document.createElement("strong"); title.textContent=postTitle(entry);
    const meta=document.createElement("small"); meta.textContent=postDate(entry);
    a.append(title,meta); el.append(a);
  });
}
async function loadFeed(kind) {
  const targets = kind === "notices" ? ["#recentNoticesList","#noticesList"] : ["#recentBlogList","#blogList"];
  targets.forEach(sel => { const el=$(sel); if(el) el.innerHTML='<p class="muted">Loading…</p>'; });
  try {
    const url=FEEDS[kind] + (FEEDS[kind].includes("?") ? "&" : "?") + "alt=json";
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok) throw new Error("Feed unavailable");
    const data=await res.json();
    const entries=data?.feed?.entry || [];
    targets.forEach(sel=>renderPosts(sel,entries,kind==="notices"?"No notices published yet.":"No blog posts published yet."));
  } catch {
    targets.forEach(sel=>{const el=$(sel);if(el){el.replaceChildren();const p=document.createElement("p");p.className="muted";p.textContent=kind==="notices"?"Notices could not be loaded. Open the Notices tab or try Refresh.":"Blog posts could not be loaded. Open the Blog tab or try Refresh.";el.append(p);}});
  }
}
function memberPhoto(member) { return typeof member?.photoUrl === "string" && /^https:\/\/.+/i.test(member.photoUrl) ? member.photoUrl : ""; }
function avatarNode(member, className="member-avatar") {
  const wrap=document.createElement("div"); wrap.className=className;
  const url=memberPhoto(member);
  if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>{img.remove();wrap.textContent=(member.name||"M").trim().charAt(0).toUpperCase();};wrap.append(img);}
  else wrap.textContent=(member.name||"M").trim().charAt(0).toUpperCase();
  return wrap;
}
async function loadMembers() {
  const list=$("#membersList"), search=$("#memberSearch");
  if(!list) return;
  list.replaceChildren(); const loading=document.createElement("p");loading.className="muted";loading.textContent="Loading members…";list.append(loading);
  try {
    const data=await request(API.members,{headers:headers()});
    const members=Array.isArray(data.members)?data.members:[];
    const render=()=>{
      const q=(search?.value||"").trim().toLowerCase(); list.replaceChildren();
      const filtered=members.filter(m=>[m.name,m.id,m.area].some(v=>String(v||"").toLowerCase().includes(q)));
      if(!filtered.length){const p=document.createElement("p");p.className="muted";p.textContent="No matching members found.";list.append(p);return;}
      filtered.forEach(m=>{
        const card=document.createElement("article");card.className="member-item";
        card.append(avatarNode(m));
        const info=document.createElement("div");info.className="member-item-info";
        const name=document.createElement("strong");name.textContent=m.name||"Member";
        const meta=document.createElement("small");meta.textContent=[m.id?"ID: "+m.id:"",m.area||"",m.status||""].filter(Boolean).join(" · ");
        info.append(name,meta);card.append(info);list.append(card);
      });
    };
    render(); if(search) search.oninput=render;
  } catch(err) {
    list.replaceChildren(); const p=document.createElement("p");p.className="error-text";p.textContent=err.message||"Member list could not be loaded.";list.append(p);
  }
}
function renderMemberIdentity(member) {
  const photo=memberPhoto(member);
  const sidebar=$("#sidebarMember"), sideImg=$("#sidebarMemberPhoto"), sideInitial=$("#sidebarMemberInitial");
  sidebar?.classList.remove("hidden");
  $("#sidebarMemberName") && ($("#sidebarMemberName").textContent=member.name||"Member");
  $("#sidebarMemberId") && ($("#sidebarMemberId").textContent="ID: "+(member.id||"—"));
  if(sideImg){sideImg.classList.toggle("hidden",!photo);if(photo){sideImg.src=photo;sideImg.onerror=()=>sideImg.classList.add("hidden");}}
  if(sideInitial){sideInitial.textContent=(member.name||"M").trim().charAt(0).toUpperCase();sideInitial.classList.toggle("hidden",!!photo);}
  const homeImg=$("#homeMemberPhoto"), homeInitial=$("#homeMemberInitial");
  if(homeImg){homeImg.classList.toggle("hidden",!photo);if(photo){homeImg.src=photo;homeImg.onerror=()=>homeImg.classList.add("hidden");}}
  if(homeInitial){homeInitial.textContent=(member.name||"M").trim().charAt(0).toUpperCase();homeInitial.classList.toggle("hidden",!!photo);}
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
    renderMemberIdentity(memberData.member);
    renderPayments(paymentData.payments, paymentData);

    document.body.classList.add("member-authenticated");
    loginPanel?.classList.add("hidden");
    $("#logoutBtn")?.classList.remove("hidden");
    $("#sidebarLogoutBtn")?.classList.remove("hidden");
    $("#profileLogoutBtn")?.classList.remove("hidden");

    const wanted = location.hash.slice(1);
    showScreen(SCREEN_IDS.includes(wanted) && PRIVATE_SCREENS.has(wanted) ? wanted : "home");
    message("Signed in", "Your account information has loaded.");
    loadMembers(); loadFeed("notices"); loadFeed("blog");
  } catch (error) {
    loggedOut();
    message("Unable to load account", error.message || "Please try again.", true);
    const loginError = document.getElementById("loginError");
    if (loginError) { loginError.textContent = error.message || "Please try again."; loginError.classList.remove("hidden"); }
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
      const loginError = document.getElementById("loginError");
      if (loginError) { loginError.textContent = ""; loginError.classList.add("hidden"); }
      await loadData();
    } catch (error) {
      message("Login failed", error.message || "Please check your details.", true);
      const loginError = document.getElementById("loginError");
      if (loginError) { loginError.textContent = error.message || "Please check your details."; loginError.classList.remove("hidden"); }
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

$("#refreshBtn")?.addEventListener("click", () => {
  if (session()) loadData();
  else message("Please log in", "There is no active member session.");
});

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

document.querySelectorAll('[data-nav]').forEach(link => link.addEventListener('click', () => {
  const target=link.getAttribute('data-nav');
  if(target==="members" && session()) loadMembers();
  if(target==="noticesPanel") loadFeed("notices");
  if(target==="blogPanel") loadFeed("blog");
}));
document.querySelectorAll('a[href="#noticesPanel"]').forEach(a=>a.addEventListener('click',()=>loadFeed("notices")));
document.querySelectorAll('a[href="#blogPanel"]').forEach(a=>a.addEventListener('click',()=>loadFeed("blog")));
if(window.lucide) window.lucide.createIcons();
