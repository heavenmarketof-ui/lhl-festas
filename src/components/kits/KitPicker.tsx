// Seletor oficial de Modalidade → Kit.
// FONTE ÚNICA: src/data/kits.ts. Usado na Home, no Orçamento, na Reserva e
// em qualquer formulário. Nunca declarar kits localmente.

import { Check } from "lucide-react";
import {
  MODALIDADES,
  MODALIDADE_DESCRICAO,
  MODALIDADE_EMOJI,
  MODALIDADE_LABELS,
  fmtPreco,
  getKitsByModalidade,
  modalidadeIdFromLabel,
  type ModalidadeId,
} from "@/data/kits";

type Props = {
  /** Rótulo da modalidade ("Festa na Mesa" | "Peg & Monte"). */
  modalidade: string;
  onModalidadeChange: (label: string) => void;
  /** Nome do kit ("Kit Premium"). */
  kit: string;
  onKitChange: (nome: string) => void;
  /** Mostra o preço nos cards de kit. Uso interno/administrativo apenas — páginas públicas nunca exibem valores. */
  showPrices?: boolean;
};

export default function KitPicker({
  modalidade,
  onModalidadeChange,
  kit,
  onKitChange,
  showPrices = false,
}: Props) {
  const modId = modalidadeIdFromLabel(modalidade);
  const kits = getKitsByModalidade(modId);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          1. Escolha a modalidade
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODALIDADES.map((m) => {
            const selected = modId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onModalidadeChange(MODALIDADE_LABELS[m.id as ModalidadeId]);
                  onKitChange("");
                }}
                className={[
                  "flex h-full flex-col rounded-2xl border p-5 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]"
                    : "border-border bg-card hover:border-primary/50",
                ].join(" ")}
              >
                <span className="font-serif text-xl text-foreground">
                  {MODALIDADE_EMOJI[m.id]} {m.label}
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {MODALIDADE_DESCRICAO[m.id]}
                </span>
                <span
                  className={[
                    "mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground text-background",
                  ].join(" ")}
                >
                  {selected ? "Selecionado" : "Selecionar"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {modId ? (
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">
            2. Escolha o kit de {MODALIDADE_LABELS[modId]}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {kits.map((k) => {
              const selected = kit === k.nome;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => onKitChange(k.nome)}
                  className={[
                    "flex h-full flex-col rounded-2xl border p-5 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]"
                      : "border-border bg-card hover:border-primary/50",
                  ].join(" ")}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-lg text-foreground">{k.nome}</span>
                    {showPrices ? (
                      <span className="whitespace-nowrap text-sm font-semibold text-primary">
                        {fmtPreco(k.preco)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{k.descricao}</p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
                    {k.itens.map((i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                  {showPrices ? (
                    <span className="mt-4 text-xs text-muted-foreground">
                      Caução: {fmtPreco(k.caucao)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
