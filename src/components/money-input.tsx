import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { parseValor } from "@/lib/financeiro-api";

/**
 * Campo monetário no padrão brasileiro.
 * Aceita digitação livre: 35 · 35,50 · 0,99 · 1.250,00 · R$ 1.250,00
 * Ao sair do campo, exibe formatado (1.250,00) e devolve o número puro.
 */
export function MoneyInput({
  value,
  onChange,
  onBlur,
  className = "",
  placeholder = "0,00",
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const format = (n: number) =>
    n ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const [text, setText] = useState(() => format(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(format(value));
  }, [value, editing]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        className={`h-9 pl-9 ${className}`}
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          // Permite apenas dígitos, vírgula e ponto enquanto digita.
          const raw = e.target.value.replace(/[^\d.,]/g, "");
          setText(raw);
          onChange(parseValor(raw));
        }}
        onBlur={() => {
          const n = parseValor(text);
          setEditing(false);
          setText(format(n));
          onChange(n);
          onBlur?.();
        }}
      />
    </div>
  );
}
