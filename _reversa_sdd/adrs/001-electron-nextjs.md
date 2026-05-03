# ADR-001: Arquitetura Electron + Next.js para App Desktop

> Classificado pelo reversa-detective em 2026-05-02 | `doc_level: detalhado`
> Evidência: estrutura do projeto, `package.json`, commit `e847fc9 first commit`

---

## Status

**Adotado** — em uso desde o início do projeto

## Contexto

O projeto precisava ser uma aplicação desktop com interface rica, acesso ao sistema de arquivos e banco de dados local, com capacidade de distribuição multiplataforma (Windows, macOS, Linux).

## Decisão

Usar **Electron** como runtime desktop wrapeando uma aplicação **Next.js** (App Router) como UI.

## Alternativas Consideradas

🟡 INFERIDO (não documentado explicitamente)

- **Electron puro com HTML/JS:** descartado — menor produtividade e ecossistema limitado
- **Tauri + framework web:** 🔴 LACUNA — não há evidência de que foi considerado
- **Electron + React puro (sem Next.js):** 🔴 LACUNA — razão da escolha do Next.js não documentada

## Consequências

- **Positivo:** UI rica com React, roteamento via App Router, componentes Shadcn/UI
- **Positivo:** Build estático para produção via `next export` → `out/` servido por `electron-serve`
- **Negativo:** Complexidade de dois processos simultâneos em dev (`concurrently`)
- **Negativo:** `better-sqlite3` precisa de rebuild nativo por versão do Electron (`postinstall`)
- **Negativo:** `sandbox: false` necessário para WebGPU, reduz isolamento
