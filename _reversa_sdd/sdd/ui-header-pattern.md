# SDD — Padrão de Headers (`ui-header-pattern`)

> Criado em 2026-05-06 | `doc_level: detalhado`
> Define o padrão visual e estrutural para todos os cabeçalhos de tela do app

> ⚠️ **[Revisão Reviewer — 2026-05-06]** Validação no código atual (`mobile/src/screens/*.tsx`):
> - 🔴 Componente compartilhado `AppHeader` não existe.
> - 🟡 O padrão visual está parcialmente aplicado por duplicação de código (ex.: `DashboardScreen` e `TransactionsScreen`).
> - 🔴 Há divergências de espaçamento entre telas (ex.: `marginRight` do botão esquerdo varia entre 12 e 16).
> - 🟡 Esta spec deve ser tratada como padrão alvo de refatoração para componente único.

> ✅ **[Revisão Q-04 — 2026-05-06]** Decisão do proprietário: criar componente reutilizável de header **quando viável**. Classificação ajustada de bloqueio arquitetural para recomendação preferencial de padronização.

---

## 1. Propósito

Padronizar o cabeçalho de todas as telas do app para garantir consistência visual e de interação — tamanho, espaçamento, tipografia, cores, ícones e safe area.

---

## 2. Anatomia do Header

```
┌────────────────────────────────────────────────┐
│  [left]   [title · subtitle?]   [right?]       │
└────────────────────────────────────────────────┘
```

| Slot | Conteúdo padrão | Alternativas |
|---|---|---|
| **left** | ícone hamburguer (`menu`, Feather 22px) | `arrow-left` para sub-telas |
| **center** | título da tela (bold 18px) + subtitle opcional (12px) | — |
| **right** | vazio | botão de ação (filtro, adição, etc.) |

---

## 3. Especificação Visual

### 3.1 Dimensões e Espaçamento

| Propriedade | Valor |
|---|---|
| `paddingHorizontal` | 16 |
| `paddingVertical` | 14 |
| `borderBottomWidth` | 1 |
| Ícone hamburguer `size` | 22 |
| Margem direita do ícone left | `padding: 4, marginRight: 16` |
| Título `fontSize` | 18 |
| Título `fontWeight` | `'700'` |
| Subtítulo `fontSize` | 12 |

### 3.2 Cores (Dark Mode)

| Token | Valor |
|---|---|
| Background | `#0f1117` |
| Borda inferior | `#1e2433` |
| Texto título | `#e5e7eb` |
| Texto subtítulo | `#9ca3af` |
| Ícone | `#e5e7eb` |

### 3.3 Cores (Light Mode)

| Token | Valor |
|---|---|
| Background | `#f5f6f8` |
| Borda inferior | `#e5e7eb` |
| Texto título | `#1a1f2e` |
| Texto subtítulo | `#6b7280` |
| Ícone | `#1a1f2e` |

---

## 4. Componente `AppHeader`

**Localização sugerida:** `components/ui/AppHeader.tsx`

```tsx
interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onLeftPress: () => void;
  leftIcon?: string;          // Feather icon name; default: 'menu'
  rightElement?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  onLeftPress,
  leftIcon = 'menu',
  rightElement,
}: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0f1117' : '#f5f6f8';
  const border = isDark ? '#1e2433' : '#e5e7eb';
  const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
  const subColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: bg,
      borderBottomWidth: 1,
      borderBottomColor: border,
    }}>
      <TouchableOpacity
        onPress={onLeftPress}
        style={{ padding: 4, marginRight: 16 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name={leftIcon as any} size={22} color={textColor} />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: subColor, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightElement ?? null}
    </View>
  );
}
```

---

## 5. Padrão por Tela

| Tela | Left | Título | Right |
|---|---|---|---|
| `DashboardScreen` | `menu` → openMenu | Dashboard | seletor de mês (ver `dashboard-month.md`) |
| `TransactionsScreen` | `menu` → openMenu | Transações | botão "filter" com badge |
| `BanksScreen` | `menu` → openMenu | Bancos e Cartões | — |
| `InstallmentsScreen` | `menu` → openMenu | Parcelamentos | — |
| `SubscriptionsScreen` | `menu` → openMenu | Assinaturas | — |
| `ImportScreen` | `arrow-left` → goBack | Importar extrato | — |
| `ImportHistoryScreen` | `menu` → openMenu | Importações | — |

---

## 6. SafeArea

- Todas as telas devem usar `SafeAreaView` de `react-native-safe-area-context`
- O `AppHeader` não inclui SafeArea — ele deve ser filho direto do `SafeAreaView` da tela
- O `AppHeader` pode ser usado dentro ou fora de `ScrollView` (fica fixo no topo)

---

## 7. Critérios de Aceite

- [ ] Todas as telas listadas na Tabela 5 usam o mesmo `paddingHorizontal: 16`, `paddingVertical: 14`
- [ ] Todas as telas têm `borderBottomWidth: 1` com cor correta por tema
- [ ] Ícone hamburguer tem `size={22}` com `padding: 4, marginRight: 16`
- [ ] Título usa `fontSize: 18, fontWeight: '700'`
- [ ] SafeAreaView envolve toda a tela em todas as plataformas
