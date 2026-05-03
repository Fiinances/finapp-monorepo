# Deployment — Finapp

> Gerado pelo reversa-architect em 2026-05-02
> Fonte: `package.json`, `.github/workflows/`, `electron-builder.yml`
> `doc_level: detalhado`

---

## Fluxo de Build e Distribuição

```mermaid
flowchart TD
    A([Desenvolvedor faz push para main]) --> B{GitHub Actions Workflow}

    B --> C[Trigger: push com tag vX.Y.Z]

    C --> D[Job: build-windows]
    C --> E[Job: build-macos]
    C --> F[Job: build-linux]

    D --> D1[checkout]
    D1 --> D2[node-modules cache]
    D2 --> D3[npm ci]
    D3 --> D4[Injeta GROQ_API_KEY em runtime-config.js]
    D4 --> D5[npm run build - next build + next export]
    D5 --> D6[npm run dist - electron-builder --win]
    D6 --> D7[Gera .exe NSIS installer]
    D7 --> G[Upload para GitHub Release]

    E --> E1[Build macOS - .dmg + .app]
    E1 --> G

    F --> F1[Build Linux - .AppImage]
    F1 --> G

    G --> H([GitHub Release criada automaticamente])
    H --> I([electron-updater verifica release])
    I --> J([Usuário recebe notificação de atualização])
```

---

## Plataformas de Distribuição

| Plataforma | Formato | Runner GitHub Actions |
|---|---|---|
| Windows | `.exe` (NSIS installer) | `windows-latest` |
| macOS | `.dmg` | `macos-latest` |
| Linux | `.AppImage` | `ubuntu-latest` |

---

## Configuração electron-builder

| Propriedade | Valor | Fonte |
|---|---|---|
| `appId` | 🟡 INFERIDO — `com.fiinances.finapp` | `package.json` / `electron-builder.yml` |
| `productName` | `Finapp` | `package.json:name` |
| `files` | `out/**`, `electron/**`, etc. | `package.json:build.files` |
| `publish.provider` | `github` | `package.json` |
| `autoUpdater` | `electron-updater` | `electron/main.js` |

---

## Injeção de Variável de Ambiente em Produção

```
CI Secret: GROQ_API_KEY
       ↓
scripts/generate-config.js
       ↓
electron/runtime-config.js (gerado em runtime no build)
       ↓
electron/llm-handlers.js: process.env.GROQ_API_KEY (via runtime-config)
```

🟢 A API key nunca é commitada — injetada apenas na fase de build do CI.

---

## Ambiente de Desenvolvimento

| Comando | Descrição |
|---|---|
| `npm run dev` | `concurrently`: Next.js dev server (3000) + Electron |
| `npm run build` | `next build` → `next export` → pasta `out/` |
| `npm run dist` | `electron-builder` — gera instalador para a plataforma atual |
| `npm run postinstall` | `electron-rebuild` — recompila `better-sqlite3` para a versão Electron |

---

## Notas de Infraestrutura

- 🟢 **Não há servidor de backend** — app 100% local
- 🟢 **Auto-update via GitHub Releases** — sem custo de infraestrutura própria
- 🟡 **A Groq API key é necessária apenas para categorização** — app funciona sem ela
- 🔴 **LACUNA** — Não há mecanismo de backup do banco SQLite (`finapp.db`)
- 🔴 **LACUNA** — Não há processo de migração de dados entre versões (apenas migrations de schema)
