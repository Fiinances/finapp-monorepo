# SDD — Integração LLM Híbrida (`ipc-llm`)

> ✅ **[Revisão Q-01 — 2026-05-02]** Modelo `openai/gpt-oss-120b` confirmado pelo proprietário como modelo privado/enterprise acessível via token da organização. Reclassificado de 🔴 para 🟢.

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `electron/llm-handlers.js`, `lib/llm-client.ts`, `lib/llm-worker.ts`

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `ipc-llm` |
| **Camada** | Main Process (Node.js) + Renderer (Web Worker) |
| **Arquivos** | `electron/llm-handlers.js`, `lib/llm-client.ts`, `lib/llm-worker.ts` |
| **Responsável por** | Categorização automática de transações via LLM (Groq em nuvem e MediaPipe local) |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Este componente implementa **duas estratégias independentes de LLM**:

1. **Groq API (nuvem)** — exposta via canal IPC `ai:categorize`, executa no processo principal (Main Process), protegendo a API key do renderer.
2. **MediaPipe LLM (local)** — executa inteiramente no renderer via Web Worker dedicado (`llm-worker.ts`), sem comunicação com o processo principal.

As duas estratégias são independentes e não se comunicam entre si.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Categorizar lista de transações via Groq API (`ai:categorize`) | **Must** | 🟢 |
| Proteger `GROQ_API_KEY` — nunca exposta ao renderer | **Must** | 🟢 |
| Inicializar modelo LLM local em Web Worker (`initLLM`) | **Should** | 🟢 |
| Executar prompt no modelo local (`generate`) | **Should** | 🟢 |
| Gerenciar fila assíncrona de chamadas ao Worker (`pending` Map) | **Should** | 🟢 |
| Retornar estado de inicialização do LLM local (`isLLMReady`) | **Could** | 🟢 |

---

## 4. Estratégia 1 — Groq API (Main Process)

### 4.1 Canal IPC

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `ai:categorize` | `transactions: Transaction[]` | `string[]` (categorias na mesma ordem) | 🟢 |

### 4.2 Prompt do sistema (hardcoded)

🟢 `electron/llm-handlers.js:15-23`

```
Você é um assistente especializado em categorias transações financeiras.
Sua tarefa é analisar os detalhes de cada transação e sugerir a categoria mais
apropriada com base nas informações fornecidas.
Considere o nome do estabelecimento, a descrição da transação, o valor e a data
para determinar a categoria correta.
As categorias podem incluir, mas não estão limitadas a:
Alimentação, Transporte, Salario, Transferência, Cartão de Credito, Telefone,
Internet, Lazer, Saúde, Educação, Moradia, Compras, Serviços e Outras.
Forneça apenas a categoria sugerida para cada transação sem explicações adicionais.
A resposta DEVE ser um array de categorias correspondentes à ordem das transações
fornecidas
```

### 4.3 Configuração do modelo

| Parâmetro | Valor | Confiança |
|---|---|---|
| `model` | `"openai/gpt-oss-120b"` | 🟢 (modelo privado/enterprise confirmado pelo proprietário) |
| `temperature` | `0` (determinístico) | 🟢 |

### 4.4 Parsing da resposta

🟢 `electron/llm-handlers.js:35-38`

```javascript
const result = chatCompletion.choices[0].message.content
const jsonStr = result.substring(
  result.indexOf('["'),
  result.lastIndexOf('"]') + 2
)
return JSON.parse(jsonStr)
```

> ⚠️ 🔴 **Frágil** — Assume que a resposta contém exatamente `["categoria1", "categoria2"]`. Se o modelo adicionar prefixo/sufixo ou usar aspas simples, o `JSON.parse` vai falhar.

### 4.5 Singleton do cliente Groq

```javascript
let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}
```

🟢 O cliente é inicializado na primeira chamada e reutilizado.

---

## 5. Estratégia 2 — MediaPipe LLM Local (Renderer / Web Worker)

### 5.1 Arquitetura de comunicação

```
Renderer (llm-client.ts)
    ↓ postMessage({ type: 'init', payload: { modelStream, wasmUrl } }, [modelStream])
Web Worker (llm-worker.ts)
    ↓ postMessage({ type: 'ready' })
Renderer
    ↓ postMessage({ type: 'generate', id: '1', prompt })
Web Worker
    ↓ postMessage({ type: 'generate-result', id: '1', text })
Renderer → resolve(text)
```

