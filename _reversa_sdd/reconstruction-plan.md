# Reconstruction Plan — Finapp Mobile (Quarkus + Supabase)

**Stack:** 
- **Mobile:** React Native + NativeWind (Tailwind CSS) + Gluestack UI
- **API:** Java Quarkus (REST)
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel (Backend) + Supabase (DB/Auth)
**Gerado em:** 2026-05-03 | **Atualizado em:** 2026-05-06
**Status:** 36 tarefas | 22 concluídas | 14 pendentes

---

## Alertas de pré-voo

> Pontos críticos para a nova arquitetura mobile/cloud.

- ⚠️ **Configuração Vercel + Quarkus** — Requer o uso de Vercel Runtimes para Java ou containerização específica. Devemos validar o entry point da função serverless.
- ⚠️ **Temas Light/Dark** — Implementar via NativeWind (dark class) e garantir que o Java Quarkus não precise de conhecimento sobre o tema (lógica puramente no frontend).
- ⚠️ **G-03: Seeding de categorias** — Deve ser feito via SQL no Supabase (seed.sql).
- ⚠️ **Autenticação** — Integração Supabase Auth no React Native.
- ⚠️ **G-01 (Reviewer): Seletor global de mês ainda não implementado no posicionamento validado** — vinculado à **Tarefa 18-A**.
- ⚠️ **G-02 (Reviewer): Filtros avançados de transações ainda ausentes** — vinculado à **Tarefa 18-B**.
- ⚠️ **G-03 (Reviewer): Matriz code-spec incompleta para módulos mobile** — vinculado à **Tarefa 18-E**.

---

## Tarefas

### Fase 1: Infraestrutura e Dados (Supabase)

#### Tarefa 01 — Schema no Supabase (PostgreSQL)
**Status:** ✅ done
**Lê:** `_reversa_sdd/erd-complete.md`, `_reversa_sdd/data-dictionary.md`
**Constrói:** Scripts SQL (DDL) para o Supabase
**Pronto quando:** Tabelas criadas no Postgres com RLS (Row Level Security) habilitado por `user_id`.

#### Tarefa 02 — Seeding e Categorias Base
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/categories.md` §10
**Constrói:** `seed.sql`
**Pronto quando:** Categorias padrão inseridas no banco de dados.

---

### Fase 2: Backend (Java Quarkus)

#### Tarefa 03 — Setup do Projeto Quarkus
**Status:** ✅ done
**Constrói:** Estrutura Maven, extensões (Resteasy Reactive, Hibernate Panache, JDBC Postgres, **Flyway**)
**Inclui obrigatoriamente:**
- Flyway configurado como extensão Quarkus (`quarkus-flyway`)
- Migration inicial `V1__finapp_initial_schema.sql` com o schema completo (tabelas + índices + triggers + RLS) já aplicado no Supabase nas Tarefas 01 e 02
- Migration `V2__seed_categories.sql` com a função de seeding e trigger de Auth
**Pronto quando:** Projeto compila, conecta ao Supabase e Flyway valida que as migrations V1 e V2 estão aplicadas (baseline).

#### Tarefa 04 — Entidades e Repositórios (JPA)
**Status:** ✅ done
**Lê:** `_reversa_sdd/domain.md`, `_reversa_sdd/data-dictionary.md`
**Constrói:** Classes `@Entity` Java e Repositórios Panache
**Pronto quando:** Mapeamento objeto-relacional completo para todas as entidades financeiras.

#### Tarefa 05 — API: Transactions & Categories
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/transactions.md`, `_reversa_sdd/sdd/categories.md`
**Constrói:** `@Path("/transactions")`, `@Path("/categories")`
**Pronto quando:** Endpoints de CRUD e listagem funcional.

