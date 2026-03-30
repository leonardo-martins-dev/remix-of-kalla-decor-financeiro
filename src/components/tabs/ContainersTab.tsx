import { useState } from "react";
import { useKalla, ContainerItem } from "@/context/KallaContext";
import { formatBRL, formatBRL2 } from "@/data/kallaData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

function ContainerKPIs({ containers }: { containers: ContainerItem[] }) {
  const totalInvestido = containers.reduce((s, c) => s + c.total, 0);
  const totalBarana = containers.reduce((s, c) => s + c.barana, 0);
  const totalInternacao = containers.reduce((s, c) => s + (c.internacao || 0), 0);
  const custoMedio = containers.length > 0 ? totalInvestido / containers.length : 0;
  const completos = containers.filter((c) => c.completo).length;
  const pendentes = containers.length - completos;
  const investPendente = containers.filter(c => !c.completo).reduce((s, c) => s + c.total, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-info">
        <p className="text-xs text-muted-foreground">Total Investido</p>
        <p className="text-xl font-bold text-card-foreground">{formatBRL(totalInvestido)}</p>
      </div>
      <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-cyan">
        <p className="text-xs text-muted-foreground">Custo Médio</p>
        <p className="text-xl font-bold text-card-foreground">{formatBRL(custoMedio)}</p>
      </div>
      <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-success">
        <p className="text-xs text-muted-foreground">Completos</p>
        <p className="text-xl font-bold text-success">{completos}/{containers.length}</p>
      </div>
      <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-warning">
        <p className="text-xs text-muted-foreground">Pendentes</p>
        <p className="text-xl font-bold text-warning">{pendentes}</p>
        <p className="text-xs text-muted-foreground">{formatBRL(investPendente)}</p>
      </div>
      <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-accent">
        <p className="text-xs text-muted-foreground">Barana vs Internação</p>
        <p className="text-sm font-semibold text-card-foreground">
          {totalInvestido > 0 ? `${((totalBarana / totalInvestido) * 100).toFixed(0)}% / ${((totalInternacao / totalInvestido) * 100).toFixed(0)}%` : "—"}
        </p>
      </div>
    </div>
  );
}

