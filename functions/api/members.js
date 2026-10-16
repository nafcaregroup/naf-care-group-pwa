export async function onRequest({ request, env }) {
  try {
    // 1. Allow only GET or POST
    if (!["GET", "POST"].includes(request.method)) {
      return Response.json(
        { ok: false, error: "Method not allowed." },
        { status: 405 }
      );
    }

    // 2. Check login session
    const sessionId = request.headers.get("X-Session-ID");

    if (!sessionId) {
      return Response.json(
        { ok: false, error: "Please log in first." },
        { status: 401 }
      );
    }

    // 3. Check server configuration
    if (
      !env.DB ||
      !env.APPS_SCRIPT_URL ||
      !env.APPS_SCRIPT_SECRET
    ) {
      return Response.json(
        {
          ok: false,
          error: "Server configuration is incomplete."
        },
        { status: 500 }
      );
    }

    // 4. Verify session
    const session = await env.DB
      .prepare(
        "SELECT member_id, expires_at FROM sessions WHERE id = ?"
      )
      .bind(sessionId)
      .first();

    if (
  !session ||
  Number(session.expires_at) <= Math.floor(Date.now() / 1000)
) {
      return Response.json(
        {
          ok: false,
          error: "Session expired. Please log in again."
        },
        { status: 401 }
      );
    }

    // 5. Request member data from Google Apps Script
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

    const responseText = await upstream.text();

    if (!upstream.ok) {
      return Response.json(
        {
          ok: false,
          error: `Member service returned HTTP ${upstream.status}.`
        },
        { status: 502 }
      );
    }

    // 6. Confirm that Apps Script returned JSON
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return Response.json(
        {
          ok: false,
          error:
            "Apps Script returned non-JSON data. Check the Web App URL and deployment access."
        },
        { status: 502 }
      );
    }

    if (
      data.ok !== true ||
      !Array.isArray(data.members)
    ) {
      return Response.json(
        {
          ok: false,
          error:
            data.error || "Could not load the member list."
        },
        { status: 502 }
      );
    }

    // 7. Return directory information only
    const members = data.members.map(member => ({
      id: String(member.id || ""),
      name: String(member.name || ""),
      area: String(member.area || ""),
      status: String(member.status || ""),
      photoUrl: String(member.photoUrl || "")
    }));

    return Response.json(
      {
        ok: true,
        members
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "Unable to load members right now."
      },
      { status: 500 }
    );
  }
}
