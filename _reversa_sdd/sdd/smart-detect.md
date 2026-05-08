# SDD — Detecção Automática de Padrões (`smart-detect`)

> Criado em 2026-05-07 | `doc_level: detalhado`

---

## 1. Visão Geral

O usuário pode solicitar que o aplicativo analise o histórico de transações bancárias e identifique automaticamente:

1. **Padrões de parcelamento** — mesma descrição (normalizada), mesmo valor, em meses consecutivos
2. **Padrões de assinatura** — mesma descrição (normalizada), mesmo valor aproximado, recorrente com intervalo fixo (mensal, semanal ou anual)

Após a análise, o app exibe os candidatos identificados para revisão humana. O usuário decide, para cada candidato, se deseja criar o vínculo como Parcelamento, como Assinatura ou ignorar.

---

## 2. Ponto de Entrada

### 2.1 Acesso

- **Tela de Parcelamentos (`InstallmentsScreen`):** botão `Detectar` no header — aciona análise de parcelamentos.
- **Tela de Assinaturas (`SubscriptionsScreen`):** botão `Detectar` no header — aciona análise de assinaturas.
- Ambos reutilizam o mesmo hook de análise (`useSmartDetect`), mas filtram o resultado por tipo de padrão.

> **Decisão de UX:** a detecção unificada roda uma única vez no banco e separa os resultados por tipo. Isso evita processar duas vezes o mesmo dataset.

### 2.2 Fluxo Geral

```
Usuário pressiona [Detectar]
    → SmartDetectSheet abre
    → Exibe loading ("Analisando suas transações...")
    → Hook executa algoritmo de detecção no banco via Supabase
    → Exibe candidatos agrupados por tipo
    → Para cada candidato: [Criar como Parcelamento] | [Criar como Assinatura] | [Ignorar]
    → Feedback individual por candidato
    → Ação confirmada salva no banco (installment_groups ou subscriptions)
```

---

## 3. Algoritmo de Detecção

### 3.1 Pré-processamento de Descrições

```typescript
function normalizeDescription(desc: string): string {
    return desc
        .toLowerCase()
        .replace(/\d+\/\d+/g, '')           // Remove "1/12", "3/6" etc
        .replace(/\s*\d+\s*x\s*/gi, '')     // Remove "12x", "3x " etc
        .replace(/[^\w\s]/g, ' ')           // Remove pontuação
        .replace(/\s+/g, ' ')               // Colapsa espaços
        .trim();
}
```

### 3.2 Agrupamento

1. Buscar todas as transações bancárias (`credit_card_id IS NULL`) dos últimos 12 meses.
2. Agrupar por `normalizeDescription(description)`.
3. Para cada grupo com **≥ 2 ocorrências**:
   - Calcular variação de valor: `(max - min) / avg * 100`
   - Calcular intervalos entre datas em dias
   - Classificar como candidato a Parcelamento ou Assinatura

### 3.3 Classificação de Parcelamentos

Um grupo é candidato a **Parcelamento** quando:

| Critério | Regra |
|---|---|
| Ocorrências | ≥ 2 |
| Variação de valor | < 2% (parcelas muito uniformes) |
| Intervalos | Todos entre 25–35 dias (mensal) |
| Duração limitada | Menos de 24 meses (para diferenciar de assinatura longa) |

**Campos estimados pelo algoritmo:**
- `description` — descrição normalizada
- `total_amount` — `amount × count` (estimativa simples)
- `installments` — número de ocorrências já observadas
- `first_billing_month` — mês da ocorrência mais antiga
- `credit_card_id` — `null` (bancário), pode ser associado manualmente

> ℹ️ Como o algoritmo analisa parcelas já ocorridas, `installments` é o mínimo real. O usuário pode ajustar o número total no formulário de criação.

### 3.4 Classificação de Assinaturas

Um grupo é candidato a **Assinatura** quando:

