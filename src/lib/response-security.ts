const NOINDEX_PREFIXES = [
  "/admin",
  "/auth",
  "/login",
  "/contract",
  "/checklist",
  "/reserva",
  "/orcamento-obrigado",
  "/obrigado",
];

const PRIVATE_CACHE_PREFIXES = [
  "/admin",
  "/auth",
  "/login",
  "/contract",
  "/checklist",
  "/reserva",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function shouldNoIndex(pathname: string): boolean {
  return matchesPrefix(pathname, NOINDEX_PREFIXES);
}

export function shouldDisableCache(pathname: string): boolean {
  return matchesPrefix(pathname, PRIVATE_CACHE_PREFIXES);
}

export function applyResponseSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const url = new URL(request.url);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (url.protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (shouldNoIndex(url.pathname)) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  const contentType = headers.get("content-type") || "";
  const isHtml = contentType.includes("text/html");
  const isDynamicPublicPage = url.pathname === "/orcamento" || url.pathname.startsWith("/orcamento/");

  if (shouldDisableCache(url.pathname) || isDynamicPublicPage || isHtml) {
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("Pragma", "no-cache");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
