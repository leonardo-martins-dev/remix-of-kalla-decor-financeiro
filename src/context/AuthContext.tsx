import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export interface SessionData {
  user: string;
  nome: string;
  perfil: string;
  loggedAt: string;
  manter: boolean;
  supabaseUserId: string;
}

interface AuthContextType {
  session: SessionData | null;
  loading: boolean;
  login: (email: string, senha: string, manter: boolean) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<{ nome: string; perfil: string } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nome, perfil")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data;
}

function buildSessionData(user: User, profile: { nome: string; perfil: string }, manter: boolean): SessionData {
  return {
    user: user.email?.split("@")[0] || "",
    nome: profile.nome,
    perfil: profile.perfil,
    loggedAt: new Date().toISOString(),
    manter,
    supabaseUserId: user.id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recuperar sessão existente
    supabase.auth.getSession().then(async ({ data: { session: sbSession } }) => {
      if (sbSession?.user) {
        const profile = await fetchProfile(sbSession.user.id);
        if (profile) {
          setSession(buildSessionData(sbSession.user, profile, true));
        }
      }
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sbSession) => {
      if (event === "SIGNED_IN" && sbSession?.user) {
        const profile = await fetchProfile(sbSession.user.id);
        if (profile) {
          setSession(buildSessionData(sbSession.user, profile, true));
        }
      } else if (event === "SIGNED_OUT") {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, senha: string, _manter: boolean): Promise<string | null> => {
    // Suporte para login por nome de usuário (retrocompatibilidade)
    const emailNormalized = email.includes("@") ? email : `${email.toLowerCase()}@kalladecor.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailNormalized,
      password: senha,
    });

    if (error) {
      return "Usuário ou senha incorretos";
    }

    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setSession(buildSessionData(data.user, profile, _manter));
        return null;
      }
      return "Perfil do usuário não encontrado";
    }

    return "Erro inesperado ao fazer login";
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