| Critério | Regra |
|---|---|
| Ocorrências | ≥ 2 |
| Variação de valor | < 5% (assinaturas podem variar levemente) |
| Intervalo detectado | `weekly` (5–9 dias), `monthly` (25–35 dias), `yearly` (340–390 dias) |
| Duração | Sem limite máximo |

**Campos estimados pelo algoritmo:**
- `name` — descrição normalizada (capitalizada)
- `amount` — mediana dos valores observados
- `period` — derivado do intervalo médio (`weekly` / `monthly` / `yearly`)
- `type` — `expense` (padrão, ajustável pelo usuário)
- `account_id` — `null` (sem vínculo automático)

### 3.5 Desambiguação

Se um grupo atende critérios de ambos os tipos:
- Priorizar **Parcelamento** se variação < 2% e duração ≤ 24 meses
- Priorizar **Assinatura** se variação < 5% e duração indeterminada

---

## 4. Interface de Revisão (`SmartDetectSheet`)

### 4.1 Layout

```
┌──────────────────────────────────────┐
│  ── (drag handle)                    │
│  Detectar Padrões           [X]      │  ← Header
├──────────────────────────────────────┤
│  [Loading spinner]                   │  ← Estado carregando
│  Analisando transações...            │
│                                      │
│  ── Após análise ──                  │
│  [Tab: Parcelamentos | Assinaturas]  │  ← Tabs para filtrar candidatos
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🟣 Notebook Dell             │    │  ← Card de candidato
│  │ R$ 450,00 × 3 meses         │    │
│  │ jan/2025 → mar/2025          │    │
│  │ Confiança: Alta              │    │
│  │ [Parcelamento] [Assinatura] [Ignorar]│
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🔵 Netflix                   │    │
│  │ R$ 55,90 / mês               │    │
│  │ 6 ocorrências detectadas     │    │
│  │ Confiança: Alta              │    │
│  │ [Parcelamento] [Assinatura] [Ignorar]│
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

### 4.2 Card de Candidato

Cada candidato exibe:

| Campo | Conteúdo |
|---|---|
| Ícone colorido | Cor gerada deterministicamente a partir do nome |
| Descrição | Nome normalizado (capitalizado) |
| Valor / padrão | `R$ X,XX × N meses` (parcelamento) ou `R$ X,XX / mês` (assinatura) |
| Período | Datas detectadas (primeiro → último mês) |
| Confiança | `Alta` (variação < 2%), `Média` (< 5%), `Baixa` (resto) |
| Ações | 3 botões: Criar como Parcelamento · Criar como Assinatura · Ignorar |

### 4.3 Ações por Candidato

**Criar como Parcelamento:**
- Abre `InstallmentCreateSheet` pré-preenchido com os dados detectados
- Usuário revisa e confirma
- Ao salvar: candidato marcado como `✅ Criado` na lista

**Criar como Assinatura:**
- Abre `SubscriptionSheet` pré-preenchido com os dados detectados
- Usuário revisa e confirma
- Ao salvar: candidato marcado como `✅ Criado` na lista

**Ignorar:**
- Remove o candidato da lista localmente (não persiste — próxima análise pode re-detectar)
- Candidate marcado como `❌ Ignorado` com estilo apagado

### 4.4 Estado Vazio

```
Nenhum padrão encontrado.
Importe mais transações para que o algoritmo possa identificar recorrências.
```

---

## 5. Hook `useSmartDetect`

```typescript
interface SmartCandidate {
    id: string;               // hash da descrição normalizada
    normalizedDesc: string;
    displayName: string;      // capitalizado
    amount: number;           // mediana dos valores
    count: number;            // nº de ocorrências
    firstMonth: string;       // MM/YYYY
    lastMonth: string;        // MM/YYYY
    interval: 'weekly' | 'monthly' | 'yearly';
    confidence: 'high' | 'medium' | 'low';
    suggestedType: 'installment' | 'subscription';
    rawTransactionIds: number[];
}

