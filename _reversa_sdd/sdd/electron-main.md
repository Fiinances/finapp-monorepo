# SDD — Processo Principal Electron (`electron-main`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `electron/main.js`, `electron/preload.js`

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `electron-main` |
| **Camada** | Main Process (Node.js) |
| **Arquivos** | `electron/main.js`, `electron/preload.js` |
| **Responsável por** | Ciclo de vida da aplicação desktop: criação de janela, flags de WebGPU, registro de handlers IPC, auto-atualização e bridge de segurança renderer↔main |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Entry point do processo principal do Electron. Gerencia o ciclo de vida completo da aplicação: cria a `BrowserWindow` com configurações de segurança, ativa flags experimentais de GPU necessárias para o LLM local, registra todos os handlers IPC (DB e LLM), configura o auto-updater em produção e expõe uma bridge segura ao renderer via `preload.js`.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Criar e configurar `BrowserWindow` | **Must** | 🟢 |
| Carregar a URL correta (dev vs. produção) | **Must** | 🟢 |
| Registrar handlers IPC de DB (`registerDbHandlers`) | **Must** | 🟢 |
| Registrar handlers IPC de LLM (`registerLlmHandlers`) | **Must** | 🟢 |
| Expor bridge segura via `contextBridge` (preload) | **Must** | 🟢 |
| Ativar flags WebGPU para LLM local (MediaPipe) | **Should** | 🟢 |
| Configurar auto-updater em produção | **Should** | 🟢 |
| Registrar handlers IPC de controle de janela | **Should** | 🟢 |
| Desabilitar menu nativo da aplicação | **Could** | 🟢 |
| Evitar flash branco com `show: false` + `ready-to-show` | **Could** | 🟢 |

---

## 4. Configuração da BrowserWindow

🟢 `electron/main.js:21-47`

| Propriedade | Valor | Justificativa |
|---|---|---|
| `width` | `1200` | Tamanho padrão confortável para finanças |
| `height` | `800` | — |
| `show` | `false` | Evita flash branco — exibe em `ready-to-show` |
| `backgroundColor` | `#2B2D31` | Cor de fundo antes do carregamento da UI |
| `webPreferences.preload` | `electron/preload.js` | Script de bridge |
| `webPreferences.nodeIntegration` | `false` | Segurança — renderer não acessa Node.js |
| `webPreferences.contextIsolation` | `true` | Segurança — contextos isolados |
| `webPreferences.sandbox` | `false` | Necessário para WebGPU no renderer |

---

## 5. Flags de WebGPU

🟢 `electron/main.js:1-18` — via `app.commandLine.appendSwitch`

| Flag | Valor |
|---|---|
| `enable-unsafe-webgpu` | — |
| `enable-features` | `WebGPU,WebGPUExperimentalFeatures,WebGPUSubgroups` |
| `ignore-gpu-blocklist` | — |
| `disable-gpu-process-crash-limit` | — |

> ⚠️ 🟢 Estas flags são necessárias para que o MediaPipe LLM local funcione via WebGPU no renderer. São ativadas **antes** de `app.whenReady()`.

---

## 6. Carregamento de URL

🟢 `electron/main.js:47-52`

```
SE process.env.NODE_ENV === 'development':
  mainWindow.loadURL('http://localhost:3000')
SENÃO:
  serve(app, { directory: 'out' })
  mainWindow.loadURL('app://-')
```

> 🟢 Em produção, usa `electron-serve` para servir a build estática exportada do Next.js (`out/`).

---

## 7. Sequência de Inicialização

🟢 `electron/main.js` — sequência completa

```
1. Aplicar flags WebGPU (antes de app.whenReady)
2. app.whenReady()
3. createWindow():
   a. Criar BrowserWindow com configurações de segurança
   b. loadURL (dev ou prod)
   c. mainWindow.once('ready-to-show') → mainWindow.show()
   d. Registrar handlers IPC de controle de janela
4. registerDbHandlers() → migrate() + 20+ handlers CRUD
5. registerLlmHandlers() → ai:categorize
6. setupAutoUpdater(mainWindow) → apenas em produção
7. app.on('activate') → recriar janela se necessário (macOS)
8. app.on('window-all-closed') → quit (não-macOS)
```