#### Tarefa 06 — API: Banks & Cards
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/banks.md`
**Constrói:** Endpoints para gestão de contas e cartões
**Pronto quando:** API permite criar e editar bancos/cartões conforme as RNs.

#### Tarefa 07 — Lógica de Negócio: Detecção de Padrões
**Status:** done
**Lê:** `_reversa_sdd/sdd/ipc-db.md` (Algoritmos de detecção)
**Constrói:** Serviços Java para detecção de parcelamentos e assinaturas
**Pronto quando:** Algoritmos originais portados para Java/Postgres.

#### Tarefa 08 — API: Installments & Subscriptions
**Status:** done
**Lê:** `_reversa_sdd/sdd/installments.md`, `_reversa_sdd/sdd/subscriptions.md`
**Constrói:** Endpoints de gestão de parcelas e recorrências
**Pronto quando:** Funcionalidades de progresso e ativação/desativação disponíveis via REST.

#### Tarefa 09 — API: Dashboard Analytics
**Status:** done
**Lê:** `_reversa_sdd/sdd/dashboard.md`
**Constrói:** Endpoints de agregação
**Pronto quando:** API retorna dados agregados para o Dashboard mobile.

#### Tarefa 10 — Testes Automatizados: Backend
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/transactions.md`, `_reversa_sdd/sdd/banks.md`, `_reversa_sdd/sdd/installments.md`, `_reversa_sdd/sdd/subscriptions.md`
**Constrói:** Suite JUnit 5 com `@QuarkusTest` + REST-assured para todos os endpoints REST; `@TestSecurity` para simular usuários autenticados; cobertura de cenários de sucesso, 404 e validação (422)
**Pronto quando:** Testes cobrem os endpoints de Transactions, Accounts, Cards, Categories, Installments e Subscriptions com no mínimo 80% de cobertura dos branches críticos; todos os testes passam em CI.

#### Tarefa 11 — Deploy Vercel (Quarkus)
**Status:** ✅ done
**Constrói:** `vercel.json`, build scripts
**Pronto quando:** API acessível via URL de produção da Vercel.

---

### Fase 3: Frontend Mobile (React Native)

#### Tarefa 12 — Setup React Native, UI Lib & Themes
**Status:** ✅ done
**Constrói:** Expo/CLI, **NativeWind**, **Gluestack UI**, Configuração de Temas Light/Dark
**Pronto quando:** App inicia com suporte a temas e componentes básicos da UI Lib.

#### Tarefa 13 — Integração Supabase Auth
**Status:** done
**Constrói:** Telas de Login/Cadastro, Auth Provider
**Pronto quando:** Usuário consegue se logar e manter a sessão no app.

#### Tarefa 13-A — Melhorias na Tela de Cadastro
**Status:** ✅ done
**Lê:** `mobile/src/screens/auth/RegisterScreen.tsx`, `mobile/src/contexts/AuthContext.tsx`
**Constrói:** Validação inline por campo + Indicador de força de senha + Fluxo sem confirmação de e-mail
**Detalhes:**
- Substituir `Alert.alert()` de validação por mensagens de erro individuais sob cada campo (email, senha, confirmar senha)
- Indicador visual de força de senha com 4 níveis: **Fraca / Média / Forte / Muito forte** — baseado em: comprimento ≥ 8, letra maiúscula, número, caractere especial
- Validação obrigatória para submit: mínimo 8 caracteres + 1 maiúscula + 1 número
- Remover mensagem "Verifique seu e-mail" após cadastro bem-sucedido — navegar diretamente para Login (confirmação de e-mail desativada no Supabase)
**Pronto quando:** Formulário exibe erros inline por campo; barra de força de senha atualiza em tempo real; após cadastro bem-sucedido o usuário é redirecionado ao Login sem mensagem de confirmação de e-mail.

#### Tarefa 13-B — Validação de Formulário com Zod
**Status:** ✅ done
**Lê:** `mobile/src/screens/auth/RegisterScreen.tsx`
**Constrói:** Schema Zod substituindo função manual `validateFields`
**Detalhes:**
- Instalar `zod` v4 (`npm install zod`)
- Criar `registerSchema` com `.superRefine()` para checar se as senhas coincidem
- `parseErrors()` mapeia `z.ZodIssueCode` para `FieldErrors` (primeiro erro por campo)
- Tipo `z.ZodSafeParseError<unknown>` (renomeado no Zod v4 — era `SafeParseError`)
**Pronto quando:** Toda validação do RegisterScreen passa pelo schema Zod sem erros de TypeScript.

