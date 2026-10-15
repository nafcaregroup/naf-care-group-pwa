
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

  if (!env.DB) {
    return json({ ok: false, error: "Server configuration is incomplete." }, 500);
  }

  const sessionId = request.headers.get("X-Session-ID");

  if (!sessionId || sessionId.length > 200) {
    return json({ ok: false, error: "Session not found." }, 401);
  }

  try {
    await env.DB.prepare(
      "DELETE FROM sessions WHERE id = ?"
    ).bind(sessionId).run();

    return json({ ok: true, message: "Logged out successfully." });
  } catch (error) {
    return json({ ok: false, error: "Unable to log out." }, 500);
  }
}
