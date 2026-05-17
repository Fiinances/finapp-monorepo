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

- **Tela de Parcelamentos (`InstallmentsScreen`):** botão `Detectar` no header — abre `SmartDetectSheet` com `mode="installment"`.
- **Tela de Assinaturas (`SubscriptionsScreen`):** botão `Detectar` no header — abre `SmartDetectSheet` com `mode="subscription"`.
- Ambos reutilizam o mesmo hook (`useSmartDetect`) e o mesmo componente (`SmartDetectSheet`). O `mode` determina quais candidatos são exibidos e como o registro é feito.

> **Decisão de UX (revisada):** a detecção roda uma única vez e retorna todos os candidatos. O componente filtra por `mode`, exibindo apenas os candidatos do tipo relevante para a tela corrente. Não há tabs — cada tela mostra somente seus candidatos. Isso evita o problema anterior em que assinaturas eram exibidas ou classificadas incorretamente como parcelamentos e vice-versa.

### 2.2 Fluxo Geral

```
Usuário pressiona [Detectar] (em InstallmentsScreen ou SubscriptionsScreen)
    → SmartDetectSheet abre com mode = 'installment' | 'subscription'
    → Exibe loading ("Analisando suas transações...")
    → Hook executa algoritmo de detecção via Supabase
    → Lista exibe apenas candidatos do tipo correspondente ao mode
    → Para cada candidato: [Criar] | [Ignorar]
    → "Criar" cadastra como Parcelamento (mode=installment) ou Assinatura (mode=subscription)
    → Feedback individual por candidato (badge "✅ Criado")
    → Ação confirmada salva no banco (installment_groups ou subscriptions)
```

---

## 3. Algoritmo de Detecção

### 3.1 Pré-processamento de Descrições

```typescript
/** Detecta se a descrição bruta contém padrão de numeração de parcela (ex: "1/3", "02/12") */
function hasInstallmentPattern(rawDesc: string): boolean {
    return /\b\d{1,2}\s*[\/\-]\s*\d{1,2}\b/.test(rawDesc);
}

function normalizeDescription(desc: string): string {
    return desc
        .toLowerCase()
        .replace(/\b\d{1,2}\s*[\/\-]\s*\d{1,2}\b/g, '') // Remove "1/12", "03/12", "3-12"
        .replace(/\s*\d+\s*x\s*/gi, '')                  // Remove "12x", "3x "
        .replace(/parc\.?\s*\d+/gi, '')                  // Remove "Parc 3", "PARC.03"
        .replace(/parcela\s*\d+/gi, '')                  // Remove "parcela 3"
        .replace(/[^\w\s]/g, ' ')                        // Remove pontuação
        .replace(/\s+/g, ' ')                            // Colapsa espaços
        .trim();
}
```

> **Sinal forte de parcelamento:** se pelo menos uma das descrições brutas do grupo contiver o padrão `N/M` (ex: `"Notebook 1/3"`, `"Notebook 2/3"`), o grupo é classificado diretamente como `installment` com alta confiança, independentemente da variação de valor.

### 3.2 Agrupamento

1. Buscar todas as transações bancárias (`credit_card_id IS NULL`) dos últimos 6 meses.
2. Para cada transação, registrar se a descrição bruta contém padrão N/M (`hasInstallmentPattern`).
3. Agrupar por `normalizeDescription(description)`.
4. Para cada grupo com **≥ 2 ocorrências**:
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

A classificação segue uma ordem de prioridade estrita:

1. **Sinal N/M nas descrições brutas** — se qualquer transação do grupo apresenta padrão `N/M` na descrição original (antes da normalização) → `installment` com `hasInstallmentPattern=true` e confiança `high`, independente dos outros critérios.
2. **Heurística de variação + duração** (fallback para grupos sem padrão N/M):
   - Priorizar **Parcelamento** se variação < 2% e count ≤ 24
   - Priorizar **Assinatura** em qualquer outro caso com recorrência detectada

> **Motivação:** assinaturas como Netflix, Spotify, etc. não contêm padrão N/M e costumam ter variação < 2% com mais de 24 meses de histórico. A heurística anterior classificava essas assinaturas incorretamente como parcelamentos quando count ≤ 24. O sinal N/M resolve a ambiguidade principal.

---

## 4. Interface de Revisão (`SmartDetectSheet`)

### 4.1 Layout

O `SmartDetectSheet` recebe um prop `mode: 'installment' | 'subscription'` e exibe apenas os candidatos classificados com o `suggestedType` correspondente. Não há tabs — cada tela mostra somente seus candidatos.

