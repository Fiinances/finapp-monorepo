# Relatório de Confiança — Finapp (Ciclo Reviewer 2026-05-06)

> Gerado pelo reversa-reviewer em 2026-05-06
> doc_level: detalhado

---

## Resumo Geral

| Nível | Quantidade | Percentual |
|---|---:|---:|
| 🟢 CONFIRMADO | 288 | 83.0% |
| 🟡 INFERIDO | 34 | 9.8% |
| 🔴 LACUNA | 25 | 7.2% |
| **Total** | **347** | **100%** |

**Confiança geral:** 87.9%  
(Fórmula: (🟢 + 0.5 x 🟡) / total)

---

## Por Spec

| Spec | 🟢 | 🟡 | 🔴 | Confiança |
|---|---:|---:|---:|---:|
| _reversa_sdd/sdd/banks.md | 27 | 4 | 3 | 85.3% |
| _reversa_sdd/sdd/categories.md | 19 | 3 | 4 | 78.8% |
| _reversa_sdd/sdd/dashboard.md | 30 | 2 | 2 | 91.2% |
| _reversa_sdd/sdd/dashboard-month-selector.md | 6 | 2 | 1 | 77.8% |
| _reversa_sdd/sdd/electron-main.md | 20 | 1 | 0 | 97.6% |
| _reversa_sdd/sdd/import.md | 34 | 3 | 1 | 93.4% |
| _reversa_sdd/sdd/import-flows.md | 9 | 2 | 2 | 76.9% |
| _reversa_sdd/sdd/installments.md | 30 | 2 | 3 | 88.6% |
| _reversa_sdd/sdd/ipc-db.md | 41 | 2 | 2 | 93.3% |
| _reversa_sdd/sdd/ipc-llm.md | 21 | 3 | 2 | 86.5% |
| _reversa_sdd/sdd/subscriptions.md | 25 | 3 | 3 | 85.5% |
| _reversa_sdd/sdd/transactions.md | 18 | 2 | 1 | 90.5% |
| _reversa_sdd/sdd/transactions-filters.md | 5 | 2 | 1 | 75.0% |
| _reversa_sdd/sdd/ui-header-pattern.md | 3 | 3 | 0 | 75.0% |

---

## Validação de Matrizes

| Arquivo | Status | Observação |
|---|---|---|
| _reversa_sdd/traceability/code-spec-matrix.md | 🔴 Incompleta | Não cobre plenamente os SDDs mobile adicionados recentemente |
| _reversa_sdd/traceability/spec-impact-matrix.md | 🟡 Parcial | Válida para núcleo legado; precisa incorporar novos módulos mobile |

---

## Lacunas Pendentes 🔴

- Divergência funcional remanescente entre algumas especificações novas e comportamento implementado em Dashboard e Transactions.
- Matriz de rastreabilidade ainda incompleta para cobertura mobile integral.

---

## Recomendações

- [ ] Atualizar as matrizes de rastreabilidade e impacto incluindo os módulos mobile.
- [ ] Implementar os itens já validados nas respostas (filtros de transação e posicionamento global do seletor de mês).
- [ ] Consolidar refatoração gradual para header reutilizável.

---

## Perguntas Processadas

- Recebidas: 5
- Respondidas: 5
- Pendentes: 0

---

## Checkpoint para o Reversa

- Specs revisadas: 14
- Revisão cruzada realizada: não
- Reclassificações neste ciclo: 14 (🔴→🟢: 7, 🔴→🟡: 3, 🟡→🟢: 4)
- Perguntas geradas: 5
- Perguntas respondidas: 5
- Percentual geral de confiança final do ciclo: 87.9%
