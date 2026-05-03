# Perguntas para Validação Humana

> Gerado pelo reversa-reviewer em 2026-05-02
> `doc_level: detalhado` | `answer_mode: chat`

---

## Contexto

Durante a revisão das 10 specs SDD e da matriz de rastreabilidade, foram identificados **8 pontos** que exigem validação do proprietário do sistema — situações onde o código existe, mas a **intenção de design é ambígua** ou onde uma **lacuna crítica** pode bloquear reimplementação fiel.

---

## Q-01 — Modelo Groq `openai/gpt-oss-120b`

**Spec afetada:** `sdd/ipc-llm.md`
**Severidade:** 🔴 Crítico

O modelo configurado em `electron/llm-handlers.js:31` é:
```
"model": "openai/gpt-oss-120b"
```

Este modelo **não é um modelo público da Groq** (os modelos Groq públicos são `llama3-*`, `mixtral-*`, `gemma-*`). A identificação `openai/gpt-oss-120b` parece inválida ou privada.

**Pergunta:** Este é o modelo correto em uso? O sistema está funcionando em produção com a categorização via Groq? Se sim, qual é o nome correto do modelo?

---

## Q-02 — `balance` de conta: campo manual vs. calculado

**Spec afetada:** `sdd/banks.md` (RN-01), `sdd/ipc-db.md`
**Severidade:** 🔴 Crítico

O saldo exibido em `/banks` é o campo `account.balance` — um valor **inserido manualmente**, não calculado pelas transações. Isso significa que o saldo pode estar incorreto se o usuário importar transações sem atualizar manualmente o `balance`.

**Pergunta:** Isso é intencional? Há planos de calcular o `balance` automaticamente como `saldo_inicial + SUM(receitas) - SUM(despesas)` da conta? Ou o campo é apenas um "saldo de referência" editável pelo usuário?

---

## Q-03 — Redux não alimentado em todas as páginas

**Spec afetada:** `sdd/categories.md` (CB-02)
**Severidade:** 🔴 Crítico

A ação `addCategories` (que popula o Redux com as categorias existentes) **só é chamada em `app/banks/account/page.tsx:73`**. Nenhuma outra página faz isso.

Consequência: se o usuário navegar diretamente para uma página de transações **sem passar pela página de conta**, o `TxRow` terá `catList = []` e o Combobox de categorias ficará vazio.

**Pergunta:** Isso é um bug conhecido? O fluxo de uso esperado força a passagem pela página de conta antes de editar transações?

---

## Q-04 — `next_due` de assinaturas: manual ou automático?

**Spec afetada:** `sdd/subscriptions.md` (RN-06)
**Severidade:** 🟡 Moderado

O campo `next_due` das assinaturas **não é atualizado automaticamente** após o vencimento. Não há nenhum scheduler, cron ou lógica de renovação no código.

**Pergunta:** O `next_due` é apenas informativo (o usuário atualiza manualmente) ou deveria ser renovado automaticamente (ex: ao abrir o app, somar 1 mês/semana/ano)? Se for automático, isso ainda não foi implementado e deve ser documentado como lacuna de funcionalidade.

---

## Q-05 — Exclusão sem cascata: conta → cartões e transações

**Spec afetada:** `sdd/banks.md` (RN-08), `sdd/subscriptions.md` (CB-03)
**Severidade:** 🟡 Moderado

Ao excluir uma conta bancária via `/banks`, os **cartões de crédito vinculados** e as **transações e assinaturas dessa conta** **não são deletados** automaticamente. O handler `db:accounts:delete` faz apenas `DELETE WHERE id = ?`.

**Pergunta:** Ao excluir uma conta, o comportamento desejado é:
- (A) Apagar apenas a conta, mantendo cartões e transações (comportamento atual)
- (B) Apagar a conta e desativar/deslocar transações e cartões (cascata suave)
- (C) Apagar a conta e tudo associado (cascata completa)

---

## Q-06 — Parcelamentos com `first_billing_month` no futuro

**Spec afetada:** `sdd/installments.md` (CB-01), `sdd/ipc-db.md` (CB-02)
**Severidade:** 🟡 Moderado

Quando `first_billing_month` está no futuro, o algoritmo de progresso (`monthsBetween`) retorna um valor **negativo**, e `real_paid_installments` pode ser negativo. O sistema **não trata esse caso**.

**Pergunta:** É válido cadastrar um parcelamento com data de início no futuro? Se sim, o comportamento esperado para progresso é:
- (A) Exibir 0/N (clampado a zero)
- (B) Exibir como "Não iniciado" com visual diferente
- (C) Proibir data futura no formulário (bloqueio na validação)

---

## Q-07 — Sem backup automático do `finapp.db`

**Spec afetada:** `sdd/ipc-db.md` (seção 7, RNF)
**Severidade:** 🟡 Moderado

Não existe nenhuma rotina de backup do banco de dados SQLite. Em caso de corrupção do arquivo `finapp.db`, todos os dados são perdidos permanentemente.

**Pergunta:** Há planos de implementar backup automático (ex: copiar o `.db` para `~/Documents/finapp-backup/` na inicialização)? Ou o risco é aceito dado o uso pessoal do app?

---

## Q-08 — Ausência de fonte tipográfica explícita

**Spec afetada:** `design-system/typography.md` (DS-01)
**Severidade:** 🟢 Cosmético

Nenhuma família de fonte é definida explicitamente. No Windows, a UI usa Segoe UI; no macOS, San Francisco; no Linux, a fonte padrão do sistema.

**Pergunta:** A variação de fonte entre SOs é aceitável, ou há preferência por fixar uma família (ex: Inter, Geist, ou outra)?

---

## Como responder

Responda no chat numerando sua resposta (ex: **Q-01:** modelo correto é `llama3-70b-8192`).
Processei cada resposta e atualizo as specs correspondentes.
