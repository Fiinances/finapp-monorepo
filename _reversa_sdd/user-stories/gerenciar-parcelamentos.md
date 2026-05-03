# User Story — Gerenciar Parcelamentos

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/installments/page.tsx`, `sdd/installments.md`

---

## US-06 — Cadastrar compra parcelada

**Como** usuário do Finapp,  
**Quero** registrar uma compra parcelada no cartão de crédito,  
**Para que** possa acompanhar o progresso e o valor restante a pagar.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Formulário preenchido com dados válidos | Parcelamento cadastrado; lista atualizada |
| 2 | `installments < 2` | Toast de erro; nada é salvo |
| 3 | `first_billing_month` fora do formato `MM/AAAA` | Toast de erro; nada é salvo |
| 4 | `total_amount <= 0` | Toast de erro; nada é salvo |
| 5 | Nenhum cartão cadastrado ao abrir o formulário | Seletor de cartão vazio; salvamento vai falhar na validação |
| 6 | `total_amount = 1000, installments = 12` | Preview exibe "12x de R$83,33 por mês" |

### Fluxo Principal

```
1. Usuário clica em "Novo parcelamento"
2. Sheet abre com mês atual pré-selecionado e primeiro cartão disponível
3. Usuário preenche: cartão, descrição, valor total, nº de parcelas, 1ª parcela
4. Preview de valor/parcela é exibido em tempo real
5. Usuário clica em "Salvar"
6. Validações executam (cliente)
7. IPC db:installmentGroups:insert
8. Toast "Parcelamento cadastrado" → Sheet fecha → lista recarrega
```

### Regras de Negócio Referenciadas

- RN-01 (`installments`): mínimo 2 parcelas
- RN-03 (`installments`): formato `MM/AAAA` validado por regex
- RN-09 (`installments`): valor por parcela = `total_amount / installments`

---

## US-07 — Acompanhar progresso de parcelamento

**Como** usuário do Finapp,  
**Quero** visualizar o progresso de cada parcelamento (parcelas pagas vs. restantes),  
**Para que** saiba exatamente quanto ainda tenho a pagar e quando termina.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Parcelamento em andamento | Barra de progresso, `paid/total`, % e valor restante exibidos |
| 2 | Parcelamento quitado (todas as parcelas decorridas) | Linha com `opacity-50`, ícone ✓ verde, texto "Quitado" |
| 3 | `first_billing_month = "01/2025", installments = 12, hoje = 06/2025` | `paid = 6`, `remaining = 6`, progresso = 50% |
| 4 | Parcelamento com `first_billing_month` no futuro | Progresso pode mostrar 0% (tratado como não iniciado) |

### Regras de Negócio Referenciadas

- RN-04 (`installments`): progresso calculado por tempo decorrido (não por pagamentos)
- RN-05 (`installments`): grupo ativo = `real_remaining_installments > 0`
- RN-06 (`installments`): grupo quitado = visual diferenciado

---

## US-08 — Detectar parcelamentos automaticamente

**Como** usuário do Finapp,  
**Quero** que o sistema identifique automaticamente compras parceladas já importadas,  
**Para que** eu não precise cadastrá-las manualmente uma a uma.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Transações com padrão "N/M" na descrição (últimos 2 meses) | Sistema detecta e exibe grupos candidatos |
| 2 | Usuário confirma um grupo detectado | `installmentGroups.insert` é chamado; lista atualiza |
| 3 | Nenhuma transação com padrão de parcela | Sem resultados na DetectInstallmentsSheet |
| 4 | Transação já vinculada a um grupo | Não aparece nos resultados de detecção |

### Regras de Negócio Referenciadas

- RN-06 (`ipc-db`): janela de detecção = últimos 2 meses
- RN-10 (`installments`): `installment_number` preenchido quando padrão detectado

---

## Referências

| Artefato | Localização |
|---|---|
| SDD completo | `_reversa_sdd/sdd/installments.md` |
| Página | `app/installments/page.tsx` |
| IPC de progresso | `electron/db-handlers.js` (canal `db:installmentGroups:list`) |
| Algoritmo de detecção | `electron/db-handlers.js:241-318` |
