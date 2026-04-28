# Kalla Decor — Gestão Financeira e Comercial

## 1) Cabeçalho

| Campo | Valor |
|---|---|
| **Projeto** | Kalla Decor — Gestão Financeira e Comercial |
| **Repositório** | `leonardo-martins-dev/remix-of-kalla-decor-financeiro` |
| **Branch** | `main` |
| **Status atual** | ⚠️ Em operação com evolução ativa (há mudanças locais não versionadas, ex.: `.cursor/`) |
| **URL do repo** | [github.com/leonardo-martins-dev/remix-of-kalla-decor-financeiro](https://github.com/leonardo-martins-dev/remix-of-kalla-decor-financeiro) |
| **URL do app** | Não definida no código (provável deploy Vite) |
| **Banco principal** | Supabase projeto `vgxvzrsewvbauecpkfcw` |

---

## 2) Descrição (o que o sistema faz para o negócio)

O sistema é um **painel interno da Kalla Decor** para suportar decisão comercial/financeira com foco em:
- precificação de linhas de produto (B2C/B2B),
- simulação de desconto e margem,
- orçamento com geração de PDF,
- gestão de custos fixos e containers de importação,
- importação e análise de vendas (planilhas do Maiô),
- controle de usuários de acesso.

### Contextos funcionais reais

- **Contexto comercial (`consultor`)**
  - acessa só `Simulador` e `Orçamento`;
  - usa preços e descontos para negociação;
  - não enxerga dados internos mais sensíveis (ex.: custo posto e margens internas em pontos específicos).

- **Contexto financeiro/administrativo (`financeiro` / `admin`)**
  - acesso completo às abas;
  - alimenta fechamentos, custos, produtos, containers e importações;
  - gere usuários com RPCs administrativas no Supabase.

- **Contexto CRM (latente no banco)**
  - existem tabelas de CRM/mensageria (`leads`, `messages`, `conversations`, `tenants`, etc.),
  - **não há UI ativa no frontend atual** para esse fluxo.

---

## 3) Stack tecnológica

### Frontend
- **React 18 + TypeScript**
- **Vite 5**
- **React Router DOM 6**
- **Tailwind CSS 3**
- **shadcn/ui + Radix UI**
- **Recharts** (gráficos)
- **jsPDF + jspdf-autotable** (PDF de orçamento)
- **xlsx** (importação de planilhas Maiô)

### Backend / Dados
- **Supabase**
  - Auth (`signInWithPassword`, sessão, `profiles`)
  - Postgres (tabelas de negócio + RLS)
  - RPCs: `admin_create_user`, `admin_delete_user`
- Cliente Supabase em `src/lib/supabase.ts` via `@supabase/supabase-js`

### Qualidade / Tooling
- **ESLint 9**
- **Vitest** (setup `jsdom`)
- **Playwright** (config base Lovable, sem cenários definidos no repositório)
- **TypeScript 5**

---

## 4) Rotas da aplicação

| Rota | Descrição | Guard/Permissão |
|---|---|---|
| `/login` | Tela de autenticação | `PublicRoute`: redireciona para `/` se já autenticado |
| `/` | Dashboard principal com abas | `ProtectedRoute`: exige sessão válida |
| `*` | Página 404 | Sem guard específico |

### Permissões por perfil (dentro de `/`)
- `admin`, `financeiro`: todas as abas
- `consultor`: apenas `simulador` e `orcamento`

---

## 5) Funcionalidades por módulo

- **Visão Geral**
  - KPIs macro, composição de custos, evolução e margem por linha.

- **Produtos**
  - análise de preço por linha, parâmetros B2C/B2B, concorrência e cenários de desconto.

- **Custos**
  - gestão e leitura de custos fixos por categoria (estrutura usada por outros módulos).

- **Simulador**
  - simulação de preço final por desconto/canal;
  - cálculo de MC em R$ e %;
  - alertas por teto de desconto (global e por linha);
  - comparação com faixa de mercado e concorrentes.

- **Orçamento**
  - montagem de cotação item a item por SKU;
  - desconto por item, frete e forma de pagamento;
  - geração de PDF com cabeçalho/rodapé e logo;
  - persistência de cotações recentes no Supabase.

- **Containers**
  - cadastro/edição de processos de importação;
  - visão de composição de custos (barana, internação, tarifas, desembaraço).

- **Equilíbrio**
  - ponto de equilíbrio, margem de segurança e análises de sensibilidade.

- **Caixa**
  - projeções e cenários de caixa necessário.

- **Vendas**
  - analytics a partir de importação do Maiô (produtos, vendedores, mês, clientes, pagamento).

- **Atualizar**
  - fechamento mensal;
  - atualização de produto e equipe/custos;
  - importação de planilhas Maiô;
  - histórico de alterações e reset para base default.

- **Usuários**
  - criação e remoção de acesso via RPC administrativa;
  - restrições para autoexclusão.

---

## 6) Regras de negócio

- **Autenticação**
  - login aceita usuário sem domínio e tenta candidatos:
    - `@kalladecor.com`
    - `@kalladecor.com.br`
  - mensagens de erro mapeadas para UX.

- **Autorização**
  - perfil controla visibilidade de abas.
  - `consultor` limitado a simulação e orçamento.

- **Simulador (desconto)**
  - alerta crítico geral > 55%.
  - alerta de aprovação por linha:
    - Mármore Flexível 15%
    - Deck WPC / Madeira Ecológica 12%
    - Piso SPC Click / Pedra Leve 10%
    - Rev. Texturizado / Ripado WPC 8%
    - Cobogó/3D 5%
    - default 40%

- **Visibilidade de custos para comercial**
  - custo posto oculto no simulador para perfil comercial (`consultor`/`vendas`).
  - no orçamento, para comercial, oculta blocos de margem/custos internos.

- **Fechamento mensal**
  - permite sobrescrever mês existente (com confirmação).

- **Container**
  - impede duplicidade por `id`.
  - se internação ausente, estima com fator 1,26x do valor barana.

- **Importação Maiô**
  - exige aba `Relatório de Produtos`;
  - mapeia SKU por `SKU_MAP`;
  - SKUs não identificados são sinalizados;
  - grava resumo de vendas e também atualiza fechamentos por mês.

- **Orçamento**
  - salva cotação no banco e gera PDF.
  - número sequencial `KD-XXXX`.

---

## 7) Arquitetura de código

### Estrutura principal

```text
src/
  components/
    tabs/                  # módulos de negócio por aba
    ui/                    # componentes base (shadcn/radix)
    InfoTooltip.tsx
  context/
    AuthContext.tsx        # sessão, login, logout, perfil
    KallaContext.tsx       # estado de negócio + sincronização Supabase
  data/
    kallaData.ts           # defaults de produtos/custos/premissas
    skuMapping.ts          # mapa SKU Maiô -> Kalla + utilitários
  lib/
    supabase.ts            # cliente Supabase
  pages/
    Login.tsx
    Index.tsx              # shell dashboard e regras de tabs por perfil
    NotFound.tsx
  test/
    setup.ts
    example.test.ts
```

### Fluxo de dados principal

1. App sobe em `src/App.tsx` com `AuthProvider` + rotas protegidas.
2. Após login, `Index` monta dashboard e filtra abas por perfil.
3. `KallaProvider` carrega dados do Supabase (`meses`, `produtos`, `custos`, `containers`, etc.).
4. Abas consomem `useKalla()` e escrevem de volta no banco (insert/update/delete).
5. Ações relevantes também entram em `historico`.
6. Importação Maiô atualiza fechamento mensal + `vendas_data`.
7. Orçamento gera PDF local e persiste resumo em `cotacoes`.

---

## 8) Banco de dados (Supabase)

### Tabelas principais usadas pelo app atual
- `profiles`
- `produtos`
- `fechamentos_mensais`
- `containers`
- `custos_fixos`
- `historico`
- `vendas_data`
- `cotacoes`

### Tabelas presentes no banco (contexto paralelo/CRM)
- `tenants`, `leads`, `conversations`, `messages`, `connections`, `agents`, `automations`
- Estão com RLS e migrations aplicadas, mas sem uso no frontend atual.

### Funções especiais (RPC)
- `public.admin_create_user(new_email text, new_password text, new_nome text, new_perfil text)`
- `public.admin_delete_user(target_user_id uuid)`

### RLS / Políticas
- RLS habilitado nas tabelas públicas listadas.
- Política predominante: permissões amplas para role `authenticated`.
- `profiles` possui políticas específicas (`select`, `insert_own`, `update_own`).

### Migrations relevantes (no banco)
- `20260330212431 create_all_tables_and_rls`
- `20260330213606 create_cotacoes_table`
- `20260330214014 update_profiles_and_create_rpc`
- `20260331125848 create_missing_tables_crm`
- `20260401120619 add_media_and_status_to_messages`
- `20260402153837 create_tenants_and_automations`

⚠️ Não há pasta de migrations SQL versionada no repositório local; o histórico está no banco.

---

## 9) Integrações e serviços externos

- **Supabase**
  - Auth + Postgres + RPC (principal backend do app).

- **Importação Maiô**
  - integração por arquivo Excel (`.xlsx/.xls`) carregado manualmente;
  - parser local com `xlsx`.

- **PDF**
  - geração client-side com `jsPDF`/`autotable`.

- **Sem Edge Functions ativas no código frontend**
  - não há `supabase.functions.invoke(...)` no projeto atual.

---

## 10) Variáveis de ambiente

Detectadas no projeto:

- `VITE_SUPABASE_URL` — URL do projeto Supabase (frontend)
- `VITE_SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_PUBLISHABLE_KEY`) — chave pública para cliente web
- `SUPABASE_SERVICE_ROLE_KEY` — chave privilegiada (não deve estar em frontend)

