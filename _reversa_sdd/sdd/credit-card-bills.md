# SDD — Tela de Faturas de Cartões de Crédito (`credit-card-bills`)

> Criado em 2026-05-07 | Revisado em 2026-05-07 | `doc_level: detalhado`

---

## 1. Visão Geral

A tela de **Faturas de Cartões de Crédito** tem como objetivo centralizar o acompanhamento dos gastos realizados via cartão. Ela combina uma visão macro (gráfico de evolução mensal) com uma visão micro (lista de transações da fatura).

## 2. Componentes da Interface

### 2.1 Gráfico de Faturas (Visão Macro)
- **Tipo**: Gráfico de barras empilhadas (Stacked Bar Chart).
- **Eixo X**: Meses de fatura (ex: Jan, Fev, Mar, Abr).
- **Eixo Y**: Valor total gasto no mês.
- **Composição da Barra**: Cada barra representa o gasto total de um mês específico. A barra é dividida verticalmente em segmentos proporcionais ao gasto de cada cartão de crédito naquele mês.
- **Cores**: Cada segmento da barra deve obrigatoriamente utilizar a cor cadastrada para o respectivo cartão de crédito no banco de dados (`credit_cards.color`).
- **Interatividade**: Ao tocar/clicar na barra inteira de um mês, a tela atualiza o "Mês Selecionado" e reflete essa seleção na lista de transações abaixo. 

### 2.2 Seletor de Mês (Alternativa Manual)
- Deve existir um componente explícito de seleção de mês (ex: setas `< Maio/2026 >` ou um dropdown) sincronizado bidirecionalmente com o gráfico.
- Se o usuário mudar o mês no seletor, o gráfico deve destacar a barra correspondente.
- Se o usuário clicar na barra do gráfico, o seletor deve atualizar para refletir o mês clicado.

### 2.3 Lista de Transações da Fatura (Visão Micro)
- Exibida logo abaixo do gráfico.
- **Filtro Aplicado**: Mostra apenas as transações vinculadas a cartões de crédito (`credit_card_id IS NOT NULL`) onde o mês de fatura (`billing_month`) seja igual ao mês selecionado no gráfico/seletor.
- **Agrupamento**: Pode agrupar as transações por cartão para facilitar a leitura.
- **Ações**: O usuário pode editar ou categorizar as transações diretamente dessa lista, assim como na tela principal de transações.

## 3. Regras de Negócio e Comportamento

| ID | Regra | Local / Referência | Confiança |
|---|---|---|---|
| RN-01 | O gráfico e a listagem devem considerar o valor líquido de cada cartão (somando saídas e entradas/estornos, que se anulam naturalmente) para compor o total da fatura. | Gráfico de Barras | 🟢 |
| RN-02 | A cor do segmento da barra deve ser extraída da propriedade `color` do objeto `CreditCard`. | Renderização do Gráfico | 🟢 |
| RN-03 | Alterar o mês no gráfico altera os dados da lista; alterar no seletor altera o foco do gráfico. Sincronização 100%. | Gestão de Estado Local | 🟢 |
| RN-04 | A listagem de transações exibe a soma total do mês selecionado em um cabeçalho de resumo, eliminando a necessidade de tooltip no gráfico. | Header da Lista | 🟢 |
| RN-05 | Se um mês não tiver gastos para nenhum cartão, a barra não é renderizada ou fica zerada, mas o mês pode ser selecionado via seletor manual. | Lógica do Gráfico | 🟡 |

## 4. Estado da Tela (State)

```typescript
interface CreditCardBillsState {
  selectedMonth: string; // ex: "05/2026"
  chartData: Array<{
    month: string;
    total: number;
    breakdown: Array<{
      cardId: number;
      cardName: string;
      color: string;
      amount: number;
    }>;
  }>;
  monthlyTransactions: Transaction[];
}
```

## 5. Estratégia de Atualização de Dados (Supabase)

- A tela pode buscar todas as transações do ano letivo ou dos últimos 6 meses para popular o gráfico em uma única query.
- Quando o usuário muda de mês, a lista de transações pode ser filtrada localmente (se já carregada no bulk) ou disparar uma nova query filtrando `billing_month = 'MM/YYYY'` e `credit_card_id IS NOT NULL`.

---
> ✅ **[Revisão Reviewer — 2026-05-07]**: Spec validada pelo usuário. Tratamento de estornos e cabeçalho de totais confirmados (todas as regras críticas 🔴 resolvidas para 🟢).
