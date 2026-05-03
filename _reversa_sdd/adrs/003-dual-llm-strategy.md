# ADR-003: Dupla estratégia de LLM (Groq nuvem + MediaPipe local)

> Classificado pelo reversa-detective em 2026-05-02 | `doc_level: detalhado`
> Evidência: `electron/llm-handlers.js`, `lib/llm-client.ts`, commits `4d56bc4`, `96c7cff`, dependências `groq-sdk`, `@mlc-ai/web-llm`, `@mediapipe/tasks-genai`

---

## Status

**Adotado** — ambas as estratégias coexistem

## Contexto

O app precisa de IA para categorização automática de transações. Ao mesmo tempo, o princípio de privacidade (dados locais) entra em conflito com o uso de APIs de nuvem.

## Decisão

Implementar **duas estratégias de LLM**:
1. **Groq API** (nuvem) — via processo principal, rápido, sem setup do usuário
2. **MediaPipe LLM** (local, offline) — via Web Worker, requer que o usuário carregue um arquivo de modelo

## Alternativas Consideradas

🟡 INFERIDO

- **Apenas Groq:** descartado — viola princípio de privacidade e depende de conexão
- **Apenas local:** descartado — setup complexo e desempenho variável por hardware
- **OpenAI API:** pode ter sido considerada mas Groq foi escolhida por velocidade/custo
- **WebLLM (@mlc-ai/web-llm):** importado mas 🔴 LACUNA — não identificado em uso ativo no código atual (pode ser resíduo ou feature futura)

## Consequências

- **Positivo:** Usuário pode escolher privacidade (local) ou conveniência (nuvem)
- **Positivo:** Groq processa no processo principal — API key nunca exposta ao renderer
- **Negativo:** Dupla implementação aumenta complexidade de manutenção
- **Negativo:** Parsing da resposta Groq é frágil (`substring` entre `["` e `"]`)
- **Negativo:** WebGPU para MediaPipe requer `sandbox: false`, reduzindo isolamento
- **Negativo:** Modelo LLM local precisa ser carregado manualmente (UX complexa)
- **Risco:** Modelo `openai/gpt-oss-120b` referenciado no handler Groq não é um modelo público conhecido

## Alternativas Consideradas

- `@mlc-ai/web-llm` está como dependência mas aparentemente não em uso ativo — 🔴 LACUNA: status desta lib não determinado
