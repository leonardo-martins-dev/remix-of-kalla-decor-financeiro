export interface ProductLine {
  id?: number;
  name: string;
  material: string;
  custos: number[];
  pv: number;
  pm: number;
  pvB2B: number;
  pedMin: number;
  frete: number;
  embalUn: number;
  skus: string[];
  mercadoB2C: string;
  mercadoB2B: string;
  posicao: string;
  concorrentes: { nome: string; preco: number }[];
  specs?: string[];
}

/** Item vendável para cotação (SKU dentro de uma linha). */
export interface CatalogSku {
  key: string;
  produto: string;
  skuKalla: string;
  linha: string;
  custoPosto: number;
  pv: number;
}

/** Monta o catálogo do orçamento a partir das linhas de produto (dinâmico). */
export function buildOrcamentoCatalog(produtos: ProductLine[]): CatalogSku[] {
  const items: CatalogSku[] = [];
  for (const line of produtos) {
    const skus = line.skus?.length ? line.skus : [line.name];
    skus.forEach((skuName, i) => {
      const nome = String(skuName || "").trim() || line.name;
      const custo = Number.isFinite(line.custos?.[i])
        ? Number(line.custos[i])
        : avgCusto(line.custos?.length ? line.custos : [0]);
      items.push({
        key: `${line.name}::${nome}::${i}`,
        produto: nome.includes(line.name) ? nome : `${line.name} ${nome}`,
        skuKalla: nome,
        linha: line.name,
        custoPosto: custo,
        pv: Number(line.pv) || 0,
      });
    });
  }
  return items;
}

export const PREMISSAS_DEFAULT = {
  das: 0.06,
  taxaCartao: 0.0244,
  comissaoB2C: 0.02,
  comissaoB2B: 0.01,
};