#### Tarefa 13-C — Menu Lateral (Drawer) com Logout
**Status:** ✅ done
**Lê:** `mobile/src/screens/DashboardScreen.tsx`, `mobile/src/contexts/AuthContext.tsx`
**Constrói:** Componente `SideMenu` com animação de deslize + botão hamburguer no Dashboard
**Detalhes:**
- `SideMenu.tsx` em `components/ui/` — drawer animado com `Animated.spring` (entrada) e `Animated.timing` (saída)
- Backdrop semi-transparente com `Pressable` para fechar ao tocar fora
- Avatar com iniciais do e-mail do usuário + seção de navegação + botão "Sair da conta"
- Botão hamburguer (`Feather/menu`) no canto superior direito do Dashboard
- `signOut()` chamado com 250 ms de delay para a animação de fechamento completar antes da mudança de estado
- `@expo/vector-icons` instalado como dependência
**Pronto quando:** Usuário abre o menu lateral pelo ícone hamburguer, visualiza seu e-mail e consegue fazer logout retornando para a tela de Login.

#### Tarefa 13-D — Correção de Safe Area no Dashboard
**Status:** ✅ done
**Lê:** `mobile/src/screens/DashboardScreen.tsx`
**Constrói:** Ajuste de insets para o header não sobrepor a status bar
**Detalhes:**
- `SafeAreaView` nativo do React Native (`react-native`) não respeita os insets corretamente em todos os dispositivos Android
- Substituído por `SafeAreaView` de `react-native-safe-area-context` (já presente no projeto via Expo)
- Garante que título "Dashboard" e botão hamburguer ficam abaixo da barra de status (hora, bateria, rede) em iOS e Android
**Pronto quando:** Header do Dashboard visível abaixo da status bar em ambas as plataformas.

#### Tarefa 14 — Componentes Core: Listagem de Transações
**Status:** ✅ done
**Implementado:**
- `components/transactions/TransactionItem.tsx` — reescrito com inline styles (dark mode via `useColorScheme`)
- `components/transactions/TransactionList.tsx` — reescrito com inline styles, SectionList agrupada por mês
- `screens/TransactionsScreen.tsx` — criada com header (hamburguer esquerdo via `useSideMenu`), dark mode completo
- `navigation/AppNavigator.tsx` — rota `Transactions` agora aponta para `TransactionsScreen`
- Hook `hooks/useTransactions.ts` já existia e foi aproveitado (busca Supabase + agrupamento mensal)
**Pronto quando:** Transações renderizadas com suporte a Dark Mode. ✅

#### Tarefa 15 — Tela: Dashboard (Gráficos Mobile)
**Status:** done
**Lê:** `_reversa_sdd/sdd/dashboard.md`
**Constrói:** Integração com gráficos mobile
**Pronto quando:** Gráficos adaptados para visualização mobile e temas.

