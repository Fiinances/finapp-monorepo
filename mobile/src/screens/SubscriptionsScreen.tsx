import { Feather } from '@expo/vector-icons';
import { useSideMenu } from '@/contexts/SideMenuContext';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    monthlyEquivalent,
    resolveAccountName,
    useSubscriptions,
} from '@/hooks/useSubscriptions';
import type { Subscription, SubscriptionPeriod } from '@/types';
import { AppHeader } from '@/components/ui';

// ── Types ────────────────────────────────────────────────────────────────────

interface DialogConfig {
    visible: boolean;
    type: 'info' | 'error' | 'danger';
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
}

interface FormState {
    name: string;
    amount: string;
    type: 'expense' | 'income';
    period: SubscriptionPeriod;
    next_due: string;
    category: string;
    color: string;
    bank_account_id: string;
    credit_card_id: string;
    active: 0 | 1;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
    name: '',
    amount: '',
    type: 'expense',
    period: 'monthly',
    next_due: '',
    category: '',
    color: '',
    bank_account_id: '',
    credit_card_id: '',
    active: 1,
};

const PERIOD_LABELS: Record<SubscriptionPeriod, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBRL(input: string): number {
    const cleaned = input.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
}

function currencyMask(input: string): string {
    const digits = input.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Returns true if next_due is within the next 7 days (inclusive) */
function isDueWithin7Days(next_due: string | null | undefined): boolean {
    if (!next_due) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(next_due);
    due.setHours(0, 0, 0, 0);
    const plusSeven = new Date(today);
    plusSeven.setDate(plusSeven.getDate() + 7);
    return due >= today && due <= plusSeven;
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

/** useSwipeToDismiss – pan gesture to close bottom sheet */
function useSwipeToDismiss(onClose: () => void) {
    const translateY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) translateY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 80 || g.vy > 0.5) {
                    Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start(onClose);
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        }),
    ).current;

    const resetTranslate = useCallback(() => translateY.setValue(0), [translateY]);

    return { translateY, panHandlers: panResponder.panHandlers, resetTranslate };
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export function SubscriptionsScreen() {
    const { openMenu } = useSideMenu();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const inputBg = isDark ? '#252d45' : '#f9fafb';

    const {
        subscriptions, accounts, creditCards, loading, error, refetch,
        insertSubscription, updateSubscription, deleteSubscription, toggleActive,
    } = useSubscriptions();

    // ── Sheet / form state ─────────────────────────────────────────────
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<Subscription | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [dialog, setDialog] = useState<DialogConfig>({ visible: false, type: 'info', title: '', message: '' });

    const { translateY, panHandlers, resetTranslate } = useSwipeToDismiss(() => closeSheet());

    // ── Metrics ────────────────────────────────────────────────────────
    const active = subscriptions.filter((s) => s.active === 1);
    const activeExpenseMonthly = active
        .filter((s) => s.type === 'expense')
        .reduce((sum, s) => sum + monthlyEquivalent(s), 0);
    const activeIncomeMonthly = active
        .filter((s) => s.type === 'income')
        .reduce((sum, s) => sum + monthlyEquivalent(s), 0);
    const dueSoonCount = active.filter((s) => isDueWithin7Days(s.next_due)).length;

    // ── Dialog helpers ─────────────────────────────────────────────────
    const showDialog = (cfg: Omit<DialogConfig, 'visible'>) =>
        setDialog({ visible: true, ...cfg });
    const closeDialog = () => setDialog((d) => ({ ...d, visible: false }));

    // ── Sheet open/close ───────────────────────────────────────────────
    const openSheet = (sub?: Subscription) => {
        if (sub) {
            setEditing(sub);
            setForm({
                name: sub.name,
                amount: sub.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                type: sub.type,
                period: sub.period,
                next_due: sub.next_due ?? '',
                category: sub.category ?? '',
                color: sub.color ?? '',
                bank_account_id: sub.bank_account_id ? String(sub.bank_account_id) : '',
                credit_card_id: sub.credit_card_id ? String(sub.credit_card_id) : '',
                active: sub.active,
            });
        } else {
            setEditing(null);
            setForm(EMPTY_FORM);
        }
        resetTranslate();
        setSheetOpen(true);
    };

    const closeSheet = () => {
        setSheetOpen(false);
        setEditing(null);
        setForm(EMPTY_FORM);
    };

    // ── Save ───────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!form.name.trim()) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'Informe o nome da assinatura.' });
            return;
        }
        const amount = parseBRL(form.amount);
        if (amount <= 0) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'O valor deve ser maior que zero.' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                amount,
                type: form.type,
                period: form.period,
                next_due: form.next_due.trim() || null,
                category: form.category.trim() || null,
                color: form.color.trim() || null,
                bank_account_id: form.bank_account_id ? Number(form.bank_account_id) : null,
                credit_card_id: form.credit_card_id ? Number(form.credit_card_id) : null,
                active: form.active,
            };

            if (editing) {
                await updateSubscription(editing.id, payload);
            } else {
                await insertSubscription(payload);
            }
            closeSheet();
        } catch (err: unknown) {
            showDialog({
                type: 'error',
                title: 'Erro ao salvar',
                message: err instanceof Error ? err.message : 'Não foi possível salvar a assinatura.',
            });
        } finally {
            setSaving(false);
        }
    }, [form, editing, insertSubscription, updateSubscription]);

    // ── Delete ─────────────────────────────────────────────────────────
    const handleDelete = (sub: Subscription) => {
        showDialog({
            type: 'danger',
            title: 'Excluir assinatura',
            message: `Tem certeza que deseja excluir "${sub.name}"?`,
            confirmText: 'Excluir',
            onConfirm: async () => {
                try {
                    await deleteSubscription(sub.id);
                } catch (err: unknown) {
                    showDialog({
                        type: 'error',
                        title: 'Erro ao excluir',
                        message: err instanceof Error ? err.message : 'Não foi possível excluir.',
                    });
                }
            },
        });
    };

    // ── Toggle active ──────────────────────────────────────────────────
    const handleToggle = async (sub: Subscription) => {
        try {
            await toggleActive(sub.id, sub.active);
        } catch {
            showDialog({
                type: 'error',
                title: 'Erro',
                message: 'Não foi possível alterar o status da assinatura.',
            });
        }
    };

    // ── Render list item ───────────────────────────────────────────────
    const renderItem = ({ item }: { item: Subscription }) => {
        const isActive = item.active === 1;
        const dotColor = item.color ?? '#6366f1';
        const amountColor = item.type === 'expense' ? '#ef4444' : '#22c55e';
        const monthly = monthlyEquivalent(item);
        const showMonthly = item.period !== 'monthly';
        const accountName = resolveAccountName(item, accounts, creditCards);
        const dueSoon = isActive && isDueWithin7Days(item.next_due);

        return (
            <View
                style={{
                    backgroundColor: bgCard,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    opacity: isActive ? 1 : 0.5,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                }}
            >
                {/* Row 1: dot + name + actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View
                        style={{
                            width: 12, height: 12, borderRadius: 6,
                            backgroundColor: dotColor, marginRight: 10,
                        }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.category ? (
                            <Text style={{ color: labelColor, fontSize: 11, marginTop: 1 }}>{item.category}</Text>
                        ) : null}
                    </View>

                    {/* Toggle active */}
                    <TouchableOpacity
                        onPress={() => handleToggle(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 6 }}
                    >
                        <View
                            style={{
                                width: 32, height: 18, borderRadius: 9,
                                backgroundColor: isActive ? '#6366f1' : (isDark ? '#374151' : '#d1d5db'),
                                justifyContent: 'center',
                                paddingHorizontal: 2,
                            }}
                        >
                            <View
                                style={{
                                    width: 14, height: 14, borderRadius: 7,
                                    backgroundColor: '#fff',
                                    alignSelf: isActive ? 'flex-end' : 'flex-start',
                                }}
                            />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => openSheet(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 10 }}
                    >
                        <Feather name="edit-2" size={15} color={labelColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 10 }}
                    >
                        <Feather name="trash-2" size={15} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                {/* Row 2: amount, period, due, account */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={{ color: amountColor, fontSize: 15, fontWeight: '700' }}>
                        {formatBRL(item.amount)}
                    </Text>
                    {showMonthly && (
                        <Text style={{ color: labelColor, fontSize: 12 }}>
                            ({formatBRL(monthly)}/mês)
                        </Text>
                    )}
                    <View
                        style={{
                            backgroundColor: isDark ? '#252d45' : '#f3f4f6',
                            borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8,
                        }}
                    >
                        <Text style={{ color: labelColor, fontSize: 11 }}>
                            {PERIOD_LABELS[item.period]}
                        </Text>
                    </View>
                    {item.next_due && (
                        <View
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 3,
                                backgroundColor: dueSoon ? '#fef3c7' : (isDark ? '#252d45' : '#f3f4f6'),
                                borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8,
                            }}
                        >
                            <Feather name="calendar" size={10} color={dueSoon ? '#f59e0b' : labelColor} />
                            <Text style={{ color: dueSoon ? '#d97706' : labelColor, fontSize: 11 }}>
                                {formatDate(item.next_due)}
                            </Text>
                        </View>
                    )}
                    {accountName !== '—' && (
                        <Text style={{ color: labelColor, fontSize: 11 }}>{accountName}</Text>
                    )}
                </View>
            </View>
        );
    };

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <AppHeader
                    title="Assinaturas"
                    onLeftPress={openMenu}
                    rightElement={
                        <TouchableOpacity
                            onPress={() => openSheet()}
                            activeOpacity={0.8}
                            style={{
                                width: 38, height: 38, borderRadius: 19,
                                backgroundColor: '#6366f1',
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Feather name="plus" size={20} color="#fff" />
                        </TouchableOpacity>
                    }
                />

                {/* Metric cards */}
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 }}>
                    <MetricCard
                        label="Ativas" value={String(active.length)}
                        color="#6366f1" icon="refresh-cw"
                        bgCard={bgCard} textColor={textColor} labelColor={labelColor}
                    />
                    <MetricCard
                        label="Despesa" value={formatBRL(activeExpenseMonthly)}
                        color="#ef4444" icon="trending-down"
                        bgCard={bgCard} textColor={textColor} labelColor={labelColor}
                    />
                    <MetricCard
                        label="Receita" value={formatBRL(activeIncomeMonthly)}
                        color="#22c55e" icon="trending-up"
                        bgCard={bgCard} textColor={textColor} labelColor={labelColor}
                    />
                    <MetricCard
                        label="Vencem em 7d" value={String(dueSoonCount)}
                        color="#f59e0b" icon="clock"
                        bgCard={bgCard} textColor={textColor} labelColor={labelColor}
                    />
                </View>

                {loading && !subscriptions.length ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color="#6366f1" size="large" />
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                        <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 12 }}>{error}</Text>
                        <TouchableOpacity onPress={refetch}>
                            <Text style={{ color: '#6366f1', fontWeight: '600' }}>Tentar novamente</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={subscriptions}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
                                <View
                                    style={{
                                        width: 72, height: 72, borderRadius: 36,
                                        backgroundColor: isDark ? '#1e2540' : '#f0f0ff',
                                        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                                    }}
                                >
                                    <Feather name="refresh-cw" size={30} color="#6366f1" />
                                </View>
                                <Text style={{ color: textColor, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                                    Nenhuma assinatura
                                </Text>
                                <Text style={{ color: labelColor, fontSize: 13, textAlign: 'center' }}>
                                    Toque em + para cadastrar uma assinatura.
                                </Text>
                            </View>
                        }
                        refreshing={loading}
                        onRefresh={refetch}
                    />
                )}
            </SafeAreaView>

            {/* ── Form Bottom Sheet ── */}
            <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeSheet} />
                    <Animated.View
                        style={{
                            backgroundColor: bgCard,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            maxHeight: '92%',
                            transform: [{ translateY }],
                        }}
                    >
                        {/* Drag handle — swipe down to close */}
                        <View {...panHandlers} style={{ alignItems: 'center', paddingVertical: 14 }}>
                            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: borderColor }} />
                        </View>

                        {/* Sheet header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
                            <Text style={{ color: textColor, fontSize: 17, fontWeight: '700', flex: 1 }}>
                                {editing ? 'Editar assinatura' : 'Nova assinatura'}
                            </Text>
                            <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Feather name="x" size={22} color={labelColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Name */}
                            <FormField label="Nome *" labelColor={labelColor} borderColor={borderColor} inputBg={inputBg}>
                                <TextInput
                                    value={form.name}
                                    onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                                    placeholder="Ex: Netflix"
                                    placeholderTextColor={labelColor}
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                />
                            </FormField>

                            {/* Amount */}
                            <FormField label="Valor *" labelColor={labelColor} borderColor={borderColor} inputBg={inputBg}>
                                <TextInput
                                    value={form.amount}
                                    onChangeText={(t) => setForm((f) => ({ ...f, amount: currencyMask(t) }))}
                                    placeholder="0,00"
                                    placeholderTextColor={labelColor}
                                    keyboardType="numeric"
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                />
                            </FormField>

                            {/* Type selector */}
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Tipo *</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {(['expense', 'income'] as const).map((t) => {
                                        const selected = form.type === t;
                                        const color = t === 'expense' ? '#ef4444' : '#22c55e';
                                        return (
                                            <TouchableOpacity
                                                key={t}
                                                onPress={() => setForm((f) => ({ ...f, type: t }))}
                                                style={{
                                                    flex: 1, paddingVertical: 10, borderRadius: 10,
                                                    borderWidth: 1.5,
                                                    borderColor: selected ? color : borderColor,
                                                    backgroundColor: selected ? color + '20' : inputBg,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text style={{ color: selected ? color : labelColor, fontWeight: selected ? '700' : '400', fontSize: 13 }}>
                                                    {t === 'expense' ? 'Despesa' : 'Receita'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Period selector */}
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Periodicidade *</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {(['weekly', 'monthly', 'yearly'] as SubscriptionPeriod[]).map((p) => {
                                        const selected = form.period === p;
                                        return (
                                            <TouchableOpacity
                                                key={p}
                                                onPress={() => setForm((f) => ({ ...f, period: p }))}
                                                style={{
                                                    flex: 1, paddingVertical: 10, borderRadius: 10,
                                                    borderWidth: 1.5,
                                                    borderColor: selected ? '#6366f1' : borderColor,
                                                    backgroundColor: selected ? '#6366f120' : inputBg,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text style={{ color: selected ? '#6366f1' : labelColor, fontWeight: selected ? '700' : '400', fontSize: 12 }}>
                                                    {PERIOD_LABELS[p]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Next due */}
                            <FormField label="Próximo vencimento (AAAA-MM-DD)" labelColor={labelColor} borderColor={borderColor} inputBg={inputBg}>
                                <TextInput
                                    value={form.next_due}
                                    onChangeText={(t) => setForm((f) => ({ ...f, next_due: t }))}
                                    placeholder="2025-01-15"
                                    placeholderTextColor={labelColor}
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                />
                            </FormField>

                            {/* Category */}
                            <FormField label="Categoria (opcional)" labelColor={labelColor} borderColor={borderColor} inputBg={inputBg}>
                                <TextInput
                                    value={form.category}
                                    onChangeText={(t) => setForm((f) => ({ ...f, category: t }))}
                                    placeholder="Ex: Streaming"
                                    placeholderTextColor={labelColor}
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                />
                            </FormField>

                            {/* Color */}
                            <FormField label="Cor (hex, opcional)" labelColor={labelColor} borderColor={borderColor} inputBg={inputBg}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14 }}>
                                    {form.color ? (
                                        <View
                                            style={{
                                                width: 18, height: 18, borderRadius: 9,
                                                backgroundColor: form.color,
                                                marginRight: 8,
                                            }}
                                        />
                                    ) : null}
                                    <TextInput
                                        value={form.color}
                                        onChangeText={(t) => setForm((f) => ({ ...f, color: t }))}
                                        placeholder="#6366f1"
                                        placeholderTextColor={labelColor}
                                        style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingRight: 14 }}
                                    />
                                </View>
                            </FormField>

                            {/* Account/card selector */}
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
                                    Conta / Cartão (opcional)
                                </Text>
                                <ScrollView
                                    horizontal showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 8 }}
                                >
                                    <TouchableOpacity
                                        onPress={() => setForm((f) => ({ ...f, bank_account_id: '', credit_card_id: '' }))}
                                        style={{
                                            paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                                            borderWidth: 1.5,
                                            borderColor: !form.bank_account_id && !form.credit_card_id ? '#6366f1' : borderColor,
                                            backgroundColor: !form.bank_account_id && !form.credit_card_id ? '#6366f120' : inputBg,
                                        }}
                                    >
                                        <Text style={{ color: !form.bank_account_id && !form.credit_card_id ? '#6366f1' : textColor, fontSize: 12 }}>
                                            Nenhum
                                        </Text>
                                    </TouchableOpacity>
                                    {accounts.map((acc) => {
                                        const selected = form.bank_account_id === String(acc.id);
                                        const color = acc.color ?? '#6366f1';
                                        return (
                                            <TouchableOpacity
                                                key={`acc-${acc.id}`}
                                                onPress={() => setForm((f) => ({ ...f, bank_account_id: String(acc.id), credit_card_id: '' }))}
                                                style={{
                                                    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                                                    borderWidth: 1.5,
                                                    borderColor: selected ? color : borderColor,
                                                    backgroundColor: selected ? color + '22' : inputBg,
                                                }}
                                            >
                                                <Text style={{ color: selected ? color : textColor, fontSize: 12 }}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {creditCards.map((card) => {
                                        const selected = form.credit_card_id === String(card.id);
                                        const color = card.color ?? '#6366f1';
                                        return (
                                            <TouchableOpacity
                                                key={`card-${card.id}`}
                                                onPress={() => setForm((f) => ({ ...f, credit_card_id: String(card.id), bank_account_id: '' }))}
                                                style={{
                                                    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                                                    borderWidth: 1.5,
                                                    borderColor: selected ? color : borderColor,
                                                    backgroundColor: selected ? color + '22' : inputBg,
                                                }}
                                            >
                                                <Text style={{ color: selected ? color : textColor, fontSize: 12 }}>
                                                    {card.name} (cartão)
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Save button */}
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.85}
                                style={{
                                    backgroundColor: '#6366f1',
                                    borderRadius: 12, paddingVertical: 15,
                                    alignItems: 'center', marginTop: 8,
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                        {editing ? 'Salvar alterações' : 'Cadastrar assinatura'}
                                    </Text>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Dialog ── */}
            <AppDialog
                {...dialog}
                onClose={closeDialog}
                isDark={isDark}
                textColor={textColor}
                bgCard={bgCard}
                labelColor={labelColor}
            />
        </View>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface MetricCardProps {
    label: string;
    value: string;
    color: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    bgCard: string;
    textColor: string;
    labelColor: string;
}

function MetricCard({ label, value, color, icon, bgCard, textColor, labelColor }: MetricCardProps) {
    return (
        <View
            style={{
                flex: 1, backgroundColor: bgCard, borderRadius: 12, padding: 10,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
            }}
        >
            <View
                style={{
                    width: 26, height: 26, borderRadius: 13,
                    backgroundColor: color + '22',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                }}
            >
                <Feather name={icon} size={12} color={color} />
            </View>
            <Text style={{ color, fontSize: 13, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>
                {value}
            </Text>
            <Text style={{ color: labelColor, fontSize: 10, lineHeight: 13 }}>{label}</Text>
        </View>
    );
}

interface FormFieldProps {
    label: string;
    children: React.ReactNode;
    labelColor: string;
    borderColor: string;
    inputBg: string;
}

function FormField({ label, children, labelColor, borderColor, inputBg }: FormFieldProps) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>{label}</Text>
            <View style={{ backgroundColor: inputBg, borderRadius: 10, borderWidth: 1, borderColor }}>
                {children}
            </View>
        </View>
    );
}

// ── AppDialog ────────────────────────────────────────────────────────────────

interface AppDialogProps extends DialogConfig {
    onClose: () => void;
    isDark: boolean;
    textColor: string;
    bgCard: string;
    labelColor: string;
}

function AppDialog({
    visible, type, title, message,
    confirmText = 'OK', onClose, onConfirm,
    isDark, textColor, bgCard, labelColor,
}: AppDialogProps) {
    const overlayBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
    const iconName: React.ComponentProps<typeof Feather>['name'] =
        type === 'error' ? 'alert-circle' : type === 'danger' ? 'trash-2' : 'info';
    const iconColor = type === 'info' ? '#3b82f6' : '#ef4444';
    const iconBg = type === 'info'
        ? (isDark ? '#1e3a5f' : '#dbeafe')
        : (isDark ? '#4c1f1f' : '#fee2e2');

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={type !== 'danger' ? onClose : undefined}
                style={{
                    flex: 1, backgroundColor: overlayBg,
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
                }}
            >
                <View
                    onStartShouldSetResponder={() => true}
                    style={{ backgroundColor: bgCard, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' }}
                >
                    <View
                        style={{
                            width: 64, height: 64, borderRadius: 32,
                            backgroundColor: iconBg,
                            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                        }}
                    >
                        <Feather name={iconName} size={28} color={iconColor} />
                    </View>
                    <Text style={{ color: textColor, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                        {title}
                    </Text>
                    <Text style={{ color: labelColor, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                        {message}
                    </Text>

                    {type === 'danger' ? (
                        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                            <TouchableOpacity
                                onPress={onClose}
                                style={{
                                    flex: 1, paddingVertical: 13, borderRadius: 12,
                                    backgroundColor: isDark ? '#252d45' : '#f3f4f6',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: textColor, fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { onClose(); onConfirm?.(); }}
                                style={{
                                    flex: 1, paddingVertical: 13, borderRadius: 12,
                                    backgroundColor: '#ef4444', alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                    {confirmText}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                width: '100%', paddingVertical: 13, borderRadius: 12,
                                backgroundColor: '#6366f1', alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{confirmText}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );
}
