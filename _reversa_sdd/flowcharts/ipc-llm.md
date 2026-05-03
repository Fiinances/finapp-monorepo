# Flowchart — Módulo: `ipc-llm`

> Gerado pelo reversa-archaeologist em 2026-05-02 | `doc_level: detalhado`

---

## Fluxo: categorização via Groq API (processo principal)

```mermaid
flowchart TD
    A([IPC: ai:categorize - transactions]) --> B[getGroq: lazy-init Groq client]
    B --> C{groq já existe?}
    C -->|sim| D[usa instância existente]
    C -->|não| E[new Groq com GROQ_API_KEY]
    E --> D
    D --> F[chat.completions.create]
    F --> G[model: openai/gpt-oss-120b\ntemperature: 0\nsystem: prompt de categorização\nuser: JSON das transações]
    G -->|erro API| H([Propaga erro ao renderer])
    G -->|resposta| I[result = choices 0 .message.content]
    I --> J[Extrai JSON: substring entre primeiro ponto colchete e último ponto colchete]
    J --> K[JSON.parse]
    K -->|erro parse| L([Propaga erro])
    K -->|ok| M([return string array de categorias])
```

---

## Fluxo: LLM local via MediaPipe Web Worker

### Inicialização

```mermaid
flowchart TD
    A([initLLM modelBuffer]) --> B{readyPromise existe?}
    B -->|sim| C([return readyPromise - já inicializado])
    B -->|não| D[Cria nova readyPromise com resolve/reject]
    D --> E[getWorker: cria Web Worker de llm-worker.ts]
    E --> F{worker existe?}
    F -->|sim| G[usa worker existente]
    F -->|não| H[new Worker llm-worker.ts]
    H --> I[Registra worker.onmessage handler]
    I --> G
    G --> J[postMessage: type=init, modelStream, wasmUrl\nTransfere buffer zero-copy]
    J --> K([Aguarda worker responder])

    K --> L{msg.type?}
    L -->|ready| M[readyResolve - resolve a promise]
    L -->|init-error| N[readyReject com msg.message]
    M --> O([initLLM resolvida])
    N --> P([initLLM rejeitada])
```

### Geração de texto

```mermaid
flowchart TD
    A([generate prompt]) --> B{readyPromise existe?}
    B -->|não| C([throw: Call initLLM first])
    B -->|sim| D[await readyPromise]
    D --> E[id = ++idCounter como string]
    E --> F[pending.set id, resolve, reject]
    F --> G[worker.postMessage: type=generate, id, prompt]
    G --> H([Aguarda resposta])
    H --> I{msg.type?}
    I -->|generate-result| J[pending.get id .resolve msg.text]
    I -->|generate-error| K[pending.get id .reject Error msg.message]
    J --> L[pending.delete id]
    K --> L
    L --> M([Promise resolvida ou rejeitada])
```

### Worker interno (llm-worker.ts)

```mermaid
flowchart TD
    A([self.onmessage - msg]) --> B{msg.type?}
    B -->|init| C[FilesetResolver.forGenAiTasks wasmUrl]
    C -->|erro| D[postMessage: init-error]
    C -->|fileset| E[LlmInference.createFromOptions\nmodelAssetBuffer, maxTokens: 20480]
    E -->|erro| D
    E -->|ok| F[llmInference = instância]
    F --> G[postMessage: ready]

    B -->|generate| H{llmInference existe?}
    H -->|não| I[postMessage: generate-error - not initialized]
    H -->|sim| J[llmInference.generateResponse prompt]
    J -->|erro| K[postMessage: generate-error]
    J -->|texto| L[postMessage: generate-result, id, text]
```
