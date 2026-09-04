// Utilitários robustos para normalização e formatação de datas/horas
// vindos da planilha, do formulário ou do localStorage.
//
// Problemas que estes helpers resolvem:
// - Google Apps Script costuma serializar células de data como ISO
//   (ex.: "2026-06-08T03:00:00.000Z"). Concatenar "T00:00:00" nesse caso
//   gera "Invalid Date".
// - Células contendo apenas hora viram "1899-12-30T..." (epoch do Sheets).
// - Datas vazias ou "Invalid Date" jamais devem aparecer para o usuário.

const INVALID_YEARS = new Set([1899, 1970]);

/** Tenta extrair "YYYY-MM-DD" de qualquer valor razoável. */
export function toDateISO(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";

  // Já vem no formato "YYYY-MM-DD"
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const y = Number(ymd[1]);
    if (INVALID_YEARS.has(y)) return "";
    return s;
  }

  // ISO completo ("YYYY-MM-DDTHH:mm:ss...") — usa a parte de data direto
  // (evita problema de fuso horário convertendo via Date()).
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (iso) {
    const y = Number(iso[1]);
    if (INVALID_YEARS.has(y)) return "";
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  // DD/MM/AAAA
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const y = Number(br[3]);
    if (INVALID_YEARS.has(y)) return "";
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  // Último recurso: tenta parsear como Date
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && !INVALID_YEARS.has(d.getFullYear())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

/** Tenta extrair "HH:mm" de qualquer valor razoável. */
export function toTimeHHmm(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";

  // "HH:mm" ou "HH:mm:ss"
  const hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) {
    const h = String(Math.min(23, Math.max(0, Number(hm[1])))).padStart(2, "0");
    return `${h}:${hm[2]}`;
  }

  // ISO com hora: "...THH:mm..."
  const iso = s.match(/T(\d{2}):(\d{2})/);
  if (iso) return `${iso[1]}:${iso[2]}`;

  return "";
}

/** Formata YYYY-MM-DD (ou qualquer entrada) como DD/MM/AAAA. Retorna "—" se inválida. */
export function formatDateBR(value: unknown): string {
  const iso = toDateISO(value);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Formata data + hora como "DD/MM/AAAA às HH:mm". */
export function formatDateTimeBR(date: unknown, time: unknown): string {
  const dateStr = formatDateBR(date);
  if (dateStr === "—") return "—";
  const t = toTimeHHmm(time);
  return t ? `${dateStr} às ${t}` : dateStr;
}
