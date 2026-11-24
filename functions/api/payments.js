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

async function callAppsScript(env, payload) {
  const response = await fetch(env.APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      secret: env.APPS_SCRIPT_SECRET
    }),
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Upstream HTTP ${response.status}`);
  }

  return await response.json();
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

    const url = new URL(request.url);
    const isAllLedger = url.searchParams.get("all") === "1";

    // Full Group Contribution Ledger (all members + monthly matrix)
    if (isAllLedger) {
      const membersRes = await callAppsScript(env, { action: "members" });

      if (!membersRes || membersRes.ok !== true || !Array.isArray(membersRes.members)) {
        return json({ ok: false, error: "Unable to load member list for ledger." }, 502);
      }

      const ledgerEntries = await Promise.all(
        membersRes.members.map(async (m) => {
          const memberId = String(m.id || "").trim();
          const [memberInfoRes, payRes] = await Promise.all([
            callAppsScript(env, { action: "member", memberId }).catch(() => null),
            callAppsScript(env, { action: "payments", memberId }).catch(() => null)
          ]);

          const fullMember = memberInfoRes?.member || m;
          const payments = Array.isArray(payRes?.payments) ? payRes.payments : [];

          return {
            id: memberId,
            name: String(fullMember.name || m.name || "Member"),
            status: String(fullMember.status || m.status || "Active"),
            capitalPaid: Number(fullMember.capitalPaid || 0),
            monthlyPaid: Number(
              payRes?.monthlyPaid != null ? payRes.monthlyPaid : fullMember.monthlyPaid || 0
            ),
            payments
          };
        })
      );

      return json({
        ok: true,
        ledger: ledgerEntries
      });
    }

    // Single logged-in member payments
    const data = await callAppsScript(env, {
      action: "payments",
      memberId: session.member_id
    });

    if (!data || data.ok !== true) {
      return json({ ok: false, error: "Unable to load payment history." }, 502);
    }

    return json(data);
  } catch (error) {
    return json({ ok: false, error: "Unable to load payment history." }, 502);
  }
}
