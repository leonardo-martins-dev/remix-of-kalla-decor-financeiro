import { useState } from "react";
import { useKalla, type DadosMes, type ContainerItem } from "@/context/KallaContext";
import { useAuth } from "@/context/AuthContext";
import { formatBRL, sumCategory } from "@/data/kallaData";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import ImportarMaio from "./ImportarMaio";

const safe = (v: number) => (Number.isFinite(v) ? v : 0);

/* ── Seção 1: Fechamento Mensal ──────────────── */
function FechamentoMensal() {
  const { session } = useAuth();
  const userName = session?.nome || "Sistema";
  const { meses, custos, salvarFechamento, totalCFPorCategoria } = useKalla();
  const { toast } = useToast();

  const mesesDisponiveis = ["Mar/26", "Abr/26", "Mai/26", "Jun/26", "Jul/26", "Ago/26", "Set/26", "Out/26", "Nov/26", "Dez/26"];
  const [mesRef, setMesRef] = useState(mesesDisponiveis[0]);
  const [receita, setReceita] = useState(0);
  const [cmv, setCmv] = useState<string>("");
  const [cfMes, setCfMes] = useState<Record<string, number>>({ ...totalCFPorCategoria });

  const cmvFinal = cmv === "" ? safe(receita * 0.35) : Number(cmv);
  const totalCfMes = Object.values(cfMes).reduce((a, b) => a + safe(b), 0);
  const ebitda = safe(receita - cmvFinal - totalCfMes);
  const mesJaExiste = meses.some((m) => m.mes === mesRef);

  const handleSalvar = (sobrescrever = false) => {
    if (receita < 0) { toast({ title: "Receita não pode ser negativa", variant: "destructive" }); return; }
    const dados: DadosMes = { mes: mesRef, receita, cmv: cmvFinal, custos: cfMes };
    const ok = salvarFechamento(dados, sobrescrever, userName);
    if (!ok && !sobrescrever) {
      if (confirm(`Mês ${mesRef} já cadastrado — deseja sobrescrever?`)) {
        salvarFechamento(dados, true, userName);
        toast({ title: `Mês ${mesRef} sobrescrito com sucesso ✅` });
      }
      return;
    }
    toast({ title: `Mês ${mesRef} salvo com sucesso ✅` });
    setReceita(0);
    setCmv("");
  };

  const catLabels: Record<string, string> = {
    pessoal: "👥 Pessoal", predial: "🏢 Predial", marketing: "📢 Marketing",
    comercial: "🚚 Comercial", admin: "📋 Admin", logistica: "🚢 Logística",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Mês de referência</label>
          <select value={mesRef} onChange={(e) => setMesRef(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {mesJaExiste && <p className="text-xs text-warning mt-1">⚠ Mês já cadastrado</p>}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Receita Bruta (R$)</label>
          <input type="number" min={0} value={receita} onChange={(e) => setReceita(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded border border-border bg-blue-50 text-info font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">CMV realizado (R$) <span className="opacity-50">— vazio = 35%</span></label>
          <input type="number" min={0} value={cmv} placeholder={`Auto: ${formatBRL(receita * 0.35)}`}
            onChange={(e) => setCmv(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      <div className="bg-secondary/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-3 font-medium">Custos fixos do mês (altere apenas o que mudou):</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(catLabels).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <input type="number" min={0} value={cfMes[key] || 0}
                onChange={(e) => setCfMes((p) => ({ ...p, [key]: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-1.5 rounded border border-border text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-info/5 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-2 font-medium">📋 Preview antes de salvar:</p>
        <div className="flex flex-wrap gap-6 text-sm">
          <span>Receita <strong className="text-info">{formatBRL(receita)}</strong></span>
          <span>CF <strong className="text-destructive">{formatBRL(totalCfMes)}</strong></span>
          <span>CMV <strong>{formatBRL(cmvFinal)}</strong></span>
          <span>EBITDA <strong className={ebitda >= 0 ? "text-success" : "text-destructive"}>{formatBRL(ebitda)}</strong></span>
        </div>
      </div>

      <button onClick={() => handleSalvar()} className="px-6 py-2.5 bg-info text-primary-foreground rounded-lg font-medium hover:bg-info/90 transition-colors">
        💾 Salvar fechamento do mês
      </button>
    </div>
  );
}

/* ── Seção 2: Novo Container ─────────────────── */
function NovoContainer() {
  const { session } = useAuth();
  const userName = session?.nome || "Sistema";
  const { containers, adicionarContainer, atualizarContainer } = useKalla();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [invoice, setInvoice] = useState("");
  const [mes, setMes] = useState("Mar/26");
  const [barana, setBarana] = useState(0);
  const [internacao, setInternacao] = useState<string>("");
  const [tarifas, setTarifas] = useState(315);
  const [desembaraco, setDesembaraco] = useState(2320);

  const internFinal = internacao === "" ? null : Number(internacao);
  const estimativa = internFinal === null ? safe(barana * 1.26) : internFinal;
  const totalCalc = safe(barana + estimativa + tarifas + desembaraco);

  const handleAdd = () => {
    if (!codigo.trim()) { toast({ title: "Informe o código do processo", variant: "destructive" }); return; }
    const item: ContainerItem = {
      id: codigo.trim(), invoice, mes, barana, internacao: internFinal,
      tarifas, desembaraco, total: totalCalc,
      completo: internFinal !== null,
    };
    const ok = adicionarContainer(item, userName);
    if (!ok) { toast({ title: "Container com mesmo código já existe", variant: "destructive" }); return; }
    toast({ title: `Container ${codigo} adicionado ✅` });
    setCodigo(""); setInvoice(""); setBarana(0); setInternacao(""); setTarifas(315); setDesembaraco(2320);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Código do processo</label>
          <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="IMPO 3500"
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Invoice</label>
          <input type="text" value={invoice} onChange={(e) => setInvoice(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Mês/Ano</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {["Mar/26", "Abr/26", "Mai/26", "Jun/26", "Jul/26"].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Pagamento Barana (R$)</label>
          <input type="number" min={0} value={barana} onChange={(e) => setBarana(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Internação (R$) <span className="opacity-50">— vazio = estima 1,26×</span></label>
          <input type="number" min={0} value={internacao} placeholder={`Est: ${formatBRL(barana * 1.26)}`}
            onChange={(e) => setInternacao(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tarifas bancárias (R$)</label>
          <input type="number" min={0} value={tarifas} onChange={(e) => setTarifas(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Desembaraço (R$)</label>
          <input type="number" min={0} value={desembaraco} onChange={(e) => setDesembaraco(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleAdd} className="px-6 py-2.5 bg-info text-primary-foreground rounded-lg font-medium hover:bg-info/90 transition-colors">
          ➕ Adicionar container
        </button>
        <span className="text-sm text-muted-foreground">Total estimado: <strong>{formatBRL(totalCalc)}</strong></span>
        {internFinal === null && <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning">Internação pendente</span>}
      </div>

      {/* Lista de containers */}
      <div className="bg-secondary/30 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              {["Processo", "Mês", "Barana", "Internação", "Total", "Status", ""].map((h) => (
                <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {containers.map((c) => (
              <tr key={c.id} className="border-b border-border/30">
                <td className="py-2 px-3 font-medium text-foreground">{c.id}</td>
                <td className="py-2 px-3 text-foreground">{c.mes}</td>
                <td className="py-2 px-3 text-foreground">{formatBRL(c.barana)}</td>
                <td className="py-2 px-3">
                  {editingId === c.id ? (
                    <input type="number" defaultValue={c.internacao || ""} className="w-24 px-2 py-1 rounded border border-border text-xs"
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0) {
                          atualizarContainer(c.id, { internacao: val, completo: true, total: c.barana + val + (c.tarifas || 315) + (c.desembaraco || 2320) }, userName);
                        }
                        setEditingId(null);
                      }} autoFocus />
                  ) : c.internacao ? (
                    <span className="text-foreground">{formatBRL(c.internacao)}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning">PENDENTE</span>
                  )}
                </td>
                <td className="py-2 px-3 font-semibold text-foreground">{formatBRL(c.total)}</td>
                <td className="py-2 px-3">
                  {c.completo ? <span className="text-success text-xs">✓</span> : <span className="text-warning text-xs">⚠</span>}
                </td>
                <td className="py-2 px-3">
                  {!c.completo && (
                    <button onClick={() => setEditingId(c.id)} className="text-muted-foreground hover:text-info">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Seção 3: Atualizar Produto ──────────────── */
function AtualizarProduto() {
  const { session } = useAuth();
  const userName = session?.nome || "Sistema";
  const { produtos, atualizarProduto } = useKalla();
  const { toast } = useToast();
  const [idx, setIdx] = useState(0);
  const p = produtos[idx];

  const [pv, setPv] = useState(p.pv);
  const [pm, setPm] = useState(p.pm);
  const [pvB2B, setPvB2B] = useState(p.pvB2B);
  const [custoPosto, setCustoPosto] = useState(p.custos[0]);
  const [motivo, setMotivo] = useState("");

  const handleSelect = (i: number) => {
    setIdx(i);
    const prod = produtos[i];
    setPv(prod.pv); setPm(prod.pm); setPvB2B(prod.pvB2B); setCustoPosto(prod.custos[0]);
    setMotivo("");
  };

  const handleSalvar = () => {
    atualizarProduto(idx, {
      pv, pm, pvB2B,
      custos: p.custos.map(() => custoPosto),
    }, motivo || "Atualização manual", userName);
    toast({ title: `${p.name} atualizado ✅` });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">Linha de produto</label>
        <select value={idx} onChange={(e) => handleSelect(Number(e.target.value))}
          className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {produtos.map((pr, i) => <option key={i} value={i}>{pr.name}</option>)}
        </select>
      </div>

      <div className="bg-secondary/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-2">Valores atuais → Novos valores:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">PV B2C</label>
            <input type="number" value={pv} onChange={(e) => setPv(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-blue-50 text-info font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">PV Mínimo</label>
            <input type="number" value={pm} onChange={(e) => setPm(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">PV B2B</label>
            <input type="number" value={pvB2B} onChange={(e) => setPvB2B(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Custo Posto</label>
            <input type="number" value={custoPosto} onChange={(e) => setCustoPosto(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Motivo da alteração</label>
        <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Container IMPO 3500 com custo menor"
          className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <button onClick={handleSalvar} className="px-6 py-2.5 bg-info text-primary-foreground rounded-lg font-medium hover:bg-info/90 transition-colors">
        💾 Atualizar produto
      </button>
    </div>
  );
}

/* ── Seção 4: Equipe / Custos Fixos ──────────── */
function EquipeCustos() {
  const { session } = useAuth();
  const userName = session?.nome || "Sistema";
  const { custos, atualizarCustos, adicionarPessoa, removerPessoa } = useKalla();
  const { toast } = useToast();

  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");
  const [valor, setValor] = useState(0);

  const handleAdd = () => {
    if (!nome.trim()) return;
    adicionarPessoa("pessoal", { nome: `${nome} (${funcao})`, valor }, userName);
    toast({ title: `${nome} adicionado(a) ✅` });
    setNome(""); setFuncao(""); setValor(0);
  };

  const handleUpdateValor = (idx: number, novoValor: number) => {
    const novos = { ...custos, pessoal: custos.pessoal.map((p, i) => (i === idx ? { ...p, valor: novoValor } : p)) };
    atualizarCustos(novos, userName);
  };

  return (
    <div className="space-y-4">
      {/* Adicionar */}
      <div className="bg-secondary/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-2 font-medium">➕ Adicionar pessoa:</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Função</label>
            <input type="text" value={funcao} onChange={(e) => setFuncao(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Valor mensal</label>
            <input type="number" min={0} value={valor} onChange={(e) => setValor(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={handleAdd} className="px-4 py-2 bg-info text-primary-foreground rounded-lg text-sm font-medium hover:bg-info/90">
            ➕ Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {custos.pessoal.map((p, i) => (
          <div key={i} className="flex items-center gap-3 bg-card rounded-lg p-3 shadow-sm">
            <span className="text-sm text-foreground flex-1">{p.nome}</span>
            <input type="number" value={p.valor} onChange={(e) => handleUpdateValor(i, Number(e.target.value))}
              className="w-28 px-3 py-1.5 rounded border border-border text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => { removerPessoa(i, userName); toast({ title: `${p.nome} removido(a)` }); }}
              className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="text-right text-sm text-muted-foreground">
        Total Pessoal: <strong className="text-foreground">{formatBRL(sumCategory(custos.pessoal))}</strong>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────── */
export default function Atualizar() {
  const { historico, resetar } = useKalla();
  const { toast } = useToast();

  const handleReset = () => {
    if (confirm("Tem certeza? Isso apaga todos os dados inseridos e volta aos dados de Nov/25 a Fev/26.")) {
      resetar();
      toast({ title: "Dados resetados para os valores originais ✅" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-info/5 border border-info/20 rounded-lg p-4">
        <p className="text-sm text-foreground">
          ⚙️ <strong>Módulo de Atualização</strong> — Alimente o sistema mês a mês. Os dados são salvos localmente e refletidos em todas as abas automaticamente.
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["fechamento"]} className="space-y-3">
        <AccordionItem value="importar" className="bg-card rounded-lg shadow-sm border">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="font-semibold text-card-foreground">📥 Importar relatório de vendas do Maiô</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <ImportarMaio />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fechamento" className="bg-card rounded-lg shadow-sm border">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="font-semibold text-card-foreground">📅 Fechamento Mensal</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <FechamentoMensal />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="container" className="bg-card rounded-lg shadow-sm border">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="font-semibold text-card-foreground">🚢 Novo Container</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <NovoContainer />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produto" className="bg-card rounded-lg shadow-sm border">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="font-semibold text-card-foreground">📦 Atualizar Produto</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <AtualizarProduto />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="equipe" className="bg-card rounded-lg shadow-sm border">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="font-semibold text-card-foreground">👥 Equipe / Custos Fixos</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <EquipeCustos />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Histórico */}
      <div className="bg-card rounded-lg shadow-sm p-5">
        <h3 className="font-semibold text-card-foreground mb-3">📋 Histórico de atualizações</h3>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Data", "Tipo", "Descrição", "Usuário"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.slice(0, 10).map((h, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 px-3 text-foreground">{h.data}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-info/10 text-info">{h.tipo}</span>
                    </td>
                    <td className="py-2 px-3 text-foreground">{h.descricao}</td>
                    <td className="py-2 px-3 text-muted-foreground">{h.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="text-center">
        <button onClick={handleReset}
          className="px-6 py-2.5 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/20 transition-colors inline-flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Resetar para dados originais
        </button>
      </div>
    </div>
  );
}
