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

function normalizeLoginIdentifier(loginInput: string): string {
  const normalized = loginInput.trim().toLowerCase();
  if (!normalized) return "";
  return normalized;
}

function buildLoginCandidates(loginInput: string): string[] {
  const normalized = normalizeLoginIdentifier(loginInput);
  if (!normalized) return [];
  if (normalized.includes("@")) return [normalized];

  // Retrocompatibilidade entre domínios de e-mail corporativo.
  return [
    `${normalized}@kalladecor.com`,
    `${normalized}@kalladecor.com.br`,
  ];
}

function mapSupabaseAuthError(error: { message?: string; status?: number; code?: string } | null): string {
  if (!error) return "Erro inesperado ao autenticar";
  const message = (error.message || "").toLowerCase();
  const code = (error.code || "").toLowerCase();

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Conta ainda não confirmada. Verifique seu e-mail.";
  }

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "Usuário ou senha incorretos";
  }

  if (message.includes("signup is disabled")) {
    return "Autenticação por e-mail/senha está desabilitada no Supabase.";
  }

  if (error.status === 400) {
    return "Não foi possível autenticar. Confira usuário e senha.";
  }

  return "Falha ao autenticar no Supabase. Tente novamente.";
}

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
    const loginCandidates = buildLoginCandidates(email);
    const passwordNormalized = senha.trim();

    if (!loginCandidates.length || !passwordNormalized) {
      return "Informe usuário e senha";
    }

    let lastError: { message?: string; status?: number; code?: string } | null = null;
    let signedUser: User | null = null;

    for (const candidateEmail of loginCandidates) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: candidateEmail,
        password: passwordNormalized,
      });

      if (!error && data.user) {
        signedUser = data.user;
        break;
      }

      lastError = error;
    }

    if (!signedUser) {
      // Log técnico para diagnóstico em ambiente de produção.
      console.error("Supabase login error:", lastError);
      return mapSupabaseAuthError(lastError);
    }

    if (signedUser) {
      const profile = await fetchProfile(signedUser.id);
      if (profile) {
        setSession(buildSessionData(signedUser, profile, _manter));
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
