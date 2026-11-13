function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function generateRandomHint(memberId, secret) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode("NAF_ID_RH:" + String(memberId).trim().toUpperCase())
    )
  );
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[sig[i] % alphabet.length];
  }
  return code;
}

function maskPhone(phone) {
  const s = String(phone || "").trim();
  if (!s) return "—";
  if (s.length <= 6) return s.slice(0, 2) + "***";
  return s.slice(0, 3) + "****" + s.slice(-3);
}

function maskEmail(email) {
  const s = String(email || "").trim();
  if (!s || !s.includes("@")) return "—";
  const [user, domain] = s.split("@");
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const url = new URL(request.url);
  const memberId = String(url.searchParams.get("id") || "")
    .trim()
    .toUpperCase();
  const rh = String(url.searchParams.get("rh") || "")
    .trim()
    .toUpperCase();

  if (!memberId || memberId.length > 30 || !/^[A-Z0-9]{6}$/.test(rh)) {
    return json(
      { ok: false, verified: false, error: "Invalid verification link or Random Hint (rh)." },
      400
    );
  }

  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
    return json({ ok: false, error: "Server configuration is incomplete." }, 500);
  }

  try {
    const expectedRh = await generateRandomHint(memberId, env.APPS_SCRIPT_SECRET);
    if (rh !== expectedRh) {
      return json(
        { ok: false, verified: false, error: "Security hint mismatch. Please scan an authentic QR code." },
        403
      );
    }

    const upstream = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "members",
        secret: env.APPS_SCRIPT_SECRET
      }),
      redirect: "follow"
    });

    const data = await upstream.json();

    if (!upstream.ok || !data || data.ok !== true || !Array.isArray(data.members)) {
      return json({ ok: false, error: "Verification service unavailable." }, 502);
    }

    const found = data.members.find(
      m => String(m.id || "").trim().toUpperCase() === memberId
    );

    if (!found) {
      return json({ ok: false, verified: false, error: "Member ID not found." }, 404);
    }

    return json({
      ok: true,
      verified: true,
      member: {
        id: String(found.id || ""),
        name: String(found.name || ""),
        area: String(found.area || ""),
        status: String(found.status || ""),
        phoneMasked: maskPhone(found.phone),
        emailMasked: maskEmail(found.email),
        photoUrl: String(found.photoUrl || "")
      }
    });
  } catch {
    return json({ ok: false, error: "Unable to verify member right now." }, 502);
  }
}
