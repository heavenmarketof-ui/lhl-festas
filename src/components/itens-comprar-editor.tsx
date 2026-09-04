// ============================================================================
// ITENS A COMPRAR — seção do Contrato
// ----------------------------------------------------------------------------
// Cadastro ultrarrápido: Nome (com pesquisa no Catálogo de Materiais),
// Quantidade, Observação e — quando o preço já é conhecido — Fornecedor e
// Valor Orçado. Ao salvar, o usuário escolhe o destino do item:
//   · Aguardando orçamento (padrão)
//   · Enviar para aprovação (exige Valor Orçado)
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/money-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Check, Sparkles, ChevronDown } from "lucide-react";
import { fmtBRL } from "@/lib/financeiro-api";
import {
  buscarMateriais,
  getCatalogo,
  materialExiste,
  registrarMaterial,
  normalizeMaterialName,
  type ItemComprar,
  type ItemComprarDestino,
  type MaterialCatalogo,
} from "@/lib/materiais-catalogo";

export function ItensComprarEditor({
  itens,
  onChange,
}: {
  itens: ItemComprar[];
  onChange: (list: ItemComprar[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [valorOrcado, setValorOrcado] = useState(0);
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
    setFornecedor("");
    setValorOrcado(0);
  };

  const salvarItem = (destino: ItemComprarDestino, nomeFinal?: string) => {
    const bruto = (nomeFinal ?? nome).replace(/\s+/g, " ").trim();
    if (!bruto) {
      nomeRef.current?.focus();
      return;
    }
    if (destino === "aprovacao" && valorOrcado <= 0) return;
    // Cadastra/padroniza no Catálogo Inteligente e reutiliza imediatamente.
    const oficial = registrarMaterial(bruto);
    setCatalogo(getCatalogo());
    onChange([
      ...itens,
      {
        id: crypto.randomUUID(),
        nome: oficial || bruto,
        quantidade: Math.max(1, Number(quantidade) || 1),
        observacao: observacao.trim(),
        fornecedor: fornecedor.trim(),
        valorOrcado,
        destino,
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
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {(i.valorOrcado || 0) > 0 ? (
                    <span className="text-foreground font-medium">{fmtBRL(i.valorOrcado || 0)}</span>
                  ) : null}
                  {i.fornecedor ? <span>{i.fornecedor}</span> : null}
                  <DestinoBadge destino={i.destino} valorOrcado={i.valorOrcado} />
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
          Nenhum material registrado. Adicione o que precisará ser comprado para esta festa.
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
                  salvarItem("orcamento");
                }
              }}
              placeholder='Ex.: Balão Verde 9"'
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
                    onClick={() => salvarItem("orcamento", nome)}
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
                    salvarItem("orcamento");
                  }
                }}
                placeholder="Ex.: cor exata do tema"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Fornecedor (opcional)
              </Label>
              <Input
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Ex.: Balões Center"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Valor Orçado (opcional)
              </Label>
              <div className="mt-1">
                <MoneyInput value={valorOrcado} onChange={setValorOrcado} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" className="rounded-full">
                  <Check className="h-4 w-4 mr-2" /> Salvar item
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuItem
                  className="flex-col items-start gap-0.5"
                  onSelect={() => salvarItem("orcamento")}
                >
                  <span className="text-sm">📝 Salvar como Aguardando orçamento</span>
                  <span className="text-xs text-muted-foreground">
                    Segue o fluxo normal de cotação na Ordem de Produção.
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={valorOrcado <= 0}
                  className="flex-col items-start gap-0.5"
                  onSelect={() => salvarItem("aprovacao")}
                >
                  <span className="text-sm">✅ Salvar e enviar para aprovação</span>
                  <span className="text-xs text-muted-foreground">
                    {valorOrcado > 0
                      ? "Gera a Solicitação Financeira automaticamente."
                      : "Informe o valor orçado para enviar diretamente para aprovação."}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          {valorOrcado <= 0 ? (
            <p className="text-xs text-muted-foreground">
              Informe o valor orçado para enviar diretamente para aprovação.
            </p>
          ) : null}
        </div>
      ) : (
        <Button type="button" variant="outline" className="rounded-full" onClick={abrir}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Item
        </Button>
      )}
    </div>
  );
}

function DestinoBadge({
  destino,
  valorOrcado,
}: {
  destino?: ItemComprarDestino;
  valorOrcado?: number;
}) {
  const aprovacao = destino === "aprovacao" && (valorOrcado || 0) > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
        aprovacao
          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40"
          : "bg-yellow-500/15 text-yellow-700 border-yellow-500/40"
      }`}
    >
      {aprovacao ? "🟢 Enviado para aprovação" : "🟡 Aguardando orçamento"}
    </span>
  );
}
