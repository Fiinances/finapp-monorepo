# C4 — Contexto (Nível 1) — Finapp

> Gerado pelo reversa-architect em 2026-05-02

```mermaid
C4Context
    title Sistema Finapp — Visão de Contexto

    Person(user, "Usuário", "Pessoa física gerenciando suas finanças pessoais")

    System(finapp, "Finapp", "Aplicação desktop de controle financeiro pessoal. Armazena dados localmente, importa extratos e categoriza transações com IA.")

    System_Ext(groq, "Groq API", "API de LLM em nuvem para categorização automática de transações financeiras")
    System_Ext(github, "GitHub Releases", "Repositório de releases para auto-atualização da aplicação")
    System_Ext(jsdelivr, "jsDelivr CDN", "CDN para carregamento do WebAssembly do MediaPipe (LLM local)")
    System_Ext(bank, "Banco / Instituição Financeira", "Gera extratos em formato OFX ou CSV para importação")

    Rel(user, finapp, "Usa", "Desktop GUI")
    Rel(finapp, groq, "Envia transações para categorização", "HTTPS/REST")
    Rel(finapp, github, "Verifica e baixa atualizações", "HTTPS")
    Rel(finapp, jsdelivr, "Carrega WASM do MediaPipe", "HTTPS (uma vez)")
    Rel(bank, user, "Fornece extrato", "OFX / CSV")
    Rel(user, finapp, "Importa extrato", "Upload de arquivo")
```

**Notas:**
- 🟢 O Finapp não possui backend próprio — é 100% local
- 🟢 A comunicação com Groq inclui dados financeiros (descrição das transações) — risco de privacidade
- 🟡 jsDelivr é carregado apenas uma vez para habilitar o LLM local (pode ser cacheado pelo browser)
- 🟡 Google Charts Loader também está presente no `<head>` — integração não confirmada em uso ativo
