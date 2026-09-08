import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/lhl-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Acesso Administrativo — LHL Festas" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        toast.error("E-mail ou senha incorretos.");
        return;
      }
      navigate({ to: "/admin" });
    } catch {
      toast.error("Não foi possível validar o acesso agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <Toaster position="top-center" richColors />
      <Link to="/" className="mb-6">
        <img src={logo} alt="LHL Festas" className="w-28" />
      </Link>

      <div className="w-full max-w-md rounded-3xl bg-card border border-border/60 p-8 shadow-[var(--shadow-soft)]">
        <h1 className="font-serif text-3xl text-center text-primary">Acesso Administrativo</h1>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Painel exclusivo da equipe autorizada da LHL Festas
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5" autoComplete="on">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              maxLength={254}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={128}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95 shadow-[var(--shadow-soft)] disabled:opacity-70"
          >
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Novos acessos administrativos são criados somente pela administração do sistema e precisam receber a permissão de administrador.
        </p>
      </div>

      <Link to="/" className="mt-6 text-xs text-muted-foreground hover:text-primary">
        ← Voltar para a página inicial
      </Link>
    </div>
  );
}
