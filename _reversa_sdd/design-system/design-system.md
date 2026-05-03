# Design System — Finapp (Documento Consolidado)

> Gerado pelo reversa-design-system em 2026-05-02
> Stack: Tailwind CSS v4 · Shadcn/UI · Radix Primitives · Recharts · OKLCH color space

---

## Visão Geral

O Finapp é uma aplicação Electron/Next.js com **sistema de design baseado no Shadcn/UI**, que usa variáveis CSS no espaço de cor **OKLCH** e **Tailwind CSS v4** para estilização utilitária. O tema suporta nativamente **modo claro e escuro** via classe `.dark`.

---

## 1. Fundação

### Tecnologias de Design

| Tecnologia | Papel | Versão |
|---|---|---|
| **Tailwind CSS v4** | Utilitários de layout, espaçamento, tipografia | `^4.x` |
| **Shadcn/UI** | Componentes base (Card, Button, Table, Sheet...) | Via `shadcn/tailwind.css` |
| **Radix UI** | Primitivos acessíveis (Dialog, Dropdown, Tooltip...) | `^1.x–^2.x` |
| **tw-animate-css** | Animações de entrada/saída | Importado em globals.css |
| **Recharts** | Visualizações de dados (Bar, Line, Pie) | npm |
| **Sonner** | Notificações toast | npm |
| **Lucide React** | Ícones vetoriais | npm |

### Espaço de Cor

Todo o sistema de cores usa **OKLCH** (Oklab Lightness-Chroma-Hue), garantindo:
- Interpolações perceptualmente uniformes
- Melhor contraste entre temas light/dark
- Compatibilidade com CSS Color Level 4

---

## 2. Paleta Resumida

> Consultar detalhe completo em [color-palette.md](./color-palette.md)

### Neutros (base do tema)

| Papel | Light | Dark |
|---|---|---|
| Background | Branco puro (`#ffffff`) | Azul escuro (`#0f1117`) |
| Card | Branco puro | Azul médio (`#1a1f2e`) |
| Texto principal | Quase preto (`#0f1117`) | Quase branco (`#f8f9fc`) |
| Texto muted | Cinza médio (`#6b7280`) | Cinza claro (`#9ca3af`) |
| Borda | Cinza claro (`#e5e7eb`) | Branco 10% opacidade |

### Cores de Ação

| Papel | Light | Dark |
|---|---|---|
| Primary | Azul escuro (`#1a1f2e`) | Cinza claro (`#e5e7eb`) |
| Destructive | Vermelho (`#dc2626`) | Vermelho claro (`#f87171`) |
| Ring (foco) | Cinza (`#9ca3af`) | Cinza médio (`#6b7280`) |

### Cores Funcionais (hardcoded)

| Papel | Hex | Tailwind |
|---|---|---|
| Receita / Sucesso | `#22c55e` | `green-500` |
| Despesa / Erro | `#ef4444` | `red-500` |
| Investimento / Alerta | `#f59e0b` | `amber-500` |
| Saldo líquido / Parcelamento | `#6366f1` | `indigo-500` / `violet-500` |
| Transferência | `#3b82f6` | `blue-500` |
| Pgto. Cartão | `#8b5cf6` | `purple-500` |

---

## 3. Tipografia Resumida

> Consultar detalhe completo em [typography.md](./typography.md)

| Nível | Classe | Tamanho | Peso |
|---|---|---|---|
| Título de página | `text-xl font-semibold` | 20px | 600 |
| Valor monetário | `text-2xl font-bold` | 24px | 700 |
| Título de card | `text-base font-semibold` | 16px | 600 |
| Corpo | `text-sm` | 14px | 400 |
| Labels/badges | `text-xs font-medium` | 12px | 500 |
| Micro labels | `text-[10px]` ou `text-[11px]` | 10–11px | 400 |

**Fonte:** Sistema operacional (sem importação explícita).
**Locale:** `pt-BR` — formatação monetária e datas em padrão brasileiro.

---

## 4. Espaçamento Resumido

> Consultar detalhe completo em [spacing.md](./spacing.md)

