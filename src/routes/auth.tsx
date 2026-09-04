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
  const [mode, setMode] = useState<"login" | "signup">("login");
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
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error("E-mail ou senha incorretos.");
      navigate({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Conta criada! Você já pode entrar.");
      setMode("login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <Toaster position="top-center" richColors />
      <Link to="/" className="mb-6">
        <img src={logo} alt="LHL Festas" className="w-28" />
      </Link>

      <div className="w-full max-w-md rounded-3xl bg-card border border-border/60 p-8 shadow-[var(--shadow-soft)]">
        <h1 className="font-serif text-3xl text-center text-primary">
          {mode === "login" ? "Acesso Administrativo" : "Criar Conta Admin"}
        </h1>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Painel exclusivo da LHL Festas
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@lhlfestas.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95 shadow-[var(--shadow-soft)] disabled:opacity-70"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {mode === "login" ? "Primeira vez? Criar conta de administrador" : "Já tenho conta — entrar"}
        </button>
      </div>

      <Link to="/" className="mt-6 text-xs text-muted-foreground hover:text-primary">
        ← Voltar para a página inicial
      </Link>
    </div>
  );
}
