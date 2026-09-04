import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Heart, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import logo from "@/assets/lhl-logo.png";

const WHATSAPP_URL = "https://wa.me/5511925543380?text=Ol%C3%A1!%20Quero%20fazer%20uma%20festa%20com%20a%20LHL%20Festas.";

export const Route = createFileRoute("/obrigado")({
  component: ThankYou,
  head: () => ({
    meta: [
      { title: "Obrigado! — LHL Festas" },
      { name: "description", content: "Recebemos seus dados. Em instantes você receberá seu contrato e os próximos passos pelo WhatsApp." },
      { property: "og:title", content: "Obrigado! — LHL Festas" },
      { property: "og:description", content: "Recebemos seus dados. Em instantes você receberá seu contrato pelo WhatsApp." },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "canonical", href: "https://lhl-festas.lovable.app/obrigado" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Karla:wght@300;400;500;600&display=swap" },
    ],
  }),
});

function ThankYou() {
  const steps = [
    { icon: CheckCircle2, label: "Dados recebidos", done: true },
    { icon: Sparkles, label: "Preparando seu contrato", done: false },
    { icon: MessageCircle, label: "Envio pelo WhatsApp", done: false },
  ];
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 text-center">
      <img src={logo} alt="LHL Festas" className="w-28 sm:w-36 mb-8 drop-shadow-sm" />

      <div className="max-w-xl w-full rounded-3xl bg-card border border-border/60 p-8 sm:p-12 shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-[image:var(--gradient-elegant)] flex items-center justify-center shadow-[var(--shadow-soft)]">
          <Heart className="h-6 w-6 text-primary-foreground" />
        </div>

        <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-gold mb-3">
          Recebemos seus dados
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-primary leading-tight">
          Obrigado por escolher a LHL Festas
        </h1>

        <div className="mx-auto my-6 h-px w-20 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
          Nossos atendentes vão preparar seu contrato e enviar tudo pelo WhatsApp em instantes.
        </p>

        {/* Indicador de próximos passos */}
        <ol className="mt-8 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
          {steps.map((s, i) => (
            <li key={i} className="flex flex-col items-center gap-2">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center border ${
                  s.done
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted border-border text-muted-foreground"
                }`}
                aria-current={s.done ? undefined : "step"}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <span className={s.done ? "text-primary font-medium" : "text-muted-foreground"}>{s.label}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground/85">
          O atendimento continua pelo <strong>WhatsApp</strong> — fique de olho nas mensagens.
        </div>

        <p className="font-script text-2xl sm:text-3xl text-primary mt-8">
          Sua festa, do seu jeito! <span className="text-gold">♡</span>
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-center">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="sm:order-2">
            <Button className="h-12 px-8 w-full sm:w-auto rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95 gap-2">
              <MessageCircle className="h-4 w-4" /> Continuar no WhatsApp
            </Button>
          </a>
          <Button
            asChild
            variant="outline"
            className="h-12 px-8 rounded-full sm:order-1"
          >
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