#### Tarefa 16 — Tela: Gestão de Bancos e Cartões
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/banks.md`
**Constrói:** CRUD Mobile (Forms com validação)
**Concluído:**
- `useBanks.ts` — CRUD completo com cascade delete; `insertAccount` e `insertCard` corrigidos para incluir `user_id: user.id` via `supabase.auth.getUser()`, satisfazendo a RLS policy `auth.uid() = user_id` nas tabelas `accounts` e `credit_cards` (bug: nova linha violava política de segurança de linha); **padrão obrigatório para T17+:** todo `INSERT` em tabela com RLS por `user_id` deve incluir `user_id` explicitamente — tabelas afetadas: `accounts`, `credit_cards`, `installment_groups`, `transactions`, `subscriptions`, `transaction_categories`
- `BanksScreen.tsx` — lista, modais de form, estado vazio, confirmação de exclusão; campos `balance` (saldo) e `credit_limit` (limite de crédito) com **máscara monetária BRL** (`currencyMask` / `parseCurrency`) — entrada e pré-preenchimento na edição formatados em pt-BR; `Alert.alert` nativo substituído por **`AddTypeSheet`** — bottom sheet estilizado, respeitando tema dark/light, com opções Conta bancária e Cartão de crédito; campo `Conta vinculada` no formulário de cartão tornado **opcional** — cartões podem ser criados sem vínculo bancário (`account_id = null`), suportando cartões de loja, mercado ou emissor não-bancário; seletor exibe opção "Nenhuma (independente)" no topo da lista; **todos os bottom sheets** suportam gesto de arrastar para baixo para fechar via `useSwipeToDismiss` (`PanResponder` + `Animated.Value`, threshold dy>80 ou vy>0.5, aplicado no drag handle); `AccountFormModal` e `CardFormModal` com `ScrollView` para suportar formulários e listas longas de contas; `AddTypeSheet` migrado de `animationType="fade"` para `"slide"` para consistência
- Tipos `BankAccount` / `CreditCard`; navegação via SideMenu
- **Fix schema** — `V3__credit_cards_account_id_nullable.sql` aplicada no Supabase: `credit_cards.account_id` tornado nullable e FK alterada para `ON DELETE SET NULL`; corrige erro *"null value in column account_id violates not-null constraint"* ao criar cartão sem vínculo bancário

#### Tarefa 17 — Tela: Gestão de Parcelamentos e Assinaturas
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/installments.md`, `_reversa_sdd/sdd/subscriptions.md`
**Constrói:** Telas de detalhe e detecção automática
**Concluído:**
- `types/index.ts` — `InstallmentGroup` adicionado; `Subscription` atualizado com campos de recorrência
- `hooks/useInstallments.ts` — CRUD completo + cálculo de progresso por parcela; `INSERT` inclui `user_id` obrigatoriamente (RLS)
- `hooks/useSubscriptions.ts` — CRUD + toggle otimista de ativo/inativo + helpers exportados (`monthlyEquivalent`, `resolveAccountName`)
- `screens/InstallmentsScreen.tsx` — métricas, lista por grupo, formulário com validação, AppDialog para confirmações
- `screens/SubscriptionsScreen.tsx` — 4 métricas (mensal/anual/ativas/inativas), lista, formulário, AppDialog
- `navigation/types.ts` — rotas `Installments` e `Subscriptions` adicionadas a `AppTabParamList`
- `navigation/AppNavigator.tsx` — novas telas registradas; `SideMenuProvider` envolvendo o Stack; `<SideMenu>` como overlay global
- `contexts/SideMenuContext.tsx` — contexto criado com `isMenuOpen`, `openMenu`, `closeMenu`
- **Refactor de navegação UX:** botão hamburguer movido para o lado **esquerdo** em todas as telas; botões de retorno (`arrow-left` / `goBack()`) removidos das sub-telas (Banks, Installments, Subscriptions) e substituídos pelo ícone `menu` que chama `openMenu()` via contexto — qualquer tela pode abrir o SideMenu independentemente
**Pronto quando:** Fluxos de detecção portados para a UI mobile.

#### Tarefa 17b — Padronização de Headers e SideMenu
**Status:** ✅ done
**Constrói:** Consistência visual de cabeçalhos em todas as telas; navegação funcional no SideMenu
**Concluído:**
- **DashboardScreen** — Header reestruturado: layout `space-between` → `row` alinhado à esquerda; hamburger de card redondo (40×40 `bgCard`) → `TouchableOpacity` simples com `padding:4, marginRight:16`; ícone `size={18}` → `size={22}`; título movido para esquerda com `flex:1`
- **BanksScreen** — Header padronizado: removido estilo card redondo do hamburger; adicionado `borderBottomWidth:1`, `borderBottomColor:borderColor`; `paddingVertical:16` → `14`, `paddingHorizontal:20` → `16`; `marginRight:12` → `padding:4,marginRight:16`
- **InstallmentsScreen** — Header padronizado: `paddingHorizontal:20,paddingVertical:16` → `16,14`; `marginRight:12` → `padding:4,marginRight:16`; `fontSize:20` → `18`; adicionado `borderBottomWidth:1,borderBottomColor:borderColor`
- **SubscriptionsScreen** — Header padronizado: idem InstallmentsScreen com título "Assinaturas"
- **TransactionsScreen** — Header ajustado: `paddingVertical:12` → `14`; `marginRight:12` → `16`; `fontWeight:'600'` → `'700'`; removido `backgroundColor:bgCard` do header
- **SideMenu** — `useNavigationState` adicionado para rastrear rota ativa dinamicamente; `active` prop agora calculado com `currentRoute === 'RouteName'`; Dashboard e Transações agora navegam (`navigation.navigate`) em vez de apenas fechar o menu; todos os 5 itens com `active` dinâmico

