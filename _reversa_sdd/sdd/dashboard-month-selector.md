# SDD — Seletor de Mês no Dashboard (`dashboard-month-selector`)

> Criado em 2026-05-06 | `doc_level: detalhado`
> Expande `sdd/dashboard.md` com controle de período no cabeçalho

> ⚠️ **[Revisão Reviewer — 2026-05-06]** Divergência com a implementação atual mobile (`mobile/src/screens/DashboardScreen.tsx`, `mobile/src/components/dashboard/CategoryChart.tsx`):
> - 🔴 Não existe seletor `< Mês >` no cabeçalho; o cabeçalho apenas exibe o mês.
> - 🟢 A troca de mês existe hoje via chips no componente `CategoryChart`.
> - 🔴 Regras de desabilitar avanço no mês atual (`maxMonth`) não estão implementadas.
> - 🟡 Esta spec descreve comportamento alvo/proposto, não o comportamento atual do app.

> ✅ **[Revisão Q-01 — 2026-05-06]** Decisão do proprietário: o seletor de mês deve ficar **abaixo do gráfico "Últimos 12 meses"**, com escopo global para todos os gráficos subsequentes (não no header e não dentro de um card específico).

---

## 1. Propósito

Permitir ao usuário selecionar o mês de referência do Dashboard em um controle global posicionado abaixo do gráfico "Últimos 12 meses", sem abrir modal separado. Todos os gráficos e métricas abaixo respondem ao mês selecionado de forma reativa.

---

## 2. Layout da Região Superior

```
┌─────────────────────────────────────────────────────────────┐
│  [≡]   Dashboard                                            │
├─────────────────────────────────────────────────────────────┤
│  [ Gráfico: Últimos 12 meses ]                              │
├─────────────────────────────────────────────────────────────┤
│  [ < ]   Abr 2026   [ > ]   <- seletor global de período    │
└─────────────────────────────────────────────────────────────┘
```

| Zona | Conteúdo | Posição |
|------|----------|---------|
| Header | Botão de menu + título "Dashboard" | topo |
| Conteúdo 1 | Gráfico de últimos 12 meses | abaixo do header |
| Conteúdo 2 | Seletor de mês global | abaixo do gráfico de 12 meses |

---

## 3. Componente: Seletor de Mês (`MonthSelector`)

### 3.1 Anatomia visual

```
[ < ]   Abr 2026   [ > ]
```

| Elemento | Descrição |
|----------|-----------|
| Botão anterior `<` | Navega para o mês anterior. Sempre habilitado. |
| Rótulo do mês | Exibe o mês selecionado no formato `MMM YYYY` (ex: `Abr 2026`), centralizado. Largura mínima suficiente para 3 letras + 4 dígitos sem layout shift. |
| Botão próximo `>` | Navega para o mês seguinte. **Desabilitado e visualmente opaco** quando o mês selecionado já é o mês atual. |

### 3.2 Contrato de dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `selectedMonth` | string `YYYY-MM` | Mês atualmente exibido |
| `maxMonth` | string `YYYY-MM` | Limite superior de navegação (padrão: mês corrente) |

### 3.3 Comportamento de navegação

**Ação: ir para o mês anterior**
1. Subtrair 1 mês do `selectedMonth`
2. Não há limite inferior (pode ir para qualquer mês no passado)
3. Atualizar `selectedMonth` com o novo valor

**Ação: ir para o mês seguinte**
1. Se `selectedMonth >= maxMonth` → ignorar a ação (botão desabilitado)
2. Caso contrário, somar 1 mês ao `selectedMonth`
3. Atualizar `selectedMonth` com o novo valor

**Lógica de aritmética de mês:**
- Representação canônica: `YYYY-MM` (ex: `2026-04`)
- Mês anterior de `YYYY-01` → `(YYYY-1)-12`
- Mês seguinte de `YYYY-12` → `(YYYY+1)-01`
- Comparação entre meses: comparação lexicográfica de strings `YYYY-MM` é suficiente

---

## 4. Estado Global do Período

O mês selecionado é um **estado compartilhado** na tela do Dashboard. Todos os blocos de conteúdo consomem esse estado como entrada.

```
DashboardScreen
  └── estado: selectedMonth (padrão = mês atual em YYYY-MM)
        ├── MonthSelector  ← lê e escreve selectedMonth
        ├── GráficoReceitaDespesaMensal  ← lê selectedMonth
        ├── GráficoDespesaPorCategoria   ← lê selectedMonth
        ├── GráficoFaturaCartão          ← lê selectedMonth
        └── CalendárioAssinaturas        ← lê selectedMonth
```

**Regra:** qualquer mudança em `selectedMonth` deve propagar para todos os blocos simultaneamente, sem necessidade de recarregar a tela.

---

## 5. Filtragem de Dados por Período

Toda consulta de dados do Dashboard deve receber o mês selecionado e aplicar o filtro:

| Campo de filtro | Valor calculado |
|-----------------|-----------------|
| Data inicial | Primeiro dia do mês: `YYYY-MM-01` |
| Data final | Último dia do mês: `YYYY-MM-{último dia}` |

O cálculo do último dia deve considerar meses com 28, 29, 30 ou 31 dias (respeitar bissexto para fevereiro).

**Comportamento esperado quando não há dados no mês:**
- Métricas numéricas exibem `0`
- Gráficos exibem estado vazio (sem barra, sem fatia)
- **Nenhum erro deve ser lançado** — ausência de dados é um estado válido

---

## 6. Regras de Navegação

| Regra | Detalhe |
|-------|---------|
| Sem limite inferior | O usuário pode navegar livremente para qualquer mês no passado |
| Limite superior | O mês atual é o máximo; não é possível avançar para meses futuros |
| Estado inicial | Ao abrir o Dashboard, o mês selecionado deve ser o mês corrente |
| Persistência de sessão | O mês selecionado pode ou não ser preservado ao fechar e reabrir o app (decisão de implementação) |

---

## 7. Critérios de Aceite

- [ ] O seletor de mês fica abaixo do gráfico "Últimos 12 meses" com escopo global
- [ ] O botão `<` navega para o mês anterior sem restrição
- [ ] O botão `>` navega para o mês seguinte, exceto quando o mês atual já está selecionado
- [ ] O botão `>` aparece visivelmente desabilitado (opaco) no limite máximo
- [ ] O rótulo exibe o mês no formato `MMM YYYY` na língua do sistema
- [ ] Todos os gráficos e métricas atualizam ao mudar o mês selecionado
- [ ] O mês inicial ao abrir o Dashboard é o mês corrente
- [ ] Meses sem transações exibem valores zerados — sem mensagem de erro
