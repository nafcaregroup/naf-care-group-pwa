/*
 * NAF CARE GROUP PWA starter.
 * The directory below contains names only. Do not add private financial data here.
 * Connect to the Apps Script API only after authentication and server-side
 * authorization have been implemented and tested.
 */
const previewMembers = [
  "Tareq Aziz",
  "Jasim Uddin",
  "Ishaq Saeed",
  "Sifat Hossain",
  "Nurul Ansar Akash",
  "Shah Kamal Shafi",
  "Kafayat Ullah",
  "Abdullah",
  "Kafil Uddin",
  "Mizan"
];

const list = document.querySelector("#membersList");
const search = document.querySelector("#memberSearch");

function renderMembers(query = "") {
  const filtered = previewMembers.filter(name =>
    name.toLowerCase().includes(query.trim().toLowerCase())
  );
  list.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No members match your search.";
    list.appendChild(empty);
    return;
  }

  filtered.forEach(name => {
    const card = document.createElement("article");
    card.className = "member";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = name;
    const sub = document.createElement("small");
    sub.textContent = "Member profile will be connected later";
    text.append(title, sub);
    card.append(avatar, text);
    list.appendChild(card);
  });
}

search.addEventListener("input", event => renderMembers(event.target.value));
document.querySelector("#memberCount").textContent = String(previewMembers.length);
document.querySelector("#year").textContent = String(new Date().getFullYear());
document.querySelector("#refreshBtn").addEventListener("click", () => {
  renderMembers(search.value);
  const notice = document.querySelector("#notice");
  notice.querySelector("p").textContent =
    "Preview refreshed. No private financial data has been requested or loaded.";
});

renderMembers();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