```
┌──────────────────────────────────────┐
│  ── (drag handle)                    │
│  Detectar Padrões           [X]      │  ← Header
├──────────────────────────────────────┤
│  [Loading spinner]                   │  ← Estado carregando
│  Analisando transações...            │
│                                      │
│  ── Após análise ──                  │
│  (candidatos filtrados por mode)     │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🟣 Notebook Dell             │    │  ← mode=installment
│  │ R$ 450,00 × 3 meses         │    │
│  │ jan/2025 → mar/2025          │    │
│  │ Confiança: Alta              │    │
│  │ [Criar Parcelamento] [Ignorar]│   │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │  ← mode=subscription
│  │ 🔵 Netflix                   │    │
│  │ R$ 55,90 / mês               │    │
│  │ 6 ocorrências detectadas     │    │
│  │ Confiança: Alta              │    │
│  │ [Criar Assinatura]  [Ignorar]│    │
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
| Confiança | `Alta` (variação < 2% ou padrão N/M), `Média` (< 5%), `Baixa` (resto) |
| Ações | 2 botões: **[Criar Parcelamento]** ou **[Criar Assinatura]** (conforme `mode`) · **[Ignorar]** |

> O rótulo do botão "Criar" reflete o contexto da tela: "Criar Parcelamento" quando `mode='installment'`, "Criar Assinatura" quando `mode='subscription'`.

### 4.3 Ações por Candidato

**Criar** (mode=installment):
- Abre `InstallmentCreateSheet` pré-preenchido com os dados detectados
- Usuário revisa e confirma
- Ao salvar: candidato marcado como `✅ Criado` na lista

**Criar** (mode=subscription):
- Abre `SubscriptionSheet` pré-preenchido com os dados detectados
- Usuário revisa e confirma
- Ao salvar: candidato marcado como `✅ Criado` na lista

**Ignorar:**
- Remove o candidato da lista localmente (não persiste — próxima análise pode re-detectar)
- Candidato marcado como `❌ Ignorado` com estilo apagado

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
    /** Verdadeiro se pelo menos uma descrição bruta do grupo continha padrão N/M */
    hasInstallmentPattern: boolean;
    rawTransactionIds: number[];
}

interface UseSmartDetectReturn {
    loading: boolean;
    error: string | null;
    candidates: SmartCandidate[];
    analyze: () => Promise<void>;
    dismiss: (id: string) => void;
    markCreated: (id: string) => void;
    created: Set<string>;
    dismissed: Set<string>;
}

// Props do SmartDetectSheet
interface SmartDetectSheetProps {
    visible: boolean;
    onClose: () => void;
    /** Determina quais candidatos são exibidos e como o registro é feito */
    mode: 'installment' | 'subscription';
}
```

**`analyze()`:**
1. Busca transações: `credit_card_id IS NULL`, últimos 6 meses
2. Para cada transação, registra se a descrição bruta tem padrão N/M (`hasInstallmentPattern`)
3. Agrupa por descrição normalizada e classifica candidatos em memória
4. Candidatos com padrão N/M → `suggestedType = 'installment'` e `hasInstallmentPattern = true` (sinal forte)
5. Atualiza `candidates` com todos os resultados (installments + subscriptions)

**`SmartDetectSheet` (componente):**
- Filtra `candidates` por `candidate.suggestedType === mode` para exibir apenas os relevantes
- Botão "Criar" rotulado conforme `mode`: "Criar Parcelamento" ou "Criar Assinatura"

> ℹ️ O processamento ocorre **no cliente** (em memória). Não há stored procedures nem Edge Functions.

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
| RN-09 | Confiança `Alta` = variação < 2% ou `hasInstallmentPattern=true`; `Média` = variação < 5%; `Baixa` = ≥ 5%. | 🟢 |
| RN-10 | `SmartDetectSheet` com `mode='installment'` exibe apenas candidatos com `suggestedType='installment'` e o botão "Criar" registra um Parcelamento (`installment_groups`). | 🟢 |
| RN-11 | `SmartDetectSheet` com `mode='subscription'` exibe apenas candidatos com `suggestedType='subscription'` e o botão "Criar" registra uma Assinatura (`subscriptions`). | 🟢 |
| RN-12 | Descrições brutas contendo padrão `N/M` (ex: `"Compra 1/3"`, `"Parcela 02/12"`) são classificadas como `installment` com `hasInstallmentPattern=true` e confiança `high`, independentemente de variação de valor ou count. | 🟢 |

---

## 7. Critérios de Aceitação

### CA-01 — Detecção de assinatura mensal

```
Dado:  6 transações "Netflix" em meses consecutivos, valor ~R$55,90 (variação < 2%)
       Descrições brutas NÃO contêm padrão N/M
Quando: usuário aciona "Detectar" na tela de Assinaturas (mode=subscription)
Então: candidato "Netflix" aparece na lista
       amount ≈ 55,90
       interval = monthly
       confidence = Alta
       suggestedType = subscription
       hasInstallmentPattern = false
```

### CA-02 — Detecção de parcelamento por padrão N/M

```
Dado:  3 transações "Notebook 1/3", "Notebook 2/3", "Notebook 3/3"
Quando: usuário aciona "Detectar" na tela de Parcelamentos (mode=installment)
Então: candidato "Notebook" aparece na lista
       count = 3
       suggestedType = installment
       hasInstallmentPattern = true
       confidence = Alta (sinal forte N/M)
```

### CA-02b — Assinatura não confundida com parcelamento

```
Dado:  24 transações "Netflix" em meses consecutivos, variação < 2%
       Descrições brutas NÃO contêm padrão N/M
Quando: usuário aciona "Detectar" na tela de Parcelamentos (mode=installment)
Então: candidato "Netflix" NÃO aparece (suggestedType=subscription, filtrado pelo mode)

Quando: usuário aciona "Detectar" na tela de Assinaturas (mode=subscription)
Então: candidato "Netflix" aparece corretamente como assinatura
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
