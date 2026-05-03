# Inventário do Projeto — electron-next-app (Finapp)

> Gerado pelo reversa-scout em 2026-05-02
> Fase: Reconhecimento

---

## Visão Geral

| Campo | Valor |
|---|---|
| **Nome do projeto** | electron-next-app |
| **Nome do produto** | Finapp |
| **Versão** | 0.5.10 |
| **App ID** | com.finapp |
| **Linguagem principal** | TypeScript |
| **Frameworks principais** | Next.js 14, Electron 34 |
| **Gerenciador de pacotes** | npm |
| **Total de arquivos TS/JS** | 84 |

---

## Estrutura de Pastas

```
electron-next-app/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Layout raiz
│   ├── page.tsx                # Página principal (transações)
│   ├── store.tsx               # Redux store
│   ├── StoreProvider.tsx       # Provider Redux
│   ├── globals.css             # Estilos globais (Tailwind CSS 4)
│   ├── types/                  # Definições TypeScript
│   │   ├── electron.d.ts       # Tipagens da API Electron (IPC)
│   │   └── ofx-js.d.ts         # Tipagens da lib OFX
│   ├── dashboard/              # Módulo: Dashboard financeiro
│   │   ├── page.tsx
│   │   └── components/
│   ├── banks/                  # Módulo: Contas bancárias e cartões
│   │   ├── page.tsx
│   │   ├── account/
│   │   ├── card/
│   │   └── components/
│   ├── installments/           # Módulo: Parcelamentos
│   │   ├── page.tsx
│   │   └── components/
│   ├── subscriptions/          # Módulo: Assinaturas recorrentes
│   │   ├── page.tsx
│   │   └── components/
│   └── features/               # Feature flags / módulos em desenvolvimento
│       └── categories/
│
├── components/                 # Componentes globais
│   ├── app-sidebar.tsx         # Sidebar da aplicação
│   ├── dynamic-breadcrumb.tsx  # Breadcrumb dinâmico
│   ├── import-dropdown.tsx     # Importação de extratos (OFX/CSV)
│   ├── load-model-sheet.tsx    # Sheet de carregamento de LLM local
│   ├── month-picker.tsx        # Seletor de mês
│   ├── nav-principal.tsx       # Navegação principal
│   ├── nav-settings.tsx        # Navegação de configurações
│   ├── team-switcher.tsx       # Alternador de perfis/contas
│   ├── transaction-table.tsx   # Tabela de transações
│   ├── update-notifier.tsx     # Notificador de atualização
│   └── ui/                     # 24 componentes Shadcn/UI
│
├── electron/                   # Processo principal Electron
│   ├── main.js                 # Entry point Electron
│   ├── preload.js              # Bridge IPC (contextBridge)
│   ├── database.js             # Inicialização do banco SQLite
│   ├── db-handlers.js          # Handlers IPC para banco de dados
│   ├── llm-handlers.js         # Handlers IPC para LLM local
│   ├── generate-config.js      # Geração de config de produção
│   ├── runtime-config.js       # Config em tempo de execução
│   └── migrations/             # 13 migrations Knex.js
│
├── hooks/                      # React hooks customizados
│   ├── use-mobile.ts
│   └── use-mobile.tsx
│
├── lib/                        # Utilitários e serviços
│   ├── llm-client.ts           # Cliente LLM (Groq + WebLLM local)
│   ├── llm-worker.ts           # Worker para LLM local
│   ├── transactions.ts         # Lógica de negócio de transações
│   └── utils.ts                # Utilitários gerais (cn, formatação)
│
├── public/                     # Assets estáticos
├── .github/workflows/          # CI/CD GitHub Actions
│   ├── bump-version.yml        # Auto bump de versão
│   └── release.yml             # Release automático via Electron Builder
│
├── package.json                # Dependências e configuração Electron Builder
├── next.config.js              # Configuração Next.js
├── knexfile.js                 # Configuração Knex.js (migrations)
├── tsconfig.json               # Configuração TypeScript
├── postcss.config.mjs          # Configuração PostCSS
└── .env                        # Variáveis de ambiente
```

---

## Módulos Identificados

| Módulo | Localização | Descrição |
|---|---|---|
| `transactions` | `app/page.tsx`, `lib/transactions.ts` | Gestão de transações financeiras (core) |
| `dashboard` | `app/dashboard/` | Visão geral financeira e gráficos |
| `banks` | `app/banks/` | Contas bancárias e cartões de crédito |
| `installments` | `app/installments/` | Controle de parcelamentos |
| `subscriptions` | `app/subscriptions/` | Gestão de assinaturas recorrentes |
| `categories` | `app/features/categories/` | Categorias de transações |
| `electron-main` | `electron/main.js` | Processo principal Electron, janela, menu |
| `ipc-db` | `electron/db-handlers.js` | Camada IPC → SQLite |
| `ipc-llm` | `electron/llm-handlers.js` | Camada IPC → LLM local |
| `llm` | `lib/llm-client.ts`, `lib/llm-worker.ts` | Integração LLM (Groq API + WebLLM) |
| `import` | `components/import-dropdown.tsx` | Importação de extratos OFX/CSV |

---

## Pontos de Entrada

| Arquivo | Tipo |
|---|---|
| `electron/main.js` | Entry point Electron (processo principal) |
| `electron/preload.js` | Preload script (bridge IPC) |
| `app/layout.tsx` | Entry point Next.js (App Router) |
| `app/page.tsx` | Página principal (rota `/`) |

---

## Configurações e Ambiente

| Arquivo | Propósito |
|---|---|
| `next.config.js` | Configuração Next.js |
| `knexfile.js` | Configuração Knex (migrations SQLite) |
| `tsconfig.json` | Configuração TypeScript |
| `postcss.config.mjs` | PostCSS / Tailwind |
| `.env` | Variáveis de ambiente (chaves de API) |
| `electron/runtime-config.js` | Config runtime produção |

---

## Banco de Dados

- **Engine:** SQLite via `better-sqlite3`
- **ORM/Query Builder:** Knex.js 3.1
- **Migrations:** 13 arquivos em `electron/migrations/`
- **Tabelas identificadas:** `transactions`, `accounts`, `credit_cards`, `installment_groups`, `subscriptions`, `transaction_categories`

---

## CI/CD

| Arquivo | Ação |
|---|---|
| `.github/workflows/bump-version.yml` | Auto-incremento de versão |
| `.github/workflows/release.yml` | Build e release via Electron Builder |
| **Distribuição:** | GitHub Releases (owner: Fiinances, repo: finapp_releases) |
| **Plataformas:** | Windows (NSIS x64), macOS (DMG x64/arm64), Linux (AppImage x64) |

---

## Cobertura de Testes

- **Frameworks de teste identificados:** Nenhum identificado
- **Arquivos `*.test.*` ou `*.spec.*`:** 0
- 🔴 **LACUNA** — O projeto não possui testes automatizados

---

## Integrações Externas

| Integração | Biblioteca | Uso |
|---|---|---|
| **Groq API** | `groq-sdk` | LLM via nuvem (categorização, chat) |
| **WebLLM / MediaPipe** | `@mlc-ai/web-llm`, `@mediapipe/tasks-genai` | LLM local (offline) |
| **GitHub Releases** | `electron-updater` | Auto-atualização |
| **OFX** | `ofx-js` | Importação de extratos bancários |
| **CSV** | `papaparse` | Importação de extratos CSV |
