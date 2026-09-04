// ============================================================================
// ITENS A PRODUZIR — seção do Contrato
// ----------------------------------------------------------------------------
// Materiais artesanais produzidos pela própria empresa (painel, display, topo
// de bolo, aplique...). Nada financeiro: apenas Nome, Quantidade e Observação.
// Ao salvar o Contrato, cada item desce para a aba Produção da OP com o status
// "Produção pendente".
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, Sparkles } from "lucide-react";
import {
  buscarMateriais,
  getCatalogo,
  materialExiste,
  registrarMaterial,
  normalizeMaterialName,
  type ItemProduzir,
  type MaterialCatalogo,
} from "@/lib/materiais-catalogo";

export function ItensProduzirEditor({
  itens,
  onChange,
}: {
  itens: ItemProduzir[];
  onChange: (list: ItemProduzir[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [catalogo, setCatalogo] = useState<MaterialCatalogo[]>([]);
  const [focusSugestoes, setFocusSugestoes] = useState(false);
  const nomeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCatalogo(getCatalogo());
  }, []);

  const sugestoes = useMemo(
    () => (nome.trim().length >= 1 ? buscarMateriais(nome, catalogo) : []),
    [nome, catalogo],
  );

  const podeCriarNovo = nome.trim().length >= 2 && !materialExiste(nome, catalogo);

  const abrir = () => {
    setAberto(true);
    setTimeout(() => nomeRef.current?.focus(), 30);
  };

  const limpar = () => {
    setNome("");
    setQuantidade("1");
    setObservacao("");
  };

  const salvarItem = (nomeFinal?: string) => {
    const bruto = (nomeFinal ?? nome).replace(/\s+/g, " ").trim();
    if (!bruto) {
      nomeRef.current?.focus();
      return;
    }
    const oficial = registrarMaterial(bruto);
    setCatalogo(getCatalogo());
    onChange([
      ...itens,
      {
        id: crypto.randomUUID(),
        nome: oficial || bruto,
        quantidade: Math.max(1, Number(quantidade) || 1),
        observacao: observacao.trim(),
        materialKey: normalizeMaterialName(oficial || bruto),
        criadoEm: new Date().toISOString(),
      },
    ]);
    limpar();
    setTimeout(() => nomeRef.current?.focus(), 30);
  };

  const remover = (id: string) => onChange(itens.filter((i) => i.id !== id));

  return (
    <div className="space-y-4">
      {itens.length > 0 ? (
        <ul className="space-y-2">
          {itens.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
            >
              <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                {i.quantidade}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{i.nome}</p>
                <p className="mt-0.5">
                  <span className="inline-flex items-center rounded-full border border-yellow-500/40 bg-yellow-500/15 px-2 py-0.5 text-[11px] text-yellow-700">
                    🟡 Produção pendente
                  </span>
                </p>
                {i.observacao ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{i.observacao}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => remover(i.id)}
                aria-label={`Remover ${i.nome}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum item artesanal registrado. Adicione painéis, displays, topos de bolo e
          demais peças produzidas pela LHL para esta festa.
        </p>
      )}

      {aberto ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="relative">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Nome do item
            </Label>
            <Input
              ref={nomeRef}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onFocus={() => setFocusSugestoes(true)}
              onBlur={() => setTimeout(() => setFocusSugestoes(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  salvarItem();
                }
              }}
              placeholder="Ex.: Painel Redondo 1,50"
              className="mt-1"
              autoComplete="off"
            />
            {focusSugestoes && (sugestoes.length > 0 || podeCriarNovo) ? (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {sugestoes.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setNome(s.nome);
                      nomeRef.current?.focus();
                    }}
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span className="flex-1 truncate">{s.nome}</span>
                  </button>
                ))}
                {podeCriarNovo ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => salvarItem(nome)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    + Criar novo material "{nome.trim()}"
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Quantidade
              </Label>
              <Input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Observação (opcional)
              </Label>
              <Input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    salvarItem();
                  }
                }}
                placeholder="Ex.: medidas, cores, tema"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => salvarItem()} className="rounded-full">
              <Check className="h-4 w-4 mr-2" /> Salvar item
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                limpar();
                setAberto(false);
              }}
            >
              Concluir
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="rounded-full" onClick={abrir}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Item
        </Button>
      )}
    </div>
  );
}
