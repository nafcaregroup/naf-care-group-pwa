
export async function onRequest({ request }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  if (request.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed." },
      { status: 405, headers }
    );
  }

  const kind = new URL(request.url).searchParams.get("kind");

  const labels = {
    notices: "Notice",
    blog: "Blog"
  };

  if (!labels[kind]) {
    return Response.json(
      { ok: false, error: "Invalid feed type." },
      { status: 400, headers }
    );
  }

  try {
    const url =
      "https://nafcaregroup.blogspot.com/feeds/posts/default/-/" +
      encodeURIComponent(labels[kind]) +
      "?alt=json";

    const upstream = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!upstream.ok) {
      return Response.json(
        { ok: false, error: "Blogger feed request failed." },
        { status: 502, headers }
      );
    }

    const data = await upstream.json();

    return Response.json(
      { ok: true, entries: data?.feed?.entry || [] },
      { headers }
    );
  } catch {
    return Response.json(
      { ok: false, error: "Unable to load Blogger feed." },
      { status: 502, headers }
    );
  }
}
