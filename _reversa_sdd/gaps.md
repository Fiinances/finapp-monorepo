# Gaps — Lacunas Não Resolvidas (Ciclo 2026-05-06)

> Gerado pelo reversa-reviewer em 2026-05-06
> doc_level: detalhado

---

## Crítico

| ID | Gap | Spec | Impacto |
|---|---|---|---|
| G-01 | Seletor de mês global validado para ficar abaixo do gráfico de 12 meses ainda não está implementado nesse posicionamento | _reversa_sdd/sdd/dashboard-month-selector.md | Divergência funcional no principal filtro temporal do Dashboard |
| G-02 | `transactions-filters` não está implementado (sheet/hook/filtros por mês, categoria, tipo e origem) | _reversa_sdd/sdd/transactions-filters.md | Filtragem avançada de transações indisponível |
| G-03 | Matriz code-spec incompleta para os novos módulos mobile | _reversa_sdd/traceability/code-spec-matrix.md | Rastreabilidade parcial e risco de reconstrução inconsistente |

---

## Moderado

| ID | Gap | Spec | Impacto |
|---|---|---|---|
| G-04 | `import-flows` ainda contém exemplos de UX que não refletem totalmente o fluxo real atual | _reversa_sdd/sdd/import-flows.md | Diferenças entre documentação e implementação |
| G-05 | `ui-header-pattern` define AppHeader reutilizável, mas adoção ainda não concluída | _reversa_sdd/sdd/ui-header-pattern.md | Inconsistência de manutenção/estilo entre telas |
| G-06 | `ipc-llm` tinha sinalização contraditória sobre modelo privado/publicidade (corrigido parcialmente) | _reversa_sdd/sdd/ipc-llm.md | Ruído documental residual |
| G-07 | Regras antigas de legado web coexistem com regras mobile no mesmo corpus SDD | _reversa_sdd/sdd/*.md | Aumenta chance de contradição em decisões de reconstrução |

---

## Cosmético

| ID | Gap | Spec | Impacto |
|---|---|---|---|
| G-08 | Terminologia de formato de mês alterna entre `AAAA-MM` e `MM/YYYY` em trechos diferentes | _reversa_sdd/sdd/import-flows.md | Ruído de documentação |
| G-09 | Exemplos de layout em algumas specs estão mais detalhados que a implementação atual | _reversa_sdd/sdd/dashboard-month-selector.md, _reversa_sdd/sdd/transactions-filters.md | Pode sugerir falsa impressão de completude |

---

## Processamento de Perguntas

- Perguntas recebidas: 5
- Perguntas respondidas: 5
- Pendentes: 0
