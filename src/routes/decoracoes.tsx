import { createFileRoute, Link } from "@tanstack/react-router";

const catalogUrl = "https://lhl-catalogo-decoracoes.heavenmarketof.workers.dev/";

export const Route = createFileRoute("/decoracoes")({
  component: DecoracoesPage,
  head: () => ({
    meta: [
      { title: "Catálogo de Decorações | LHL Festas" },
      { name: "description", content: "Explore as decorações da LHL Festas e solicite um orçamento personalizado." },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/decoracoes" }],
  }),
});

function DecoracoesPage() {
  return (
    <main className="min-h-screen bg-[#fff8f0]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#651f36] px-4 py-3 text-sm text-white">
        <Link to="/" className="font-semibold">LHL Festas</Link>
        <div className="flex items-center gap-4">
          <Link to="/catalogo" className="underline underline-offset-4">Catálogo de Capas</Link>
          <a href={catalogUrl} target="_blank" rel="noopener noreferrer">Abrir catálogo em nova aba</a>
        </div>
      </div>
      <iframe
        title="Catálogo de Decorações LHL Festas"
        src={catalogUrl}
        className="block h-[calc(100dvh-52px)] min-h-[680px] w-full border-0"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
