# Máquinas de Estado — Finapp

> Gerado pelo reversa-detective em 2026-05-02

---

## Entidade: `Transaction` — campo `type`

O tipo de uma transação **não muda** após a criação (exceto edição manual pelo usuário).
Durante a importação, o usuário pode ciclar pelo botão de tipo: `income → expense → investment → transfer → card_payment → income`.

```mermaid
stateDiagram-v2
    [*] --> income : importação (valor >= 0) ou manual
    [*] --> expense : importação (valor < 0)
    [*] --> investment : manual
    [*] --> transfer : manual
    [*] --> card_payment : manual

    income --> expense : usuário altera tipo
    expense --> investment : usuário altera tipo
    investment --> transfer : usuário altera tipo
    transfer --> card_payment : usuário altera tipo
    card_payment --> income : usuário altera tipo

    note right of income : Entra no total (income - expense)
    note right of expense : Entra no total (income - expense)
    note right of investment : NÃO entra no total
    note right of transfer : NÃO entra no total
    note right of card_payment : NÃO entra no total
```

**Regra de ciclo (import preview):** 🟢 CONFIRMADO — `next[t.type]` em `import-dropdown.tsx:618`

---

## Entidade: `Subscription` — campo `active`

```mermaid
stateDiagram-v2
    [*] --> ativa : criação (default active = 1)
    ativa --> inativa : usuário clica em toggle
    inativa --> ativa : usuário clica em toggle
    ativa --> [*] : delete
    inativa --> [*] : delete
```

**Notas:**
- 🟢 `active` é INTEGER (`0 | 1`) — SQLite não tem boolean nativo
- 🟢 Assinaturas inativas **não entram** nos totais mensais
- 🔴 **LACUNA** — Não há estado `vencida` ou `suspensa` diferenciado. `next_due` não altera automaticamente o `active`.

---

## Entidade: `InstallmentGroup` — campo `real_remaining_installments` (computado)

O grupo de parcelamento não tem campo `status` explícito. O estado é derivado de `real_remaining_installments`.

```mermaid
stateDiagram-v2
    [*] --> em_andamento : criação (installments >= 2)
    em_andamento --> quitado : real_remaining_installments <= 0 (tempo decorrido)
    quitado --> em_andamento : edição de total ou first_billing_month
    em_andamento --> [*] : delete (desvincula transações)
    quitado --> [*] : delete (desvincula transações)
```

**Notas:**
- 🟢 `quitado` = estado visual (opacity-50 + ícone CheckCircle2) quando `remaining === 0`
- 🟡 **INFERIDO** — A transição para `quitado` é automática e baseada apenas em tempo decorrido, sem confirmação de pagamento real.

---

## Entidade: `Transaction` — campo `source` (origem)

```mermaid
stateDiagram-v2
    [*] --> manual : usuário cria manualmente
    [*] --> csv : importação de arquivo CSV
    [*] --> ofx : importação de arquivo OFX
    manual --> manual : update (source não muda)
    csv --> csv : update (source não muda)
    ofx --> ofx : update (source não muda)
```

**Nota:** 🟡 **INFERIDO** — `source` não é alterado após a criação. Não há lógica explícita que impeça a alteração, mas a UI de edição não expõe esse campo.

---

## Entidade: Atualização automática do App

```mermaid
stateDiagram-v2
    [*] --> idle : app iniciado em produção
    idle --> update_available : autoUpdater.checkForUpdates detecta nova versão
    update_available --> downloading : usuário clica em "Baixar atualização"
    downloading --> downloaded : download concluído
    downloaded --> installing : usuário clica em "Instalar e Reiniciar"
    installing --> [*] : app reinicia com nova versão
    update_available --> idle : usuário ignora
    downloaded --> idle : usuário ignora

    note right of idle : isDev = true → nenhum estado de update
```

**Notas:**
- 🟢 `autoDownload: false` — usuário deve confirmar o download
- 🟢 `autoInstallOnAppQuit: false` — usuário deve confirmar a instalação
