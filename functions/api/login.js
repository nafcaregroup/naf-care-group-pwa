export async function onRequest(context) {
  const { request } = context;

  if (request.method !== "POST") {
    return Response.json(
      { ok: false, error: "Use POST method." },
      {
        status: 405,
        headers: { Allow: "POST" }
      }
    );
  }

  return Response.json(
    {
      ok: false,
      error: "Login is not configured yet.",
      message: "Member verification must be connected before login is enabled."
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
