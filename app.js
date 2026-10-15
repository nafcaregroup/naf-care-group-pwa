const API={login:"/api/login",check:"/api/session-check",member:"/api/member",payments:"/api/payments",logout:"/api/logout"};
const $=s=>document.querySelector(s), KEY="nafCareSessionId";
const notice=$("#notice"), loginPanel=$("#loginPanel"), memberPanel=$("#memberPanel"), loginBtn=$("#loginBtn");
function message(title,text,error=false){notice.replaceChildren();const b=document.createElement("strong"),p=document.createElement("p");b.textContent=title;p.textContent=text;notice.append(b,p);notice.classList.toggle("notice-error",error);}
function session(){return sessionStorage.getItem(KEY)||""}
function headers(){const id=session();if(!id)throw Error("Session expired. Please log in again.");return {"X-Session-ID":id}}
function cash(v){return "৳"+Number(v||0).toLocaleString("en-BD",{maximumFractionDigits:2})}
async function request(url,opts={}){const r=await fetch(url,{cache:"no-store",...opts,headers:{...(opts.headers||{})}});let d;try{d=await r.json()}catch{throw Error("Server returned an unreadable response.")}if(!r.ok||d.ok!==true)throw Error(d.error||`Request failed (${r.status})`);return d}
function loggedOut(){sessionStorage.removeItem(KEY);loginPanel.classList.remove("hidden");memberPanel.classList.add("hidden");$("#logoutBtn").classList.add("hidden")}
function detail(box,label,value){const row=document.createElement("div");row.className="profile-row";const a=document.createElement("span"),b=document.createElement("strong");a.className="muted";a.textContent=label;b.textContent=value==null||value===""?"—":String(value);row.append(a,b);box.append(row)}
function renderProfile(m){$("#welcomeTitle").textContent="Welcome, "+(m.name||"Member");$("#capitalPaid").textContent=cash(m.capitalPaid);$("#capitalDue").textContent=cash(m.capitalDue);$("#monthlyDue").textContent=cash(m.monthlyDue);const box=$("#profileDetails");box.replaceChildren();[["Member ID",m.id],["Full name",m.name],["Email",m.email],["Phone",m.phone],["Ward / Area",m.area],["Status",m.status],["Capital required",cash(m.capitalRequired)],["Monthly contribution",cash(m.monthlyContribution)],["Monthly paid",cash(m.monthlyPaid)],["Months with due",m.monthsDue],["Total due",cash(m.totalDue)]].forEach(x=>detail(box,x[0],x[1]))}
function renderPayments(rows,result){const body=$("#paymentsBody");body.replaceChildren();$("#paymentSummary").textContent=`Monthly paid: ${cash(result.monthlyPaid)} · Monthly due: ${cash(result.monthlyDue)} · Months with due: ${result.monthsDue??0}`;if(!Array.isArray(rows)||!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="No payment history available.";tr.append(td);body.append(tr);return}rows.slice().reverse().forEach(p=>{const tr=document.createElement("tr");[`${p.monthName||p.month||""} ${p.year||""}`.trim(),cash(p.required),cash(p.paid),cash(p.due),p.status||"—"].forEach(v=>{const td=document.createElement("td");td.textContent=String(v);tr.append(td)});body.append(tr)})}
async function loadData(){if(!session()){loggedOut();return}try{await request(API.check,{headers:headers()});const [m,p]=await Promise.all([request(API.member,{headers:headers()}),request(API.payments,{headers:headers()})]);if(!m.member)throw Error("Member data missing.");renderProfile(m.member);renderPayments(p.payments,p);loginPanel.classList.add("hidden");memberPanel.classList.remove("hidden");$("#logoutBtn").classList.remove("hidden");message("Signed in","Your account information has loaded.")}catch(e){if(/session|required|expired|unauthorized/i.test(e.message))loggedOut();message("Unable to load account",e.message,true)}}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();loginBtn.disabled=true;loginBtn.textContent="Signing in…";try{const d=await request(API.login,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({memberId:$("#memberIdInput").value.trim(),email:$("#emailInput").value.trim()})});if(!d.sessionId)throw Error("No session returned.");sessionStorage.setItem(KEY,d.sessionId);await loadData()}catch(err){message("Login failed",err.message,true)}finally{loginBtn.disabled=false;loginBtn.textContent="Log in"}});
$("#logoutBtn").addEventListener("click",async()=>{try{if(session())await fetch(API.logout,{method:"POST",headers:headers(),cache:"no-store"})}catch{}loggedOut();message("Logged out","You have been signed out.")});
$("#refreshBtn").addEventListener("click",()=>session()?loadData():message("Please log in","No active session."));
$("#year").textContent=String(new Date().getFullYear());
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
if(session())loadData();else message("Member portal","Sign in to view your own member information.");




/* =========================================
   NOTICE & BLOG POSTS
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
    const url = new URL(
      "https://script.google.com/macros/s/AKfycby_KG4rhiHL5TRPtlOlEQ8h-2hlWHMpTgy5pEmtik0ZqD863DXt74vPQyfVh1BycM0mLg/exec"
    );
    url.searchParams.set("action", action);

    const response = await fetch(url.toString(), {
      cache: "no-store",
      redirect: "follow"
    });

    if (!response.ok) throw new Error("Unable to load posts.");

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

      if (post.published || post.date || post.publishedDate) {
        const date = document.createElement("p");
        date.className = "muted";
        date.textContent = post.published || post.date || post.publishedDate;
        article.appendChild(date);
      }

      const summary = document.createElement("p");
      summary.textContent = post.summary || post.snippet || post.content || "";
      article.appendChild(summary);

      if (post.url || post.link) {
        const link = document.createElement("a");
        link.href = post.url || post.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Read more ↗";
        article.appendChild(link);
      }

      container.appendChild(article);
    });
  } catch (error) {
    container.replaceChildren();

    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Posts could not be loaded. Please try again later.";
    container.appendChild(message);
  }
}

loadPublicPosts("notices", "noticesList");
loadPublicPosts("blog", "blogList");
