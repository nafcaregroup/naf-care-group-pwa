/* NAF CARE GROUP PWA - app.js */

const API = {
  login: "/api/login",
  check: "/api/session-check",
  member: "/api/member",
  payments: "/api/payments",
  logout: "/api/logout",
  members: "/api/members",
  verify: "/api/verify"
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

const PUBLIC_SCREENS = new Set([
  "noticesPanel", "blogPanel", "aboutPanel"
]);

const IS_PUBLIC_VERIFY = new URLSearchParams(location.search).has("verify");

function message(title, text, error = false) {
  if (!notice || IS_PUBLIC_VERIFY) return;

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
  return localStorage.getItem(KEY) || "";
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
    const error = new Error(
      !response.ok
        ? `Server request failed (${response.status}). Check the API endpoint and Cloudflare logs.`
        : "Server returned an unreadable response. The API must return JSON."
    );

    error.status = response.status;
    throw error;
  }

  if (!response.ok || data.ok !== true) {
    const error = new Error(
      data.error || `Request failed (${response.status})`
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

function setScreenVisibility(screenId) {
  SCREEN_IDS.forEach(id => {
    const element = document.getElementById(id);

    if (element) {
      element.classList.toggle("hidden", id !== screenId);
    }
  });
}

function showScreen(screenId, updateUrl = true) {
  if (IS_PUBLIC_VERIFY) return;

  if (!SCREEN_IDS.includes(screenId)) {
    screenId = "home";
  }

  if (PRIVATE_SCREENS.has(screenId) && !session()) {
    SCREEN_IDS.forEach(id => {
      const element = document.getElementById(id);

      if (element) {
        element.classList.add("hidden");
      }
    });

    loginPanel?.classList.remove("hidden");

    message(
      "Member access",
      "Please log in to view member information."
    );

    closeMenu();
    return;
  }

  setScreenVisibility(screenId);

  if (screenId === "noticesPanel") markFeedAsSeen("notices");
  if (screenId === "blogPanel") markFeedAsSeen("blog");

  if (session()) {
    loginPanel?.classList.add("hidden");
  } else {
    loginPanel?.classList.remove("hidden");
  }

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.nav === screenId
    );
  });

  if (updateUrl) {
    history.replaceState(null, "", `#${screenId}`);
  }

  closeMenu();
}

function loggedOut(showMessage = false) {
  document.body.classList.remove("member-authenticated", "session-checking");
  document.getElementById("sessionLoader")?.classList.add("hidden");
  localStorage.removeItem(KEY);

  if (IS_PUBLIC_VERIFY) return;

  loginPanel?.classList.remove("hidden");
  memberPanel?.classList.add("hidden");

  [
    "logoutBtn",
    "sidebarLogoutBtn",
    "profileLogoutBtn"
  ].forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });

  SCREEN_IDS.forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.remove("active");
  });

  history.replaceState(null, "", location.pathname);

  closeMenu();

  if (showMessage) {
    message("Logged out", "You have been signed out.");
  } else {
    message(
      "Member portal",
      "Sign in to view your own member information."
    );
  }

  $("#bottomNav")?.classList.add("hidden");
}

function detail(container, label, value) {
  if (!container) return;

  const row = document.createElement("div");
  row.className = "profile-row";

  const name = document.createElement("span");
  const content = document.createElement("strong");

  name.className = "muted";
  name.textContent = label;

  content.textContent =
    value == null || value === "" ? "—" : String(value);

  row.append(name, content);
  container.append(row);
}