| Nível | Valor | Uso típico |
|---|---|---|
| `gap-1.5` / `gap-2` | 6–8px | Entre ícone e texto |
| `gap-3` / `gap-4` | 12–16px | Entre cards e formulários |
| `gap-6` | 24px | Entre seções de página |
| `p-4` | 16px | Padding interno de cards |
| `p-6` | 24px | Padding de páginas |

**Janela desktop:** `1200×800px` (padrão). Layout sidebar + conteúdo com header fixo de `64px`.

---

## 5. Border Radius

| Token | Valor |
|---|---|
| Base (`--radius`) | **10px** |
| `sm` | 6px |
| `md` | 8px |
| `lg` | 10px (base) |
| Pill / circular | 9999px |

---

## 6. Componentes Principais

> Consultar detalhe de tokens em [tokens.md](./tokens.md)

### Componentes Shadcn usados

| Componente | Variantes | Arquivo de referência |
|---|---|---|
| `Button` | `default`, `outline`, `ghost` · `size: sm, icon` | Globalmente |
| `Card` | Com `CardHeader`, `CardContent`, `CardAction` | Dashboard, Banks |
| `Badge` | `default`, `secondary`, `outline` | Transações, Parcelamentos |
| `Sheet` | Lateral, `sm:max-w-md` | CRUD de todos os módulos |
| `Table` | Com sortable rows | Assinaturas, Parcelamentos |
| `DropdownMenu` | Com separador e variante destrutiva | Banks, Subscriptions |
| `Input` | Padrão + inline no TxRow | Forms e tabelas |
| `Combobox` | Custom com criação inline | Categorias em TxRow |

### Gráficos (Recharts)

| Componente | Tipo | Módulo |
|---|---|---|
| `ComposedChart` + `Bar` + `Line` | Barras + Linha | MonthlyIncomeExpenseChart |
| `BarChart` | Barras agrupadas | CreditCardFaturaChart |
| `PieChart` (Donut) | Pizza/Donut | CategoryExpenseChart |

### Micro-interações

| Interação | Implementação |
|---|---|
| Hover em card de banco | `hover:shadow-md transition-shadow` |
| Botão excluir oculto | `opacity-0 group-hover:opacity-100 transition-opacity` |
| Barra de progresso | `transition-all` no width |
| Toggle de status | Otimista — sem reload |
| Entrada/saída de Sheet | `tw-animate-css` via Radix state |

---

## 7. Padrões de Cor por Domínio

### Transações

| Tipo | Badge | Ícone / Cor |
|---|---|---|
| `income` | `bg-green-100 text-green-700` | Verde |
| `expense` | `bg-red-100 text-red-700` | Vermelho |
| `investment` | `bg-amber-100 text-amber-700` | Âmbar |
| `transfer` | `bg-blue-100 text-blue-700` | Azul |
| `card_payment` | `bg-purple-100 text-purple-700` | Roxo |

### Parcelamentos

| Estado | Visual |
|---|---|
| Em andamento | Ícone ⏰ âmbar, barra violeta, valor âmbar |
| Quitado | Ícone ✓ verde, `opacity-50`, texto "Quitado" verde |

### Assinaturas

| Estado | Visual |
|---|---|
| Ativa | Badge `default` (filled) |
| Inativa | Badge `outline` + `opacity-50` na linha |

---

## 8. Lacunas Identificadas

| # | Lacuna | Severidade |
|---|---|---|
| DS-01 | Sem fonte explicitamente definida — depende do SO | 🔴 Alta |
| DS-02 | `monthlyEquivalent` duplicada em 3 arquivos | 🟡 Média |
| DS-03 | Cores funcionais (verde, vermelho, âmbar) são hardcoded nos componentes, não em tokens | 🟡 Média |
| DS-04 | Sem sistema de elevação (sombras) documentado | 🟡 Média |
| DS-05 | `tailwind.config.js` não existe — configuração inline no CSS | 🟢 Baixa |

---

## 9. Referências

| Artefato | Localização |
|---|---|
| Variáveis CSS completas | `app/globals.css` |
| Paleta de cores | [color-palette.md](./color-palette.md) |
| Tipografia | [typography.md](./typography.md) |
| Espaçamento e Grid | [spacing.md](./spacing.md) |
| Tokens completos | [tokens.md](./tokens.md) |