#### Tarefa 18 — Fluxo de Importação (Mobile)
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/import.md`
**Constrói:** Upload de arquivos + Preview de importação
**Concluído:** `ImportScreen.tsx` e `importParsers.ts` já implementados e sem erros. Upsert por `user_id,external_id` ativo. Registrado na navegação e acessível via SideMenu.

#### Tarefa 18-A — Seletor de Mês Global no Dashboard
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/dashboard-month-selector.md`
**Constrói:** Reposicionamento do seletor de mês para ficar abaixo do gráfico de últimos 12 meses, com escopo global para os gráficos subsequentes
**Concluído:** Componente `MonthSelector` adicionado inline em `DashboardScreen.tsx` com botões `< >`, label `MMM YYYY`, `maxMonth` = mês corrente (botão `>` desabilitado/opaco no limite). Chips de mês removidos do `CategoryChart.tsx`. `currentSummary` atualizado para refletir o mês selecionado.

#### Tarefa 18-B — Filtros Avançados de Transações (sem importBatchId)
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/transactions-filters.md`
**Constrói:** `TransactionFilterSheet` + `useTransactionFilters` com filtros por mês, categoria, tipo e origem (conta/cartão/manual), removendo `importBatchId`
**Pronto quando:** Usuário aplica filtros combinados na tela de transações e o badge do botão de filtro reflete a quantidade de filtros ativos.

#### Tarefa 18-C — Idempotência de Importação por `external_id`
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/import-flows.md`, `_reversa_sdd/sdd/import.md`
**Constrói:** Consolidação da regra oficial de importação com `upsert` por (`user_id`, `external_id`) e feedback de processadas/atualizadas/ignoradas no resumo de importação
**Pronto quando:** Reimportações OFX com mesmo `external_id` atualizam sem duplicar e o fluxo/documentação de UX ficam consistentes com a regra oficial validada.

#### Tarefa 18-D — Componente Reutilizável de Header (`AppHeader`)
**Status:** done ✅
**Lê:** `_reversa_sdd/sdd/ui-header-pattern.md`
**Constrói:** Componente compartilhado de header com slots `left/center/right` e migração progressiva das telas principais
**Pronto quando:** As telas centrais usam o mesmo componente de header e mantêm consistência visual entre temas.

#### Tarefa 18-E — Atualização das Matrizes de Rastreabilidade/Impacto (Web + Mobile)
**Status:** done ✅
**Lê:** `_reversa_sdd/traceability/code-spec-matrix.md`, `_reversa_sdd/traceability/spec-impact-matrix.md`
**Constrói:** Revisão das matrizes para refletir cobertura equivalente entre legado web e implementação mobile
**Pronto quando:** As matrizes incluem os módulos mobile novos e deixam explícita a estratégia de fonte de verdade combinada.

#### Tarefa 18-F — Upsert Completo de Transações na Reimportação (troca de source)
**Status:** pending
**Lê:** `_reversa_sdd/sdd/import-flows.md`, `_reversa_sdd/sdd/import.md`
**Constrói:** Garantia de que o upsert por `external_id` sobrescreve **todos os campos relevantes** — incluindo `account_id`, `credit_card_id` e `billing_month` — permitindo que uma transação mude de cartão para conta bancária (e vice-versa) em reimportações
**Detalhes:**
- Revisar a chamada Supabase `upsert` em `mobile/src/screens/ImportScreen.tsx` para garantir que todos os campos (`account_id`, `credit_card_id`, `billing_month`, `amount`, `description`, `date`, `type`) estão explicitamente listados no payload do upsert (Supabase `upsert` com `ignoreDuplicates: false` já atualiza o que for passado)
- Garantir que quando o destino é conta bancária: `credit_card_id: null` e `billing_month: null` são passados explicitamente (não omitidos) para que sobrescrevam valores anteriores
- Garantir que quando o destino é cartão: `account_id: null` é passado explicitamente
- Preservar `category_id` existente: usar `COALESCE(transactions.category_id, EXCLUDED.category_id)` via Supabase RPC ou checar no frontend antes do upsert
- Exibir na tela de preview coluna **Status** com `✨ Nova` / `🔄 Atualizar` por transação (requer pré-consulta de `external_id`s existentes antes de montar o preview)
- Exibir no resumo de confirmação: quantas são novas, quantas serão atualizadas e quantas tiveram source alterado (cartão→conta ou conta→cartão)
**Pronto quando:** Reimportação de OFX/CSV atualiza todos os campos da transação existente, incluindo mudança de fonte entre conta bancária e cartão de crédito, sem duplicatas; CAs 09, 10 e 11 de `import.md` passam.

