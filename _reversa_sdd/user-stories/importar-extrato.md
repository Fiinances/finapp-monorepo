# User Story — Importar Extrato

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `components/import-dropdown.tsx`, `sdd/import.md`

---

## US-01 — Importar extrato bancário OFX

**Como** usuário do Finapp,  
**Quero** importar um arquivo OFX exportado do meu banco,  
**Para que** minhas transações sejam registradas automaticamente sem digitação manual.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Usuário seleciona arquivo `.ofx` válido | Preview com todas as transações parseadas é exibido |
| 2 | Arquivo contém transações já importadas (mesmo FITID) | Transações duplicadas são ignoradas; `skipped` é exibido no toast |
| 3 | Usuário confirma a importação | Toast exibe "N transações importadas, M ignoradas" |
| 4 | Arquivo OFX de cartão de crédito | Transações são mapeadas com `type=expense` ou `type=income` conforme `TRNTYPE` |
| 5 | Arquivo OFX inválido ou corrompido | Toast de erro exibido; usuário permanece na etapa de upload |

### Fluxo Principal

```
1. Usuário abre o menu de importação → escolhe "OFX"
2. Seleciona arquivo → clica em "Processar"
3. Sistema parseia o arquivo (ofx-js) no browser
4. Step muda para "preview" — tabela editável com todas as transações
5. Usuário seleciona conta ou cartão de destino
6. [Opcional] Ajusta `billing_month` se destino for cartão
7. Usuário clica em "Importar N transações"
8. IPC `db:transactions:insert` com deduplicação por external_id
9. Toast de sucesso → Sheet fecha → onSuccess() é chamado
```

### Regras de Negócio Referenciadas

- RN-01 (`import`): deduplicação por `external_id` (FITID do OFX)
- RN-08 (`import`): `amount` sempre positivo; `type` determinado pelo sinal
- RN-02 (`import`): `billing_month` obrigatório apenas quando destino é cartão

---

## US-02 — Importar extrato bancário CSV

**Como** usuário do Finapp,  
**Quero** importar um arquivo CSV exportado do meu banco ou aplicativo financeiro,  
**Para que** minhas transações históricas sejam registradas mesmo quando OFX não está disponível.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | CSV com cabeçalhos reconhecíveis (data, descrição, valor) | Preview exibido com transações mapeadas corretamente |
| 2 | CSV com separador `;` e valores no padrão BR (`1.234,56`) | Valores parseados corretamente sem erro |
| 3 | CSV com cabeçalhos não reconhecíveis | Toast de erro exibido; etapa permanece em "upload" |
| 4 | Linha CSV com data ou descrição vazia | Linha é ignorada silenciosamente |
| 5 | Valor positivo no CSV | `type = "income"`; valor negativo → `type = "expense"` |
| 6 | Importações CSV repetidas do mesmo arquivo | Transações duplicadas inseridas (sem deduplicação por CSV) |

### Fluxo Principal

```
1. Usuário abre o menu de importação → escolhe "CSV"
2. Seleciona arquivo → clica em "Processar"
3. Sistema parseia com PapaParse (browser)
4. Detecção fuzzy de colunas: data, descrição, valor
5. Step muda para "preview"
6. Usuário seleciona conta ou cartão de destino
7. Usuário confirma → IPC db:transactions:insert
8. Toast de sucesso
```

### Regras de Negócio Referenciadas

- RN-01 (`import`): sem deduplicação para CSV (`source = "csv"`, sem `external_id`)
- RN-09 (`import`): `source` fixo como `"csv"`

---

## US-03 — Revisar e editar transações antes de importar

**Como** usuário do Finapp,  
**Quero** revisar e corrigir as transações parseadas antes de confirmá-las,  
**Para que** erros de parsing ou categorias incorretas não sejam persistidos.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Usuário edita a descrição de uma linha | Novo valor é persistido na importação |
| 2 | Usuário clica no badge de tipo | Tipo cicla entre income → expense → investment → transfer → card_payment |
| 3 | Usuário remove uma linha do preview | Linha é excluída; não é importada |
| 4 | Usuário clica em "Wand" (auto-categorizar) | IA categoriza todas as transações; toast exibe contagem |
| 5 | IA não disponível (sem API key) | Toast de erro; categorias permanecem em branco |

### Regras de Negócio Referenciadas

- RN-04 (`import`): tipo clicável na tabela de preview
- RN-05 (`import`): auto-categorização aplica a todas as transações

---

## Referências

| Artefato | Localização |
|---|---|
| SDD completo | `_reversa_sdd/sdd/import.md` |
| Componente | `components/import-dropdown.tsx` |
| IPC de persistência | `electron/db-handlers.js` (canal `db:transactions:insert`) |
| IPC de IA | `electron/llm-handlers.js` (canal `ai:categorize`) |
