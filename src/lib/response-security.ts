const NOINDEX_PREFIXES = [
  "/admin",
  "/auth",
  "/login",
  "/contract",
  "/checklist",
  "/orcamento-obrigado",
  "/obrigado",
];

export function shouldNoIndex(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
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

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