#### Tarefa 18-G — Correções de Filtros, Schema e Formatação de Datas
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/transactions-filters.md`
**Constrói:** Correções nos filtros de origem de transações, remoção de coluna redundante e formatação de datas
**Concluído:**
- **Filtro de origem corrigido** — `Transaction.bank_account_id` renomeado para `account_id` em `types/index.ts` para refletir o nome real da coluna no banco de dados; lógica de filtro em `useTransactions.ts` e `TransactionsScreen.tsx` reescrita: `'credit_card'` verifica `t.credit_card_id != null`; `'bank_account'` verifica `t.account_id != null`
- **Filtro 'manual' removido** — opção `'manual'` removida de `ImportSource` em `useTransactionFilters.ts` e de `ORIGINS` em `TransactionFilterSheet.tsx`; não existia correspondência no schema (nenhuma coluna distingue transações manuais no banco)
- **Coluna `category TEXT` removida de `transactions`** — migration `V4__remove_category_from_transactions.sql` criada com `ALTER TABLE transactions DROP COLUMN IF EXISTS category`; `category_id` FK + join com `transaction_categories` é a abordagem correta
- **Data DD/MM/YYYY no preview de importação** — `ImportScreen.tsx` importa `formatDate` de `@/utils/transactions` e usa `formatDate(row.date)` na coluna de data do preview (antes exibia ISO bruto `YYYY-MM-DD`)
- **Spec atualizada** — `transactions-filters.md` reflete os filtros corretos sem 'manual' e com lógica baseada em `account_id`/`credit_card_id`
**Pronto quando:** Filtros de conta e cartão funcionam corretamente; coluna `category TEXT` removida do banco; datas exibidas em DD/MM/YYYY no preview de importação.

---

#### Tarefa 18-H — Transaction Card UI + Edit Sheet
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/transactions.md`
**Constrói:** `TransactionEditSheet.tsx`, `updateTransaction` no hook, integração na `TransactionsScreen`
**Concluído:**
- **TransactionEditSheet criado** — bottom sheet (Modal + Animated.View) com drag handle, header "Editar transação" e botão X de fechar; campos: type pills em scroll horizontal, description TextInput, linha valor+data, category chips em scroll horizontal ("Sem categoria" como primeira opção = null); footer com botões Cancelar/Salvar; validação inline; KeyboardAvoidingView para iOS
- **updateTransaction no useTransactions.ts** — novo método `updateTransaction(id, patch)` que executa `supabase.from('transactions').update({...}).eq('id', id)` e chama `refetch`; `TransactionPatch` importado de `TransactionEditSheet.tsx`
- **TransactionsScreen integrada** — estado `editTarget` e `editSaving`; `onPressItem={(tx) => setEditTarget(tx)}` passado para `TransactionList`; `TransactionEditSheet` adicionado com `onSave={handleSaveEdit}` e `onClose={() => setEditTarget(null)}`
- **Exports atualizados** — `index.ts` exporta `TransactionEditSheet` e `TransactionPatch`
- **Spec atualizada** — `sdd/transactions.md` documenta o padrão Mobile Card + Edit Sheet
**Pronto quando:** Ao tocar em qualquer transação, o bottom sheet abre pré-populado; usuário pode alterar categoria, descrição, tipo, valor e data; salvar persiste no Supabase e fecha o sheet.

