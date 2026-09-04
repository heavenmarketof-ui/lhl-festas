import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ConsultorPanel = lazy(() => import("@/components/consultor/ConsultorPanel"));

export const Route = createFileRoute("/consultor")({
  component: ConsultorPage,
  head: () => ({
    meta: [
      { title: "Consultor de Festas — LHL Festas" },
      {
        name: "description",
        content:
          "Descubra em minutos a decoração ideal para sua festa com a Consultora de Festas da LHL. Atendimento guiado e personalizado.",
      },
      { property: "og:title", content: "Consultor de Festas — LHL Festas" },
      {
        property: "og:description",
        content:
          "Atendimento guiado para escolher tema, kit e modalidade da sua festa em minutos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ConsultorPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8f5] via-white to-[#fdf4ee]">
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Abrindo consultor…</div>}>
        <ConsultorPanel onClose={() => navigate({ to: "/" })} />
      </Suspense>
    </div>
  );
}
