import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { UserPlus, UserX, Shield, User, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  created_at: string;
}

export default function Usuarios() {
  const { session } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form states
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoPerfil, setNovoPerfil] = useState("consultor");

  const isAdmin = session?.perfil === "admin";

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar usuários");
      console.error(error);
    } else {
      setUsers(data as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoEmail || !novaSenha) {
      toast.warning("Preencha todos os campos");
      return;
    }

    setAdding(true);

    const { data, error } = await supabase.rpc("admin_create_user", {
      new_email: novoEmail,
      new_password: novaSenha,
      new_nome: novoNome,
      new_perfil: novoPerfil,
    });

    if (error) {
      toast.error("Erro ao criar usuário: " + error.message);
    } else {
      toast.success("Usuário criado com sucesso!");
      setNovoNome("");
      setNovoEmail("");
      setNovaSenha("");
      setNovoPerfil("consultor");
      fetchUsers(); // Refresh the list
    }
    setAdding(false);
  };

  const handleDeleteUser = async (id: string, nome: string) => {
    if (id === session?.supabaseUserId) {
      toast.error("Você não pode deletar a sua própria conta.");
      return;
    }

    if (window.confirm(`Tem certeza que deseja remover o acesso de ${nome}? Esta ação não pode ser desfeita.`)) {
      const { error } = await supabase.rpc("admin_delete_user", { target_user_id: id });
      
      if (error) {
        toast.error("Erro ao remover usuário: " + error.message);
      } else {
        toast.success("Usuário removido da plataforma.");
        setUsers((prev) => prev.filter((u) => u.id !== id));
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-100">
        <Shield className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2 text-center max-w-md">
          Esta área é reservada para administradores. Você está logado como{" "}
          <span className="font-semibold capitalize text-slate-600">{session?.perfil}</span> e não tem permissão para gerenciar usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* CAdastro de Novo Usuário */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-navy" />
          <h3 className="font-bold text-lg text-slate-800">Novo Acesso</h3>
        </div>

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="col-span-1 md:col-span-1 border rounded-lg hover:border-cyan/50 focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan transition-all bg-slate-50">
            <label className="block text-[10px] uppercase font-bold text-slate-500 px-3 pt-2">Nome</label>
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="w-full bg-transparent px-3 py-1 text-sm text-slate-800 focus:outline-none placeholder:text-slate-300"
              placeholder="Ex: Novo Vendedor"
              required
            />
          </div>

          <div className="col-span-1 md:col-span-1 border rounded-lg hover:border-cyan/50 focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan transition-all bg-slate-50">
            <label className="block text-[10px] uppercase font-bold text-slate-500 px-3 pt-2">E-mail Corporativo</label>
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              className="w-full bg-transparent px-3 py-1 text-sm text-slate-800 focus:outline-none placeholder:text-slate-300"
              placeholder="vendedor@kalladecor..."
              required
            />
          </div>

          <div className="col-span-1 md:col-span-1 border rounded-lg hover:border-cyan/50 focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan transition-all bg-slate-50">
            <label className="block text-[10px] uppercase font-bold text-slate-500 px-3 pt-2">Senha Provisória</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full bg-transparent px-3 py-1 text-sm text-slate-800 focus:outline-none placeholder:text-slate-300"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <div className="col-span-1 md:col-span-1 border rounded-lg hover:border-cyan/50 focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan transition-all bg-slate-50">
            <label className="block text-[10px] uppercase font-bold text-slate-500 px-3 pt-2">Perfil de Acesso</label>
            <select
              value={novoPerfil}
              onChange={(e) => setNovoPerfil(e.target.value)}
              className="w-full bg-transparent px-3 py-1 text-sm text-slate-800 focus:outline-none pb-1.5"
            >
              <option value="consultor">Consultor de Vendas</option>
              <option value="financeiro">Financeiro / Backoffice</option>
              <option value="admin">Administrador Total</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={adding}
            className="col-span-1 md:col-span-1 h-12 bg-navy hover:bg-slate-800 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Autorizar Acesso
          </button>
        </form>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-navy" />
            <h3 className="font-bold text-lg text-slate-800">Acessos Ativos da Plataforma</h3>
          </div>
          <p className="text-sm font-medium hover:text-navy cursor-pointer transition-colors px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
            {users.length} usuários
          </p>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4">Status / Perfil</th>
                  <th className="px-6 py-4 text-right">Cadastrado em</th>
                  <th className="px-6 py-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm border border-white">
                        {user.nome.charAt(0)}
                      </div>
                      {user.nome}
                      {user.id === session?.supabaseUserId && (
                        <span className="ml-2 text-[10px] bg-cyan/10 text-cyan px-2 py-0.5 rounded-full font-bold">Você</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email || "—"}</td>
                    <td className="px-6 py-4">
                      {user.perfil === "admin" ? (
                        <span className="bg-navy/10 text-navy font-bold text-xs px-3 py-1 rounded-full border border-navy/20 inline-flex items-center gap-1">
                          🛡️ Admin
                        </span>
                      ) : user.perfil === "financeiro" ? (
                        <span className="bg-purple-100 text-purple-700 font-bold text-xs px-3 py-1 rounded-full border border-purple-200 inline-flex items-center gap-1">
                          💰 Financeiro
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-600 font-bold text-xs px-3 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1">
                          🤝 Vendas
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-right">
                      {new Date(user.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.nome)}
                        disabled={user.id === session?.supabaseUserId}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                        title={user.id === session?.supabaseUserId ? "Você não pode deletar sua própria conta" : "Remover Acesso"}
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