export const productLines: ProductLine[] = [
  {
    name: "Mármore Flexível",
    material: "PU",
    custos: [79.49, 79.49, 92.82, 92.82, 79.49, 79.49],
    pv: 497, pm: 450, pvB2B: 420, pedMin: 2, frete: 150, embalUn: 50,
    skus: ["Toque de Cinza", "Pedra de Sal", "Calacatta Gold", "Folha de Ouro", "Crema Imperial", "Cinza Verona"],
    mercadoB2C: "R$350-600", mercadoB2B: "R$280-480", posicao: "Premium",
    concorrentes: [{ nome: "Revestop", preco: 450 }, { nome: "Mosarte", preco: 520 }, { nome: "ML", preco: 380 }],
    specs: ["Flexível 0,3mm", "UV resistente", "Classe A fogo", "Autoextinguível", "Cola PU"],
  },
  {
    name: "Madeira Ecológica",
    material: "WPC",
    custos: [77.50, 77.50],
    pv: 279, pm: 199, pvB2B: 235, pedMin: 3, frete: 150, embalUn: 5,
    skus: ["Avelã", "Amêndoa"],
    mercadoB2C: "R$200-350", mercadoB2B: "R$150-260", posicao: "Premium",
    concorrentes: [{ nome: "EspaçoWall", preco: 299 }, { nome: "Woopo", preco: 229 }, { nome: "BR Floor", preco: 189 }],
  },
  {
    name: "Pedra Leve",
    material: "PU",
    custos: [77.70, 77.70, 77.70],
    pv: 199, pm: 149, pvB2B: 169, pedMin: 4, frete: 150, embalUn: 5,
    skus: ["Taupe", "Cinza Terra", "Geada"],
    mercadoB2C: "R$150-250", mercadoB2B: "R$110-180", posicao: "Competitivo",
    concorrentes: [{ nome: "Castelatto", preco: 220 }, { nome: "Solarium", preco: 189 }, { nome: "Sta Luzia", preco: 175 }],
  },
  {
    name: "Rev. Texturizado",
    material: "PU",
    custos: [59.10, 40.39, 40.39],
    pv: 139, pm: 99, pvB2B: 119, pedMin: 4, frete: 150, embalUn: 5,
    skus: ["Cinza Areia", "Duna", "Polar"],
    mercadoB2C: "R$100-180", mercadoB2B: "R$70-130", posicao: "Competitivo",
    concorrentes: [{ nome: "Solarium", preco: 159 }, { nome: "Sta Luzia", preco: 129 }, { nome: "3TC", preco: 109 }],
  },
  {
    name: "Cobogó/3D",
    material: "PU",
    custos: [58.80, 90.53],
    pv: 169, pm: 99, pvB2B: 145, pedMin: 6, frete: 150, embalUn: 5,
    skus: ["3D Lunar R$147", "Cobogó R$169"],
    mercadoB2C: "R$130-220", mercadoB2B: "R$90-160", posicao: "Preço médio",
    concorrentes: [{ nome: "Castelatto", preco: 195 }, { nome: "Solarium", preco: 169 }, { nome: "Portobello", preco: 210 }],
  },
  {
    name: "Ripado WPC",
    material: "WPC",
    custos: [14.82, 14.82, 14.82, 14.82],
    pv: 54, pm: 54, pvB2B: 42, pedMin: 10, frete: 150, embalUn: 5,
    skus: ["Cumarú", "Cinza", "Ébano", "Freijó"],
    mercadoB2C: "R$54-250", mercadoB2B: "R$35-55", posicao: "Muito competitivo",
    concorrentes: [{ nome: "Wallboard", preco: 79.90 }, { nome: "GF Casa Decor", preco: 89 }, { nome: "Woopo", preco: 89.90 }, { nome: "BR Floor", preco: 129.90 }, { nome: "EspaçoWall", preco: 246.90 }],
  },
  {
    name: "Piso SPC Click",
    material: "SPC",
    custos: [52.80, 52.80, 52.80, 52.80],
    pv: 149, pm: 119, pvB2B: 125, pedMin: 5, frete: 150, embalUn: 5,
    skus: ["Aspen", "Boreal", "Toscana", "Atacama"],
    mercadoB2C: "R$120-180", mercadoB2B: "R$85-130", posicao: "Competitivo",
    concorrentes: [{ nome: "Durafloor", preco: 169 }, { nome: "Eucafloor", preco: 149 }, { nome: "Quick Step", preco: 189 }, { nome: "Tarkett", preco: 159 }],
  },
  {
    name: "Deck WPC",
    material: "WPC",
    custos: [111.97, 136.71],
    pv: 340, pm: 319, pvB2B: 285, pedMin: 5, frete: 150, embalUn: 5,
    skus: ["Café Imperial", "Castanheira"],
    mercadoB2C: "R$280-450", mercadoB2B: "R$200-320", posicao: "Premium",
    concorrentes: [{ nome: "Madvei", preco: 380 }, { nome: "EspaçoWall", preco: 420 }, { nome: "Trex", preco: 550 }],
  },
  {
    name: "Cantoneira L",
    material: "WPC",
    custos: [5.10],
    pv: 39, pm: 30, pvB2B: 30, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Cantoneira L"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Cantoneira Lateral",
    material: "WPC",
    custos: [7.00],
    pv: 39, pm: 30, pvB2B: 30, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Cantoneira Lateral"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Painel Ripado Externo WPC",
    material: "WPC",
    custos: [47.85],
    pv: 239, pm: 149, pvB2B: 149, pedMin: 5, frete: 150, embalUn: 5,
    skus: ["Painel Ripado Externo WPC"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Competitivo",
    concorrentes: [],
  },
  {
    name: "Acabamento Lateral - Ripado Ext.",
    material: "WPC",
    custos: [10.00],
    pv: 69, pm: 69, pvB2B: 69, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Acabamento Lateral - Ripado Ext."],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Barrote",
    material: "WPC",
    custos: [12.00],
    pv: 49, pm: 49, pvB2B: 49, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Barrote"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Clipe",
    material: "Outros",
    custos: [10.00],
    pv: 1.30, pm: 1.30, pvB2B: 1.30, pedMin: 10, frete: 150, embalUn: 5,
    skus: ["Clipe"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Parafuso",
    material: "Outros",
    custos: [0.20],
    pv: 0.45, pm: 0.45, pvB2B: 0.45, pedMin: 10, frete: 150, embalUn: 5,
    skus: ["Parafuso"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Kit Parafuso e Bucha",
    material: "Outros",
    custos: [10.00],
    pv: 1.90, pm: 1.90, pvB2B: 1.90, pedMin: 10, frete: 150, embalUn: 5,
    skus: ["Kit Parafuso e Bucha"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Forro Arquitetônico Teto",
    material: "PVC",
    custos: [40.00],
    pv: 120, pm: 60, pvB2B: 60, pedMin: 4, frete: 150, embalUn: 5,
    skus: ["Forro Arquitetônico Teto"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Competitivo",
    concorrentes: [],
  },
  {
    name: "Acabamento Lateral - Forro",
    material: "PVC",
    custos: [10.00],
    pv: 24, pm: 24, pvB2B: 24, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Acabamento Lateral - Forro"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Acabamento em T - Forro",
    material: "PVC",
    custos: [10.00],
    pv: 24, pm: 24, pvB2B: 24, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Acabamento em T - Forro"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Rodapé Piso Vinílico T",
    material: "Vinílico",
    custos: [35.00],
    pv: 97, pm: 72, pvB2B: 72, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Rodapé Piso Vinílico T"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Rodapé Piso Redutor",
    material: "Vinílico",
    custos: [35.00],
    pv: 97, pm: 72, pvB2B: 72, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Rodapé Piso Redutor"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
  {
    name: "Rodapé SPC",
    material: "SPC",
    custos: [39.00],
    pv: 49, pm: 49, pvB2B: 49, pedMin: 1, frete: 150, embalUn: 5,
    skus: ["Rodapé SPC"],
    mercadoB2C: "", mercadoB2B: "", posicao: "Acessório",
    concorrentes: [],
  },
];

export const CUSTOS_FIXOS_DEFAULT = {
  pessoal: [
    { nome: "Gustavo (Pró-labore)", valor: 12517 },
    { nome: "Gisele (Financeiro)", valor: 7000 },
    { nome: "Elvis (Vendedor)", valor: 3905 },
    { nome: "Ranielly (Logística)", valor: 4500 },
    { nome: "Maurício (Vendedor)", valor: 2909 },
    { nome: "Mirela (Vendedora)", valor: 3500 },
    { nome: "Elaine (Vendedora)", valor: 273 },
    { nome: "Gabriela (Marketing)", valor: 3000 },
    { nome: "William (Estoque)", valor: 2700 },
    { nome: "Vinícius (Estoque)", valor: 1550 },
    { nome: "Ajudantes diversos", valor: 2230 },
    { nome: "Sebastiana (Limpeza)", valor: 1000 },
    { nome: "Seg.Trabalho+Uniformes", valor: 500 },
  ],
  predial: [
    { nome: "Aluguel showroom + CD", valor: 15000 },
    { nome: "Condomínio / IPTU", valor: 5000 },
    { nome: "Energia elétrica", valor: 2900 },
    { nome: "Água", valor: 300 },
    { nome: "Manutenção predial", valor: 8163 },
  ],
  marketing: [
    { nome: "Tráfego pago (Meta/Google)", valor: 18000 },
    { nome: "Produção de conteúdo", valor: 3000 },
    { nome: "Ferramentas/plataformas", valor: 500 },
    { nome: "Material gráfico", valor: 1290 },
    { nome: "Montagem showroom", valor: 3000 },
  ],
  comercial: [
    { nome: "Frete entrega cliente", valor: 1300 },
    { nome: "Embalagem envio", valor: 5450 },
    { nome: "Combustível/veículos", valor: 2500 },
    { nome: "Alimentação equipe", valor: 164 },
    { nome: "Viagens/deslocamentos", valor: 1500 },
    { nome: "Outros comerciais", valor: 5143 },
  ],
  admin: [
    { nome: "Contabilidade", valor: 610 },
    { nome: "Sistema Maiô", valor: 695 },
    { nome: "Consultoria NoPonto", valor: 4500 },
    { nome: "Internet/Telefone", valor: 500 },
    { nome: "Material escritório", valor: 300 },
    { nome: "Seguros", valor: 5421 },
  ],
  logistica: [
    { nome: "Frete Santos→Limeira", valor: 5000 },
    { nome: "Capatazia/armazenagem", valor: 3000 },
    { nome: "Despachante", valor: 1822 },
  ],
};

export const CONTAINERS = [
  { id: "IMPO 2760", mes: "Out/25", barana: 133000, internacao: 122000, total: 241000, completo: true },
  { id: "IMPO 2768", mes: "Out/25", barana: 75000, internacao: 110000, total: 165000, completo: true },
  { id: "IMPO 3166", mes: "Nov/25", barana: 52000, internacao: 79000, total: 135000, completo: true },
  { id: "IMPO 3167", mes: "Dez/25", barana: 73000, internacao: 86000, total: 162000, completo: true },
  { id: "IMPO 3192", mes: "Dez/25", barana: 60000, internacao: 73000, total: 135000, completo: true },
  { id: "IMPO 3431", mes: "Fev/26", barana: 89000, internacao: null, total: 92000, completo: false },
  { id: "IMPO 3432", mes: "Fev/26", barana: 81000, internacao: null, total: 84000, completo: false },
];

export function calcMC(pv: number, custoPosto: number, _frete: number, _pedMin: number, _embalUn: number, premissas: typeof PREMISSAS_DEFAULT, isB2B = false) {
  const comissao = isB2B ? premissas.comissaoB2B : premissas.comissaoB2C;
  const mc = pv - (pv * premissas.das) - (pv * premissas.taxaCartao) - (pv * comissao) - custoPosto;
  return mc;
}

export function calcMCPercent(pv: number, mc: number) {
  return pv > 0 ? (mc / pv) * 100 : 0;
}

export function avgCusto(custos: number[]) {
  return custos.reduce((a, b) => a + b, 0) / custos.length;
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatBRL2(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function sumCategory(items: { valor: number }[]) {
  return items.reduce((s, i) => s + i.valor, 0);
}
