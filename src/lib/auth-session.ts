// ============================================================================
// Sessão administrativa — Supabase Auth.
// O acesso ao painel exige sessão válida + papel "admin" na tabela user_roles.
// ============================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminSessionState = {
  loading: boolean;
  authenticated: boolean;
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

const SIGNED_OUT: AdminSessionState = {
  loading: false,
  authenticated: false,
  isAdmin: false,
  email: "",
  userId: "",
};

async function resolveState(): Promise<AdminSessionState> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return SIGNED_OUT;
    const user = data.user;
    if (!user) return SIGNED_OUT;

    let isAdmin = false;
    try {
      const { data: ok, error: roleError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      isAdmin = !roleError && ok === true;
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
  } catch (error) {
    console.error("[admin-session] falha ao validar sessão", error);
    return SIGNED_OUT;
  }
}

export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<AdminSessionState>(INITIAL);

  useEffect(() => {
    let alive = true;
    resolveState().then((s) => { if (alive) setState(s); });

    let unsubscribe = () => {};
    try {
      const { data: sub } = supabase.auth.onAuthStateChange(() => {
        setTimeout(() => {
          resolveState().then((s) => { if (alive) setState(s); });
        }, 0);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    } catch (error) {
      console.error("[admin-session] falha ao observar sessão", error);
    }

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return state;
}

export async function signOutAdmin() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[admin-session] falha ao encerrar sessão", error);
  }
}

export async function currentUserName(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.email?.split("@")[0] || "Equipe LHL";
  } catch {
    return "Equipe LHL";
  }
}