interface UseSmartDetectReturn {
    loading: boolean;
    error: string | null;
    candidates: SmartCandidate[];
    analyze: () => void;
    dismiss: (id: string) => void;
}
```

**`analyze()`:**
1. Busca transações: `credit_card_id IS NULL`, últimos 12 meses
2. Executa o algoritmo de agrupamento e classificação em memória
3. Atualiza `candidates` com os resultados

> ℹ️ O processamento ocorre **no cliente** (em memória). Não há stored procedures nem Edge Functions. O volume de transações de 12 meses é manejável em memória em todos os dispositivos móveis modernos.

---

## 6. Regras de Negócio

| ID | Regra | Confiança |
|---|---|---|
| RN-01 | O algoritmo analisa apenas transações bancárias (`credit_card_id IS NULL`). Transações de cartão têm lógica própria de parcelas/faturas. | 🟢 |
| RN-02 | Mínimo de 2 ocorrências para ser considerado candidato. | 🟢 |
| RN-03 | Variação de valor < 5% para ser candidato a assinatura; < 2% para parcelamento. | 🟢 |
| RN-04 | "Ignorar" remove o candidato apenas da sessão atual. Próxima análise pode re-detectar o mesmo padrão. | 🟢 |
| RN-05 | Ao criar como Parcelamento, o formulário é pré-preenchido mas o usuário pode editar todos os campos antes de confirmar. | 🟢 |
| RN-06 | Ao criar como Assinatura, o formulário é pré-preenchido mas o usuário pode editar todos os campos antes de confirmar. | 🟢 |
| RN-07 | Um candidato que já foi vinculado a um Parcelamento ou Assinatura existente deve ser filtrado (verificar se `description` já existe em `installment_groups` ou `subscriptions`). | 🟢 |
| RN-08 | A detecção não exclui nem modifica transações existentes em nenhum momento. | 🟢 |
| RN-09 | Confiança `Alta` = variação < 2%; `Média` = < 5%; `Baixa` = ≥ 5%. | 🟢 |

---

## 7. Critérios de Aceitação

### CA-01 — Detecção de assinatura mensal

```
Dado:  6 transações "Netflix" em meses consecutivos, valor ~R$55,90 (variação < 2%)
Quando: usuário aciona "Detectar" na tela de Assinaturas
Então: candidato "Netflix" aparece
       amount ≈ 55,90
       interval = monthly
       confidence = Alta
```

### CA-02 — Detecção de parcelamento

```
Dado:  3 transações "Notebook 1/12", "Notebook 2/12", "Notebook 3/12"
       ou 3 transações "Compra Notebook" com valores idênticos em 3 meses consecutivos
Quando: usuário aciona "Detectar" na tela de Parcelamentos
Então: candidato "Notebook" aparece
       count = 3
       suggestedType = installment
```

### CA-03 — Criar assinatura a partir de candidato

```
Dado:  candidato "Spotify" detectado (interval=monthly, amount=21,90)
Quando: usuário pressiona [Criar como Assinatura]
Então: SubscriptionSheet abre pré-preenchido com name="Spotify", amount=21.90, period="monthly"
       Após salvar: candidato exibe "✅ Criado"
```

### CA-04 — Ignorar candidato

```
Dado:  candidato "Cobrança X" detectado
Quando: usuário pressiona [Ignorar]
Então: candidato é removido visualmente da lista
       Nenhuma escrita no banco é feita
```

### CA-05 — Estado vazio

```
Dado:  usuário com poucas transações importadas (< 2 de qualquer padrão)
Quando: análise completa
Então: mensagem "Nenhum padrão encontrado" exibida
       Sugestão para importar mais transações
```

---

## 8. Dependências

| Dependência | Uso |
|---|---|
| `supabase` (client) | Busca de transações para análise |
| `InstallmentsScreen` / `InstallmentCreateSheet` | Criação de parcelamento pré-preenchido |
| `SubscriptionsScreen` / `SubscriptionSheet` | Criação de assinatura pré-preenchida |
| `useCreditCardBills` / `useDashboard` | Nenhuma — a detecção é isolada |
| `useSmartDetect` (hook novo) | Lógica de análise e estado |
| `SmartDetectSheet` (componente novo) | UI de revisão de candidatos |
