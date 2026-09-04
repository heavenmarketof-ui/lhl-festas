// ============================================================================
// Sessão administrativa — autenticação real (Lovable Cloud / Supabase Auth).
// Substitui o antigo auth-local (usuário/senha fixos no código + sessionStorage).
// O acesso ao painel exige: sessão válida + papel "admin" na tabela user_roles.
// ============================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminSessionState = {
  /** true enquanto a sessão ainda está sendo verificada */
  loading: boolean;
  /** usuário autenticado */
  authenticated: boolean;
  /** autenticado E com papel admin */
  isAdmin: boolean;
  email: string;
  userId: string;
};

const INITIAL: AdminSessionState = {
  loading: true,
  authenticated: false,
  isAdmin: false,
  email: "",
  userId: "",
};

async function resolveState(): Promise<AdminSessionState> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { ...INITIAL, loading: false };

  let isAdmin = false;
  try {
    const { data: ok } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    isAdmin = ok === true;
  } catch {
    isAdmin = false;
  }

  const nome = user.email?.split("@")[0] || "Equipe LHL";
  try { localStorage.setItem("lhl_user_name", nome); } catch { /* noop */ }

  return {
    loading: false,
    authenticated: true,
    isAdmin,
    email: user.email ?? "",
    userId: user.id,
  };
}

/** Hook de sessão administrativa. Reage a login/logout em qualquer aba. */
export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<AdminSessionState>(INITIAL);

  useEffect(() => {
    let alive = true;

    resolveState().then((s) => { if (alive) setState(s); });

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Nunca chamar Supabase dentro do callback — adiar para o próximo tick.
      setTimeout(() => {
        resolveState().then((s) => { if (alive) setState(s); });
      }, 0);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

/** Nome exibido nos registros de histórico da Ordem de Produção. */
export async function currentUserName(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email?.split("@")[0] || "Equipe LHL";
}
