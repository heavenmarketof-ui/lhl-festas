import { env as cloudflareEnv } from "cloudflare:workers";

type RuntimeBindings = Record<string, unknown>;

const GLOBAL_KEY = "__LHL_RUNTIME_BINDINGS__";

type GlobalWithBindings = typeof globalThis & {
  [GLOBAL_KEY]?: RuntimeBindings;
};

/**
 * Registra os bindings recebidos pelo Worker sem logar ou persistir valores.
 * Em desenvolvimento local, process.env continua funcionando como fallback.
 */
export function setRuntimeBindings(env: unknown): void {
  if (!env || typeof env !== "object") return;
  const current = (globalThis as GlobalWithBindings)[GLOBAL_KEY] ?? {};
  (globalThis as GlobalWithBindings)[GLOBAL_KEY] = { ...current, ...(env as RuntimeBindings) };
}

export function getServerEnv(name: string): string {
  const bindings = (globalThis as GlobalWithBindings)[GLOBAL_KEY];
  const runtimeValue = bindings?.[name];
  if (typeof runtimeValue === "string" && runtimeValue.trim()) {
    return runtimeValue.trim();
  }

  const processValue = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return typeof processValue === "string" ? processValue.trim() : "";
}

/** Recupera um Service Binding Cloudflare sem expor segredos ao cliente. */
export function getServerServiceBinding(name: string): { fetch: typeof fetch } | null {
  const bindings = (globalThis as GlobalWithBindings)[GLOBAL_KEY];
  const native = cloudflareEnv as unknown as RuntimeBindings;
  const value = bindings?.[name] ?? native?.[name];
  if (value && typeof value === "object" && "fetch" in value && typeof value.fetch === "function") {
    return value as { fetch: typeof fetch };
  }
  return null;
}