### 5.2 API pública (`lib/llm-client.ts`)

#### `initLLM(modelBuffer: ReadableStream<Uint8Array>): Promise<void>`

🟢 Inicializa o Web Worker e transfere o buffer do modelo (zero-copy).

**Comportamento:**
- Se já chamado → retorna a mesma `readyPromise` (idempotente)
- Cria o Worker na primeira chamada
- Transfere `modelBuffer` ao Worker via `Transferable` (buffer local fica detached)
- Resolve quando Worker envia `{ type: 'ready' }`
- Rejeita quando Worker envia `{ type: 'init-error', message }`

**Configuração do Worker:**
```javascript
wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.26/wasm'
maxTokens = 20480
```

#### `generate(prompt: string): Promise<string>`

🟢 Envia um prompt ao modelo e aguarda a resposta.

**Comportamento:**
- Se `readyPromise` não existe → lança `Error('Call initLLM() before generate()')`
- `await readyPromise` — aguarda inicialização se ainda em progresso
- Gera `id` único (`++idCounter` como string)
- Adiciona `{ resolve, reject }` ao `Map<string, PendingCall>`
- `postMessage({ type: 'generate', id, prompt })`
- Resolve/rejeita quando Worker responde com `id` correspondente

#### `isLLMReady(): boolean`

🟢 Retorna `true` se `initLLM()` foi chamado (independente de ter completado).

### 5.3 Protocolo de mensagens Worker

| Direção | `type` | Campos | Significado |
|---|---|---|---|
| Client → Worker | `init` | `payload: { modelStream, wasmUrl }` | Inicializar modelo |
| Client → Worker | `generate` | `id: string, prompt: string` | Gerar resposta |
| Worker → Client | `ready` | — | Modelo pronto |
| Worker → Client | `init-error` | `message: string` | Falha na inicialização |
| Worker → Client | `generate-result` | `id: string, text: string` | Resposta gerada |
| Worker → Client | `generate-error` | `id: string, message: string` | Falha na geração |

### 5.4 Implementação do Worker (`lib/llm-worker.ts`)

🟢 `/// <reference lib="webworker" />`

**Inicialização:**
```
FilesetResolver.forGenAiTasks(wasmUrl)
  → LlmInference.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: modelStream.getReader() },
      maxTokens: 20480
    })
  → self.postMessage({ type: 'ready' })
```

**Geração:**
```
llmInference.generateResponse(prompt)
  → self.postMessage({ type: 'generate-result', id, text })
```

---

## 6. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | `GROQ_API_KEY` nunca é exposta ao renderer — chamada feita no Main Process | `electron/llm-handlers.js:6` | 🟢 |
| RN-02 | Resposta Groq deve ser JSON array de strings na mesma ordem das transações de entrada | `electron/llm-handlers.js:15-22` | 🟢 |
| RN-03 | `initLLM` é idempotente — segunda chamada retorna promise existente | `lib/llm-client.ts:57` | 🟢 |
| RN-04 | `generate` falha imediatamente se `initLLM` nunca foi chamado | `lib/llm-client.ts:76` | 🟢 |
| RN-05 | Buffer do modelo é transferido zero-copy (Transferable) — referência local fica detached | `lib/llm-client.ts:65` | 🟢 |
| RN-06 | Worker singleton — apenas um Worker existe por ciclo de vida da janela | `lib/llm-client.ts:12-44` | 🟢 |
| RN-07 | LLM local requer que o usuário forneça o arquivo de modelo `.litertlm` | 🟡 INFERIDO | 🟡 |

---

## 7. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Isolamento de thread** | LLM local roda em Web Worker — não bloqueia a UI | 🟢 |
| **Sem estado compartilhado** | Groq e LLM local são completamente independentes | 🟢 |
| **Idempotência** | `initLLM` pode ser chamado múltiplas vezes com segurança | 🟢 |
| **Dependência de CDN** | MediaPipe WASM requer acesso ao jsDelivr na primeira execução | 🟢 |
| **Sem retry** | 🔴 Nenhuma lógica de retry em falhas de rede (Groq ou CDN) | 🟡 |
| **Sem timeout** | 🔴 `generate()` pode pender indefinidamente se Worker travar | 🔴 |

