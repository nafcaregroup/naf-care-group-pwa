
export async function onRequest(context) {
  const { request, env } = context;

  if (!env.DB) {
    return Response.json(
      { ok: false, error: "Database binding DB is missing." },
      { status: 500 }
    );
  }

  const sessionId = request.headers
    .get("X-Session-ID");

  if (!sessionId) {
    return Response.json(
      { ok: false, authenticated: false, error: "Session required." },
      { status: 401 }
    );
  }

  try {
    const session = await env.DB.prepare(`
      SELECT id, member_id, expires_at
      FROM sessions
      WHERE id = ? AND expires_at > ?
    `).bind(sessionId, Math.floor(Date.now() / 1000)).first();

    if (!session) {
      return Response.json(
        { ok: false, authenticated: false, error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    return Response.json(
      {
        ok: true,
        authenticated: true,
        memberId: session.member_id,
        expiresAt: session.expires_at
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: "Session lookup failed." },
      { status: 500 }
    );
  }
}
