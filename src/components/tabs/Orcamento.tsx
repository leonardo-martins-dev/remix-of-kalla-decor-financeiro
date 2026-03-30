import { useState, useEffect, useCallback } from "react";
import { useKalla } from "@/context/KallaContext";
import { useAuth } from "@/context/AuthContext";
import { SKU_MAP } from "@/data/skuMapping";
import { formatBRL2, PREMISSAS_DEFAULT } from "@/data/kallaData";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InfoTooltip from "@/components/InfoTooltip";

const safe = (v: number) => (Number.isFinite(v) ? v : 0);

function getBadge(pct: number) {
  if (pct > 25) return { label: "SAUDÁVEL", cls: "bg-green-100 text-success border-success/30" };
  if (pct > 15) return { label: "ATENÇÃO", cls: "bg-yellow-100 text-warning border-warning/30" };
  if (pct > 0) return { label: "CRÍTICO", cls: "bg-orange-100 text-orange-600 border-orange-300" };
  return { label: "PREJUÍZO", cls: "bg-red-100 text-destructive border-destructive/30" };
}

function formatCPFCNPJ(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join(".") + (e ? `-${e}` : "")
    );
  }
  return d.replace(/(\d{2})(\d{3})?(\d{3})?(\d{4})?(\d{2})?/, (_, a, b, c, e, f) =>
    [a, b, c].filter(Boolean).join(".") + (e ? `/${e}` : "") + (f ? `-${f}` : "")
  );
}

interface CotacaoItem {
  id: number;
  skuIdx: number;
  qtd: number;
  pvUnit: number;
  descPct: number;
}

interface ClienteData {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  cidadeUf: string;
  obs: string;
}

interface CotacaoSalva {
  numero: string;
  data: string;
  cliente: string;
  valor: number;
  itens: number;
  vendedor: string;
}

const FORMAS_PGTO = [
  "À Vista (PIX)",
  "Cartão 1x",
  "Cartão 4x s/ juros",
  "Cartão 10x s/ juros",
  "Boleto 30 dias",
  "Boleto 30/60",
];

// All SKUs flattened for the select
const ALL_SKUS = SKU_MAP.map((s, i) => ({ idx: i, label: `${s.produto} (${s.skuKalla})`, pv: 0, custo: s.custoPosto, linha: s.linha }));

function getNextSeq(): number {
  const raw = localStorage.getItem("kalla_cotacao_seq");
  return raw ? Number(raw) + 1 : 1;
}

function saveSeq(n: number) {
  localStorage.setItem("kalla_cotacao_seq", String(n));
}

