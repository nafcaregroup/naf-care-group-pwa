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
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Ambiguous 0/O, 1/I excluded
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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return json({ ok: false, error: "Use GET." }, 405);
  }

  if (!env.DB || !env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
    return json({ ok: false, error: "Server configuration is incomplete." }, 500);
  }

  const sessionId = request.headers.get("X-Session-ID");

  if (!sessionId || sessionId.length > 200) {
    return json({ ok: false, error: "Please log in again." }, 401);
  }

  try {
    const session = await env.DB.prepare(
      "SELECT member_id FROM sessions WHERE id = ? AND expires_at > ?"
    ).bind(sessionId, Math.floor(Date.now() / 1000)).first();

    if (!session) {
      return json({ ok: false, error: "Session expired. Please log in again." }, 401);
    }

    const response = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "member",
        memberId: session.member_id,
        secret: env.APPS_SCRIPT_SECRET
      }),
      redirect: "follow"
    });

    const data = await response.json();

    if (!response.ok || !data || data.ok !== true) {
      return json({ ok: false, error: "Unable to load member information." }, 502);
    }

    if (data.member && data.member.id) {
      data.member.rh = await generateRandomHint(
        data.member.id,
        env.APPS_SCRIPT_SECRET
      );
    }

    return json(data);
  } catch {
    return json({ ok: false, error: "Unable to load member information." }, 502);
  }
}
