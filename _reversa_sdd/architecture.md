# Arquitetura — Finapp

> Gerado pelo reversa-architect em 2026-05-02

---

## Visão Geral

O **Finapp** é uma aplicação desktop de controle financeiro pessoal construída com a arquitetura **Electron shell + Next.js App Router**. Toda a persistência é local (SQLite). A única comunicação externa é com a **Groq API** (categorização por IA) e com o **GitHub Releases** (auto-atualização).

---

## Modelo de Dois Processos (Electron)

```
┌──────────────────────────────────────────────────────────────────┐
│                         Electron App                              │
│                                                                   │
│  ┌───────────────────────────────┐   IPC   ┌──────────────────┐  │
│  │   Main Process (Node.js)      │◄───────►│ Renderer Process  │  │
│  │                               │         │ (Chromium)        │  │
│  │  • electron/main.js           │         │                   │  │
│  │  • electron/db-handlers.js    │         │ • Next.js UI      │  │
│  │  • electron/llm-handlers.js   │         │ • React Components│  │
│  │  • electron/database.js       │         │ • Redux Store     │  │
│  │  • SQLite (better-sqlite3)    │         │ • Tailwind CSS    │  │
│  │  • Knex.js (query builder)    │         │                   │  │
│  │  • electron-updater           │         │ lib/              │  │
│  └───────────────────────────────┘         │ • llm-client.ts   │  │
│          ▲                                  │ • llm-worker.ts   │  │
│          │ contextBridge                    │ • transactions.ts │  │
│          │ preload.js                       └──────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Fluxo de comunicação:**
1. Renderer chama `window.electronAPI.*` (exposto pelo preload via contextBridge)
2. Preload faz `ipcRenderer.invoke(canal, args)`
3. Main Process executa o handler registrado em `ipcMain.handle(canal, fn)`
4. Resultado é retornado ao Renderer como Promise

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime desktop | Electron | 34.x |
| UI Framework | Next.js (App Router) | 14.x |
| UI Library | React | 18.x |
| Estilo | Tailwind CSS v4 + Shadcn/UI | 4.2.x |
| Estado global | Redux Toolkit | 2.x |
| Banco de dados | SQLite (better-sqlite3) | 12.x |
| Query builder | Knex.js | 3.x |
| LLM nuvem | Groq SDK | 0.37.x |
| LLM local | MediaPipe GenAI | 0.10.26 |
| Importação OFX | ofx-js | 0.2.x |
| Importação CSV | PapaParse | 5.x |
| Gráficos | Recharts | 2.x |
| Distribuição | electron-builder | 24.x |
| CI/CD | GitHub Actions | — |

---

## Módulos e Responsabilidades

| Módulo | Localização | Responsabilidade | Complexidade |
|---|---|---|---|
| `electron-main` | `electron/main.js` | Ciclo de vida, janela, WebGPU, updater | Media |
| `preload` | `electron/preload.js` | Bridge IPC segura via contextBridge | Baixa |
| `ipc-db` | `electron/db-handlers.js` | CRUD SQLite, algoritmos de detecção | Alta |
| `database` | `electron/database.js` | Singleton Knex, migrations | Baixa |
| `ipc-llm` | `electron/llm-handlers.js` | Categorização via Groq API | Média |
| `llm-client` | `lib/llm-client.ts` | Worker manager para LLM local | Média |
| `llm-worker` | `lib/llm-worker.ts` | Execução MediaPipe em Web Worker | Média |
| `transactions` | `lib/transactions.ts` | Parsing datas, agrupamento mensal | Média |
| `import` | `components/import-dropdown.tsx` | Importação OFX/CSV com preview | Alta |
| `dashboard` | `app/dashboard/` | Gráficos financeiros | Média |
| `banks` | `app/banks/` | Gestão de contas e cartões | Baixa |
| `installments` | `app/installments/` | Parcelamentos com progresso | Média |
| `subscriptions` | `app/subscriptions/` | Assinaturas recorrentes | Média |
| `categories` | `app/features/categories/` | Categorias hierárquicas | Baixa |
| `layout` | `app/layout.tsx` | Shell UI, providers globais | Baixa |

---

## Dívidas Técnicas Identificadas

| Dívida | Severidade | Localização | Confiança |
|---|---|---|---|
| Dois formatos de data coexistindo (ISO + DD/MM/YYYY legado) | 🔴 Alta | Banco de dados + queries SQL | 🟢 |
| Parsing de resposta LLM frágil (substring) | 🟡 Média | `electron/llm-handlers.js:36` | 🟢 |
| Modelo LLM `openai/gpt-oss-120b` não é modelo Groq público | 🔴 Alta | `electron/llm-handlers.js:31` | 🟡 |
| Ordenação MM/YYYY por `localeCompare` pode errar cross-year | 🟡 Média | `lib/transactions.ts:72` | 🟢 |
| Nenhum teste automatizado | 🔴 Alta | Projeto inteiro | 🟢 |
| `next_due` de assinaturas não atualiza automaticamente | 🟡 Média | `subscriptions` | 🟢 |
| Sem validação/sanitização de dados IPC | 🟡 Média | `electron/db-handlers.js` | 🟡 |
| `@types/pdf-parse` resíduo em devDependencies | 🟢 Baixa | `package.json` | 🟢 |
| `@mlc-ai/web-llm` importado mas possivelmente não usado | 🟡 Média | `package.json` | 🟡 |
| Progresso de parcelamento por tempo, não por pagamentos reais | 🟡 Média | `electron/db-handlers.js` | 🟢 |
| Saldo de conta não calculado automaticamente | 🟡 Média | `banks` | 🟡 |
| Redux Store aparentemente vazio/mínimo | 🟡 Média | `app/store.tsx` | 🟡 |

---

## Integrações Externas

| Sistema | Protocolo | Finalidade | Confiança |
|---|---|---|---|
| **Groq API** | HTTPS REST | Categorização automática de transações via LLM | 🟢 |
| **GitHub Releases** | HTTPS | Verificação e download de atualizações | 🟢 |
| **jsDelivr CDN** | HTTPS | Carregamento de WASM do MediaPipe | 🟢 |
| **Google Charts** | HTTPS | Carregamento do loader (uso não confirmado) | 🟡 |
