# Tipografia — Finapp Design System

> Gerado pelo reversa-design-system em 2026-05-02
> Fonte: `app/globals.css`, `app/layout.tsx`, uso de classes Tailwind em componentes
>
> ✅ **[Revisão Q-08 — 2026-05-02]** Fonte definida pelo proprietário: **Poppins** (Google Fonts). Substituir a fonte do sistema por Poppins em todas as plataformas.

---

## 1. Família de Fontes

✅ **Definida pelo proprietário em revisão:**

| Papel | Família | Fallback | Confiança |
|---|---|---|---|
| **Corpo e UI** | **Poppins** (Google Fonts) | `ui-sans-serif, system-ui, sans-serif` | 🟢 |
| **Código / Mono** | (padrão do sistema) | `ui-monospace, monospace` | 🟡 |

**Implementação recomendada em `app/layout.tsx`:**
```typescript
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})
```

**E em `globals.css`:**
```css
body {
  font-family: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
}
```

> ℹ️ O layout (`app/layout.tsx`) não importa nenhuma fonte do Google Fonts ou `next/font`. O projeto usa a **fonte do sistema operacional** como padrão — no Windows será Segoe UI, no macOS San Francisco, no Linux DejaVu/Ubuntu.

> 🔴 **Lacuna:** Sem definição explícita de fonte — experiência pode variar entre plataformas (Windows vs macOS vs Linux). Recomendado definir `font-family` explícito no `body`.

---

## 2. Escala Tipográfica (via Tailwind)

🟡 Inferido do uso de classes nos componentes:

| Classe Tailwind | Tamanho | Peso | Uso observado |
|---|---|---|---|
| `text-2xl font-bold` | 1.5rem / 24px | 700 | Valores métricos nos cards de resumo |
| `text-xl font-semibold` | 1.25rem / 20px | 600 | Títulos de página (`<h1>`) |
| `text-base` | 1rem / 16px | 400 | Corpo de texto padrão |
| `text-sm` | 0.875rem / 14px | 400 | Descrições, labels de tabela |
| `text-sm font-medium` | 0.875rem / 14px | 500 | Nomes de contas nos cards |
| `text-xs` | 0.75rem / 12px | 400 | Labels de gráfico, badges, notas de parcela |
| `text-[11px]` | 0.6875rem / 11px | 400 | Labels menores (tick de eixo em gráficos) |
| `text-[10px]` | 0.625rem / 10px | 400 | Micro-labels (CardDescription em métricas) |

---

## 3. Pesos de Fonte

| Classe Tailwind | Peso CSS | Uso |
|---|---|---|
| `font-bold` | 700 | Valores numéricos principais (saldos, métricas) |
| `font-semibold` | 600 | Títulos de seção, cabeçalhos de card |
| `font-medium` | 500 | Nomes de itens em listas |
| `font-normal` | 400 | Corpo de texto, descrições |
| `font-mono` | — | Valores monetários em tabelas (`font-mono` em subscriptions) |

---

## 4. Hierarquia de Texto

| Elemento | Classe(s) Tailwind | Contexto |
|---|---|---|
| Título de página `<h1>` | `text-xl font-semibold` | `/installments`, `/subscriptions` |
| Título de card `<CardTitle>` | `text-base font-semibold` *(Shadcn default)* | Cards de bancos e dashboard |
| Descrição de card `<CardDescription>` | `text-sm text-muted-foreground` | Subtítulos de cards |
| Subtítulo de seção `<h3>` | `text-xs font-medium text-muted-foreground uppercase tracking-wide` | Seções "Contas bancárias" / "Cartões" |
| Valor monetário principal | `text-2xl font-semibold` | Saldo de conta, limite de cartão |
| Label de métrica | `text-sm font-medium text-muted-foreground` | Card de resumo |
| Texto muted | `text-sm text-muted-foreground` | Placeholders, empty states |
| Badge de tipo | `text-xs font-medium` | Tipo de transação (Entrada/Saída/etc.) |
| Nota de parcela | `text-xs text-muted-foreground` | "12x de R$83,33 por mês" |
| Micro label de gráfico | `fontSize: 11` (inline) | Ticks dos eixos Recharts |

---

## 5. Casos especiais

### Valores monetários nas tabelas (`subscriptions/page.tsx`)
```
<TableCell className="text-right font-mono">
```
Usa **fonte monoespaçada** do sistema para alinhar dígitos corretamente.

### Número de parcelas (`installments/page.tsx`)
```
<span className="text-[10px] text-muted-foreground w-8">
```
Usa tamanho personalizado `10px` via Tailwind arbitrary value.

### Labels de eixo Recharts (inline)
```
tick={{ fontSize: 11 }}
```
Inline style — não usa Tailwind; garantia de tamanho consistente nos gráficos.

---

## 6. Internacionalização / Localização

| Atributo | Valor | Confiança |
|---|---|---|
| `<html lang>` | `"pt-BR"` | 🟢 |
| Formatação de moeda | `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })` | 🟢 |
| Separador decimal | `,` (vírgula — padrão BR) | 🟢 |
| Separador de milhar | `.` (ponto — padrão BR) | 🟢 |
| Meses em português | Jan, Fev, Mar... / Janeiro, Fevereiro... | 🟢 |
