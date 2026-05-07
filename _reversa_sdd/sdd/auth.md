# SDD — Autenticação (`auth`)

> Criado em 2026-05-06 | `doc_level: detalhado`
> Rastreabilidade: `mobile/src/contexts/AuthContext.tsx`, `mobile/src/screens/auth/`, `mobile/src/navigation/AuthNavigator.tsx`, `mobile/src/navigation/types.ts`

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `auth` |
| **Camada** | Frontend Mobile — contexto, telas e navegação |
| **Arquivos** | `mobile/src/contexts/AuthContext.tsx`, `mobile/src/screens/auth/LoginScreen.tsx`, `mobile/src/screens/auth/RegisterScreen.tsx`, `mobile/src/screens/auth/ForgotPasswordScreen.tsx`, `mobile/src/screens/auth/ResetPasswordScreen.tsx`, `mobile/src/navigation/AuthNavigator.tsx`, `mobile/src/navigation/types.ts` |
| **Rotas** | `Login`, `Register`, `ForgotPassword`, `ResetPassword` (AuthStack) |
| **Responsável por** | Login, cadastro, sessão do usuário e recuperação de senha via OTP |
| **Serviço externo** | Supabase Auth (email/password + OTP por e-mail) |

---

## 2. Propósito

Módulo de autenticação do app mobile. Gerencia sessão via `AuthContext`, expõe as operações de auth como métodos memoizados e controla o stack de navegação não-autenticada (`AuthNavigator`). O `RootNavigator` troca automaticamente entre `AppNavigator` e `AuthNavigator` baseado em `session` via `onAuthStateChange`.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Login com e-mail e senha | **Must** | 🟢 |
| Cadastro com e-mail e senha | **Must** | 🟢 |
| Persistência de sessão (token Supabase) | **Must** | 🟢 |
| Logout | **Must** | 🟢 |
| Recuperação de senha por OTP (e-mail) | **Must** | 🟢 |
| Validação de formulários via Zod | **Must** | 🟢 |
| Indicador de força de senha | **Should** | 🟢 |
| Redirecionamento automático pós-auth via `onAuthStateChange` | **Must** | 🟢 |

---

## 4. Estrutura de Navegação

```
AuthNavigator (Stack, headerShown: false)
├── Login          → LoginScreen
├── Register       → RegisterScreen
├── ForgotPassword → ForgotPasswordScreen
└── ResetPassword  → ResetPasswordScreen  (params: { email: string })
```

**Tipo (`AuthStackParamList`):**
```ts
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    ResetPassword: { email: string };
};
```

---

## 5. AuthContext — Interface e Contrato

```ts
interface AuthContextValue {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    sendPasswordOtp: (email: string) => Promise<{ error: string | null }>;
    resetPasswordWithOtp: (email: string, otp: string, newPassword: string) => Promise<{ error: string | null }>;
}
```

**Inicialização:** `getSession()` no mount + listener `onAuthStateChange`. Estado `loading: true` até a primeira resposta.

**Provider:** envolve toda a árvore via `AuthProvider` no `App.tsx`.

---

## 6. Fluxo de Recuperação de Senha (OTP por e-mail)

### 6.1 Visão Geral

```
ForgotPasswordScreen → (OTP enviado por Supabase SMTP) → ResetPasswordScreen → Dashboard
```

### 6.2 Passo a Passo

| # | Ação do usuário | Chamada Supabase | Resultado |
|---|---|---|---|
| 1 | Digita e-mail em `ForgotPasswordScreen` e pressiona "Enviar código" | `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` | Supabase envia e-mail com código **numérico de 8 dígitos** |
| 2 | Navega automaticamente para `ResetPasswordScreen` (params: `{ email }`) | — | Tela exibe campo de código + campos de nova senha (ocultos até código preenchido) |
| 3 | Digita o código de 8 dígitos | `supabase.auth.verifyOtp({ email, token, type: 'email' })` | Sessão criada no Supabase |
| 4 | Define nova senha + confirma | `supabase.auth.updateUser({ password: newPassword })` | Senha atualizada |
| 5 | `onAuthStateChange` dispara com nova sessão | — | `RootNavigator` muda para `AppNavigator` → Dashboard automaticamente |

### 6.3 Implementação em `AuthContext`

```ts
sendPasswordOtp: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });
    return { error: error?.message ?? null };
};

resetPasswordWithOtp: async (email, otp, newPassword) => {
    const { error: verifyError } = await supabase.auth.verifyOtp({
        email, token: otp, type: 'email',
    });
    if (verifyError) return { error: verifyError.message };
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    return { error: updateError?.message ?? null };
};
```

