import { useState } from "react";
import { Card } from "./heaven-ui";
import { CheckCircle2 } from "lucide-react";
import { submitHeavenLead as apiSubmit } from "@/lib/heaven-api";

/**
 * FORMULÁRIO DE INTERESSE — HEAVEN FESTAS
 *
 * Agora conectado à tabela 'heaven_leads' no banco de dados.
 * Leads da Heaven permanecem logicamente separados da LHL Festas.
 */

const ORGANIZACAO = ["Caderno", "Planilha", "Aplicativo", "Outro sistema", "Um pouco de tudo"];
const ATUACAO = ["Peg & Monte", "Festa na Mesa", "Decoração", "Personalizados", "Locação", "Outro"];

const inputClass =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

export function HeavenForm() {
  const [atuacao, setAtuacao] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(value: string) {
    setAtuacao((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    setSending(true);

    const result = await apiSubmit({
      nome: String(fd.get("nome") || ""),
      empresa: String(fd.get("empresa") || ""),
      whatsapp: String(fd.get("whatsapp") || ""),
      email: String(fd.get("email") || ""),
      instagram: String(fd.get("instagram") || ""),
      cidade: String(fd.get("cidade") || ""),
      estado: String(fd.get("estado") || ""),
      organizacao_hoje: String(fd.get("organizacaoHoje") || ""),
      atuacao,
      dificuldade: String(fd.get("dificuldade") || ""),
    });

    setSending(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error || "Ocorreu um erro ao enviar. Tente novamente.");
    }
  }

  if (done) {
    return (
      <Card className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <p className="mt-4 text-lg font-semibold">Recebemos seu interesse!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Vamos entrar em contato para conversar sobre a sua rotina e apresentar a Heaven Festas.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="grid gap-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="h-nome" className="mb-1.5 block text-sm font-medium text-foreground">Nome</label>
            <input id="h-nome" name="nome" required autoComplete="name" className={inputClass} />
          </div>
          <div>
            <label htmlFor="h-empresa" className="mb-1.5 block text-sm font-medium text-foreground">Nome da empresa</label>
            <input id="h-empresa" name="empresa" required autoComplete="organization" className={inputClass} />
          </div>
          <div>
            <label htmlFor="h-whats" className="mb-1.5 block text-sm font-medium text-foreground">WhatsApp</label>
            <input id="h-whats" name="whatsapp" required inputMode="tel" autoComplete="tel" className={inputClass} />
          </div>
          <div>
            <label htmlFor="h-email" className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
            <input id="h-email" name="email" required type="email" autoComplete="email" className={inputClass} />
          </div>
          <div>
            <label htmlFor="h-insta" className="mb-1.5 block text-sm font-medium text-foreground">Instagram</label>
            <input id="h-insta" name="instagram" placeholder="@suaempresa" className={inputClass} />
          </div>
          <div>
            <label htmlFor="h-cidade" className="mb-1.5 block text-sm font-medium text-foreground">Cidade</label>
            <input id="h-cidade" name="cidade" className={inputClass} />
          </div>
          <div>
            <label htmlFor="h-estado" className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
            <input id="h-estado" name="estado" className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="h-org" className="mb-1.5 block text-sm font-medium text-foreground">
            Como você organiza suas festas hoje?
          </label>
          <select id="h-org" name="organizacaoHoje" defaultValue="" className={inputClass}>
            <option value="" disabled>Selecione</option>
            {ORGANIZACAO.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">Com o que você trabalha?</legend>
          <div className="flex flex-wrap gap-2">
            {ATUACAO.map((a) => {
              const active = atuacao.includes(a);
              return (
                <label
                  key={a}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={active}
                    onChange={() => toggle(a)}
                  />
                  {a}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="h-dif" className="mb-1.5 block text-sm font-medium text-foreground">
            Qual é sua maior dificuldade hoje para organizar sua empresa? (opcional)
          </label>
          <textarea id="h-dif" name="dificuldade" rows={4} className={inputClass} />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="mt-1 min-h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {sending ? "Enviando..." : "QUERO PARTICIPAR DO TESTE"}
        </button>
      </form>
    </Card>
  );
}
