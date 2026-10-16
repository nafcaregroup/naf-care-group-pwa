
export async function onRequestPost({ request, env }) {
  try {
    // 1. Check login session
    const sessionId = request.headers.get("X-Session-ID");

    if (!sessionId) {
      return Response.json(
        { ok: false, error: "Please log in first." },
        { status: 401 }
      );
    }

    if (!env.DB || !env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
      return Response.json(
        { ok: false, error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const session = await env.DB
      .prepare(
        "SELECT member_id, expires_at FROM sessions WHERE id = ?"
      )
      .bind(sessionId)
      .first();

    if (
      !session ||
      Number(session.expires_at) <= Date.now()
    ) {
      return Response.json(
        { ok: false, error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    // 2. Request the protected Apps Script endpoint
    const upstream = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "members",
        secret: env.APPS_SCRIPT_SECRET
      })
    });

    if (!upstream.ok) {
      return Response.json(
        { ok: false, error: "Member service is temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    if (data.ok !== true || !Array.isArray(data.members)) {
      return Response.json(
        { ok: false, error: "Could not load the member list." },
        { status: 502 }
      );
    }

    // 3. Return only public directory fields
    const members = data.members.map(member => ({
      id: String(member.id || ""),
      name: String(member.name || ""),
      area: String(member.area || ""),
      status: String(member.status || ""),
      photoUrl: String(member.photoUrl || "")
    }));

    return Response.json({
      ok: true,
      members
    });

  } catch (error) {
    return Response.json(
      { ok: false, error: "Unable to load members right now." },
      { status: 500 }
    );
  }
}
