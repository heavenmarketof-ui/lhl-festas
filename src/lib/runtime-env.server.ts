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
  (globalThis as GlobalWithBindings)[GLOBAL_KEY] = env as RuntimeBindings;
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