⚠️ **Alerta crítico de segurança:** existe `SUPABASE_SERVICE_ROLE_KEY` no `.env` local do projeto frontend. Mesmo sem uso direto no código web, isso aumenta risco operacional (vazamento local/commit acidental).

---

## 11) Comandos

```bash
npm install
npm run dev
npm run build
npm run build:dev
npm run preview
npm run lint
npm run test
npm run test:watch
```

---

## 12) Notas importantes

- ✅ App funcionalmente orientado a finanças/comercial da Kalla.
- ⚠️ README estava praticamente vazio (`TODO`), o conhecimento real está no código.
- ⚠️ Testes automatizados ainda são mínimos (há teste-exemplo apenas).
- ⚠️ Há desalinhamento entre perfis:
  - frontend já considera `vendas` em algumas lógicas de visibilidade,
  - banco `profiles.perfil` aceita hoje `admin|financeiro|consultor`.
- ⚠️ Tabelas CRM coexistem no mesmo banco, mas sem acoplamento no frontend atual.

---

## 13) Relacionado

- Repositório: [remix-of-kalla-decor-financeiro](https://github.com/leonardo-martins-dev/remix-of-kalla-decor-financeiro)
- Supabase client: `src/lib/supabase.ts`
- Contextos principais: `src/context/AuthContext.tsx`, `src/context/KallaContext.tsx`
- Mapeamento SKU Maiô: `src/data/skuMapping.ts`

---

## Pontos de atenção para qualquer dev novo (leitura obrigatória)

1. **Segurança de credenciais:** remover/segregar `SUPABASE_SERVICE_ROLE_KEY` do ambiente frontend imediatamente.
2. **Permissões inconsistentes:** alinhar enum/check de `profiles.perfil` com perfis usados na UI (`vendas` vs `consultor`).
3. **Governança de schema:** trazer migrations para o repositório (ou documentar fluxo oficial), porque hoje o estado real está no banco e dificulta rastreabilidade.
