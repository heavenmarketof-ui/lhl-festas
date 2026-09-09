import "./lib/error-capture";

import { env as cloudflareEnv } from "cloudflare:workers";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applyResponseSecurityHeaders } from "./lib/response-security";
import { setRuntimeBindings } from "./lib/runtime-env.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RuntimeEnv = Record<string, unknown>;

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) return false;
  return fields.unhandled === true && fields.message === "HTTPError" && (fields.status === undefined || fields.status === responseStatus);
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

function firstString(envs: RuntimeEnv[], names: string[]): string {
  for (const env of envs) {
    for (const name of names) {
      const value = env?.[name];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

async function injectPublicRuntimeEnv(response: Response, env: unknown): Promise<Response> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const nativeEnv = (cloudflareEnv && typeof cloudflareEnv === "object" ? cloudflareEnv : {}) as RuntimeEnv;
  const passedEnv = (env && typeof env === "object" ? env : {}) as RuntimeEnv;
  const sources = [nativeEnv, passedEnv];
  const publicEnv = {
    SUPABASE_URL: firstString(sources, ["SUPABASE_URL", "VITE_SUPABASE_URL"]),
    SUPABASE_PUBLISHABLE_KEY: firstString(sources, ["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]),
  };

  if (!publicEnv.SUPABASE_URL || !publicEnv.SUPABASE_PUBLISHABLE_KEY) return response;

  const script = `<script>window.__LHL_PUBLIC_ENV__=${JSON.stringify(publicEnv).replace(/</g, "\\u003c")};</script>`;
  const html = await response.text();
  const body = html.includes("</head>") ? html.replace("</head>", `${script}</head>`) : `${script}${html}`;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

function validDriveId(value: string) {
  return /^[a-zA-Z0-9_-]{10,}$/.test(value);
}

async function proxyCatalogImage(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/catalog-image") return null;
  const id = (url.searchParams.get("id") || "").trim();
  if (!validDriveId(id)) return new Response("Imagem inválida", { status: 400 });

  const candidates = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1600`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
  ];

  for (const source of candidates) {
    try {
      const upstream = await fetch(source, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
      });
      const contentType = upstream.headers.get("content-type") || "";
      if (!upstream.ok || !contentType.startsWith("image/")) continue;
      const headers = new Headers();
      headers.set("content-type", contentType);
      headers.set("cache-control", "public, max-age=86400, s-maxage=604800");
      headers.set("access-control-allow-origin", "*");
      return new Response(upstream.body, { status: 200, headers });
    } catch {
      // tenta a próxima origem
    }
  }

  return new Response("Imagem indisponível", { status: 404, headers: { "cache-control": "public, max-age=300" } });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      setRuntimeBindings(cloudflareEnv);
      setRuntimeBindings(env);

      const catalogImage = await proxyCatalogImage(request);
      if (catalogImage) return catalogImage;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const withRuntimeEnv = await injectPublicRuntimeEnv(normalized, env);
      return applyResponseSecurityHeaders(request, withRuntimeEnv);
    } catch (error) {
      console.error(error);
      return applyResponseSecurityHeaders(request, brandedErrorResponse());
    }
  },
};