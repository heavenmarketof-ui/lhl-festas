import { lazy, Suspense, useEffect, useState } from "react";
import consultoraAsset from "@/assets/lhl/consultor/fale-com-a-consultora.png";
import { pushConsultorEvent } from "@/lib/consultor/analytics";

// O painel completo é carregado sob demanda ao primeiro clique.
const ConsultorPanel = lazy(() => import("./ConsultorPanel"));

type Props = {
  /**
   * Compat: mantido para não quebrar chamadores antigos.
   * Não afeta mais o posicionamento — Consultora fica sempre no canto
   * inferior direito, e o WhatsApp foi para o canto inferior esquerdo.
   */
  stackedOverWhatsapp?: boolean;
};

export default function ConsultorFAB(_props: Props = {}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Evita flash durante SSR/hidratação.
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const handleOpen = () => {
    setOpen(true);
    pushConsultorEvent("consultor_festas_opened");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Abrir Consultor de Festas LHL"
        className="fixed bottom-4 right-3 sm:bottom-5 sm:right-4 z-50 group animate-[consultor-float_4s_ease-in-out_infinite] bg-transparent border-0 p-0 overflow-visible shadow-none appearance-none"
        style={{ background: "transparent", border: "none", overflow: "visible", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <span className="pointer-events-none absolute inset-2 rounded-full bg-primary/15 blur-2xl opacity-70 transition-opacity group-hover:opacity-100" />
        <img
          src={consultoraAsset}
          alt="Fale com a Consultora de Festas LHL"
          className="relative h-36 w-36 sm:h-44 sm:w-44 md:h-52 md:w-52 object-contain bg-transparent transition-transform duration-300 group-hover:scale-105"
          style={{ background: "transparent", objectFit: "contain" }}
          loading="lazy"
          decoding="async"
        />
      </button>


      {/* keyframes locais para animação leve de flutuação */}
      <style>{`
        @keyframes consultor-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {open ? (
        <Suspense fallback={null}>
          <ConsultorPanel onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