function renderProfile(member) {
  const welcome = $("#welcomeTitle");

  if (welcome) {
    welcome.textContent = "Welcome, " + (member.name || "Member");
  }

  const homeGreeting = $("#homeGreeting");

  if (homeGreeting) {
    homeGreeting.textContent =
      "Welcome, " + (member.name || "Member");
  }

  const capitalPaid = $("#capitalPaid");
  const capitalDue = $("#capitalDue");
  const monthlyDue = $("#monthlyDue");

  if (capitalPaid) {
    capitalPaid.textContent = cash(member.capitalPaid);
  }

  if (capitalDue) {
    capitalDue.textContent = cash(member.capitalDue);
  }

  const monthlyPaid = $("#monthlyPaid");

  if (monthlyPaid) {
    monthlyPaid.textContent = cash(member.monthlyPaid);
  }

  if (monthlyDue) {
    monthlyDue.textContent = cash(member.monthlyDue);
  }

  // Calculate Total Deposit
  const totalDeposit = $("#totalDeposit");

  if (totalDeposit) {
    const total =
      Number(member.capitalPaid || 0) +
      Number(member.monthlyPaid || 0);

    totalDeposit.textContent = cash(total);
  }

  // Calculate Total Due
  const totalDue = $("#totalDue");

  if (totalDue) {
    const total =
      Number(member.capitalDue || 0) +
      Number(member.monthlyDue || 0);

    totalDue.textContent = cash(total);
  }

  // Keep the print statement summary synchronized with the member data.
  const statementTotalDeposit =
    Number(member.capitalPaid || 0) + Number(member.monthlyPaid || 0);
  const statementTotalDue =
    Number(member.capitalDue || 0) + Number(member.monthlyDue || 0);

  const statementValues = {
    statementMemberName: member.name || "Member",
    statementMemberId: member.id || "—",
    statementDate: new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric"
    }),
    statementCapitalPaid: cash(member.capitalPaid),
    statementCapitalDue: cash(member.capitalDue),
    statementMonthlyPaid: cash(member.monthlyPaid),
    statementMonthlyDue: cash(member.monthlyDue),
    statementTotalDeposit: cash(statementTotalDeposit),
    statementTotalDue: cash(statementTotalDue)
  };

  Object.entries(statementValues).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  const profileName = $("#profileName");

  if (profileName) {
    profileName.textContent = member.name || "Member";
  }

  const profilePhoto = $("#profileMemberPhoto");
  const profileInitial = $("#profileMemberInitial");
  const profileId = $("#profileMemberId");
  const profileUrl = memberPhoto(member);

  if (profilePhoto) {
    profilePhoto.classList.toggle("hidden", !profileUrl);
    profilePhoto.removeAttribute("src");

    if (profileUrl) {
      profilePhoto.crossOrigin = "anonymous";
      profilePhoto.referrerPolicy = "no-referrer";
      profilePhoto.src = profileUrl;

      profilePhoto.onerror = () => {
        // Retry without crossOrigin if the image host blocks CORS headers
        if (profilePhoto.hasAttribute("crossorigin")) {
          profilePhoto.removeAttribute("crossorigin");
          profilePhoto.src = profileUrl;
          return;
        }
        profilePhoto.classList.add("hidden");

        if (profileInitial) {
          profileInitial.classList.remove("hidden");
        }
      };
    }
  }

  if (profileInitial) {
    profileInitial.textContent =
      (member.name || "M").trim().charAt(0).toUpperCase();

    profileInitial.classList.toggle("hidden", !!profileUrl);
  }

  if (profileId) {
    profileId.textContent = member.id || "—";
  }

  // Digital Member ID Card Data & Ultra-Crisp QR Code (rh hidden inside URL only)
  window.__currentVerifyUrl = "";
  window.__currentMemberId = member.id || "Member";

  const idCardArea = document.getElementById("idCardArea");
  if (idCardArea) idCardArea.textContent = member.area || "—";

  const idCardPhone = document.getElementById("idCardPhone");
  if (idCardPhone) idCardPhone.textContent = member.phone || "—";

  const idCardEmail = document.getElementById("idCardEmail");
  if (idCardEmail) idCardEmail.textContent = member.email || "—";

  const idCardStatus = document.getElementById("idCardStatus");
  if (idCardStatus) {
    const st = (member.status || "MEMBER").trim().toUpperCase();
    idCardStatus.textContent = st === "ACTIVE" ? "MEMBER" : st;
  }

  const qrContainer = document.getElementById("memberQrCode");
  if (qrContainer && window.QRCode && member.id && member.rh) {
    qrContainer.replaceChildren();
    const verifyUrl = `${location.origin}${location.pathname}?verify=${encodeURIComponent(member.id)}&rh=${encodeURIComponent(member.rh)}`;
    window.__currentVerifyUrl = verifyUrl;

    new window.QRCode(qrContainer, {
      text: verifyUrl,
      width: 512,
      height: 512,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  // Real Scannable Barcode encoding the Member ID
  const barcodeEl = document.getElementById("memberBarcode");
  if (barcodeEl && window.JsBarcode && member.id) {
    window.JsBarcode(barcodeEl, String(member.id).trim(), {
      format: "CODE128",
      lineColor: "#0d1f1c",
      background: "#ffffff",
      width: 1.8,
      height: 28,
      displayValue: false,
      margin: 0
    });
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
    ].forEach(item => detail(box, item[0], item[1]));
  }

  const monthlyAmount = $("#infoMonthlyAmount");

  if (monthlyAmount) {
    monthlyAmount.textContent = cash(member.monthlyContribution);
  }
}

function renderPayments(rows, result) {
  const body = $("#paymentsBody");
  const summary = $("#paymentSummary");

  if (summary) {
    summary.textContent =
      `Monthly paid: ${cash(result.monthlyPaid)} · ` +
      `Monthly due: ${cash(result.monthlyDue)} · ` +
      `Months with due: ${result.monthsDue ?? 0}`;
  }

  // The backend rows are displayed newest-first below.
  const latestPayment = Array.isArray(rows) && rows.length
    ? rows[rows.length - 1]
    : null;
  const latestMonthElement = document.getElementById("statementLatestMonth");

  if (latestMonthElement) {
    latestMonthElement.textContent = latestPayment
      ? `${latestPayment.monthName || latestPayment.month || ""} ${latestPayment.year || ""}`.trim()
      : "No payment record";
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

/* Blogger Notice and Blog feeds use the Cloudflare Pages API proxy. */
const FEEDS = {
  notices: "/api/feed?kind=notices",
  blog: "/api/feed?kind=blog"
};

const FEED_PAGE_SIZE = 4;

const feedState = {
  notices: { entries: [], shown: FEED_PAGE_SIZE, loaded: false },
  blog: { entries: [], shown: FEED_PAGE_SIZE, loaded: false }
};

const SEEN_FEED_KEYS = {
  notices: "nafCareLastSeenNotice",
  blog: "nafCareLastSeenBlog"
};

function entryUid(entry) {
  return entry?.id?.$t || postLink(entry) || postTitle(entry);
}

function setUnreadBadge(kind, hasUnread) {
  const navTarget = kind === "notices" ? "noticesPanel" : "blogPanel";
  document.querySelectorAll(`[data-nav="${navTarget}"]`).forEach(el => {
    el.classList.toggle("has-unread-badge", Boolean(hasUnread));
  });
}

function syncFeedUnreadBadge(kind) {
  const entries = feedState[kind]?.entries || [];
  if (!entries.length) {
    setUnreadBadge(kind, false);
    return;
  }

  const latestId = entryUid(entries[0]);
  const lastSeenId = localStorage.getItem(SEEN_FEED_KEYS[kind]) || "";
  const activeScreen = location.hash.slice(1);
  const currentTabKind = activeScreen === "noticesPanel" ? "notices" : activeScreen === "blogPanel" ? "blog" : "";

  if (currentTabKind === kind) {
    localStorage.setItem(SEEN_FEED_KEYS[kind], latestId);
    setUnreadBadge(kind, false);
  } else {
    setUnreadBadge(kind, latestId !== lastSeenId);
  }
}

function markFeedAsSeen(kind) {
  const entries = feedState[kind]?.entries || [];
  if (entries.length) {
    localStorage.setItem(SEEN_FEED_KEYS[kind], entryUid(entries[0]));
  }
  setUnreadBadge(kind, false);
}

function postTitle(entry) {
  return entry?.title?.$t || "Untitled";
}

function postLink(entry) {
  return (
    (entry?.link || []).find(item => item.rel === "alternate")?.href ||
    "https://nafcaregroup.blogspot.com/"
  );
}

function postDate(entry) {
  const date = new Date(entry?.published?.$t || "");

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
}

function sanitizePostHtml(rawHtml) {
  const doc = new DOMParser().parseFromString(rawHtml || "", "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed").forEach(el => el.remove());
  doc.querySelectorAll("*").forEach(el => {
    el.removeAttribute("style");
    el.removeAttribute("class");
    [...el.attributes].forEach(attr => {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

function openPostReader(entry, categoryLabel = "UPDATE") {
  const modal = document.getElementById("postReaderModal");
  const titleEl = document.getElementById("readerTitle");
  const dateEl = document.getElementById("readerDate");
  const catEl = document.getElementById("readerCategory");
  const bodyEl = document.getElementById("readerBody");
  const extLink = document.getElementById("readerExternalLink");

  if (!modal || !bodyEl) {
    window.open(postLink(entry), "_blank", "noopener,noreferrer");
    return;
  }

  if (catEl) catEl.textContent = categoryLabel;
  if (titleEl) titleEl.textContent = postTitle(entry);
  if (dateEl) dateEl.textContent = postDate(entry);
  if (extLink) extLink.href = postLink(entry);

  const rawContent = entry?.content?.$t || entry?.summary?.$t || "<p>No content available.</p>";
  bodyEl.innerHTML = sanitizePostHtml(rawContent);
  bodyEl.scrollTop = 0;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closePostReader() {
  const modal = document.getElementById("postReaderModal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("closeReaderBtn")?.addEventListener("click", closePostReader);
document.getElementById("closeReaderFooterBtn")?.addEventListener("click", closePostReader);
document.getElementById("readerBackdrop")?.addEventListener("click", closePostReader);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePostReader();
});

function renderPosts(target, entries, emptyText, limit = FEED_PAGE_SIZE) {
  const el = $(target);
  if (!el) return;

  el.replaceChildren();

  if (!entries.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = emptyText;
    el.append(p);
    return;
  }

  const categoryLabel = target.toLowerCase().includes("notice") ? "NOTICE" : "BLOG";

  entries.slice(0, limit).forEach(entry => {
    const a = document.createElement("a");
    a.className = "update-item";
    a.href = postLink(entry);

    a.addEventListener("click", event => {
      event.preventDefault();
      openPostReader(entry, categoryLabel);
    });

    const title = document.createElement("strong");
    title.textContent = postTitle(entry);

    const meta = document.createElement("small");
    meta.textContent = postDate(entry);

    a.append(title, meta);
    el.append(a);
  });
}

function updateSeeMoreButton(kind) {
  const state = feedState[kind];

  const button = document.getElementById(
    kind === "notices" ? "loadMoreNotices" : "loadMoreBlog"
  );

  if (!button || !state) return;

  button.hidden =
    !state.loaded || state.shown >= state.entries.length;

  button.disabled = false;
  button.textContent = "See More";
}

function renderFeedKind(kind) {
  const state = feedState[kind];
  if (!state || !state.loaded) return;

  const emptyText = kind === "notices"
    ? "No notices published yet."
    : "No blog posts published yet.";

  const homeTarget = kind === "notices"
    ? "#recentNoticesList"
    : "#recentBlogList";

  const tabTarget = kind === "notices"
    ? "#noticesList"
    : "#blogList";

  // Home page always displays only the latest four posts.
  renderPosts(
    homeTarget,
    state.entries,
    emptyText,
    FEED_PAGE_SIZE
  );

  // The dedicated tab displays four posts initially, then four more per click.
  renderPosts(
    tabTarget,
    state.entries,
    emptyText,
    state.shown
  );

  updateSeeMoreButton(kind);
}

async function loadFeed(kind, forceReload = false) {
  if (!Object.prototype.hasOwnProperty.call(FEEDS, kind)) {
    return;
  }

  const state = feedState[kind];

  if (state.loaded && !forceReload) {
    renderFeedKind(kind);
    return;
  }

  const targets = kind === "notices"
    ? ["#recentNoticesList", "#noticesList"]
    : ["#recentBlogList", "#blogList"];

  targets.forEach(selector => {
    const el = $(selector);
    if (!el) return;

    const skeletons = Array.from({ length: 3 }, () => {
      const card = document.createElement("div");
      card.className = "skeleton-card";
      card.innerHTML = `<div class="skeleton-line title"></div><div class="skeleton-line meta"></div>`;
      return card;
    });
    el.replaceChildren(...skeletons);
  });

  const button = document.getElementById(
    kind === "notices" ? "loadMoreNotices" : "loadMoreBlog"
  );

  if (button) {
    button.hidden = true;
  }

  try {
    const res = await fetch(FEEDS[kind], {
      method: "GET",
      cache: "no-store",
      headers: {
        "Accept": "application/json"
      }
    });

    let data;

    try {
      data = await res.json();
    } catch {
      throw new Error("Feed API returned an unreadable response.");
    }

    if (
      !res.ok ||
      data.ok !== true ||
      !Array.isArray(data.entries)
    ) {
      throw new Error(data.error || "Feed could not be loaded.");
    }

    state.entries = data.entries;
    state.shown = FEED_PAGE_SIZE;
    state.loaded = true;

    renderFeedKind(kind);
    syncFeedUnreadBadge(kind);

  } catch (error) {
    const errorText = kind === "notices"
      ? "Notices could not be loaded. Please try again later."
      : "Blog posts could not be loaded. Please try again later.";

    targets.forEach(selector => {
      const el = $(selector);
      if (!el) return;

      el.replaceChildren();

      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = errorText;

      el.append(p);
    });

    if (button) {
      button.hidden = true;
    }

    console.error(`Failed to load ${kind} feed:`, error);
  }
}

function loadMorePosts(kind) {
  const state = feedState[kind];

  if (
    !state ||
    !state.loaded ||
    state.shown >= state.entries.length
  ) {
    return;
  }

  state.shown = Math.min(
    state.shown + FEED_PAGE_SIZE,
    state.entries.length
  );

  renderFeedKind(kind);
}

document.getElementById("loadMoreNotices")?.addEventListener(
  "click",
  () => loadMorePosts("notices")
);

document.getElementById("loadMoreBlog")?.addEventListener(
  "click",
  () => loadMorePosts("blog")
);

function memberPhoto(member) {
  return typeof member?.photoUrl === "string" &&
    /^https:\/\/.+/i.test(member.photoUrl)
    ? member.photoUrl
    : "";
}

function avatarNode(member, className = "member-avatar") {
  const wrap = document.createElement("div");
  wrap.className = className;

  const url = memberPhoto(member);

  if (url) {
    const img = document.createElement("img");

    img.src = url;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";

    img.onerror = () => {
      img.remove();
      wrap.textContent =
        (member.name || "M").trim().charAt(0).toUpperCase();
    };

    wrap.append(img);
  } else {
    wrap.textContent =
      (member.name || "M").trim().charAt(0).toUpperCase();
  }

  return wrap;
}

function openMemberQuickModal(member) {
  const modal = document.getElementById("memberQuickModal");
  if (!modal) return;

  const avatarWrap = document.getElementById("qmAvatarWrap");
  const nameEl = document.getElementById("qmName");
  const idBadge = document.getElementById("qmIdBadge");
  const statusBadge = document.getElementById("qmStatusBadge");
  const areaEl = document.getElementById("qmArea");
  const phoneRow = document.getElementById("qmPhoneRow");
  const phoneEl = document.getElementById("qmPhone");
  const actionsEl = document.getElementById("qmActions");

  if (avatarWrap) {
    avatarWrap.replaceChildren();
    const url = memberPhoto(member);
    const initial = (member.name || "M").trim().charAt(0).toUpperCase();
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = member.name || "Member";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => {
        img.remove();
        avatarWrap.textContent = initial;
      };
      avatarWrap.append(img);
    } else {
      avatarWrap.textContent = initial;
    }
  }

  if (nameEl) nameEl.textContent = member.name || "Member";
  if (idBadge) idBadge.textContent = member.id ? `ID: ${member.id}` : "MEMBER";

  if (statusBadge) {
    const statusText = (member.status || "Active").trim();
    statusBadge.textContent = statusText;
    statusBadge.classList.toggle("inactive", /inactive|suspended|closed/i.test(statusText));
  }

  if (areaEl) areaEl.textContent = member.area || "—";

  const rawPhone = String(member.phone || member.mobile || member.cell || member.contact || "").trim();
  if (phoneRow && phoneEl) {
    phoneRow.classList.toggle("hidden", !rawPhone);
    phoneEl.textContent = rawPhone || "—";
  }

  if (actionsEl) {
    actionsEl.replaceChildren();
    const cleanDigits = rawPhone.replace(/[^\d+]/g, "");
    if (cleanDigits) {
      const waDigits = cleanDigits.startsWith("01") ? "88" + cleanDigits : cleanDigits.replace(/^\+/, "");

      const callLink = document.createElement("a");
      callLink.href = `tel:${cleanDigits}`;
      callLink.className = "primary-button qm-action-btn";
      callLink.textContent = "📞 Call Now";

      const waLink = document.createElement("a");
      waLink.href = `https://wa.me/${waDigits}`;
      waLink.target = "_blank";
      waLink.rel = "noopener noreferrer";
      waLink.className = "ghost-button qm-action-btn";
      waLink.textContent = "💬 WhatsApp";

      actionsEl.append(callLink, waLink);
    }
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeMemberQuickModal() {
  const modal = document.getElementById("memberQuickModal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("closeQmBtn")?.addEventListener("click", closeMemberQuickModal);
document.getElementById("qmBackdrop")?.addEventListener("click", closeMemberQuickModal);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMemberQuickModal();
});

async function loadMembers() {
  const list = $("#membersList");
  const search = $("#memberSearch");
  const countBadge = $("#memberCountBadge");
  const areaFilters = $("#memberAreaFilters");

  if (!list) return;

  const memberSkeletons = Array.from({ length: 4 }, () => {
    const row = document.createElement("div");
    row.className = "skeleton-member";
    row.innerHTML = `<div class="skeleton-avatar"></div><div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="skeleton-line title"></div><div class="skeleton-line meta"></div></div>`;
    return row;
  });
  list.replaceChildren(...memberSkeletons);

  try {
    const data = await request(API.members, {
      headers: headers()
    });

    const members = Array.isArray(data.members)
      ? data.members
      : [];

    let selectedArea = "ALL";

    // Build dynamic area filter chips
    if (areaFilters) {
      areaFilters.replaceChildren();
      const uniqueAreas = [...new Set(members.map(m => String(m.area || "").trim()).filter(Boolean))];

      if (uniqueAreas.length > 1) {
        const allAreas = ["ALL", ...uniqueAreas];
        allAreas.forEach(area => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "area-chip" + (area === selectedArea ? " active" : "");
          btn.textContent = area === "ALL" ? `All (${members.length})` : area;

          btn.addEventListener("click", () => {
            selectedArea = area;
            areaFilters.querySelectorAll(".area-chip").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            render();
          });

          areaFilters.append(btn);
        });
      }
    }

    const render = () => {
      const q = (search?.value || "").trim().toLowerCase();
      list.replaceChildren();

      const filtered = members.filter(m => {
        const matchesArea = selectedArea === "ALL" || String(m.area || "").trim() === selectedArea;
        const matchesQuery = !q || [m.name, m.id, m.area].some(v =>
          String(v || "").toLowerCase().includes(q)
        );
        return matchesArea && matchesQuery;
      });

      if (countBadge) {
        countBadge.textContent = filtered.length === members.length
          ? `Total: ${members.length} Members`
          : `Showing ${filtered.length} of ${members.length}`;
      }

      if (!filtered.length) {
        const p = document.createElement("p");
        p.className = "muted";
        p.style.gridColumn = "1 / -1";
        p.textContent = "No matching members found.";
        list.append(p);
        return;
      }

      filtered.forEach(m => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "member-card";
        card.setAttribute("aria-label", `View details for ${m.name || "Member"}`);

        card.addEventListener("click", () => openMemberQuickModal(m));

        card.append(avatarNode(m));

        const body = document.createElement("div");
        body.className = "member-card-body";

        const top = document.createElement("div");
        top.className = "member-card-top";

        const name = document.createElement("strong");
        name.textContent = m.name || "Member";

        const statusText = (m.status || "Active").trim();
        const statusPill = document.createElement("span");
        statusPill.className = "member-status-pill" + (/inactive|suspended|closed/i.test(statusText) ? " inactive" : "");
        statusPill.textContent = statusText;

        top.append(name, statusPill);

        const meta = document.createElement("div");
        meta.className = "member-card-meta";

        if (m.id) {
          const idPill = document.createElement("span");
          idPill.className = "member-id-pill";
          idPill.textContent = `ID: ${m.id}`;
          meta.append(idPill);
        }

        if (m.area) {
          const areaTag = document.createElement("span");
          areaTag.className = "member-area-tag";
          areaTag.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
          const areaText = document.createElement("span");
          areaText.textContent = m.area;
          areaTag.append(areaText);
          meta.append(areaTag);
        }

        body.append(top, meta);
        card.append(body);
        list.append(card);
      });
    };

    render();

    if (search) {
      search.oninput = render;
    }

  } catch (err) {
    if (countBadge) countBadge.textContent = "Error";
    list.replaceChildren();

    const p = document.createElement("p");
    p.className = "error-text";
    p.style.gridColumn = "1 / -1";
    p.textContent =
      err.message || "Member list could not be loaded.";

    list.append(p);
  }
}

function renderMemberIdentity(member) {
  const photo = memberPhoto(member);

  const sidebar = $("#sidebarMember");
  const sideImg = $("#sidebarMemberPhoto");
  const sideInitial = $("#sidebarMemberInitial");

  sidebar?.classList.remove("hidden");

  const sidebarName = $("#sidebarMemberName");
  if (sidebarName) {
    sidebarName.textContent = member.name || "Member";
  }

  const sidebarId = $("#sidebarMemberId");
  if (sidebarId) {
    sidebarId.textContent = "ID: " + (member.id || "—");
  }

  if (sideImg) {
    sideImg.classList.toggle("hidden", !photo);

    if (photo) {
      sideImg.src = photo;
      sideImg.onerror = () => sideImg.classList.add("hidden");
    }
  }

  if (sideInitial) {
    sideInitial.textContent =
      (member.name || "M").trim().charAt(0).toUpperCase();

    sideInitial.classList.toggle("hidden", !!photo);
  }

  const homeImg = $("#homeMemberPhoto");
  const homeInitial = $("#homeMemberInitial");

  if (homeImg) {
    homeImg.classList.toggle("hidden", !photo);

    if (photo) {
      homeImg.src = photo;
      homeImg.onerror = () => homeImg.classList.add("hidden");
    }
  }

  if (homeInitial) {
    homeInitial.textContent =
      (member.name || "M").trim().charAt(0).toUpperCase();

    homeInitial.classList.toggle("hidden", !!photo);
  }
}

async function loadData() {
  if (!session()) {
    loggedOut();
    return;
  }

  try {
    // Step 1: Check whether the saved session is valid.
    await request(API.check, {
      headers: headers()
    });
  } catch (error) {
    // Do not clear the session for a temporary network/server error.
    // Only log out when the session is actually invalid or expired.
    if (error.status === 401) {
      loggedOut();

      message(
        "Session expired",
        "Please log in again.",
        true
      );
      return;
    }

    message(
      "Connection problem",
      "Your saved session is kept. Please try again.",
      true
    );
    return;
  }

  // Session is valid. Load account information.
  try {
    const [memberData, paymentData] = await Promise.all([
      request(API.member, {
        headers: headers()
      }),
      request(API.payments, {
        headers: headers()
      })
    ]);

    if (!memberData.member) {
      throw new Error("Member data is missing.");
    }

    renderProfile(memberData.member);
    renderMemberIdentity(memberData.member);
    renderPayments(paymentData.payments, paymentData);

    document.body.classList.add("member-authenticated");

    $("#bottomNav")?.classList.remove("hidden");
    loginPanel?.classList.add("hidden");

    $("#logoutBtn")?.classList.remove("hidden");
    $("#sidebarLogoutBtn")?.classList.remove("hidden");
    $("#profileLogoutBtn")?.classList.remove("hidden");

    const wanted = location.hash.slice(1);

    showScreen(
      SCREEN_IDS.includes(wanted) && PRIVATE_SCREENS.has(wanted)
        ? wanted
        : "home"
    );

    loadMembers();
    loadFeed("notices");
    loadFeed("blog");

  } catch (error) {
    // Keep the session if account data fails to load.
    // Do not call loggedOut() here.
    message(
      "Unable to load account",
      error.message || "Please try again.",
      true
    );
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memberId,
          email
        })
      });

      if (!data.sessionId) {
        throw new Error("No session returned by the server.");
      }

      localStorage.setItem(KEY, data.sessionId);

      const loginError = document.getElementById("loginError");

      if (loginError) {
        loginError.textContent = "";
        loginError.classList.add("hidden");
      }

      await loadData();

    } catch (error) {
      message(
        "Login failed",
        error.message || "Please check your details.",
        true
      );

      const loginError = document.getElementById("loginError");

      if (loginError) {
        loginError.textContent =
          error.message || "Please check your details.";

        loginError.classList.remove("hidden");
      }

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
  if (sidebar?.classList.contains("sidebar-open")) {
    closeMenu();
  } else {
    openMenu();
  }
});

moreBtn?.addEventListener("click", event => {
  event.preventDefault();
  openMenu();
});

backdrop?.addEventListener("click", closeMenu);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

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

    if (!href || !href.startsWith("#")) return;

    const target = href.slice(1);

    if (SCREEN_IDS.includes(target)) {
      event.preventDefault();
      showScreen(target);
    }
  });
});

