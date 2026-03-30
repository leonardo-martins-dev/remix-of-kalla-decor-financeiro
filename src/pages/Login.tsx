import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [senha, setSenha] = useState("");
  const [manter, setManter] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const result = await login(user, senha, manter);
    if (result) setErro(result);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] bg-white/70 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
            KALLA DECOR
          </h1>
          <p className="text-sm text-slate-500 font-medium">Central de Gestão Financeira</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-400 group-focus-within:text-navy transition-colors" />
              </div>
              <input
                type="text"
                placeholder="ID de Usuário"
                value={user}
                onChange={(e) => { setUser(e.target.value); setErro(""); }}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-navy transition-colors" />
              </div>
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(""); }}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={manter}
                  onChange={(e) => setManter(e.target.checked)}
                  className="peer h-4 w-4 shrink-0 rounded-[4px] border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none transition-colors checked:bg-navy checked:border-navy"
                />
                <svg className="absolute w-3 h-3 text-white fill-current left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 20 20">
                  <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                </svg>
              </div>
              Lembrar de mim
            </label>
            <a href="#" className="text-sm font-medium text-navy hover:text-cyan transition-colors">Esqueceu a senha?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-navy text-white font-medium text-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/30 transition-all active:scale-[0.98] shadow-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Autenticando..." : "Acessar Plataforma"}
          </button>

          {erro && (
            <div className="p-3 mt-4 rounded-lg bg-red-50 text-red-600 text-sm text-center font-medium border border-red-100 animate-in fade-in slide-in-from-top-2">
              {erro}
            </div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[12px] text-slate-400 font-medium">NoPonto Consultoria &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}
