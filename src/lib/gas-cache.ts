// ============================================================================
// Camada de leitura resiliente para o gateway do Apps Script.
// Responsabilidades:
//  - deduplicação: chamadas simultâneas com a mesma chave compartilham 1 request
//  - cache com TTL: reabrir a mesma aba em poucos segundos não refaz a chamada
//  - retry com backoff: falhas intermitentes/timeout do Apps Script
//  - logs técnicos (rota, tempo, status, quantidade de registros) sem dados sensíveis
// ============================================================================

type Entry<T> = { data: T; at: number };

const cache = new Map<string, Entry<any>>();
const inflight = new Map<string, Promise<any>>();

/** TTL padrão: reutiliza dados carregados há menos de 30s. */
export const DEFAULT_TTL_MS = 30_000;

const DEBUG_KEY = "lhl:debugFin";

function debugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Log técnico temporário — nunca registra tokens, telefones, endereços ou nomes. */
function log(key: string, info: Record<string, unknown>) {
  if (!debugEnabled()) return;
  // eslint-disable-next-line no-console
  console.info(`[fin] ${key}`, info);
}

/** Habilita/desabilita os logs técnicos no navegador (window.lhlFinDebug(true)). */
if (typeof window !== "undefined") {
  (window as any).lhlFinDebug = (on = true) => {
    try {
      if (on) window.localStorage.setItem(DEBUG_KEY, "1");
      else window.localStorage.removeItem(DEBUG_KEY);
    } catch {
      /* ignore */
    }
    return on;
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type CachedReadOptions = {
  /** Ignora o cache e refaz a chamada (usado pelo botão Atualizar). */
  force?: boolean;
  /** Tempo de validade do cache em ms. */
  ttlMs?: number;
  /** Tentativas totais (1 = sem retry). */
  attempts?: number;
};

/**
 * Executa `fn` com dedupe + cache + retry. A chave identifica a rota lógica
 * (ex.: "fluxoList") e é usada também nos logs e na invalidação.
 */
export async function cachedRead<T>(
  key: string,
  fn: () => Promise<T>,
  opts: CachedReadOptions = {},
): Promise<T> {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const attempts = Math.max(1, opts.attempts ?? 2);

  if (!opts.force) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) {
      log(key, { status: "cache-hit", ageMs: Date.now() - hit.at });
      return hit.data as T;
    }
  }

  // Uma chamada em andamento atende todos os chamadores (evita duplicidade).
  const running = inflight.get(key);
  if (running) {
    log(key, { status: "dedupe" });
    return running as Promise<T>;
  }

  const started = Date.now();
  const task = (async () => {
    let lastErr: unknown;
    for (let i = 1; i <= attempts; i++) {
      try {
        const data = await fn();
        cache.set(key, { data, at: Date.now() });
        log(key, {
          status: "ok",
          attempt: i,
          ms: Date.now() - started,
          registros: Array.isArray(data) ? data.length : undefined,
        });
        return data;
      } catch (err) {
        lastErr = err;
        log(key, { status: "erro", attempt: i, ms: Date.now() - started });
        if (i < attempts) await sleep(400 * i);
      }
    }
    throw lastErr;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, task);
  return task as Promise<T>;
}

/** Invalida uma ou mais chaves (chamado após criar/editar/excluir). */
export function invalidate(...keys: string[]) {
  for (const k of keys) cache.delete(k);
  log("invalidate", { keys });
}

/** Lê o valor em cache sem disparar chamadas (fallback em caso de falha). */
export function peek<T>(key: string): T | undefined {
  return cache.get(key)?.data as T | undefined;
}

/** Limpa tudo (usado em testes/diagnóstico). */
export function clearCache() {
  cache.clear();
}