**Decisão de segurança:** `shouldCreateUser: false` impede que um e-mail inexistente crie uma conta durante o fluxo de recuperação.

### 6.4 Tela `ForgotPasswordScreen`

- Campo: e-mail com validação Zod (`z.string().email()`)
- Botão: "Enviar código" → chama `sendPasswordOtp(email)`
- Sucesso: navega para `ResetPassword` passando `{ email }` como parâmetro
- Erro: exibido inline abaixo do campo
- Link "Voltar para o login" (Feather `arrow-left`)

### 6.5 Tela `ResetPasswordScreen`

- Recebe `route.params.email` (string)
- **Campo OTP:** `keyboardType="number-pad"`, `maxLength={8}`, `placeholder="00000000"`, centralizado com `tracking-widest`
- **Validação Zod do OTP:** `.length(8, 'O código deve ter 8 dígitos.')` + `.regex(/^\d+$/)`
- **Campo Nova senha** + **Confirmar senha** com validação Zod:
  - Mínimo 8 caracteres
  - Pelo menos 1 letra maiúscula
  - Pelo menos 1 número
  - Senhas devem coincidir (`.superRefine`)
- **Barra de força de senha:** 4 níveis — Fraca (vermelho) / Média (laranja) / Forte (amarelo) / Muito forte (verde)
  - +1 ponto por: comprimento ≥ 8 / letra maiúscula / número / caractere especial
- Todos os erros exibidos inline por campo
- Ao concluir: mensagem "Senha redefinida com sucesso!" → sessão já ativa via `verifyOtp` → `onAuthStateChange` redireciona para Dashboard

---

## 7. Regras de Negócio

| ID | Regra | Fonte |
|---|---|---|
| RN-AUTH-01 | `shouldCreateUser: false` impede criação de conta por e-mail inválido no fluxo OTP | Segurança |
| RN-AUTH-02 | O código OTP tem 8 dígitos numéricos, gerado e enviado pelo Supabase SMTP | Supabase |
| RN-AUTH-03 | O código OTP expira conforme configuração do Supabase (padrão: 1 hora) | Supabase |
| RN-AUTH-04 | Após `verifyOtp`, a sessão é criada automaticamente — `updateUser` pode ser chamado imediatamente | Supabase |
| RN-AUTH-05 | Após cadastro bem-sucedido (`signUp`), a sessão é criada via `onAuthStateChange` sem redirecionamento manual | AuthContext |
| RN-AUTH-06 | Nova senha deve ter mínimo 8 caracteres, 1 maiúscula e 1 número | UX / Validação |

---

## 8. Critérios de Aceitação

| ID | Cenário | Resultado esperado |
|---|---|---|
| CA-01 | Usuário insere e-mail válido em ForgotPasswordScreen | Tela ResetPassword aberta; e-mail recebido com código de 8 dígitos |
| CA-02 | Usuário insere e-mail não cadastrado | Mensagem de erro retornada pelo Supabase (sem criar conta) |
| CA-03 | Usuário insere código correto + nova senha válida | Senha alterada; redirecionamento automático para Dashboard |
| CA-04 | Usuário insere código incorreto | Mensagem de erro inline; campos permanecem editáveis |
| CA-05 | Nova senha não atende aos requisitos mínimos | Erro Zod exibido inline; submit bloqueado |
| CA-06 | Senhas não coincidem | Erro "As senhas não coincidem" exibido inline |
| CA-07 | Cadastro bem-sucedido | Dashboard aberto automaticamente sem passar pela tela de Login |

---

## 9. Configuração Supabase Requerida

- **Authentication → Providers → Email:** `Enable Email OTP` deve estar ativo (padrão: ativo)
- **Authentication → Email Templates:** Personalizar template de OTP para exibir código de 8 dígitos com clareza
- **Authentication → Settings:** `OTP Expiry` configurável (padrão: 3600 segundos)
- **Confirmação de e-mail desativada** para fluxo de cadastro direto (sem e-mail de confirmação)

---

## 10. Dependências

| Dependência | Uso |
|---|---|
| `@supabase/supabase-js` v2 | `signInWithPassword`, `signUp`, `signOut`, `signInWithOtp`, `verifyOtp`, `updateUser`, `onAuthStateChange` |
| `zod` v4 | Validação de formulários em todas as telas auth |
| `@expo/vector-icons` (Feather) | Ícones: `eye`, `eye-off`, `arrow-left`, `mail` |
| `@react-navigation/native-stack` | `AuthNavigator` |
| `react-native-safe-area-context` | `SafeAreaView` em todas as telas auth |
