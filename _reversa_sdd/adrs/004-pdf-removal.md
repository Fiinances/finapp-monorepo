# ADR-004: Remoção do suporte a importação por PDF

> Classificado pelo reversa-detective em 2026-05-02 | `doc_level: detalhado`
> Evidência: commit `89139c1 chore: remove importação de transações por PDF`, devDep `@types/pdf-parse` (resíduo)

---

## Status

**Revertido** — funcionalidade foi removida

## Contexto

Em versões iniciais (antes de 0.3.6), o app aparentemente suportava importação de extratos em formato PDF.

## Decisão

Remover o suporte a importação por PDF.

## Alternativas Consideradas

🔴 LACUNA — razão da remoção não documentada no commit (mensagem: `chore: remove importação de transações por PDF`)

## Consequências

- **Positivo:** Reduz complexidade do parser de arquivos
- **Negativo:** Usuários que tinham extratos apenas em PDF perdem essa funcionalidade
- **Resíduo:** `@types/pdf-parse` permanece em `devDependencies` — indica que a lib foi removida mas os tipos ficaram
- **Lição:** A abordagem de parsing de PDF em texto estruturado provavelmente apresentou problemas de confiabilidade por variação de formato entre bancos
