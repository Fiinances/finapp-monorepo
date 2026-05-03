# User Story — Categorizar Transações com IA

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `electron/llm-handlers.js`, `lib/llm-client.ts`, `sdd/ipc-llm.md`

---

## US-04 — Auto-categorizar transações via Groq (nuvem)

**Como** usuário do Finapp,  
**Quero** que o sistema categorize automaticamente minhas transações importadas usando IA,  
**Para que** eu não precise classificar manualmente cada transação.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Usuário clica em "Wand" no preview de importação | `ai:categorize` é chamado com todas as transações do preview |
| 2 | Groq responde com lista de categorias na ordem correta | Cada transação recebe sua categoria correspondente |
| 3 | Categoria aplicada substitui a anterior | Transações que já tinham categoria têm o valor substituído |
| 4 | Groq indisponível ou API key ausente | Toast de erro exibido; categorias não são alteradas |
| 5 | Resposta Groq não contém JSON válido | Erro de parsing propagado; toast de erro exibido |

### Fluxo Principal

```
1. Usuário está na etapa "preview" da importação
2. Clica no ícone Wand (auto-categorizar)
3. autoCategorizing = true (spinner no botão)
4. IPC ai:categorize chamado com previewTransactions
5. Main Process → Groq API com prompt especializado
6. Resposta parseada: array de strings na mesma ordem
7. Cada transação recebe a categoria correspondente
8. Toast: "N transação(ões) categorizadas"
9. autoCategorizing = false
```

### Restrições Técnicas

- `GROQ_API_KEY` deve estar configurada no ambiente (injetada no build de produção)
- Modelo utilizado: `openai/gpt-oss-120b` (não é modelo público Groq — risco de indisponibilidade)
- Parsing da resposta via `substring(indexOf('["'))` — frágil a variações de formato
- Sem retry automático em caso de falha

### Regras de Negócio Referenciadas

- RN-01 (`ipc-llm`): API key nunca exposta ao renderer
- RN-02 (`ipc-llm`): resposta deve ser JSON array na mesma ordem das transações
- RN-05 (`import`): auto-categorização substitui categorias existentes

---

## US-05 — Usar modelo LLM local (MediaPipe)

**Como** usuário avançado do Finapp,  
**Quero** usar um modelo de linguagem rodando localmente no meu dispositivo,  
**Para que** possa usar IA sem depender de conexão com a internet ou API key.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | `initLLM(modelBuffer)` chamado com modelo válido | Worker inicializa; `isLLMReady()` retorna `true` |
| 2 | `generate(prompt)` chamado após `initLLM` | Resposta gerada localmente é retornada |
| 3 | `generate` chamado sem `initLLM` | Lança `Error("Call initLLM() before generate()")` |
| 4 | `initLLM` chamado duas vezes | Segunda chamada retorna a mesma Promise (idempotente) |
| 5 | Hardware sem suporte a WebGPU | Worker envia `init-error`; `initLLM` rejeita |
| 6 | WASM CDN indisponível (sem internet na primeira execução) | Worker falha ao carregar; erro propagado |

### Restrições Técnicas

- Requer arquivo de modelo `.litertlm` fornecido pelo usuário
- WASM baixado do CDN `cdn.jsdelivr.net` na primeira execução
- Buffer do modelo é transferido zero-copy (referência local fica detached)
- Sem fallback automático para Groq se LLM local falhar

### Regras de Negócio Referenciadas

- RN-03 (`ipc-llm`): `initLLM` é idempotente
- RN-05 (`ipc-llm`): buffer transferido zero-copy (Transferable)
- RN-06 (`ipc-llm`): Worker singleton por ciclo de vida da janela

---

## Referências

| Artefato | Localização |
|---|---|
| SDD completo | `_reversa_sdd/sdd/ipc-llm.md` |
| Handler Groq | `electron/llm-handlers.js` |
| Cliente LLM local | `lib/llm-client.ts` |
| Worker LLM | `lib/llm-worker.ts` |
