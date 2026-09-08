import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Isola falhas de renderização por seção.
 * Uma exceção dentro do bloco protegido não derruba a página inteira:
 * o restante continua funcional, a mensagem é exibida e o usuário pode
 * tentar novamente sem recarregar o navegador.
 */
type Props = {
  children: React.ReactNode;
  /** Nome amigável da seção (aparece na mensagem de erro). */
  label?: string;
};

type State = { error: Error | null };

export class SectionBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionBoundary${this.props.label ? ` · ${this.props.label}` : ""}]`, error, info);
  }

  private retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <p className="mt-3 font-serif text-xl text-primary">
            {this.props.label ? `Não foi possível exibir: ${this.props.label}` : "Não foi possível exibir esta seção"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            O restante do painel continua funcionando. Você pode tentar carregar esta seção novamente.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80 break-words">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={this.retry}>
            <RotateCcw className="h-4 w-4 mr-2" /> Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
}
