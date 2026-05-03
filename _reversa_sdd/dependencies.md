# Dependências — electron-next-app (Finapp)

> Gerado pelo reversa-scout em 2026-05-02

---

## Dependências de Produção

| Pacote | Versão | Categoria | Uso |
|---|---|---|---|
| `next` | ^14.2.0 | Framework | App Router, SSR, roteamento |
| `react` | ^18.2.0 | UI | Componentes React |
| `react-dom` | ^18.2.0 | UI | Renderização DOM |
| `electron-serve` | ^1.0.0 | Electron | Serve arquivos Next.js em produção |
| `electron-updater` | ^6.8.3 | Electron | Auto-atualização via GitHub Releases |
| `better-sqlite3` | ^12.6.2 | Banco | SQLite nativo bindings |
| `knex` | ^3.1.0 | Banco | Query builder / migrations |
| `groq-sdk` | ^0.37.0 | LLM | API Groq (LLM nuvem) |
| `@mlc-ai/web-llm` | ^0.2.81 | LLM | LLM local no browser |
| `@mediapipe/tasks-genai` | ^0.10.26 | LLM | MediaPipe GenAI tasks |
| `@reduxjs/toolkit` | ^2.11.2 | Estado | Redux Toolkit |
| `react-redux` | ^9.2.0 | Estado | Provider Redux para React |
| `tailwindcss` | ^4.2.1 | Estilo | Utility-first CSS |
| `@tailwindcss/postcss` | ^4.2.1 | Estilo | PostCSS plugin Tailwind v4 |
| `lucide-react` | ^0.577.0 | UI | Biblioteca de ícones |
| `recharts` | ^2.15.4 | UI | Gráficos e charts |
| `sonner` | ^2.0.7 | UI | Toast notifications |
| `next-themes` | ^0.4.6 | UI | Tema claro/escuro |
| `react-day-picker` | ^9.14.0 | UI | Seletor de datas |
| `date-fns` | ^4.1.0 | Util | Manipulação de datas |
| `ofx-js` | ^0.2.0 | Importação | Parser OFX (extratos bancários) |
| `papaparse` | ^5.5.3 | Importação | Parser CSV |
| `dotenv` | ^17.3.1 | Config | Variáveis de ambiente |
| `clsx` | ^2.1.1 | Util | Composição de classes CSS |
| `tailwind-merge` | ^3.5.0 | Util | Merge de classes Tailwind |
| `class-variance-authority` | ^0.7.1 | Util | Variantes de componentes (CVA) |
| `@radix-ui/react-avatar` | ^1.1.10 | UI | Avatar Radix |
| `@radix-ui/react-collapsible` | ^1.1.12 | UI | Collapsible Radix |
| `@radix-ui/react-dialog` | ^1.1.15 | UI | Dialog/Modal Radix |
| `@radix-ui/react-dropdown-menu` | ^2.1.15 | UI | Dropdown Radix |
| `@radix-ui/react-label` | ^2.1.7 | UI | Label Radix |
| `@radix-ui/react-separator` | ^1.1.8 | UI | Separator Radix |
| `@radix-ui/react-slot` | ^1.2.4 | UI | Slot Radix |
| `@radix-ui/react-tooltip` | ^1.2.8 | UI | Tooltip Radix |
| `@base-ui/react` | ^1.3.0 | UI | Base UI (headless) |
| `radix-ui` | ^1.4.3 | UI | Meta-pacote Radix |
| `postcss` | ^8.5.8 | Build | PostCSS |

---

## Dependências de Desenvolvimento

| Pacote | Versão | Uso |
|---|---|---|
| `electron` | ^34.0.0 | Runtime Electron |
| `electron-builder` | ^24.9.0 | Empacotamento e distribuição |
| `@electron/rebuild` | ^4.0.3 | Rebuild nativo (better-sqlite3) |
| `typescript` | ^5.3.0 | Compilador TypeScript |
| `concurrently` | ^8.2.0 | Executar Next.js + Electron em paralelo |
| `wait-on` | ^7.2.0 | Aguardar Next.js iniciar antes do Electron |
| `cross-env` | ^7.0.0 | Variáveis de ambiente cross-plataforma |
| `shadcn` | ^3.8.5 | CLI Shadcn/UI |
| `tw-animate-css` | ^1.4.0 | Animações Tailwind |
| `@types/better-sqlite3` | ^7.6.13 | Tipos SQLite |
| `@types/node` | ^20.0.0 | Tipos Node.js |
| `@types/papaparse` | ^5.5.2 | Tipos PapaParse |
| `@types/pdf-parse` | ^1.1.5 | Tipos PDF Parse (referenciado mas não instalado como dep) |
| `@types/react` | ^18.2.0 | Tipos React |
| `@types/react-dom` | ^18.2.0 | Tipos React DOM |

---

## Scripts npm

| Script | Comando | Uso |
|---|---|---|
| `dev` | `concurrently "npm run dev:next" "npm run dev:electron"` | Desenvolvimento (Next.js + Electron) |
| `dev:next` | `next dev` | Apenas servidor Next.js |
| `dev:electron` | `wait-on http://localhost:3000 && electron .` | Apenas Electron (aguarda Next) |
| `build` | `next build` | Build Next.js para produção |
| `start` | `cross-env NODE_ENV=production electron .` | Inicia em modo produção |
| `pack` | `electron-builder --dir` | Empacota sem criar instalador |
| `dist` | `npm run build && electron-builder` | Build completo + distribuição |
| `dist:production` | `npm run build && node electron/generate-config.js && electron-builder` | Build de produção com config |
| `postinstall` | `electron-rebuild -f -w better-sqlite3` | Rebuild nativo após install |

---

## Notas

- 🟡 **INFERIDO** — `@types/pdf-parse` listado em devDependencies, mas `pdf-parse` não aparece em dependencies. Pode ser resíduo ou feature planejada.
- 🟢 **CONFIRMADO** — O script `postinstall` garante que `better-sqlite3` seja recompilado para o Electron após cada `npm install`.
- 🟢 **CONFIRMADO** — Projeto usa Tailwind CSS v4 (não v3), com PostCSS plugin separado.
