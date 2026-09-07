import { env as cloudflareEnv } from "cloudflare:workers";

type RuntimeBindings = Record<string, unknown>;

const GLOBAL_KEY = "__LHL_RUNTIME_BINDINGS__";

type GlobalWithBindings = typeof globalThis & {
  [GLOBAL_KEY]?: RuntimeBindings;
};

/**
 * Registra os bindings recebidos pelo Worker sem logar ou persistir valores.
 * Mantemos isso como fallback para compatibilidade com o entrypoint customizado.
 */
export function setRuntimeBindings(env: unknown): void {
  if (!env || typeof env !== "object") return;
  (globalThis as GlobalWithBindings)[GLOBAL_KEY] = env as RuntimeBindings;
}

/**
 * Lê uma variável somente no servidor.
 * Prioridade:
 * 1) binding nativo do Cloudflare Workers (cloudflare:workers)
 * 2) bindings registrados pelo entrypoint
 * 3) process.env para desenvolvimento local / Node
 */
export function getServerEnv(name: string): string {
  const directValue = (cloudflareEnv as unknown as RuntimeBindings)?.[name];
  if (typeof directValue === "string" && directValue.trim()) {
    return directValue.trim();
  }

  const bindings = (globalThis as GlobalWithBindings)[GLOBAL_KEY];
  const runtimeValue = bindings?.[name];
  if (typeof runtimeValue === "string" && runtimeValue.trim()) {
    return runtimeValue.trim();
  }

  const processValue = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return typeof processValue === "string" ? processValue.trim() : "";
}
