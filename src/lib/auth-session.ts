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

export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<AdminSessionState>(INITIAL);

  useEffect(() => {
    let alive = true;
    resolveState().then((s) => { if (alive) setState(s); });

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
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

export async function currentUserName(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email?.split("@")[0] || "Equipe LHL";
}
