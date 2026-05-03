# Permissões — Finapp

> Gerado pelo reversa-detective em 2026-05-02

---

## Modelo de Acesso

O Finapp é um sistema **single-user**, sem autenticação, sem papéis (roles) e sem controle de acesso baseado em permissões (RBAC/ACL). 🟢 CONFIRMADO

**Não existe:**
- Login / senha
- Sessões de usuário
- Perfis ou papéis (admin, viewer, editor)
- Restrições de acesso por funcionalidade

---

## Fronteira de Segurança Real: Processo Principal vs. Renderer

A única separação de privilégios existente no sistema é a **fronteira Electron entre o processo principal (Node.js) e o renderer (Next.js/Chromium)**:

| Camada | Acesso | Proteções |
|---|---|---|
| **Renderer (Next.js)** | UI, lógica de apresentação, chamadas IPC | `nodeIntegration: false`, `contextIsolation: true` — sem acesso direto ao sistema de arquivos ou SQLite |
| **Processo Principal (Electron)** | SQLite, sistema de arquivos, API Groq, auto-updater | Acesso total ao Node.js — isolado do renderer |
| **Preload Script** | Bridge entre os dois processos via `contextBridge` | Expõe apenas as funções explicitamente declaradas em `electronAPI` |

### API exposta via `contextBridge`

🟢 O renderer só pode chamar o que está explicitamente em `preload.js`:

```
electronAPI.db.*           → CRUD de todas as entidades
electronAPI.ai.categorize  → Categorização via Groq
electronAPI.updater.*      → Controle de atualizações
electronAPI.windowMinimize / windowMaximize / windowClose
electronAPI.platform / versions
```

---

## Proteção da API Key

| Aspecto | Implementação | Confiança |
|---|---|---|
| GROQ_API_KEY armazenada | `process.env` no processo principal | 🟢 |
| Nunca exposta ao renderer | A key não passa pelo `contextBridge` | 🟢 |
| Em desenvolvimento | Via `.env` | 🟢 |
| Em produção | Via `electron/runtime-config.js` (gerado por `generate-config.js`) | 🟢 |

---

## Observações de Segurança

1. 🟢 **Nenhum dado sai do dispositivo** exceto chamadas à Groq API (transações enviadas para categorização) e verificação de atualização no GitHub.
2. 🟡 **INFERIDO** — `sandbox: false` é necessário para WebGPU, mas reduz o isolamento do renderer. Risco aceito pelo autor conscientemente (comentário no código).
3. 🔴 **LACUNA** — Não há validação/sanitização dos dados recebidos via IPC antes de inserir no banco. Os handlers confiam nos dados do renderer.
