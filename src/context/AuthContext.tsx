import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface SessionData {
  user: string;
  nome: string;
  perfil: string;
  loggedAt: string;
  manter: boolean;
}

interface AuthContextType {
  session: SessionData | null;
  login: (user: string, senha: string, manter: boolean) => string | null;
  logout: () => void;
}

const USERS = [
  { user: "gustavo", senha: "kalla2026", nome: "Gustavo", perfil: "admin" },
  { user: "gisele", senha: "financeiro2026", nome: "Gisele", perfil: "financeiro" },
  { user: "noponto", senha: "consultoria2026", nome: "NoPonto", perfil: "consultor" },
];

const LS_KEY = "kalla_session";

function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data: SessionData = JSON.parse(raw);
    if (!data.manter) {
      // session-only: check if sessionStorage flag exists
      if (!sessionStorage.getItem("kalla_active")) return null;
    }
    return data;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(() => loadSession());

  useEffect(() => {
    if (session) {
      localStorage.setItem(LS_KEY, JSON.stringify(session));
      sessionStorage.setItem("kalla_active", "1");
    }
  }, [session]);

  const login = (user: string, senha: string, manter: boolean): string | null => {
    const found = USERS.find(
      (u) => u.user.toLowerCase() === user.toLowerCase() && u.senha === senha
    );
    if (!found) return "Usuário ou senha incorretos";
    const s: SessionData = {
      user: found.user,
      nome: found.nome,
      perfil: found.perfil,
      loggedAt: new Date().toISOString(),
      manter,
    };
    setSession(s);
    return null;
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem("kalla_active");
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