---

## 8. Critérios de Aceitação

### CA-01 — `ai:categorize` retorna categorias na ordem correta

```
Dado:  3 transações: ["Supermercado", "Uber", "Netflix"]
       Groq responde: ["Alimentação", "Transporte", "Lazer"]
Quando: ai:categorize é chamado
Então: retorna ["Alimentação", "Transporte", "Lazer"]
       (mesma ordem das transações de entrada)
```

### CA-02 — `ai:categorize` falha sem API key

```
Dado:  GROQ_API_KEY não configurada (process.env.GROQ_API_KEY = undefined)
Quando: ai:categorize é chamado
Então: Groq SDK lança erro de autenticação
       erro propagado ao renderer via IPC
```

### CA-03 — `initLLM` chamado duas vezes retorna mesma promise

```
Dado:  initLLM é chamado com modelBuffer pela primeira vez
       initLLM é chamado novamente antes de resolver
Quando: segundo initLLM é executado
Então: retorna exatamente a mesma Promise (readyPromise)
       nenhum segundo Worker é criado
```

### CA-04 — `generate` antes de `initLLM` lança erro

```
Dado:  initLLM nunca foi chamado (isLLMReady() = false)
Quando: generate("teste") é chamado
Então: lança Error("Call initLLM() before generate()")
```

### CA-05 — Mensagens de Worker são roteadas pelo id

```
Dado:  duas chamadas concorrentes a generate():
       id="1" com prompt A
       id="2" com prompt B
       Worker responde: { type: 'generate-result', id: '2', text: 'resposta B' }
                        { type: 'generate-result', id: '1', text: 'resposta A' }
Quando: respostas chegam fora de ordem
Então: promise de id="1" resolve com "resposta A"
       promise de id="2" resolve com "resposta B"
```

### CA-06 — Erro de inicialização do Worker rejeita initLLM

```
Dado:  Worker falha ao carregar WASM (sem internet)
       Worker envia { type: 'init-error', message: 'WASM load failed' }
Quando: initLLM está aguardando
Então: readyPromise é rejeitada com Error("WASM load failed")
       chamadas subsequentes a generate() também falharão
```

---

## 9. Cenários de Borda (detalhado)

### CB-01 — Resposta Groq com prefixo de texto

```
Dado:  modelo responde: "Aqui estão as categorias:\n[\"Alimentação\", \"Transporte\"]"
Quando: parsing via substring indexOf('["')
Então: jsonStr = '["Alimentação", "Transporte"]'
       JSON.parse → ["Alimentação", "Transporte"] — funciona
```

### CB-02 — Resposta Groq sem array válido

```
Dado:  modelo responde: "Não consigo categorizar essas transações."
Quando: parsing via substring indexOf('["')
Então: indexOf retorna -1 → jsonStr = "" → JSON.parse("") → SyntaxError
       erro propagado ao renderer — ⚠️ sem mensagem amigável
```

### CB-03 — Buffer do modelo transferido (detached)

```
Dado:  caller passa modelBuffer para initLLM
Quando: initLLM faz postMessage(..., [modelBuffer])
Então: modelBuffer.locked = true (ou byteLength = 0 se ArrayBuffer)
       qualquer tentativa do caller de ler modelBuffer após initLLM falha
       ⚠️ documentado no JSDoc mas pode surpreender
```

### CB-04 — Worker de LLM local vs Groq — sem fallback automático

```
Dado:  LLM local inicializado mas Groq API key inválida
Quando: ai:categorize é chamado (sempre usa Groq)
Então: erro de autenticação — NÃO cai automaticamente para LLM local
       ⚠️ as duas estratégias são 100% independentes — fallback manual apenas
```

---

## 10. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `groq-sdk` | npm | Client HTTP para Groq API |
| `@mediapipe/tasks-genai` | npm | LLM local via WASM |
| `electron` (ipcMain) | Electron API | Registro do handler `ai:categorize` |
| `process.env.GROQ_API_KEY` | Variável de ambiente | Autenticação na Groq API |
| `cdn.jsdelivr.net` | CDN externo | Download do WASM do MediaPipe |
