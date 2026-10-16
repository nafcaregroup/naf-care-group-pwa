
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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ ok: false, error: "Use POST." }, 405);
  }

  if (!env.DB || !env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
    return json({
      ok: false,
      error: "Server configuration is incomplete."
    }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }

  const memberId = String(body.memberId || "").trim().toUpperCase();
  const email = String(body.email || "").trim().toLowerCase();

  if (!memberId || !email || memberId.length > 30 || email.length > 254) {
    return json({
      ok: false,
      error: "Member ID and email are required."
    }, 400);
  }

  try {
    const response = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "login",
        memberId,
        email,
        secret: env.APPS_SCRIPT_SECRET
      }),
      redirect: "follow"
    });

    const verified = await response.json();

    if (
      !verified ||
      verified.ok !== true ||
      !verified.member ||
      !verified.member.id
    ) {
      return json({
        ok: false,
        error: "Invalid Member ID or Email."
      }, 401);
    }

    const sessionId = crypto.randomUUID() + crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 30 * 24 * 60 * 60;

    await env.DB.prepare(
      `INSERT INTO sessions
       (id, member_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    ).bind(
      sessionId,
      String(verified.member.id),
      expiresAt,
      now
    ).run();

    return json({
      ok: true,
      authenticated: true,
      sessionId,
      expiresAt,
      member: {
        id: verified.member.id,
        name: verified.member.name
      }
    });

  } catch (error) {
    return json({
      ok: false,
      error: "Login service temporarily unavailable."
    }, 502);
  }
}
