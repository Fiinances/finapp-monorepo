# Tokens de Design — Finapp Design System

> Gerado pelo reversa-design-system em 2026-05-02
> Fonte: `app/globals.css`, `electron/main.js`, uso de classes em componentes

---

## 1. Border Radius

🟢 Definido em `globals.css` via `@theme inline`:

| Token | Fórmula | Valor calculado (com `--radius: 0.625rem`) |
|---|---|---|
| `--radius` (base) | `0.625rem` | **10px** |
| `--radius-sm` | `var(--radius) - 4px` | 6px |
| `--radius-md` | `var(--radius) - 2px` | 8px |
| `--radius-lg` | `var(--radius)` | 10px |
| `--radius-xl` | `var(--radius) + 4px` | 14px |
| `--radius-2xl` | `var(--radius) + 8px` | 18px |
| `--radius-3xl` | `var(--radius) + 12px` | 22px |
| `--radius-4xl` | `var(--radius) + 16px` | 26px |

**Casos especiais:**
| Elemento | Classe | Resultado |
|---|---|---|
| Barra de progresso | `rounded-full` | 9999px (pill) |
| Scrollbar thumb | `border-radius: 9999px` | Pill |
| Dot de cor | `rounded-full` | Círculo perfeito |
| Badge de tipo | `rounded-full` | Pill |
| Tops de barra de gráfico | `radius={[4, 4, 0, 0]}` (Recharts) | 4px topo |
| Faixa colorida de card | Retangular (`h-1.5`) | Sem radius |
| Assinatura border-left | Borda esquerda colorida | Sem radius |

---

## 2. Sombras e Elevação

🟡 Inferido do uso de classes:

| Contexto | Classe | Efeito |
|---|---|---|
| Card bancário hover | `hover:shadow-md` | Sombra média ao passar o mouse |
| Cards padrão Shadcn | `shadow-sm` (implícito) | Sombra leve padrão |
| Tooltip / Popover | Shadcn padrão | Sombra do sistema |

> 🔴 **Ausência:** Não há sistema de elevação documentado explicitamente. Apenas `shadow-md` no hover de cards é observado diretamente.

---

## 3. Transições e Animações

🟢 Extraído de `globals.css` e componentes:

| Elemento | Propriedade | Duração/Easing | Confiança |
|---|---|---|---|
| Scrollbar thumb | `transition: background 0.2s ease` | 200ms ease | 🟢 |
| Card bancário | `transition-shadow` (Tailwind) | Tailwind padrão (150ms) | 🟢 |
| Barra de progresso | `transition-all` | Tailwind padrão (150ms) | 🟢 |
| Header sidebar | `transition-[width,height] ease-linear` | Linear | 🟢 |
| Botão excluir (aparece no hover) | `opacity-0 group-hover:opacity-100 transition-opacity` | Tailwind padrão (150ms) | 🟢 |
| tw-animate-css | Importado em globals.css | Animações de entrada/saída de Sheet/Dialog | 🟢 |

**Animações de UI (via `tw-animate-css`):**
- `data-[state=open]:animate-in` — Entrada de Sheet, Dialog, Dropdown
- `data-[state=closed]:animate-out` — Saída dos mesmos
- `fade-in`, `slide-in-from-*` — Padrões comuns do Shadcn

---

## 4. Z-Index

🟡 Inferido — Shadcn/Radix gerencia z-index via Portal automaticamente:

| Elemento | Z-index (estimado) | Confiança |
|---|---|---|
| Sidebar | `z-10` | 🟡 |
| Dropdown Menu | `z-50` (Radix padrão) | 🟡 |
| Sheet (painel lateral) | `z-50` (Radix padrão) | 🟡 |
| Toaster (Sonner) | `z-[9999]` (Sonner padrão) | 🟡 |
| Tooltip | `z-50` (Radix padrão) | 🟡 |

---

## 5. Opacidades Semânticas

🟢 Extraídas dos componentes:

| Contexto | Valor | Uso |
|---|---|---|
| Linha "quitada" | `opacity-50` | Parcelamentos quitados |
| Linha "inativa" | `opacity-50` | Assinaturas inativas |
| Botão excluir oculto | `opacity-0 group-hover:opacity-100` | Visível apenas no hover da linha |
| Scrollbar thumb (light) | `rgba(0,0,0,0.18)` hover `0.38` active `0.55` | Scrollbar customizado |
| Scrollbar thumb (dark) | `rgba(255,255,255,0.18)` hover `0.35` active `0.50` | Scrollbar customizado |
| Borda dark mode | `oklch(1 0 0 / 10%)` | Border com 10% de opacidade |
| Input dark mode | `oklch(1 0 0 / 15%)` | Input com 15% de opacidade |

---

## 6. Cores de Feedback (Semânticas — hardcoded nos componentes)

| Estado | Cor | Classe Tailwind | Uso |
|---|---|---|---|
| Sucesso | `#22c55e` | `text-green-500`, `text-green-600` | Quitado, receitas |
| Erro / Saída | `#ef4444` | `text-red-500`, `text-red-600` | Despesas, destrutivo |
| Alerta | `#f59e0b` | `text-amber-500`, `text-amber-600` | Valor restante, alertas |
| Neutro | `#6b7280` | `text-muted-foreground` | Textos secundários |
| Investimento | `#f59e0b` | `bg-amber-100 text-amber-700` | Badge investimento |
| Transferência | `#3b82f6` | `bg-blue-100 text-blue-700` | Badge transferência |
| Pgto. Cartão | `#8b5cf6` | `bg-purple-100 text-purple-700` | Badge pagamento |
| Parcelamento | `#6366f1` | `bg-violet-100 text-violet-700` | Badge número da parcela |
| Progresso | `#6366f1` | `bg-violet-500` | Barra de progresso |

---

## 7. Tokens de Scrollbar

🟢 Customização explícita em `globals.css`:

| Propriedade | Valor |
|---|---|
| `scrollbar-width` (Firefox) | `thin` |
| `scrollbar-color` (Firefox) | `rgba(0,0,0,0.18) transparent` |
| Webkit width | `6px` |
| Webkit height | `6px` |
| Track background | `transparent` |
| Thumb border-radius | `9999px` |

---

## 8. Tokens de Componentes UI (Shadcn/Radix)

| Componente | Biblioteca | Variantes identificadas |
|---|---|---|
| `Button` | Shadcn | `default`, `outline`, `ghost`, `destructive` — `size: sm, icon` |
| `Badge` | Shadcn | `default` (filled), `secondary`, `outline` |
| `Card` | Shadcn | `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `CardAction` |
| `Sheet` | Shadcn | `sm:max-w-md` |
| `Table` | Shadcn | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead` |
| `DropdownMenu` | Radix | `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` |
| `Input` | Shadcn | Padrão |
| `Label` | Radix | Padrão |
| `Separator` | Radix | `orientation: vertical` |
| `Sidebar` | Shadcn | `SidebarProvider`, `SidebarInset`, `SidebarTrigger` |
| `Toaster` | Sonner | `position: top-center` (padrão) |
