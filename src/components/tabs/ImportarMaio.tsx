import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { findSku, formatMesAno, type SkuMapping } from "@/data/skuMapping";
import { useKalla, type DadosMes } from "@/context/KallaContext";
import { formatBRL, formatBRL2 } from "@/data/kallaData";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";

const safe = (v: number) => (Number.isFinite(v) ? v : 0);
const round2 = (v: number) => Math.round(v * 100) / 100;

/* ── Types ──────────────────────────────────── */

interface ProdutoRow {
  numero: string;
  data: string;
  cliente: string;
  representante: string;
  codigoProduto: string;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  precoTotal: number;
  sku?: SkuMapping;
  mesAno: string;
}

interface PedidoRow {
  numero: string;
  cliente: string;
  representante: string;
  formaPagamento: string;
  valorTotal: number;
  valorFrete: number;
  valorNFe: number;
}

interface ResumoMes {
  mes: string;
  pedidos: number;
  itens: number;
  receita: number;
  cmvReal: number;
  cmvPct: number;
}

interface ResumoProduto {
  produto: string;
  linha: string;
  qtd: number;
  receita: number;
  cmv: number;
  mcUnit: number;
}

interface ResumoVendedor {
  nome: string;
  pedidos: number;
  receita: number;
  ticketMedio: number;
}

interface ImportData {
  produtos: ProdutoRow[];
  pedidos: PedidoRow[];
  naoIdentificados: { codigo: string; descricao: string; qtd: number; valor: number }[];
  resumoMeses: ResumoMes[];
  resumoProdutos: ResumoProduto[];
  resumoVendedores: ResumoVendedor[];
  periodoMin: string;
  periodoMax: string;
  totalPedidos: number;
  totalItens: number;
  receitaBruta: number;
  freteTotal: number;
  formasPagamento: { forma: string; pct: number; valor: number }[];
  topClientes: { nome: string; valor: number }[];
}

/* ── Parser ─────────────────────────────────── */