function loadCotacoes(): CotacaoSalva[] {
  try {
    const raw = localStorage.getItem("kalla_cotacoes");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCotacoes(c: CotacaoSalva[]) {
  localStorage.setItem("kalla_cotacoes", JSON.stringify(c));
}

// Get PV for a SKU based on its product line
function getPvForSku(skuIdx: number, produtos: { name: string; pv: number }[]): number {
  const sku = SKU_MAP[skuIdx];
  if (!sku) return 0;
  const prod = produtos.find(p => p.name === sku.linha);
  return prod ? prod.pv : 0;
}

export default function Orcamento() {
  const { produtos, premissas } = useKalla();
  const { session } = useAuth();

  const [cliente, setCliente] = useState<ClienteData>({
    nome: "", cpfCnpj: "", telefone: "", email: "", endereco: "", cidadeUf: "", obs: "",
  });

  const [itens, setItens] = useState<CotacaoItem[]>([
    { id: 1, skuIdx: 0, qtd: 1, pvUnit: getPvForSku(0, produtos), descPct: 0 },
  ]);

  const [freteCobrado, setFreteCobrado] = useState(0);
  const [custoFreteKalla, setCustoFreteKalla] = useState(150);
  const [embalagem, setEmbalagem] = useState(30);
  const [formaPgto, setFormaPgto] = useState(FORMAS_PGTO[0]);
  const [cotacoes, setCotacoes] = useState<CotacaoSalva[]>(() => loadCotacoes());
  const [nextId, setNextId] = useState(2);

  useEffect(() => { saveCotacoes(cotacoes); }, [cotacoes]);

  const addItem = () => {
    setItens(prev => [...prev, { id: nextId, skuIdx: 0, qtd: 1, pvUnit: getPvForSku(0, produtos), descPct: 0 }]);
    setNextId(n => n + 1);
  };

  const removeItem = (id: number) => {
    if (itens.length <= 1) return;
    setItens(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: number, field: keyof CotacaoItem, value: number) => {
    setItens(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      if (field === "skuIdx") {
        updated.pvUnit = getPvForSku(value, produtos);
      }
      return updated;
    }));
  };

  // Calculations
  const calcSubtotal = (item: CotacaoItem) => safe(item.qtd * item.pvUnit * (1 - item.descPct / 100));

  const calcMcItem = useCallback((item: CotacaoItem) => {
    const pvDesc = item.pvUnit * (1 - item.descPct / 100);
    const custo = SKU_MAP[item.skuIdx]?.custoPosto ?? 0;
    const mc = pvDesc - (pvDesc * premissas.das) - (pvDesc * premissas.taxaCartao) - (pvDesc * premissas.comissaoB2C) - custo;
    return safe(mc);
  }, [premissas]);

  const calcMcPctItem = useCallback((item: CotacaoItem) => {
    const pvDesc = item.pvUnit * (1 - item.descPct / 100);
    const mc = calcMcItem(item);
    return pvDesc > 0 ? safe((mc / pvDesc) * 100) : 0;
  }, [calcMcItem]);

  const subtotalProdutos = itens.reduce((s, i) => s + calcSubtotal(i), 0);
  const totalCotacao = subtotalProdutos + freteCobrado;

  const qtdTotal = itens.reduce((s, i) => s + i.qtd, 0);
  const descontoMedio = qtdTotal > 0
    ? itens.reduce((s, i) => s + i.descPct * i.qtd, 0) / qtdTotal
    : 0;

  // MC da venda (sem frete/embal)
  const receitaLiquida = subtotalProdutos;
  const dasTotal = safe(receitaLiquida * premissas.das);
  const taxaTotal = safe(receitaLiquida * premissas.taxaCartao);
  const comissaoTotal = safe(receitaLiquida * premissas.comissaoB2C);
  const cmvTotal = itens.reduce((s, i) => safe(i.qtd * (SKU_MAP[i.skuIdx]?.custoPosto ?? 0)) + s, 0);
  const mcVenda = safe(receitaLiquida - dasTotal - taxaTotal - comissaoTotal - cmvTotal);
  const mcVendaPct = receitaLiquida > 0 ? safe((mcVenda / receitaLiquida) * 100) : 0;

  // Margem real (com frete/embal)
  const margemReal = safe(mcVenda - custoFreteKalla - embalagem);
  const margemRealPct = receitaLiquida > 0 ? safe((margemReal / receitaLiquida) * 100) : 0;
  const badgeReal = getBadge(margemRealPct);

  // PDF generation
  const gerarPDF = () => {
    const seq = getNextSeq();
    const numero = `KD-${String(seq).padStart(4, "0")}`;
    saveSeq(seq);

    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, w, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("KALLA DECOR", 14, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Revestimentos Premium | PU • WPC • SPC", 14, 26);

    doc.setFontSize(10);
    doc.text(`Cotação ${numero}`, w - 14, 14, { align: "right" });
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, w - 14, 21, { align: "right" });
    doc.text("Validade: 7 dias", w - 14, 28, { align: "right" });

    // Client data
    doc.setTextColor(15, 23, 42);
    let y = 45;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const clientRows = [
      [`Nome/Razão Social: ${cliente.nome}`, `CPF/CNPJ: ${cliente.cpfCnpj}`],
      [`Telefone: ${cliente.telefone}`, `E-mail: ${cliente.email}`],
      [`Endereço: ${cliente.endereco}`, `Cidade/UF: ${cliente.cidadeUf}`],
    ];
    clientRows.forEach(row => {
      doc.text(row[0], 14, y);
      doc.text(row[1], w / 2 + 5, y);
      y += 6;
    });

    // Products table
    y += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUTOS", 14, y);
    y += 4;

    const tableData = itens.map((item, idx) => [
      String(idx + 1),
      SKU_MAP[item.skuIdx]?.produto ?? "",
      String(item.qtd),
      formatBRL2(item.pvUnit),
      item.descPct > 0 ? `${item.descPct}%` : "—",
      formatBRL2(calcSubtotal(item)),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Produto", "Qtd", "Preço Unit.", "Desc.", "Subtotal"]],
      body: tableData,
      foot: [["", "", "", "", "SUBTOTAL", formatBRL2(subtotalProdutos)]],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "center" }, 5: { halign: "right" } },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Conditions
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CONDIÇÕES", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Frete: ${freteCobrado === 0 ? "Grátis" : formatBRL2(freteCobrado)}`, 14, y);
    y += 6;
    doc.text(`Forma de pagamento: ${formaPgto}`, 14, y);
    y += 10;

    // Total
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, y, w - 28, 16, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${formatBRL2(totalCotacao)}`, w / 2, y + 10.5, { align: "center" });
    y += 24;

    // Observations
    if (cliente.obs.trim()) {
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Observações", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(cliente.obs, w - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 6;
    }

    // Footer
    const fh = 25;
    const fy = doc.internal.pageSize.getHeight() - fh;
    doc.setFillColor(241, 245, 249);
    doc.rect(0, fy, w, fh, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Kalla Decor — Revestimentos Premium", w / 2, fy + 8, { align: "center" });
    doc.text("Rua Wilson Vitório Coletta, 181 — Limeira/SP", w / 2, fy + 13, { align: "center" });
    doc.text("WhatsApp: (19) 99685-8407 | atendimento@kalladecor.com.br | kalladecor.com.br", w / 2, fy + 18, { align: "center" });

    doc.save(`Cotacao_${numero}_${cliente.nome || "cliente"}.pdf`);

    // Save to recent
    const nova: CotacaoSalva = {
      numero,
      data: new Date().toLocaleDateString("pt-BR"),
      cliente: cliente.nome || "—",
      valor: totalCotacao,
      itens: itens.length,
      vendedor: session?.nome ?? "Sistema",
    };
    setCotacoes(prev => [nova, ...prev].slice(0, 50));
  };

  const duplicarCotacao = (c: CotacaoSalva) => {
    setCliente(prev => ({ ...prev, nome: c.cliente }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* Client Data */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">👤 Dados do Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Nome / Razão Social *</label>
            <input type="text" value={cliente.nome} onChange={e => setCliente(p => ({ ...p, nome: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Nome completo ou razão social" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">CPF / CNPJ</label>
            <input type="text" value={cliente.cpfCnpj} maxLength={18}
              onChange={e => setCliente(p => ({ ...p, cpfCnpj: formatCPFCNPJ(e.target.value) }))}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Telefone</label>
            <input type="tel" value={cliente.telefone} onChange={e => setCliente(p => ({ ...p, telefone: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="(19) 99999-0000" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">E-mail</label>
            <input type="email" value={cliente.email} onChange={e => setCliente(p => ({ ...p, email: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="cliente@email.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Endereço</label>
            <input type="text" value={cliente.endereco} onChange={e => setCliente(p => ({ ...p, endereco: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Rua, número, complemento" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cidade / UF</label>
            <input type="text" value={cliente.cidadeUf} onChange={e => setCliente(p => ({ ...p, cidadeUf: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Limeira/SP" />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-card-foreground">📦 Itens da Cotação</h3>
          <button onClick={addItem}
            className="px-3 py-1.5 text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            + Adicionar item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 w-8">#</th>
                <th className="pb-2 pr-2 min-w-[200px]">Produto</th>
                <th className="pb-2 pr-2 w-16 text-center">Qtd</th>
                <th className="pb-2 pr-2 w-24 text-right">Preço Unit.</th>
                <th className="pb-2 pr-2 w-20 text-center">Desc %</th>
                <th className="pb-2 pr-2 w-24 text-right">Subtotal</th>
                <th className="pb-2 pr-2 w-20 text-center">MC%</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => {
                const mcPct = calcMcPctItem(item);
                const mcColor = mcPct > 25 ? "text-success" : mcPct > 15 ? "text-warning" : mcPct > 0 ? "text-orange-500" : "text-destructive";
                return (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2 pr-2 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 pr-2">
                      <select value={item.skuIdx} onChange={e => updateItem(item.id, "skuIdx", Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {ALL_SKUS.map((s, i) => (
                          <option key={i} value={s.idx}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min={1} value={item.qtd}
                        onChange={e => updateItem(item.id, "qtd", Math.max(1, Number(e.target.value)))}
                        className="w-full px-2 py-1.5 rounded border border-border bg-blue-50 text-info font-semibold text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min={0} step={0.01} value={item.pvUnit}
                        onChange={e => updateItem(item.id, "pvUnit", Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded border border-border bg-blue-50 text-info font-semibold text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min={0} max={40} value={item.descPct}
                        onChange={e => updateItem(item.id, "descPct", Math.min(40, Math.max(0, Number(e.target.value))))}
                        className="w-full px-2 py-1.5 rounded border border-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold">{formatBRL2(calcSubtotal(item))}</td>
                    <td className={`py-2 pr-2 text-center font-bold ${mcColor}`}>{mcPct.toFixed(1)}%</td>
                    <td className="py-2">
                      <button onClick={() => removeItem(item.id)} disabled={itens.length <= 1}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                        aria-label="Remover item">🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery Costs & Payment */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">🚚 Custos da Entrega & Pagamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Frete cobrado do cliente (R$)</label>
            <input type="number" min={0} value={freteCobrado} onChange={e => setFreteCobrado(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Custo do frete para Kalla (R$)</label>
            <input type="number" min={0} value={custoFreteKalla} onChange={e => setCustoFreteKalla(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Embalagem (R$)</label>
            <input type="number" min={0} value={embalagem} onChange={e => setEmbalagem(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Forma de pagamento</label>
            <select value={formaPgto} onChange={e => setFormaPgto(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {FORMAS_PGTO.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Observations */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">📝 Observações para o cliente</h3>
        <textarea value={cliente.obs} onChange={e => setCliente(p => ({ ...p, obs: e.target.value }))}
          rows={3} placeholder="Observações que aparecerão no PDF..."
          className="w-full px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-xs text-muted-foreground mb-1">Subtotal Produtos <InfoTooltip text="Soma dos itens com desconto aplicado, sem frete." /></p>
          <p className="text-lg font-bold text-foreground">{formatBRL2(subtotalProdutos)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-xs text-muted-foreground mb-1">Frete Cobrado <InfoTooltip text="Valor de frete que será cobrado do cliente na cotação." /></p>
          <p className="text-lg font-bold text-foreground">{freteCobrado === 0 ? "Grátis" : formatBRL2(freteCobrado)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm text-center border-2 border-primary/30">
          <p className="text-xs text-muted-foreground mb-1">TOTAL COTAÇÃO <InfoTooltip text="Subtotal dos produtos + frete cobrado. Valor final que aparecerá no PDF do cliente." /></p>
          <p className="text-xl font-bold text-primary">{formatBRL2(totalCotacao)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-xs text-muted-foreground mb-1">Desconto Médio <InfoTooltip text="Média ponderada dos descontos aplicados nos itens, pelo peso da quantidade." /></p>
          <p className="text-lg font-bold text-foreground">{descontoMedio.toFixed(1)}%</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-xs text-muted-foreground mb-1">MC Venda <InfoTooltip text="Margem de contribuição da venda considerando DAS, taxa de cartão, comissão e custo dos produtos. Não inclui frete e embalagem." /></p>
          <p className="text-xs text-muted-foreground">(sem frete/embal)</p>
          <p className={`text-lg font-bold ${mcVenda >= 0 ? "text-info" : "text-destructive"}`}>{formatBRL2(mcVenda)}</p>
          <p className="text-xs text-muted-foreground">{mcVendaPct.toFixed(1)}%</p>
        </div>
        <div className={`rounded-lg p-4 shadow-sm text-center border ${badgeReal.cls}`}>
          <p className="text-xs text-muted-foreground mb-1">Margem Real <InfoTooltip text="Margem final descontando custo de frete e embalagem da Kalla. É o lucro real dessa venda específica." /></p>
          <p className="text-xs text-muted-foreground">(com frete/embal)</p>
          <p className="text-lg font-bold">{formatBRL2(margemReal)}</p>
          <p className="text-sm font-semibold">{margemRealPct.toFixed(1)}% — {badgeReal.label}</p>
        </div>
      </div>

      {/* Generate PDF Button */}
      <div className="flex justify-center">
        <button onClick={gerarPDF} disabled={!cliente.nome.trim()}
          className="px-8 py-3 text-base font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md">
          📄 Gerar Cotação em PDF
        </button>
      </div>

      {/* Recent Quotes */}
      {cotacoes.length > 0 && (
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">📋 Cotações Recentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-2">#</th>
                  <th className="pb-2 pr-2">Data</th>
                  <th className="pb-2 pr-2">Cliente</th>
                  <th className="pb-2 pr-2 text-right">Valor</th>
                  <th className="pb-2 pr-2 text-center">Itens</th>
                  <th className="pb-2 pr-2">Vendedor</th>
                  <th className="pb-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cotacoes.map((c, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-2 font-mono text-xs">{c.numero}</td>
                    <td className="py-2 pr-2">{c.data}</td>
                    <td className="py-2 pr-2">{c.cliente}</td>
                    <td className="py-2 pr-2 text-right font-semibold">{formatBRL2(c.valor)}</td>
                    <td className="py-2 pr-2 text-center">{c.itens}</td>
                    <td className="py-2 pr-2">{c.vendedor}</td>
                    <td className="py-2 flex gap-2">
                      <button onClick={() => duplicarCotacao(c)}
                        className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-accent transition-colors">
                        📋 Duplicar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
