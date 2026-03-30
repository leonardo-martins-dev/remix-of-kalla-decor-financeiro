import { useState, useMemo } from "react";
import { useKalla } from "@/context/KallaContext";
import { useAuth } from "@/context/AuthContext";
import { PREMISSAS_DEFAULT, calcMC, calcMCPercent, avgCusto, formatBRL, formatBRL2 } from "@/data/kallaData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { toast } from "sonner";
import InfoTooltip from "@/components/InfoTooltip";

const safe = (v: number) => (Number.isFinite(v) ? v : 0);
const safeDiv = (a: number, b: number) => (b !== 0 && Number.isFinite(a) ? a / b : 0);
const safeFmt = (v: number, fn: (n: number) => string) => (Number.isFinite(v) ? fn(v) : "—");

export default function Produtos() {
  const { produtos, premissas, atualizarProduto } = useKalla();
  const { session } = useAuth();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [localPremissas, setLocalPremissas] = useState(premissas);

  const line = produtos[selectedIdx];

  const custoMedio = avgCusto(line.custos);
  const mcB2C = calcMC(line.pv, custoMedio, 0, 1, 0, localPremissas, false);
  const mcPctB2C = safe(calcMCPercent(line.pv, mcB2C));

  function updateField(field: string, val: number) {
    const oldVal = (line as any)[field];
    atualizarProduto(selectedIdx, { [field]: val }, `${field} ${oldVal} → ${val}`, session?.nome);
    toast.info("Preço atualizado em todo o sistema", { duration: 2000 });
  }

  const b2bDescontos = [10, 15, 20, 25, 30, 35].map((d) => {
    const pvDesc = line.pvB2B * (1 - d / 100);
    const mc = calcMC(pvDesc, custoMedio, 0, 1, 0, localPremissas, true);
    return { desconto: `${d}%`, receita: safe(pvDesc * (line.pedMin || 1)), mc: safe(mc * (line.pedMin || 1)), mcPct: safe(calcMCPercent(pvDesc, mc)) };
  });

  const compTable = produtos.map((p, i) => {
    const cm = avgCusto(p.custos);
    const mc = calcMC(p.pv, cm, 0, 1, 0, localPremissas, false);
    const mcP = safe(calcMCPercent(p.pv, mc));
    return { ...p, custoMedio: cm, mcPct: mcP, mult: safe(safeDiv(p.pv, cm)), idx: i };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {produtos.map((p, i) => (
          <button key={i} onClick={() => setSelectedIdx(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${i === selectedIdx ? "bg-info text-primary-foreground shadow-lg" : "bg-card text-muted-foreground border border-border hover:bg-secondary"}`}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">{line.name}</h2>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{line.material}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">{line.posicao}</span>
            <span className="text-xs text-muted-foreground">{line.skus.length} SKUs</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Custo médio</p>
          <p className="text-2xl font-bold text-card-foreground">{safeFmt(custoMedio, formatBRL2)}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">💰 Preços & Parâmetros</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ["PV B2C", "pv", line.pv],
            ["PV Mínimo", "pm", line.pm],
            ["PV B2B", "pvB2B", line.pvB2B],
            ["Ped. Mínimo (un)", "pedMin", line.pedMin],
          ] as [string, string, number][]).map(([label, field, val]) => (
            <div key={field}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <input type="number" value={val} onChange={(e) => updateField(field, Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded border border-border bg-blue-50 text-info font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-info">
          <p className="text-xs text-muted-foreground">PV B2C <InfoTooltip text="Preço de venda ao consumidor final (B2C). Editável no bloco acima." /></p>
          <p className="text-xl font-bold text-card-foreground">{safeFmt(line.pv, formatBRL)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-destructive">
          <p className="text-xs text-muted-foreground">Custo Posto <InfoTooltip text="Média dos custos de cada SKU da linha, já incluindo FOB, internação, tarifas e desembaraço aduaneiro." /></p>
          <p className="text-xl font-bold text-card-foreground">{safeFmt(custoMedio, formatBRL2)}</p>
        </div>
        <div className={`rounded-lg p-4 shadow-sm border-l-4 ${mcB2C >= 0 ? "border-l-success bg-green-50" : "border-l-destructive bg-red-50"}`}>
          <p className="text-xs text-muted-foreground">MC do Produto <InfoTooltip text="Margem de Contribuição unitária: PV menos DAS, taxa cartão, comissão e custo posto." /></p>
          <p className={`text-xl font-bold ${mcB2C >= 0 ? "text-success" : "text-destructive"}`}>{safeFmt(mcB2C, formatBRL2)}</p>
        </div>
        <div className={`rounded-lg p-4 shadow-sm border-l-4 ${mcPctB2C >= 25 ? "border-l-success bg-green-50" : mcPctB2C >= 15 ? "border-l-info" : "border-l-warning bg-yellow-50"}`}>
          <p className="text-xs text-muted-foreground">MC % <InfoTooltip text="MC como % do PV. >25% saudável, 15-25% atenção, <15% crítico. Não inclui frete/embalagem." /></p>
          <p className="text-xl font-bold text-card-foreground">{mcPctB2C.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 border border-info/20">
        <p className="text-sm text-foreground">
          💡 A MC do produto considera apenas custos variáveis da venda (DAS, taxa cartão, comissão e custo posto). Frete e embalagem são analisados na aba <strong>Orçamento</strong>, por venda específica.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-card-foreground mb-2">🏪 Faixa B2C</h4>
          <p className="text-lg font-bold text-info">{line.mercadoB2C}</p>
          <p className="text-xs text-muted-foreground mt-1">Kalla: {formatBRL(line.pv)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-card-foreground mb-2">🏢 Faixa B2B</h4>
          <p className="text-lg font-bold text-info">{line.mercadoB2B}</p>
          <p className="text-xs text-muted-foreground mt-1">Kalla: {formatBRL(line.pvB2B)}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold text-card-foreground mb-3">🏷️ Concorrentes</h4>
        <div className="flex flex-wrap gap-3">
          {line.concorrentes.map((c) => (
            <div key={c.nome} className={`px-3 py-2 rounded-lg border ${c.preco > line.pv ? "border-success/30 bg-green-50" : "border-destructive/30 bg-red-50"}`}>
              <span className="text-sm font-medium text-foreground">{c.nome}</span>
              <span className={`ml-2 text-sm font-bold ${c.preco > line.pv ? "text-success" : "text-destructive"}`}>{formatBRL(c.preco)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">🏢 Simulador B2B — Cenários de Desconto</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={b2bDescontos}>
            <XAxis dataKey="desconto" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Bar dataKey="mcPct" radius={[4, 4, 0, 0]}>
              {b2bDescontos.map((d, i) => (
                <Cell key={i} fill={d.mcPct > 25 ? "#10B981" : d.mcPct > 15 ? "#3B82F6" : d.mcPct > 0 ? "#F59E0B" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm overflow-x-auto">
        <h3 className="font-semibold text-card-foreground mb-3">📋 Tabela Comparativa</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            {["Linha", "Custo", "PV", "B2B", "MC%", "Posição", "Mult"].map((h) => (
              <th key={h} className="text-left py-2 px-2 text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {compTable.map((r) => (
              <tr key={r.idx} onClick={() => setSelectedIdx(r.idx)}
                className={`border-b border-border/50 cursor-pointer hover:bg-secondary/50 ${r.idx === selectedIdx ? "bg-blue-50" : ""}`}>
                <td className="py-2 px-2 font-medium text-foreground">{r.name}</td>
                <td className="py-2 px-2 text-foreground">{safeFmt(r.custoMedio, formatBRL2)}</td>
                <td className="py-2 px-2 text-foreground">{safeFmt(r.pv, formatBRL)}</td>
                <td className="py-2 px-2 text-foreground">{safeFmt(r.pvB2B, formatBRL)}</td>
                <td className={`py-2 px-2 font-semibold ${r.mcPct > 30 ? "text-success" : r.mcPct > 15 ? "text-info" : "text-warning"}`}>{safe(r.mcPct).toFixed(1)}%</td>
                <td className="py-2 px-2 text-foreground">{r.posicao}</td>
                <td className="py-2 px-2 text-foreground">{safe(r.mult).toFixed(1)}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 rounded-lg p-5 border border-info/20">
        <h3 className="font-semibold text-info mb-3">⚙️ Premissas Globais</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ["DAS %", "das", localPremissas.das * 100],
            ["Taxa Cartão %", "taxaCartao", localPremissas.taxaCartao * 100],
            ["Comissão B2C %", "comissaoB2C", localPremissas.comissaoB2C * 100],
            ["Comissão B2B %", "comissaoB2B", localPremissas.comissaoB2B * 100],
          ] as [string, keyof typeof localPremissas, number][]).map(([label, field, val]) => (
            <div key={field}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <input type="number" step="0.01" value={val} onChange={(e) => setLocalPremissas((p) => ({ ...p, [field]: Number(e.target.value) / 100 }))}
                className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