---

## 8. Auto-Updater

🟢 `electron/main.js:67-103`

### 8.1 Condição de ativação

```javascript
if (!app.isPackaged) return  // Só em produção
```

### 8.2 Configuração

```javascript
autoUpdater.autoDownload = false        // Usuário confirma download
autoUpdater.autoInstallOnAppQuit = false // Usuário confirma instalação
autoUpdater.checkForUpdates()
```

### 8.3 Canais IPC (bidirecional)

| Canal | Direção | Ação |
|---|---|---|
| `updater:available` | Main → Renderer | Nova versão disponível (envia `info`) |
| `updater:downloaded` | Main → Renderer | Download concluído (envia `info`) |
| `updater:download` | Renderer → Main | Usuário solicita download |
| `updater:install` | Renderer → Main | Usuário solicita instalação |

### 8.4 Fluxo completo

```
checkForUpdates()
  → update-available: mainWindow.webContents.send('updater:available', info)
  → [usuário clica em baixar] → ipcMain.on('updater:download') → autoUpdater.downloadUpdate()
  → update-downloaded: mainWindow.webContents.send('updater:downloaded', info)
  → [usuário clica em instalar] → ipcMain.on('updater:install') → autoUpdater.quitAndInstall()
```

---

## 9. Bridge de Segurança — `preload.js`

🟢 `electron/preload.js`

Expõe `window.electronAPI` ao renderer via `contextBridge.exposeInMainWorld`:

### 9.1 Namespace `db`

| Namespace | Métodos expostos |
|---|---|
| `db.accounts` | `list`, `insert`, `update`, `delete` |
| `db.creditCards` | `list`, `insert`, `update`, `delete`, `deleteByMonth` |
| `db.transactions` | `list`, `insert`, `update`, `delete`, `deleteByMonth` |
| `db.subscriptions` | `list`, `insert`, `update`, `delete`, `detect` |
| `db.installmentGroups` | `list`, `insert`, `update`, `delete`, `detect` |
| `db.transaction_categories` | `list`, `create`, `update`, `delete` |

### 9.2 Namespace `ai`

| Método | Canal IPC |
|---|---|
| `ai.categorize(transactions)` | `ai:categorize` |

### 9.3 Namespace `updater`

| Método | Canal IPC |
|---|---|
| `updater.onAvailable(cb)` | `ipcRenderer.on('updater:available', cb)` |
| `updater.onDownloaded(cb)` | `ipcRenderer.on('updater:downloaded', cb)` |
| `updater.download()` | `ipcRenderer.send('updater:download')` |
| `updater.install()` | `ipcRenderer.send('updater:install')` |

### 9.4 Controle de janela

| Método | Canal IPC |
|---|---|
| `windowMinimize()` | `window:minimize` |
| `windowMaximize()` | `window:maximize` |
| `windowClose()` | `window:close` |

### 9.5 Metadata

| Propriedade | Valor |
|---|---|
| `platform` | `process.platform` |
| `versions` | `process.versions` |

---

## 10. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | Auto-updater só ativa quando `app.isPackaged = true` (produção) | `main.js:67` | 🟢 |
| RN-02 | Download e instalação de update são explicitamente manuais (sem auto) | `main.js:69-70` | 🟢 |
| RN-03 | `sandbox: false` aceito conscientemente para habilitar WebGPU | `main.js:40` | 🟢 |
| RN-04 | `show: false` + `ready-to-show` para eliminar flash branco | `main.js:26,55` | 🟢 |
| RN-05 | Menu nativo desativado com `Menu.setApplicationMenu(null)` | 🟡 INFERIDO | 🟡 |
| RN-06 | Em macOS, janela é recriada no `activate` se não existir | `main.js` | 🟢 |
| RN-07 | Em não-macOS, `window-all-closed` encerra o processo | `main.js` | 🟢 |

