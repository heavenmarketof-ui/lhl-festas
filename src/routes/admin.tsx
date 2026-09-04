import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useAdminSession } from "@/lib/auth-session";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAdmin } from "@/lib/auth-session";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({
    meta: [{ title: "Painel Administrativo — LHL Festas" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Karla:wght@300;400;500;600&display=swap",
      },
    ],
  }),
});

function AdminLayout() {
  const navigate = useNavigate();
  const { loading, authenticated, isAdmin } = useAdminSession();

  useEffect(() => {
    if (!loading && !authenticated) navigate({ to: "/auth", replace: true });
  }, [loading, authenticated, navigate]);

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-muted-foreground bg-background">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando acesso...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <p className="font-serif text-2xl text-primary">Acesso não autorizado</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta conta está autenticada, mas não possui permissão de administradora do painel da LHL Festas.
        </p>
        <Button variant="outline" onClick={() => signOutAdmin().then(() => navigate({ to: "/auth", replace: true }))}>
          Sair e entrar com outra conta
        </Button>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <Outlet />
    </>
  );
}
