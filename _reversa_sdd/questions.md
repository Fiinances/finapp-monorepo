# Perguntas para Validação Humana — Ciclo 2026-05-06

> Gerado pelo reversa-reviewer em 2026-05-06
> doc_level: detalhado | answer_mode: chat

---

## Pergunta 1

✅ Respondida

**Contexto:** Divergência entre spec e código em mobile/src/screens/DashboardScreen.tsx e mobile/src/components/dashboard/CategoryChart.tsx.
**Spec afetada:** _reversa_sdd/sdd/dashboard-month-selector.md
**Pergunta:** O seletor de mês no Dashboard deve ficar no header no formato < Mês > (como definido na spec), ou o comportamento correto é manter seleção por chips dentro do gráfico de categorias?
**Impacto:** Define se a spec será tratada como comportamento atual (🟢/🟡) ou requisito não implementado (🔴).

**Resposta:** Coloque abaixo do grafico de "Ultimos 12 meses" para se referir a todos os graficos abaixo dele e não dentro de um unico card parecendo ser algo exclusivo dele uma vez que não vai ser ao evoluir o app

---

## Pergunta 2

✅ Respondida

**Contexto:** A spec de filtros avançados existe, mas o código atual só mostra botão de filtro sem ação em mobile/src/screens/TransactionsScreen.tsx.
**Spec afetada:** _reversa_sdd/sdd/transactions-filters.md
**Pergunta:** O módulo de filtros avançados (sheet + hook + deep link por importBatchId) é requisito confirmado para esta versão/reconstrução, ou apenas proposta futura?
**Impacto:** Se confirmado para a versão alvo, permanece como lacuna crítica 🔴. Se for roadmap, reclassifica para 🟡.

**Resposta:** O filtro deve ignorar o importBatchId, o filtro de transações deve ser feita a partir da tabela de transações, filtrando por categorias, mes, tipo de importação(credito ou conta bancaria) entre outros filtro possiveis para essa tela

---

## Pergunta 3

✅ Respondida

**Contexto:** A spec import-flows exige exclusão prévia por mês e atomicidade excluir+inserir, mas o código atual usa upsert por user_id,external_id em mobile/src/screens/ImportScreen.tsx.
**Spec afetada:** _reversa_sdd/sdd/import-flows.md
**Pergunta:** Qual comportamento deve prevalecer na regra oficial?
- A) Reimportação substitui mês inteiro (deleteByMonth + insert atômico)
- B) Reimportação mantém estratégia atual (upsert/deduplicação por external_id)
- C) Estratégia híbrida por tipo de origem
**Impacto:** Define regra de idempotência de importação e impacto direto em consistência de dados.

**Resposta:** Atualiza transações que já existem com base no external_id presente no arquivo de importação

---

## Pergunta 4

✅ Respondida

**Contexto:** A spec ui-header-pattern define AppHeader compartilhado, mas o código atual usa headers duplicados em cada tela.
**Spec afetada:** _reversa_sdd/sdd/ui-header-pattern.md
**Pergunta:** O AppHeader único é obrigatório na reimplementação, ou a padronização visual pode continuar via headers locais por tela?
**Impacto:** Define se ausência do componente compartilhado é bug de arquitetura (🔴) ou decisão aceitável de implementação (🟡).

**Resposta:** Crie um componente reutilizavel, se for possivel.

---

## Pergunta 5

✅ Respondida

**Contexto:** A matriz code-spec foi gerada para o legado web e não cobre totalmente os novos SDDs mobile.
**Spec afetada:** _reversa_sdd/traceability/code-spec-matrix.md
**Pergunta:** Para a fase atual, a fonte de verdade da reconstrução deve priorizar o legado web, o mobile atual, ou ambos com pesos equivalentes?
**Impacto:** Define critério de rastreabilidade e evita contradições em specs híbridas.

**Resposta:** Considere ambos com pesos equivalentes, pois eu gerei a partir de um app legado e migrei para outra stack.
