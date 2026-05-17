import DateTimePicker from '@react-native-community/datetimepicker';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    monthlyEquivalent,
    resolveAccountName,
    useSubscriptions,
} from '@/hooks/useSubscriptions';
import type { Subscription, SubscriptionPeriod } from '@/types';
import { AppHeader } from '@/components/ui';
import { SmartDetectSheet } from '@/components/smart-detect/SmartDetectSheet';
import { SmartCandidate } from '@/hooks/useSmartDetect';

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
    account_id: string;
    credit_card_id: string;
    active: boolean;
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
    account_id: '',
    credit_card_id: '',
    active: true,
};

const PERIOD_LABELS: Record<SubscriptionPeriod, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
};

const SUBSCRIPTION_COLORS = [
    '#6366f1', '#3b82f6', '#10b981', '#14b8a6',
    '#f59e0b', '#f97316', '#ef4444', '#8b5cf6',
];

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
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function dateToISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isoToDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function normalizeColorForDb(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
    return trimmed;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error && err.message) return err.message;
    if (err && typeof err === 'object' && 'message' in err) {
        const msg = (err as { message?: unknown }).message;
        if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return fallback;
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
    const insets = useSafeAreaInsets();

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
    const [detectSheetOpen, setDetectSheetOpen] = useState(false);
    const [showNextDuePicker, setShowNextDuePicker] = useState(false);
    const [dialog, setDialog] = useState<DialogConfig>({ visible: false, type: 'info', title: '', message: '' });
    const [pendingCandidate, setPendingCandidate] = useState<(() => void) | null>(null);

    const { translateY, panHandlers, resetTranslate } = useSwipeToDismiss(() => closeSheet());

    // ── Metrics ────────────────────────────────────────────────────────
    const active = subscriptions.filter((s) => s.active);
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
    const openSheet = (sub?: Subscription | null, prefill?: SmartCandidate, onSuccess?: () => void) => {
        if (onSuccess) setPendingCandidate(() => onSuccess);

        if (sub) {
            setEditing(sub);
            setForm({
                name: sub.name,
                amount: currencyMask(String(Math.round(sub.amount * 100))),
                type: sub.type,
                period: sub.period,
                next_due: sub.next_due ?? '',
                category: sub.category ?? '',
                color: sub.color ?? '',
                account_id: sub.account_id ? String(sub.account_id) : '',
                credit_card_id: sub.credit_card_id ? String(sub.credit_card_id) : '',
                active: sub.active,
            });
        } else if (prefill) {
            setEditing(null);
            setForm({
                name: prefill.displayName,
                amount: currencyMask(String(Math.round(prefill.amount * 100))),
                type: 'expense',
                period: prefill.interval,
                next_due: '',
                category: '',
                color: '',
                account_id: '',
                credit_card_id: '',
                active: true,
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
        setShowNextDuePicker(false);
        setPendingCandidate(null);
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
                color: normalizeColorForDb(form.color),
                account_id: form.account_id ? Number(form.account_id) : null,
                credit_card_id: form.credit_card_id ? Number(form.credit_card_id) : null,
                active: form.active,
            };

            if (editing) {
                await updateSubscription(editing.id, payload);
            } else {
                await insertSubscription(payload);
            }
            if (pendingCandidate) pendingCandidate();
            closeSheet();
        } catch (err: unknown) {
            showDialog({
                type: 'error',
                title: 'Erro ao salvar',
                message: extractErrorMessage(err, 'Não foi possível salvar a assinatura.'),
            });
        } finally {
            setSaving(false);
        }
    }, [form, editing, insertSubscription, updateSubscription, pendingCandidate]);

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
        console.log('rendering item', item.active);
        const isActive = item.active;
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
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setDetectSheetOpen(true)}
                                activeOpacity={0.8}
                                style={{
                                    height: 38, paddingHorizontal: 12, borderRadius: 19,
                                    backgroundColor: isDark ? '#1e2540' : '#e0e7ff',
                                    flexDirection: 'row', alignItems: 'center', gap: 6,
                                }}
                            >
                                <Feather name="search" size={16} color="#6366f1" />
                                <Text style={{ color: '#6366f1', fontSize: 13, fontWeight: '600' }}>Detectar</Text>
                            </TouchableOpacity>
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
                        </View>
                    }
                />

                {/* Metric cards */}
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginVertical: 16 }}>
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
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 + insets.bottom }}
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
                                    placeholder="R$ 0,00"
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
                            <FormField label="Próximo vencimento (DD/MM/YYYY)" labelColor={labelColor} borderColor={borderColor} inputBg={inputBg}>
                                <TouchableOpacity
                                    onPress={() => setShowNextDuePicker(true)}
                                    activeOpacity={0.8}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        paddingHorizontal: 14,
                                        gap: 8,
                                    }}
                                >
                                    <Feather name="calendar" size={15} color={labelColor} />
                                    <Text
                                        style={{
                                            flex: 1,
                                            color: form.next_due ? textColor : labelColor,
                                            fontSize: 14,
                                        }}
                                    >
                                        {form.next_due ? formatDate(form.next_due) : 'Selecionar data'}
                                    </Text>
                                    {form.next_due ? (
                                        <TouchableOpacity
                                            onPress={() => setForm((f) => ({ ...f, next_due: '' }))}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Feather name="x-circle" size={16} color={labelColor} />
                                        </TouchableOpacity>
                                    ) : null}
                                </TouchableOpacity>
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
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
                                    Cor (opcional)
                                </Text>

                                <ColorPicker
                                    selected={form.color}
                                    onSelect={(c) => setForm((f) => ({ ...f, color: c }))}
                                    borderColor={borderColor}
                                    inputBg={inputBg}
                                    isDark={isDark}
                                />
                            </View>

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
                                        onPress={() => setForm((f) => ({ ...f, account_id: '', credit_card_id: '' }))}
                                        style={{
                                            paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                                            borderWidth: 1.5,
                                            borderColor: !form.account_id && !form.credit_card_id ? '#6366f1' : borderColor,
                                            backgroundColor: !form.account_id && !form.credit_card_id ? '#6366f120' : inputBg,
                                        }}
                                    >
                                        <Text style={{ color: !form.account_id && !form.credit_card_id ? '#6366f1' : textColor, fontSize: 12 }}>
                                            Nenhum
                                        </Text>
                                    </TouchableOpacity>
                                    {accounts.map((acc) => {
                                        const selected = form.account_id === String(acc.id);
                                        const color = acc.color ?? '#6366f1';
                                        return (
                                            <TouchableOpacity
                                                key={`acc-${acc.id}`}
                                                onPress={() => setForm((f) => ({ ...f, account_id: String(acc.id), credit_card_id: '' }))}
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
                                                onPress={() => setForm((f) => ({ ...f, credit_card_id: String(card.id), account_id: '' }))}
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

            {Platform.OS === 'ios' && (
                <Modal transparent animationType="fade" visible={showNextDuePicker} statusBarTranslucent>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setShowNextDuePicker(false)}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => { }}
                            style={{ backgroundColor: bgCard, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 32 }}
                        >
                            <DateTimePicker
                                value={isoToDate(form.next_due) ?? new Date()}
                                mode="date"
                                display="spinner"
                                locale="pt-BR"
                                textColor={textColor}
                                onChange={(_, date) => {
                                    if (date) {
                                        setForm((f) => ({ ...f, next_due: dateToISO(date) }));
                                    }
                                }}
                                style={{ backgroundColor: bgCard }}
                            />
                            <TouchableOpacity
                                onPress={() => setShowNextDuePicker(false)}
                                style={{ marginHorizontal: 16, paddingVertical: 14, backgroundColor: '#6366f1', borderRadius: 14, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirmar</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            )}

            {showNextDuePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={isoToDate(form.next_due) ?? new Date()}
                    mode="date"
                    display="calendar"
                    onChange={(_, date) => {
                        setShowNextDuePicker(false);
                        if (date) {
                            setForm((f) => ({ ...f, next_due: dateToISO(date) }));
                        }
                    }}
                />
            )}

            <SmartDetectSheet
                visible={detectSheetOpen}
                onClose={() => setDetectSheetOpen(false)}
                mode="subscription"
                onPrefillSubscription={(c, onSuccess) => openSheet(null, c, onSuccess)}
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

function ColorPicker({
    selected,
    onSelect,
    borderColor,
    inputBg,
    isDark,
}: {
    selected: string;
    onSelect: (c: string) => void;
    borderColor: string;
    inputBg: string;
    isDark: boolean;
}) {
    return (
        <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <TouchableOpacity
                    onPress={() => onSelect('')}
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: inputBg,
                        borderWidth: selected ? 1 : 3,
                        borderColor: selected ? borderColor : '#6366f1',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Feather name="slash" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>

                {SUBSCRIPTION_COLORS.map((c) => (
                    <TouchableOpacity
                        key={c}
                        onPress={() => onSelect(c)}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: c,
                            borderWidth: selected.toLowerCase() === c ? 3 : 0,
                            borderColor: '#fff',
                            shadowColor: c,
                            shadowOpacity: selected.toLowerCase() === c ? 0.55 : 0,
                            shadowOffset: { width: 0, height: 2 },
                            shadowRadius: 4,
                            elevation: selected.toLowerCase() === c ? 4 : 0,
                        }}
                    />
                ))}
            </View>
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