window.addEventListener("hashchange", () => {
  showScreen(
    location.hash.slice(1) || (session() ? "home" : "noticesPanel"),
    false
  );
});

const year = $("#year");

if (year) {
  year.textContent = String(new Date().getFullYear());
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

document.querySelectorAll("[data-nav]").forEach(link => {
  link.addEventListener("click", () => {
    const target = link.getAttribute("data-nav");

    if (target === "members" && session()) {
      loadMembers();
    }

    if (target === "noticesPanel") {
      loadFeed("notices");
    }

    if (target === "blogPanel") {
      loadFeed("blog");
    }
  });
});

document.querySelectorAll('a[href="#noticesPanel"]').forEach(a => {
  a.addEventListener("click", () => loadFeed("notices"));
});

document.querySelectorAll('a[href="#blogPanel"]').forEach(a => {
  a.addEventListener("click", () => loadFeed("blog"));
});

if (window.lucide) {
  window.lucide.createIcons();
}

// ========================================
// NAF CARE GROUP - BROWSER PRINT STATEMENT
// ========================================

document.getElementById("statementDownloadBtn")
  ?.addEventListener("click", function () {
    if (!session()) {
      message(
        "Please log in",
        "Log in before downloading your statement.",
        true
      );
      return;
    }

    const originalTitle = document.title;
    const memberId = document.getElementById("statementMemberId")?.textContent?.trim() || "Member";
    document.title = `${memberId}_Financial_Statement`;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  });

// ========================================
// DIGITAL ID CARD DOWNLOAD, SHARE & VERIFY
// ========================================

document.getElementById("downloadIdCardBtn")?.addEventListener("click", async function () {
  const card = document.getElementById("digitalIdCard");
  if (!card || !window.html2canvas) {
    alert("ID Card generator is loading. Please try again.");
    return;
  }

  const btn = this;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Generating HD PNG…";

  try {
    const canvas = await window.html2canvas(card, {
      scale: 4,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#f5f9f8",
      logging: false,
      onclone: (clonedDoc) => {
        const origImg = document.getElementById("profileMemberPhoto");
        const clonedImg = clonedDoc.getElementById("profileMemberPhoto");

        if (origImg && clonedImg && !origImg.classList.contains("hidden") && origImg.naturalWidth > 0) {
          const boxW = origImg.clientWidth || 90;
          const boxH = origImg.clientHeight || 110;
          const targetRatio = boxW / boxH;
          const imgRatio = origImg.naturalWidth / origImg.naturalHeight;

          let sx = 0, sy = 0, sWidth = origImg.naturalWidth, sHeight = origImg.naturalHeight;
          if (imgRatio > targetRatio) {
            sWidth = origImg.naturalHeight * targetRatio;
            sx = (origImg.naturalWidth - sWidth) / 2;
          } else {
            sHeight = origImg.naturalWidth / targetRatio;
            sy = 0; // Keep head/face top-aligned
          }

          try {
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = Math.round(boxW * 4);
            cropCanvas.height = Math.round(boxH * 4);
            const ctx = cropCanvas.getContext("2d");
            ctx.drawImage(origImg, sx, sy, sWidth, sHeight, 0, 0, cropCanvas.width, cropCanvas.height);

            clonedImg.src = cropCanvas.toDataURL("image/png");
            clonedImg.style.width = "100%";
            clonedImg.style.height = "100%";
            clonedImg.style.objectFit = "fill";
          } catch {
            // Safe fallback if external host lacks CORS headers: preserve aspect ratio without stretching
            if (imgRatio > targetRatio) {
              clonedImg.style.height = "100%";
              clonedImg.style.width = "auto";
              clonedImg.style.maxWidth = "none";
            } else {
              clonedImg.style.width = "100%";
              clonedImg.style.height = "auto";
              clonedImg.style.maxHeight = "none";
            }
          }
        }
      }
    });

    const link = document.createElement("a");
    link.download = `${window.__currentMemberId || "NAF"}_Member_ID_Card.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  } catch {
    alert("Could not download ID card image. Please try taking a screenshot.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

document.getElementById("shareIdCardBtn")?.addEventListener("click", async function () {
  const url = window.__currentVerifyUrl;
  if (!url) return;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "NAF CARE GROUP - Digital Member ID",
        text: "Verify my official NAF CARE GROUP membership:",
        url
      });
      return;
    } catch {
      // Fallback to clipboard copy if cancelled or unsupported
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    const btn = this;
    const orig = btn.textContent;
    btn.textContent = "Link Copied ✓";
    setTimeout(() => {
      btn.textContent = orig;
    }, 2000);
  } catch {
    prompt("Copy your verification link:", url);
  }
});

async function checkPublicVerification() {
  const params = new URLSearchParams(location.search);
  const verifyId = params.get("verify")?.trim();
  const rh = params.get("rh")?.trim();

  document.body.classList.add("public-verify-mode");
  document.body.classList.remove("session-checking");
  document.getElementById("sessionLoader")?.classList.add("hidden");

  const screen = document.getElementById("verifyScreen");
  const resultBox = document.getElementById("verifyResult");
  screen?.classList.remove("hidden");

  if (!verifyId || !rh) {
    resultBox.innerHTML = `
      <span class="verify-badge-fail">✕ INVALID LINK</span>
      <h2>Verification Failed</h2>
      <p class="muted">Member ID or Security Hint (rh) is missing. Please scan an official QR code.</p>
    `;
    return;
  }

  try {
    const res = await fetch(
      `${API.verify}?id=${encodeURIComponent(verifyId)}&rh=${encodeURIComponent(rh)}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (!res.ok || !data.verified || !data.member) {
      resultBox.innerHTML = `
        <span class="verify-badge-fail">✕ NOT VERIFIED</span>
        <h2>Verification Failed</h2>
        <p class="muted">${data.error || "Invalid Member ID or Security Hint."}</p>
      `;
      return;
    }

    const m = data.member;
    const initial = (m.name || "M").trim().charAt(0).toUpperCase();
    const photoHtml = m.photoUrl && /^https:\/\/.+/i.test(m.photoUrl)
      ? `<img src="${m.photoUrl}" alt="${m.name}" referrerpolicy="no-referrer">`
      : initial;

    resultBox.innerHTML = `
      <span class="verify-badge-ok">✓ VERIFIED MEMBER</span>
      <div class="verify-photo">${photoHtml}</div>
      <h2>${m.name}</h2>
      <p class="muted">Member ID: <strong>${m.id}</strong></p>
      <div class="verify-meta-box">
        <div><span>Status</span><strong style="color:#5eead4">${m.status || "Active"}</strong></div>
        <div><span>Ward / Area</span><strong>${m.area || "—"}</strong></div>
        <div><span>Phone</span><strong>${m.phoneMasked || "—"}</strong></div>
        <div><span>Email</span><strong>${m.emailMasked || "—"}</strong></div>
        <div><span>Organization</span><strong>NAF CARE GROUP</strong></div>
      </div>
    `;
  } catch {
    resultBox.innerHTML = `
      <span class="verify-badge-fail">CONNECTION ERROR</span>
      <p class="muted">Could not verify member right now. Please try again.</p>
    `;
  }
}

// App Entry Point
if (IS_PUBLIC_VERIFY) {
  checkPublicVerification();
} else if (session()) {
  document.body.classList.add("session-checking");
  document.getElementById("sessionLoader")?.classList.remove("hidden");
  loadData().finally(() => {
    document.body.classList.remove("session-checking");
    document.getElementById("sessionLoader")?.classList.add("hidden");
  });
} else {
  loggedOut();
}

// ========================================
// PWA INSTALL PROMPT HANDLER
// ========================================
let deferredPrompt = null;
const installAppBtn = document.getElementById("installAppBtn");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installAppBtn?.classList.remove("hidden");
});

installAppBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    installAppBtn.classList.add("hidden");
  }

  deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  installAppBtn?.classList.add("hidden");
});
