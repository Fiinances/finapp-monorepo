# Paleta de Cores — Finapp Design System

> Gerado pelo reversa-design-system em 2026-05-02
> Fonte: `app/globals.css` (variáveis CSS OKLCH via Shadcn/UI)
> Espaço de cor: **OKLCH** (Oklab Lightness-Chroma-Hue)

---

## Sistema de Temas

O Finapp usa **modo dual** (light/dark) via classe `.dark` no `<html>`. Todos os tokens são variáveis CSS que mudam conforme o tema ativo.

---

## 1. Cores Semânticas — Modo Claro (`:root`)

| Token CSS | Valor OKLCH | Hex aproximado | Uso |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `#ffffff` | Fundo da página |
| `--foreground` | `oklch(0.13 0.028 261.692)` | `#0f1117` | Texto principal |
| `--card` | `oklch(1 0 0)` | `#ffffff` | Fundo de cards |
| `--card-foreground` | `oklch(0.13 0.028 261.692)` | `#0f1117` | Texto em cards |
| `--popover` | `oklch(1 0 0)` | `#ffffff` | Fundo de popovers/tooltips |
| `--popover-foreground` | `oklch(0.13 0.028 261.692)` | `#0f1117` | Texto em popovers |
| `--primary` | `oklch(0.21 0.034 264.665)` | `#1a1f2e` | Cor de ação principal (botões, links) |
| `--primary-foreground` | `oklch(0.985 0.002 247.839)` | `#f8f9fc` | Texto sobre primary |
| `--secondary` | `oklch(0.967 0.003 264.542)` | `#f3f4f8` | Ações secundárias, badges |
| `--secondary-foreground` | `oklch(0.21 0.034 264.665)` | `#1a1f2e` | Texto sobre secondary |
| `--muted` | `oklch(0.967 0.003 264.542)` | `#f3f4f8` | Fundos de áreas silenciadas |
| `--muted-foreground` | `oklch(0.551 0.027 264.364)` | `#6b7280` | Texto secundário/placeholder |
| `--accent` | `oklch(0.967 0.003 264.542)` | `#f3f4f8` | Hover em itens de menu |
| `--accent-foreground` | `oklch(0.21 0.034 264.665)` | `#1a1f2e` | Texto em accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#dc2626` | Ações destrutivas (vermelho) |
| `--border` | `oklch(0.928 0.006 264.531)` | `#e5e7eb` | Bordas de elementos |
| `--input` | `oklch(0.928 0.006 264.531)` | `#e5e7eb` | Borda de inputs |
| `--ring` | `oklch(0.707 0.022 261.325)` | `#9ca3af` | Anel de foco |

## 2. Cores Semânticas — Modo Escuro (`.dark`)

| Token CSS | Valor OKLCH | Hex aproximado | Uso |
|---|---|---|---|
| `--background` | `oklch(0.13 0.028 261.692)` | `#0f1117` | Fundo da página |
| `--foreground` | `oklch(0.985 0.002 247.839)` | `#f8f9fc` | Texto principal |
| `--card` | `oklch(0.21 0.034 264.665)` | `#1a1f2e` | Fundo de cards |
| `--card-foreground` | `oklch(0.985 0.002 247.839)` | `#f8f9fc` | Texto em cards |
| `--primary` | `oklch(0.928 0.006 264.531)` | `#e5e7eb` | Cor de ação principal |
| `--primary-foreground` | `oklch(0.21 0.034 264.665)` | `#1a1f2e` | Texto sobre primary |
| `--secondary` | `oklch(0.278 0.033 256.848)` | `#2a3040` | Ações secundárias |
| `--muted` | `oklch(0.278 0.033 256.848)` | `#2a3040` | Fundos silenciados |
| `--muted-foreground` | `oklch(0.707 0.022 261.325)` | `#9ca3af` | Texto secundário |
| `--destructive` | `oklch(0.704 0.191 22.216)` | `#f87171` | Destrutivo (vermelho claro no dark) |
| `--border` | `oklch(1 0 0 / 10%)` | `rgba(255,255,255,0.10)` | Bordas |
| `--input` | `oklch(1 0 0 / 15%)` | `rgba(255,255,255,0.15)` | Borda de inputs |
| `--ring` | `oklch(0.551 0.027 264.364)` | `#6b7280` | Anel de foco |

---

## 3. Cores de Gráficos

| Token | Light (OKLCH) | Dark (OKLCH) | Uso |
|---|---|---|---|
| `--chart-1` | `oklch(0.646 0.222 41.116)` → 🟠 laranja | `oklch(0.488 0.243 264.376)` → 🔵 azul | Primeira série |
| `--chart-2` | `oklch(0.6 0.118 184.704)` → 🟢 teal | `oklch(0.696 0.17 162.48)` → 🟢 verde | Segunda série |
| `--chart-3` | `oklch(0.398 0.07 227.392)` → 🔵 azul escuro | `oklch(0.769 0.188 70.08)` → 🟡 âmbar | Terceira série |
| `--chart-4` | `oklch(0.828 0.189 84.429)` → 🟡 amarelo | `oklch(0.627 0.265 303.9)` → 🟣 roxo | Quarta série |
| `--chart-5` | `oklch(0.769 0.188 70.08)` → 🟡 âmbar | `oklch(0.645 0.246 16.439)` → 🔴 vermelho | Quinta série |

---

## 4. Cores da Sidebar

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `oklch(0.985 0.002 247.839)` ≈ branco | `oklch(0.21 0.034 264.665)` ≈ azul escuro |
| `--sidebar-foreground` | `oklch(0.13 0.028 261.692)` | `oklch(0.985 0.002 247.839)` |
| `--sidebar-primary` | igual a `--primary` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-accent` | igual a `--accent` | `oklch(0.278 0.033 256.848)` |
| `--sidebar-border` | igual a `--border` | `oklch(1 0 0 / 10%)` |

---

## 5. Cores Hardcoded (em componentes)

🟢 Extraídas dos componentes de dashboard e UI:

| Cor | Hex | Uso no componente |
|---|---|---|
| Verde sucesso | `#22c55e` | `MonthlyIncomeExpenseChart` — receitas |
| Vermelho erro | `#ef4444` | `MonthlyIncomeExpenseChart` — despesas |
| Âmbar investimento | `#f59e0b` | `MonthlyIncomeExpenseChart` — investimentos |
| Indigo saldo | `#6366f1` | `MonthlyIncomeExpenseChart` — saldo líquido |
| Indigo padrão | `#6366f1` | Cor padrão de conta/cartão sem cor definida |
| Cor de progresso | `bg-violet-500` | Barra de progresso de parcelamentos |
| Texto restante | `text-amber-600 / text-amber-400` | Valor restante de parcelamento |
| Verde quitado | `text-green-600 / text-green-400` | Parcelamento quitado |
| Vermelho assinatura | `text-red-500` | Valor de assinatura tipo expense |

---

## 6. Paleta do fundo inicial da janela

| Contexto | Valor | Confiança |
|---|---|---|
| `backgroundColor` da BrowserWindow | `#2B2D31` | 🟢 (`electron/main.js`) |
| Corresponde a | Cinza-escuro Discord-like | 🟢 |