#### Tarefa 18-I — Delete de Transações (Long-press + Confirmação)
**Status:** ✅ done
**Constrói:** `deleteTransaction` no hook, `onLongPress` em `TransactionItem`, `onLongPressItem` em `TransactionList`, `handleDeleteTx` em `TransactionsScreen`
**Concluído:**
- **deleteTransaction no useTransactions.ts** — executa `supabase.from('transactions').delete().eq('id', id)` e chama `refetch`
- **onLongPress no TransactionItem** — prop `onLongPress?: (transaction: Transaction) => void` adicionada; `Pressable` com `onLongPress={() => onLongPress?.(transaction)}` e `delayLongPress={400}`
- **onLongPressItem no TransactionList** — prop adicionada à interface e repassada para `TransactionItem`
- **handleDeleteTx em TransactionsScreen** — exibe `Alert.alert` de confirmação com botão "Excluir" destrutivo; erro exibido em novo Alert se falhar
**Pronto quando:** Toque longo em qualquer card exibe confirmação → confirmar exclui a transação e atualiza a lista.

#### Tarefa 18-J — Criar Transação Manual (com vínculo conta/cartão)
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/transactions.md`, `_reversa_sdd/sdd/banks.md`
**Constrói:** `TransactionCreateSheet.tsx`, `createTransaction` no hook, FAB em `TransactionsScreen`
**Concluído:**
- **TransactionCreateSheet criado** — bottom sheet (Modal + Animated.View + PanResponder swipe-to-close + `onCloseRef` pattern); campos: type pills, description TextInput, valor+data, category chips, seletor Vínculo (tabs Nenhum/Conta/Cartão com lista de contas/cartões do hook); footer Cancelar/Criar
- **TransactionCreate interface exportada** — `{ description, amount, type, date (YYYY-MM-DD), category_id, account_id, credit_card_id }`
- **createTransaction no useTransactions.ts** — insere com `user_id` obrigatório (RLS); `billing_month` derivado da data quando `credit_card_id` presente (formato `MM/AAAA`)
- **FAB em TransactionsScreen** — botão `+` absoluto bottom-right, cor `#6366f1`, abre o create sheet
- **useBanks() em TransactionsScreen** — `accounts` e `creditCards` passados como props para o sheet (não chamado dentro do sheet)
- **Exports atualizados** — `index.ts` exporta `TransactionCreateSheet` e `TransactionCreate`
**Pronto quando:** Tocar no FAB abre o sheet; usuário preenche campos e seleciona conta ou cartão opcional; salvar insere no Supabase e fecha o sheet com a lista atualizada.

---

### Fase 4: Testes e Validação E2E

#### Tarefa 19 — Testes Automatizados: Frontend
**Status:** pending
**Lê:** `_reversa_sdd/user-stories/`
**Constrói:** Testes unitários com Jest + React Native Testing Library (RNTL) para componentes core; hooks de API mockados com Jest; cobertura de estados de loading, erro e sucesso; testes de snapshot para componentes visuais
**Pronto quando:** Componentes de Listagem de Transações, Dashboard e Auth cobertos por testes unitários; snapshots aprovados; todos os testes passam em CI.

#### Tarefa 20 — Validação E2E (Maestro)
**Status:** pending
**Lê:** Todas as User Stories em `_reversa_sdd/user-stories/`
**Constrói:** Fluxos Maestro (`.yaml`) cobrindo os cenários críticos de cada User Story — login, importação, categorização, dashboard
**Pronto quando:** Fluxos E2E executados com sucesso no emulador (iOS e Android) sem erros; todos os critérios de aceitação das User Stories validados.

#### Tarefa 21 — Integração LLM (Groq)
**Status:** pending
**Lê:** `_reversa_sdd/sdd/ipc-llm.md`
**Constrói:** Chamada do Quarkus para a Groq API
**Pronto quando:** Auto-categorização funcional via backend.

#### Tarefa 22 — Polimento de UI/UX (Poppins & Themes)
**Status:** pending
**Lê:** `_reversa_sdd/design-system/`
**Constrói:** Ajustes finais de design, fonte Poppins e contraste nos temas
**Pronto quando:** App visualmente premium em Light e Dark mode.