function ContainerCharts({ containers }: { containers: ContainerItem[] }) {
  const totalInvestido = containers.reduce((s, c) => s + c.total, 0);
  const totalBarana = containers.reduce((s, c) => s + c.barana, 0);
  const totalInternacao = containers.reduce((s, c) => s + (c.internacao || 0), 0);
  const totalTarifas = containers.reduce((s, c) => s + (c.tarifas || 0), 0);
  const totalDesembaraco = containers.reduce((s, c) => s + (c.desembaraco || 0), 0);

  const porMes = containers.reduce<Record<string, number>>((acc, c) => {
    acc[c.mes] = (acc[c.mes] || 0) + c.total;
    return acc;
  }, {});
  const chartMeses = Object.entries(porMes).map(([mes, valor]) => ({ mes, valor }));

  const composicao = [
    { name: "Barana (FOB)", value: totalBarana, fill: "hsl(var(--info))" },
    { name: "Internação", value: totalInternacao, fill: "hsl(var(--cyan))" },
    { name: "Tarifas", value: totalTarifas, fill: "hsl(var(--warning))" },
    { name: "Desembaraço", value: totalDesembaraco, fill: "hsl(var(--success))" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">📊 Investimento por Mês</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartMeses}>
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} fill="hsl(var(--info))" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">🔄 Composição de Custos</h3>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie data={composicao.filter(c => c.value > 0)} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45} strokeWidth={2}>
                {composicao.filter(c => c.value > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {composicao.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
                <div>
                  <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBRL(c.value)} ({totalInvestido > 0 ? ((c.value / totalInvestido) * 100).toFixed(1) : 0}%)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableCell({ value, onChange, prefix = "" }: { value: number | null; onChange: (v: number | null) => void; prefix?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(draft.replace(/[^\d.,\-]/g, "").replace(",", "."));
    onChange(draft.trim() === "" ? null : isNaN(parsed) ? value : parsed);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="w-full px-2 py-1 text-sm rounded border border-info/50 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-info"
      />
    );
  }

  return (
    <button onClick={startEdit} className="w-full text-left px-2 py-1 rounded hover:bg-info/10 transition-colors text-sm text-foreground cursor-pointer" title="Clique para editar">
      {value != null ? `${prefix}${formatBRL2(value)}` : <span className="text-muted-foreground italic">—</span>}
    </button>
  );
}

function EditableText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => { setDraft(value); setEditing(true); };
  const commit = () => { setEditing(false); onChange(draft.trim()); };

  if (editing) {
    return (
      <input autoFocus type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()}
        className="w-full px-2 py-1 text-sm rounded border border-info/50 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-info" />
    );
  }

  return (
    <button onClick={startEdit} className="w-full text-left px-2 py-1 rounded hover:bg-info/10 transition-colors text-sm text-foreground cursor-pointer" title="Clique para editar">
      {value || <span className="text-muted-foreground italic">{placeholder || "—"}</span>}
    </button>
  );
}

function AddContainerForm({ onAdd }: { onAdd: (c: ContainerItem) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ id: "", invoice: "", mes: "", barana: 0, tarifas: 315, desembaraco: 2320 });

  const handleSubmit = () => {
    if (!form.id || !form.mes) return;
    const total = form.barana + form.tarifas + form.desembaraco;
    onAdd({
      id: form.id,
      invoice: form.invoice,
      mes: form.mes,
      barana: form.barana,
      internacao: null,
      tarifas: form.tarifas,
      desembaraco: form.desembaraco,
      total,
      completo: false,
    });
    setForm({ id: "", invoice: "", mes: "", barana: 0, tarifas: 315, desembaraco: 2320 });
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-info text-primary-foreground font-medium text-sm hover:bg-info/90 transition-colors">
        + Novo Container
      </button>
    );
  }

  return (
    <div className="bg-card rounded-lg p-5 shadow-sm border border-info/30">
      <h3 className="font-semibold text-card-foreground mb-4">📦 Novo Container</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Processo *</label>
          <input value={form.id} onChange={(e) => setForm(p => ({ ...p, id: e.target.value }))}
            placeholder="IMPO 0000" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Invoice</label>
          <input value={form.invoice} onChange={(e) => setForm(p => ({ ...p, invoice: e.target.value }))}
            placeholder="INV-2026-001" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Mês *</label>
          <input value={form.mes} onChange={(e) => setForm(p => ({ ...p, mes: e.target.value }))}
            placeholder="Mar/26" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Barana (FOB)</label>
          <input type="number" value={form.barana || ""} onChange={(e) => setForm(p => ({ ...p, barana: Number(e.target.value) }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tarifas</label>
          <input type="number" value={form.tarifas || ""} onChange={(e) => setForm(p => ({ ...p, tarifas: Number(e.target.value) }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Desembaraço</label>
          <input type="number" value={form.desembaraco || ""} onChange={(e) => setForm(p => ({ ...p, desembaraco: Number(e.target.value) }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={handleSubmit} disabled={!form.id || !form.mes}
          className="px-4 py-2 rounded-lg bg-success text-primary-foreground font-medium text-sm hover:bg-success/90 transition-colors disabled:opacity-50">
          ✓ Adicionar
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ContainerDetailRow({ c, onUpdate, onRemove }: {
  c: ContainerItem;
  onUpdate: (id: string, updates: Partial<ContainerItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalInvestido = c.barana + (c.internacao || 0) + (c.tarifas || 0) + (c.desembaraco || 0);

  const updateField = (field: keyof ContainerItem, value: number | string | boolean | null) => {
    const updates: Partial<ContainerItem> = { [field]: value };
    // Recalculate total
    const barana = field === "barana" ? (value as number) : c.barana;
    const internacao = field === "internacao" ? (value as number | null) : c.internacao;
    const tarifas = field === "tarifas" ? (value as number) : (c.tarifas || 0);
    const desembaraco = field === "desembaraco" ? (value as number) : (c.desembaraco || 0);
    updates.total = barana + (internacao || 0) + tarifas + desembaraco;
    updates.completo = (internacao != null && internacao > 0);
    onUpdate(c.id, updates);
  };

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
        <td className="py-2 px-3">
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground text-xs mr-1">
            {expanded ? "▼" : "▶"}
          </button>
          <span className="font-medium text-foreground">{c.id}</span>
          {c.invoice && <span className="ml-2 text-xs text-muted-foreground">({c.invoice})</span>}
        </td>
        <td className="py-2 px-3">
          <EditableText value={c.mes} onChange={(v) => onUpdate(c.id, { mes: v })} />
        </td>
        <td className="py-2 px-3">
          <EditableCell value={c.barana} onChange={(v) => updateField("barana", v || 0)} />
        </td>
        <td className="py-2 px-3">
          <EditableCell value={c.internacao} onChange={(v) => updateField("internacao", v)} />
        </td>
        <td className="py-2 px-3">
          <EditableCell value={c.tarifas || 0} onChange={(v) => updateField("tarifas", v || 0)} />
        </td>
        <td className="py-2 px-3">
          <EditableCell value={c.desembaraco || 0} onChange={(v) => updateField("desembaraco", v || 0)} />
        </td>
        <td className="py-2 px-3 font-semibold text-foreground">{formatBRL(totalInvestido)}</td>
        <td className="py-2 px-3">
          {c.completo
            ? <span className="text-xs font-medium text-success">✓ Completo</span>
            : <span className="text-xs font-medium text-warning">⚠ Pendente</span>}
        </td>
        <td className="py-2 px-3">
          <button onClick={() => onRemove(c.id)} className="text-destructive/60 hover:text-destructive text-xs transition-colors" title="Remover">✕</button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-secondary/30">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Barana (FOB)</p>
                <div className="bg-info/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-info">{formatBRL(c.barana)}</p>
                  <p className="text-xs text-muted-foreground">{totalInvestido > 0 ? ((c.barana / totalInvestido) * 100).toFixed(0) : 0}% do total</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Internação</p>
                <div className={`rounded-lg p-3 text-center ${c.internacao ? "bg-cyan/10" : "bg-warning/10"}`}>
                  <p className={`text-lg font-bold ${c.internacao ? "text-cyan" : "text-warning"}`}>
                    {c.internacao ? formatBRL(c.internacao) : "PENDENTE"}
                  </p>
                  {c.internacao && totalInvestido > 0 && <p className="text-xs text-muted-foreground">{((c.internacao / totalInvestido) * 100).toFixed(0)}% do total</p>}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tarifas</p>
                <div className="bg-warning/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-warning">{formatBRL2(c.tarifas || 0)}</p>
                  <p className="text-xs text-muted-foreground">{totalInvestido > 0 ? (((c.tarifas || 0) / totalInvestido) * 100).toFixed(1) : 0}% do total</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Desembaraço</p>
                <div className="bg-success/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-success">{formatBRL2(c.desembaraco || 0)}</p>
                  <p className="text-xs text-muted-foreground">{totalInvestido > 0 ? (((c.desembaraco || 0) / totalInvestido) * 100).toFixed(1) : 0}% do total</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 bg-secondary rounded-full h-4 overflow-hidden flex">
                <div className="h-full bg-info" style={{ width: `${totalInvestido > 0 ? (c.barana / totalInvestido) * 100 : 0}%` }} title="Barana" />
                <div className="h-full bg-cyan" style={{ width: `${totalInvestido > 0 ? ((c.internacao || 0) / totalInvestido) * 100 : 0}%` }} title="Internação" />
                <div className="h-full bg-warning" style={{ width: `${totalInvestido > 0 ? ((c.tarifas || 0) / totalInvestido) * 100 : 0}%` }} title="Tarifas" />
                <div className="h-full bg-success" style={{ width: `${totalInvestido > 0 ? ((c.desembaraco || 0) / totalInvestido) * 100 : 0}%` }} title="Desembaraço" />
              </div>
              <span className="text-sm font-bold text-foreground shrink-0">{formatBRL(totalInvestido)}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ContainersTab() {
  const { containers, adicionarContainer, atualizarContainer, removerContainer } = useKalla();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleRemove = (id: string) => {
    if (confirmDelete === id) {
      removerContainer(id, "Admin");
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleAdd = (c: ContainerItem) => {
    adicionarContainer(c, "Admin");
  };

  return (
    <div className="space-y-6">
      <ContainerKPIs containers={containers} />
      <ContainerCharts containers={containers} />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">📦 Containers — Edição Detalhada</h3>
        <AddContainerForm onAdd={handleAdd} />
      </div>

      <div className="bg-card rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              {["Processo", "Mês", "Barana (FOB)", "Internação", "Tarifas", "Desembaraço", "Total", "Status", ""].map((h) => (
                <th key={h} className="text-left py-3 px-3 text-muted-foreground font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {containers.map((c) => (
              <ContainerDetailRow
                key={c.id}
                c={c}
                onUpdate={(id, updates) => atualizarContainer(id, updates, "Admin")}
                onRemove={handleRemove}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-secondary font-bold">
              <td className="py-3 px-3 text-foreground" colSpan={2}>Total Geral</td>
              <td className="py-3 px-3 text-foreground">{formatBRL(containers.reduce((s, c) => s + c.barana, 0))}</td>
              <td className="py-3 px-3 text-foreground">{formatBRL(containers.reduce((s, c) => s + (c.internacao || 0), 0))}</td>
              <td className="py-3 px-3 text-foreground">{formatBRL(containers.reduce((s, c) => s + (c.tarifas || 0), 0))}</td>
              <td className="py-3 px-3 text-foreground">{formatBRL(containers.reduce((s, c) => s + (c.desembaraco || 0), 0))}</td>
              <td className="py-3 px-3 text-foreground">{formatBRL(containers.reduce((s, c) => s + c.total, 0))}</td>
              <td className="py-3 px-3" colSpan={2} />
            </tr>
          </tfoot>
        </table>
        <p className="text-xs text-muted-foreground px-4 py-3 border-t border-border/50">
          💡 Clique em qualquer valor para editar. Clique em ▶ para ver a composição detalhada de custos.
        </p>
      </div>

      {confirmDelete && (
        <div className="fixed bottom-6 right-6 bg-destructive text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 animate-in fade-in">
          Clique novamente em ✕ para confirmar a remoção de {confirmDelete}
        </div>
      )}
    </div>
  );
}
