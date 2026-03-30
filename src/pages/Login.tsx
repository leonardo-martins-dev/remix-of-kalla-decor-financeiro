import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [senha, setSenha] = useState("");
  const [manter, setManter] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(user, senha, manter);
    if (result) setErro(result);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-[hsl(215,25%,15%)] px-4">
      <div className="w-full max-w-[400px] bg-card rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-[28px] font-bold text-foreground" style={{ fontFamily: "Georgia, serif" }}>
            KALLA DECOR
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Central de Gestão</p>
          <div className="mx-auto mt-3 w-10 h-[2px] bg-info rounded" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Digite seu usuário"
              value={user}
              onChange={(e) => { setUser(e.target.value); setErro(""); }}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setErro(""); }}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={manter}
              onChange={(e) => setManter(e.target.checked)}
              className="rounded border-input"
            />
            Manter conectado
          </label>

          <button
            type="submit"
            className="w-full h-10 rounded-lg bg-info text-primary-foreground font-bold text-sm hover:shadow-lg transition-shadow"
          >
            Entrar
          </button>

          {erro && (
            <p className="text-destructive text-sm text-center font-medium">{erro}</p>
          )}
        </form>

        <p className="text-center text-[11px] text-accent mt-6">NoPonto Consultoria</p>
      </div>
    </div>
  );
}
