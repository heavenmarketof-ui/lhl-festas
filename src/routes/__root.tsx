import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import publicThemeCss from "../public-theme.css?url";
import publicLayoutCss from "../public-layout.css?url";
import orcamentoOficialCss from "../orcamento-oficial.css?url";
import orcamentoFixCss from "../orcamento-fix.css?url";
import adminOficialCss from "../admin-oficial.css?url";
import { hasAnalyticsConsent, PrivacyConsent } from "../components/privacy-consent";
import { RemoveContractControl } from "../components/admin/remove-contract-control";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">O endereço acessado não existe ou foi alterado.</p>
        <div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Voltar ao início</Link></div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Esta página não carregou</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ocorreu um erro ao carregar esta tela. Você pode tentar novamente ou voltar ao início.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Tentar novamente</button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">Voltar ao início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LHL Festas" },
      { name: "description", content: "LHL Festas — Festa na Mesa, Peg & Monte e decorações personalizadas para momentos inesquecíveis no ABC." },
      { name: "author", content: "LHL Festas" },
      { property: "og:title", content: "LHL Festas" },
      { property: "og:description", content: "Decorações para festas, Peg & Monte, Festa na Mesa e projetos personalizados no ABC." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://www.lhlfestas.com.br/hero-principal.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "LHL Festas" },
      { name: "twitter:description", content: "Decorações para festas, Peg & Monte, Festa na Mesa e projetos personalizados no ABC." },
      { name: "twitter:image", content: "https://www.lhlfestas.com.br/hero-principal.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: publicThemeCss },
      { rel: "stylesheet", href: publicLayoutCss },
      { rel: "stylesheet", href: orcamentoOficialCss },
      { rel: "stylesheet", href: orcamentoFixCss },
      { rel: "stylesheet", href: adminOficialCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useRouterState({ select: (s) => s.location });

  useEffect(() => {
    const isOrcamento = location.pathname === "/orcamento" || location.pathname.startsWith("/orcamento/");
    document.body.classList.toggle("page-orcamento", isOrcamento);
    return () => document.body.classList.remove("page-orcamento");
  }, [location.pathname]);

  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "page_view", page_path: location.pathname + location.search, page_location: window.location.href, page_title: document.title });
    } catch { /* noop */ }
  }, [location.pathname, location.search]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <RemoveContractControl />
      <PrivacyConsent />
    </QueryClientProvider>
  );
}