---

## 11. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Segurança** | `nodeIntegration: false`, `contextIsolation: true`, preload com contextBridge | 🟢 |
| **Performance inicial** | `backgroundColor` evita frame branco enquanto carrega | 🟢 |
| **Suporte multiplataforma** | Lógica separada para `window-all-closed` (macOS vs. outros) | 🟢 |
| **Atualização sem interrupção** | `autoInstallOnAppQuit: false` — usuário decide quando reiniciar | 🟢 |

---

## 12. Critérios de Aceitação

### CA-01 — App carrega sem flash branco

```
Dado:  aplicação iniciada em produção
Quando: janela é criada
Então: janela não aparece até o evento 'ready-to-show'
       backgroundColor = #2B2D31 é exibido como fundo antes do carregamento
```

### CA-02 — Auto-updater notifica o renderer quando update disponível

```
Dado:  nova versão publicada no GitHub Releases
       app em produção (isPackaged = true)
Quando: app inicia e chama checkForUpdates()
Então: evento 'update-available' dispara
       renderer recebe IPC 'updater:available' com info da versão
```

### CA-03 — Download de update só acontece quando solicitado

```
Dado:  update disponível notificado ao renderer
Quando: renderer NÃO envia 'updater:download'
Então: nenhum download acontece automaticamente
       autoDownload = false garante isso
```

### CA-04 — window.electronAPI disponível no renderer

```
Dado:  app carregado com preload.js configurado
Quando: renderer acessa window.electronAPI
Então: objeto disponível com namespaces: db, ai, updater, platform, versions
       nenhuma propriedade Node.js exposta além das declaradas
```

### CA-05 — Auto-updater inativo em desenvolvimento

```
Dado:  NODE_ENV = 'development' (isPackaged = false)
Quando: app inicia
Então: setupAutoUpdater não é chamado
       nenhuma verificação de update ocorre
```

---

## 13. Cenários de Borda (detalhado)

### CB-01 — WebGPU indisponível no hardware

```
Dado:  hardware sem suporte a GPU ou driver incompatível
       flags de WebGPU ativadas mas GPU não aceita
Quando: renderer tenta usar LLM local (MediaPipe)
Então: Worker falha com init-error (GPU não suportada)
       app continua funcionando — LLM local é opcional
       Groq API ainda disponível
```

### CB-02 — Janela fechada e reaberta no macOS

```
Dado:  usuário fecha a janela (não o processo) no macOS
Quando: usuário clica no ícone do Dock
Então: app.on('activate') detecta BrowserWindow.getAllWindows().length === 0
       createWindow() é chamado novamente
       nova janela é criada
```

### CB-03 — Atualização baixada mas usuário não instala

```
Dado:  update baixado, renderer recebe 'updater:downloaded'
Quando: usuário fecha o app sem confirmar instalação
Então: instalação NÃO ocorre (autoInstallOnAppQuit = false)
       na próxima abertura, checkForUpdates() é chamado novamente
```

### CB-04 — `electron/preload.js` chamado fora do Electron (teste/storybook)

```
Dado:  renderer carregado em browser comum (sem Electron)
Quando: código acessa window.electronAPI
Então: window.electronAPI = undefined
       guards com '?.' em todos os consumers evitam crash
       ⚠️ comportamento silencioso — funcionalidade indisponível
```

---

## 14. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `electron` | npm | BrowserWindow, app, ipcMain, Menu |
| `electron-serve` | npm | Servidor de arquivos estáticos em produção |
| `electron-updater` | npm | Auto-update via GitHub Releases |
| `electron/db-handlers.js` | interno | `registerDbHandlers()` |
| `electron/llm-handlers.js` | interno | `registerLlmHandlers()` |
