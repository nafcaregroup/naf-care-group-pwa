
export async function onRequest(context) {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "NAF CARE GROUP API",
      status: "running",
      message: "Cloudflare Pages Function is working"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
