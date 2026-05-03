# Espaçamento, Grid e Breakpoints — Finapp Design System

> Gerado pelo reversa-design-system em 2026-05-02
> Fonte: Tailwind CSS v4 (padrões + uso em componentes)

---

## 1. Escala de Espaçamento

O Finapp usa **Tailwind CSS v4** com a escala padrão. Os valores abaixo foram extraídos do uso observado nos componentes:

| Classe | Valor | Uso observado |
|---|---|---|
| `gap-1` | 0.25rem / 4px | Gap mínimo entre ícone e texto |
| `gap-1.5` | 0.375rem / 6px | Gap em badges e legendas de gráfico |
| `gap-2` | 0.5rem / 8px | Gap padrão em listas e toolbars |
| `gap-3` | 0.75rem / 12px | Gap entre cards de grid |
| `gap-4` | 1rem / 16px | Gap entre seções de formulário |
| `gap-6` | 1.5rem / 24px | Gap entre seções de página |
| `p-2` | 0.5rem / 8px | Padding interno mínimo |
| `p-3` | 0.75rem / 12px | Padding de células e badges |
| `p-4` | 1rem / 16px | Padding de cards e formulários |
| `p-6` | 1.5rem / 24px | Padding de páginas (`subscriptions/page.tsx`) |
| `px-2 py-1.5` | 0.5rem / 0.375rem | Células de tabela (`TxRow`) |
| `px-3 py-2` | 0.75rem / 0.5rem | Linha de assinatura |
| `pt-4 px-4 pb-1` | 1rem / 0.25rem | Header de card métrico |
| `py-12` | 3rem / 48px | Padding vertical de estados vazios |

---

## 2. Tamanhos de Elementos

| Elemento | Classe(s) | Valor |
|---|---|---|
| Botão ícone pequeno | `size-7` | 1.75rem / 28px |
| Ícone padrão | `size-4` | 1rem / 16px |
| Ícone pequeno | `size-3.5` | 0.875rem / 14px |
| Dot de cor | `size-2.5` | 0.625rem / 10px |
| Dot menor | `size-2` | 0.5rem / 8px |
| Dot mini | `size-1.5` | 0.375rem / 6px |
| Barra de faixa colorida em card | `h-1.5` | 0.375rem / 6px |
| Scrollbar width | `6px` | Webkit/Electron |
| Altura do header | `h-16` | 4rem / 64px |
| Altura do header colapsado | `h-12` | 3rem / 48px |
| Input inline tabela | `h-7` | 1.75rem / 28px |
| Select de UI | `h-8` / `h-9` | 2rem / 2.25rem |

---

## 3. Grid Responsivo

🟢 Extraído dos componentes:

| Componente | Mobile | SM (640px+) | LG (1024px+) |
|---|---|---|---|
| Cards de bancos/cartões | 1 coluna | 2 colunas | 3 colunas |
| Cards de métricas (installments) | 1 coluna | 3 colunas | 3 colunas |
| Cards de métricas (subscriptions) | 2 colunas | 4 colunas | 4 colunas |
| Cards de assinaturas (CalendarCard) | 2 colunas | 3 colunas | 3 colunas |
| Layout sidebar | Colapsada | Colapsada | Expandida |

**Classe padrão de grid de cards:**
```
grid gap-3 sm:grid-cols-2 lg:grid-cols-3
```

---

## 4. Breakpoints (Tailwind v4 padrão)

| Nome | Valor px | Uso |
|---|---|---|
| `sm` | 640px | Grid de 2 colunas, badges visíveis |
| `md` | 768px | — (não observado diretamente) |
| `lg` | 1024px | Grid de 3 colunas |
| `xl` | 1280px | — (não observado diretamente) |
| `2xl` | 1536px | — (não observado diretamente) |

> ℹ️ Por ser uma **aplicação Electron desktop**, a maioria dos layouts assume resolução ≥ 1200×800 (tamanho padrão da janela). Os breakpoints `sm` e `lg` são os mais relevantes.

---

## 5. Larguras Máximas

| Contexto | Classe | Valor |
|---|---|---|
| Sheet de CRUD | `sm:max-w-md` | 448px |
| Barra de progresso | `w-20` | 5rem / 80px |
| Barra de progresso (porcentagem label) | `w-8` | 2rem / 32px |
| Gráfico `MonthlyIncomeExpenseChart` | `h-[280px] w-full` | 280px altura, full width |
| Gráfico `CreditCardFaturaChart` | `h-[260px] w-full` | 260px altura, full width |
| Donut `CategoryExpenseChart` | `width={180} height={180}` | 180×180px (inline) |
| Página raiz `<Card>` | `w-full mx-auto` | Full width centralizado |

---

## 6. Layout da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (variável: expandida ~240px / colapsada ~48px)      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Header fixo h-16 (ou h-12 quando sidebar colapsada)     │ │
│ │  [SidebarTrigger] | [DynamicBreadcrumb]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Conteúdo principal                                      │ │
│ │ padding: p-4 pt-0 | gap: gap-4                          │ │
│ │ {children}                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```
