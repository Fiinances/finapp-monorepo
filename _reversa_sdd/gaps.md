# Gaps — Lacunas Não Resolvidas

> Gerado pelo reversa-reviewer em 2026-05-02 | `doc_level: detalhado`
> Categorização: crítico / moderado / cosmético

---

## 🔴 Críticos — bloqueiam reimplementação fiel

| ID | Gap | Spec | Impacto |
|---|---|---|---|
| G-01 | `openai/gpt-oss-120b` não é modelo Groq público — comportamento real de categorização desconhecido | `ipc-llm.md` | Funcionalidade de IA pode não reproduzível |
| G-02 | `balance` de conta é campo manual — `banks.md` documenta como RN-01, mas intenção de longo prazo é ambígua | `banks.md` | Reprodução pode implementar cálculo automático incorretamente |
| G-03 | `addCategories` chamado apenas em `banks/account/page.tsx` — Redux de categorias pode estar vazio em outras páginas | `categories.md` | Bug de UX não documentado pode afetar reproduced TxRow |

---

## 🟡 Moderados — afetam completude do comportamento

| ID | Gap | Spec | Impacto |
|---|---|---|---|
| G-04 | `next_due` de assinaturas não renovado automaticamente — intenção de design não confirmada | `subscriptions.md` | Reproduced pode implementar renovação automática desnecessária |
| G-05 | Comportamento ao excluir conta (cascata ou não) não confirmado pelo usuário | `banks.md` | Reproduced pode implementar cascata diferente do esperado |
| G-06 | `real_paid_installments < 0` (parcelamento futuro) não tratado — comportamento não definido | `installments.md`, `ipc-db.md` | Bug documentado sem spec de correção |
| G-07 | Sem backup automático do SQLite — risco de perda de dados não mitigado | `ipc-db.md` | Sistemas reproduzidos podem não incluir backup |
| G-08 | Redux seeding de categorias incompleto — não há seeding no `app/page.tsx` ou layout global | `categories.md` | Bug de UX em fluxos de entrada alternativos |

---

## 🟢 Cosméticos — sem impacto em funcionalidade core

| ID | Gap | Spec | Impacto |
|---|---|---|---|
| G-09 | Sem família de fonte definida — aparência varia por SO | `design-system/typography.md` | Visual inconsistente entre plataformas |
| G-10 | `counterSlice` (nome incorreto do slice de categorias) não documentado como dívida técnica | `categories.md` | Nomenclatura confusa no código |
| G-11 | `monthlyEquivalent` duplicada em 3 arquivos | `subscriptions.md`, `dashboard.md` | Manutenção frágil |
| G-12 | `parseYearMonth` duplicada em 2 componentes do dashboard | `dashboard.md` | Manutenção frágil |
| G-13 | Confirmação de exclusão inconsistente (`window.confirm()` em subscriptions, nada nos demais) | `banks.md`, `installments.md`, `subscriptions.md` | UX inconsistente |
| G-14 | Sem constraint UNIQUE em `transaction_categories.name` | `categories.md` | Duplicatas silenciosas possíveis |
| G-15 | Sem página dedicada de gestão de categorias | `categories.md` | Limitação de UX não documentada como decisão intencional |

---

## Nota sobre G-10 — Bug de nomenclatura no Redux

O slice exportado em `category.tsx` tem:
```typescript
export const counterSlice = createSlice({ name: 'counter', ... })
```

O nome `counterSlice` e `'counter'` são claramente resíduos de código copiado de um boilerplate Redux. O reducer funciona corretamente porque o `RootState` usa o `reducer` exportado, não o `name`. Mas é uma dívida técnica de nomenclatura que deve ser corrigida em refatoração futura.