function parseExcel(buffer: ArrayBuffer): ImportData | string {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  // Check for required sheet
  const prodSheet = wb.Sheets["Relatório de Produtos"];
  if (!prodSheet) return "Arquivo inválido — não encontramos a aba 'Relatório de Produtos'";

  const pedSheet = wb.Sheets["Relatório de Pedidos"];

  // Parse products sheet
  const prodRaw: any[][] = XLSX.utils.sheet_to_json(prodSheet, { header: 1 });
  const prodRows: ProdutoRow[] = [];

  for (let i = 1; i < prodRaw.length; i++) {
    const r = prodRaw[i];
    if (!r || !r[0]) continue;
    const codigoProduto = String(r[10] || "").trim();
    if (!codigoProduto) continue;
    const descricao = String(r[11] || "");
    if (descricao.toLowerCase() === "totais") continue;

    const quantidade = Number(r[12]) || 0;
    const precoUnit = round2(Number(r[16]) || 0);
    const precoTotal = round2(Number(r[17]) || 0);
    const dateVal = r[3];
    const mesAno = formatMesAno(dateVal);

    prodRows.push({
      numero: String(r[0] || ""),
      data: dateVal instanceof Date ? dateVal.toISOString() : (dateVal ? String(dateVal) : ""),
      cliente: String(r[6] || ""),
      representante: String(r[7] || ""),
      codigoProduto,
      descricao,
      quantidade,
      precoUnit,
      precoTotal,
      sku: findSku(codigoProduto),
      mesAno,
    });
  }

  // Parse orders sheet
  const pedRows: PedidoRow[] = [];
  if (pedSheet) {
    const pedRaw: any[][] = XLSX.utils.sheet_to_json(pedSheet, { header: 1 });
    for (let i = 1; i < pedRaw.length; i++) {
      const r = pedRaw[i];
      if (!r || !r[0]) continue;
      const cliente = String(r[11] || "");
      if (cliente.toLowerCase() === "totais") continue;

      pedRows.push({
        numero: String(r[0] || ""),
        cliente,
        representante: String(r[12] || ""),
        formaPagamento: String(r[14] || ""),
        valorTotal: round2(Number(r[17]) || 0),
        valorFrete: round2(Number(r[18]) || 0),
        valorNFe: round2(Number(r[19]) || 0),
      });
    }
  }

  // Non-identified SKUs
  const naoIdMap = new Map<string, { codigo: string; descricao: string; qtd: number; valor: number }>();
  prodRows.filter((p) => !p.sku).forEach((p) => {
    const key = p.codigoProduto.toLowerCase();
    const existing = naoIdMap.get(key);
    if (existing) {
      existing.qtd += p.quantidade;
      existing.valor += p.precoTotal;
    } else {
      naoIdMap.set(key, { codigo: p.codigoProduto, descricao: p.descricao, qtd: p.quantidade, valor: p.precoTotal });
    }
  });

  // Group by month
  const mesMap = new Map<string, { pedidosSet: Set<string>; itens: number; receita: number; cmvReal: number }>();
  prodRows.forEach((p) => {
    if (!mesMap.has(p.mesAno)) mesMap.set(p.mesAno, { pedidosSet: new Set(), itens: 0, receita: 0, cmvReal: 0 });
    const m = mesMap.get(p.mesAno)!;
    m.pedidosSet.add(p.numero);
    m.itens += p.quantidade;
    m.receita += p.precoTotal;
    if (p.sku) m.cmvReal += p.quantidade * p.sku.custoPosto;
  });
  const resumoMeses: ResumoMes[] = Array.from(mesMap.entries())
    .map(([mes, d]) => ({
      mes,
      pedidos: d.pedidosSet.size,
      itens: round2(d.itens),
      receita: round2(d.receita),
      cmvReal: round2(d.cmvReal),
      cmvPct: d.receita > 0 ? round2((d.cmvReal / d.receita) * 100) : 0,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  // Group by product (top 10)
  const prodMap = new Map<string, { produto: string; linha: string; qtd: number; receita: number; cmv: number }>();
  prodRows.filter((p) => p.sku).forEach((p) => {
    const key = p.sku!.skuKalla;
    if (!prodMap.has(key)) prodMap.set(key, { produto: p.sku!.produto, linha: p.sku!.linha, qtd: 0, receita: 0, cmv: 0 });
    const m = prodMap.get(key)!;
    m.qtd += p.quantidade;
    m.receita += p.precoTotal;
    m.cmv += p.quantidade * p.sku!.custoPosto;
  });
  const resumoProdutos: ResumoProduto[] = Array.from(prodMap.values())
    .map((p) => ({ ...p, qtd: round2(p.qtd), receita: round2(p.receita), cmv: round2(p.cmv), mcUnit: p.qtd > 0 ? round2((p.receita - p.cmv) / p.qtd) : 0 }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10);

  // Vendedores
  const vendMap = new Map<string, { pedidosSet: Set<string>; receita: number }>();
  prodRows.forEach((p) => {
    const rep = p.representante || "Sem representante";
    if (!vendMap.has(rep)) vendMap.set(rep, { pedidosSet: new Set(), receita: 0 });
    const v = vendMap.get(rep)!;
    v.pedidosSet.add(p.numero);
    v.receita += p.precoTotal;
  });
  const resumoVendedores: ResumoVendedor[] = Array.from(vendMap.entries())
    .map(([nome, d]) => ({ nome, pedidos: d.pedidosSet.size, receita: round2(d.receita), ticketMedio: d.pedidosSet.size > 0 ? round2(d.receita / d.pedidosSet.size) : 0 }))
    .sort((a, b) => b.receita - a.receita);

  // Formas de pagamento
  const fpMap = new Map<string, number>();
  pedRows.forEach((p) => { fpMap.set(p.formaPagamento || "Outros", (fpMap.get(p.formaPagamento || "Outros") || 0) + p.valorTotal); });
  const fpTotal = Array.from(fpMap.values()).reduce((a, b) => a + b, 0);
  const formasPagamento = Array.from(fpMap.entries())
    .map(([forma, valor]) => ({ forma, valor: round2(valor), pct: fpTotal > 0 ? round2((valor / fpTotal) * 100) : 0 }))
    .sort((a, b) => b.valor - a.valor);

  // Top clientes
  const cliMap = new Map<string, number>();
  pedRows.forEach((p) => { cliMap.set(p.cliente, (cliMap.get(p.cliente) || 0) + p.valorTotal); });
  const topClientes = Array.from(cliMap.entries())
    .map(([nome, valor]) => ({ nome, valor: round2(valor) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const allPedidos = new Set(prodRows.map((p) => p.numero));
  const freteTotal = pedRows.reduce((s, p) => s + p.valorFrete, 0);
  const mesesList = resumoMeses.map((m) => m.mes);

  return {
    produtos: prodRows,
    pedidos: pedRows,
    naoIdentificados: Array.from(naoIdMap.values()),
    resumoMeses,
    resumoProdutos,
    resumoVendedores,
    periodoMin: mesesList[0] || "—",
    periodoMax: mesesList[mesesList.length - 1] || "—",
    totalPedidos: allPedidos.size,
    totalItens: round2(prodRows.reduce((s, p) => s + p.quantidade, 0)),
    receitaBruta: round2(prodRows.reduce((s, p) => s + p.precoTotal, 0)),
    freteTotal: round2(freteTotal),
    formasPagamento,
    topClientes,
  };
}

/* ── Component ──────────────────────────────── */

export default function ImportarMaio() {
  const { salvarFechamento, totalCFPorCategoria, salvarVendas } = useKalla();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ImportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setData(null); setImported(false);

    const buffer = await file.arrayBuffer();
    const result = parseExcel(buffer);
    if (typeof result === "string") {
      setError(result);
    } else {
      setData(result);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (!data) return;
    setImporting(true);

    data.resumoMeses.forEach((m) => {
      const dados: DadosMes = {
        mes: m.mes,
        receita: m.receita,
        cmv: m.cmvReal,
        custos: { ...totalCFPorCategoria },
      };
      salvarFechamento(dados, true);
    });

    // Save vendas data to context for AnaliseVendas tab
    salvarVendas({
      periodoMin: data.periodoMin,
      periodoMax: data.periodoMax,
      totalPedidos: data.totalPedidos,
      totalItens: data.totalItens,
      receitaBruta: data.receitaBruta,
      freteTotal: data.freteTotal,
      resumoMeses: data.resumoMeses,
      resumoProdutos: data.resumoProdutos,
      resumoVendedores: data.resumoVendedores,
      formasPagamento: data.formasPagamento,
      topClientes: data.topClientes.map((c) => ({ ...c, pedidos: 1 })),
      produtosRaw: data.produtos.map(p => ({
        numero: p.numero, data: p.data, cliente: p.cliente, representante: p.representante,
        codigoProduto: p.codigoProduto, descricao: p.descricao, quantidade: p.quantidade,
        precoUnit: p.precoUnit, precoTotal: p.precoTotal, mesAno: p.mesAno
      })),
      pedidosRaw: data.pedidos
    });

    setImporting(false);
    setImported(true);
    toast({ title: `Dados importados com sucesso! 🎉 ${data.totalPedidos} pedidos — ${formatBRL(data.receitaBruta)}` });
  }, [data, salvarFechamento, salvarVendas, totalCFPorCategoria, toast]);

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="flex items-center gap-4">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()}
          className="px-6 py-3 bg-info text-primary-foreground rounded-lg font-medium hover:bg-info/90 transition-colors inline-flex items-center gap-2">
          <Upload className="w-4 h-4" /> 📁 Selecionar relatório do Maiô (.xlsx)
        </button>
        {data && !imported && (
          <span className="flex items-center gap-1 text-sm text-success">
            <FileSpreadsheet className="w-4 h-4" /> Arquivo carregado
          </span>
        )}
        {imported && (
          <span className="flex items-center gap-1 text-sm text-success font-medium">
            <CheckCircle className="w-4 h-4" /> Importado com sucesso!
          </span>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Preview */}
      {data && !imported && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="text-sm font-bold text-foreground">{data.periodoMin} a {data.periodoMax}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-lg font-bold text-foreground">{data.totalPedidos}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Itens vendidos</p>
              <p className="text-lg font-bold text-foreground">{data.totalItens.toLocaleString("pt-BR")}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Receita bruta</p>
              <p className="text-lg font-bold text-info">{formatBRL(data.receitaBruta)}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Frete total</p>
              <p className="text-lg font-bold text-foreground">{formatBRL(data.freteTotal)}</p>
            </div>
          </div>

          {/* Não identificados */}
          {data.naoIdentificados.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                ⚠ {data.naoIdentificados.length} SKU(s) não identificado(s):
              </p>
              <div className="space-y-1 text-xs">
                {data.naoIdentificados.map((n) => (
                  <div key={n.codigo} className="flex items-center gap-3">
                    <span className="font-mono text-warning">{n.codigo}</span>
                    <span className="text-muted-foreground flex-1">{n.descricao}</span>
                    <span className="text-foreground">{n.qtd.toFixed(1)} un — {formatBRL2(n.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo por mês */}
          <div className="bg-card rounded-lg shadow-sm overflow-x-auto">
            <h4 className="font-semibold text-card-foreground p-4 pb-2">📅 Resumo por Mês</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  {["Mês", "Pedidos", "Itens", "Receita", "CMV Real", "CMV%"].map((h) => (
                    <th key={h} className="text-left py-2 px-4 text-muted-foreground font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.resumoMeses.map((m) => (
                  <tr key={m.mes} className="border-b border-border/30">
                    <td className="py-2 px-4 font-medium text-foreground">{m.mes}</td>
                    <td className="py-2 px-4 text-foreground">{m.pedidos}</td>
                    <td className="py-2 px-4 text-foreground">{m.itens.toFixed(1)}</td>
                    <td className="py-2 px-4 font-semibold text-info">{formatBRL(m.receita)}</td>
                    <td className="py-2 px-4 text-foreground">{formatBRL(m.cmvReal)}</td>
                    <td className="py-2 px-4 text-muted-foreground">{m.cmvPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 10 produtos */}
          <div className="bg-card rounded-lg shadow-sm overflow-x-auto">
            <h4 className="font-semibold text-card-foreground p-4 pb-2">🏆 Top 10 Produtos por Faturamento</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  {["Produto", "Qtd", "Receita", "CMV", "MC unit."].map((h) => (
                    <th key={h} className="text-left py-2 px-4 text-muted-foreground font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.resumoProdutos.map((p) => (
                  <tr key={p.produto} className="border-b border-border/30">
                    <td className="py-2 px-4 text-foreground">
                      <span className="font-medium">{p.produto}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.linha}</span>
                    </td>
                    <td className="py-2 px-4 text-foreground">{p.qtd.toFixed(1)}</td>
                    <td className="py-2 px-4 font-semibold text-info">{formatBRL(p.receita)}</td>
                    <td className="py-2 px-4 text-foreground">{formatBRL(p.cmv)}</td>
                    <td className={`py-2 px-4 font-semibold ${p.mcUnit >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatBRL2(p.mcUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vendedores */}
          <div className="bg-card rounded-lg shadow-sm overflow-x-auto">
            <h4 className="font-semibold text-card-foreground p-4 pb-2">👥 Vendas por Representante</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  {["Representante", "Pedidos", "Receita", "Ticket Médio"].map((h) => (
                    <th key={h} className="text-left py-2 px-4 text-muted-foreground font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.resumoVendedores.map((v) => (
                  <tr key={v.nome} className="border-b border-border/30">
                    <td className="py-2 px-4 font-medium text-foreground">{v.nome}</td>
                    <td className="py-2 px-4 text-foreground">{v.pedidos}</td>
                    <td className="py-2 px-4 font-semibold text-info">{formatBRL(v.receita)}</td>
                    <td className="py-2 px-4 text-foreground">{formatBRL(v.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info extras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Formas pagamento */}
            <div className="bg-card rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-card-foreground mb-3">💳 Formas de Pagamento</h4>
              <div className="space-y-2">
                {data.formasPagamento.map((f) => (
                  <div key={f.forma} className="flex items-center gap-3">
                    <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
                      <div className="h-full bg-info/60 rounded-full" style={{ width: `${f.pct}%` }} />
                    </div>
                    <span className="text-xs text-foreground w-20 text-right">{f.forma}</span>
                    <span className="text-xs font-bold text-foreground w-12 text-right">{f.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top clientes */}
            <div className="bg-card rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-card-foreground mb-3">🏅 Top 5 Clientes</h4>
              <div className="space-y-2">
                {data.topClientes.map((c, i) => (
                  <div key={c.nome} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-foreground flex-1 truncate">{c.nome}</span>
                    <span className="font-semibold text-info">{formatBRL(c.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm */}
          <div className="flex items-center gap-4 pt-2">
            <button onClick={handleImport} disabled={importing}
              className="px-8 py-3 bg-success text-primary-foreground rounded-lg font-medium hover:bg-success/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-5 h-5" /> ✅ Importar dados para o sistema
            </button>
            <p className="text-xs text-muted-foreground">
              Isso salvará os dados de {data.resumoMeses.length} mês(es) no sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
