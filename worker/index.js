/**
 * ÉcolePlus Worker. Static files are served from the ASSETS binding.
 * Student records are not exposed through the API until authentication is configured.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const row = await env.DB.prepare("SELECT 1 AS ok").first();
        return Response.json({ status: row?.ok === 1 ? "ok" : "unavailable" });
      } catch {
        return Response.json({ status: "unavailable" }, { status: 503 });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Route not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
