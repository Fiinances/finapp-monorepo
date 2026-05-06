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

import { useInstallments } from '@/hooks/useInstallments';
import type { InstallmentGroup } from '@/types';

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
    credit_card_id: string;
    description: string;
    total_amount: string;
    installments: string;
    first_billing_month: string;
    category: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_YEAR_REGEX = /^(0[1-9]|1[0-2])\/\d{4}$/;

const EMPTY_FORM: FormState = {
    credit_card_id: '',
    description: '',
    total_amount: '',
    installments: '',
    first_billing_month: '',
    category: '',
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

/** Add N months to a MM/YYYY string */
function addMonths(monthYear: string, n: number): string {
    if (!MONTH_YEAR_REGEX.test(monthYear)) return monthYear;
    const [m, y] = monthYear.split('/').map(Number);
    const date = new Date(y, m - 1 + n, 1);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = date.getFullYear();
    return `${mm}/${yy}`;
}

function lastBillingMonth(firstBillingMonth: string, n: number): string {
    return addMonths(firstBillingMonth, n - 1);
}

/** Check if MM/YYYY is in the future (after current month) */
function isInFuture(monthYear: string): boolean {
    if (!MONTH_YEAR_REGEX.test(monthYear)) return false;
    const now = new Date();
    const currentMY = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    return monthYear > currentMY;
}

/** useSwipeToDismiss – pan gesture to close bottom sheet */
function useSwipeToDismiss(onClose: () => void) {
    const translateY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
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

export function InstallmentsScreen() {
    const { openMenu } = useSideMenu();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const inputBg = isDark ? '#252d45' : '#f9fafb';

    const { groups, creditCards, loading, error, refetch, insertGroup, updateGroup, deleteGroup } =
        useInstallments();

    // ── Form / sheet state ─────────────────────────────────────────────
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<InstallmentGroup | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [dialog, setDialog] = useState<DialogConfig>({ visible: false, type: 'info', title: '', message: '' });

    const { translateY, panHandlers, resetTranslate } = useSwipeToDismiss(() => closeSheet());

    // ── Metrics ────────────────────────────────────────────────────────
    const activeGroups = groups.filter((g) => (g.real_remaining_installments ?? 0) > 0);
    const totalOpen = groups.reduce((sum, g) => {
        const perInstallment = g.total_amount / g.installments;
        return sum + (g.real_remaining_installments ?? 0) * perInstallment;
    }, 0);

    // ── Dialog helpers ─────────────────────────────────────────────────
    const showDialog = (cfg: Omit<DialogConfig, 'visible'>) =>
        setDialog({ visible: true, ...cfg });
    const closeDialog = () => setDialog((d) => ({ ...d, visible: false }));

    // ── Sheet open/close ───────────────────────────────────────────────
    const openSheet = (group?: InstallmentGroup) => {
        if (group) {
            setEditing(group);
            setForm({
                credit_card_id: String(group.credit_card_id),
                description: group.description,
                total_amount: group.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                installments: String(group.installments),
                first_billing_month: group.first_billing_month,
                category: group.category ?? '',
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
        if (!form.credit_card_id) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'Selecione um cartão de crédito.' });
            return;
        }
        if (!form.description.trim()) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'Informe a descrição do parcelamento.' });
            return;
        }
        const totalAmount = parseBRL(form.total_amount);
        if (totalAmount <= 0) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'O valor total deve ser maior que zero.' });
            return;
        }
        const nInstallments = parseInt(form.installments, 10);
        if (!nInstallments || nInstallments < 2) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'O número de parcelas deve ser no mínimo 2.' });
            return;
        }
        if (nInstallments > 60) {
            showDialog({ type: 'info', title: 'Campo inválido', message: 'O número máximo de parcelas é 60.' });
            return;
        }
        if (!MONTH_YEAR_REGEX.test(form.first_billing_month)) {
            showDialog({ type: 'info', title: 'Formato inválido', message: 'Mês da 1ª parcela deve estar no formato MM/AAAA.' });
            return;
        }
        if (isInFuture(form.first_billing_month)) {
            showDialog({ type: 'info', title: 'Data inválida', message: 'A data da 1ª parcela não pode ser no futuro.' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                credit_card_id: Number(form.credit_card_id),
                description: form.description.trim(),
                total_amount: totalAmount,
                installments: nInstallments,
                first_billing_month: form.first_billing_month,
                category: form.category.trim() || null,
            };

            if (editing) {
                await updateGroup(editing.id, payload);
            } else {
                await insertGroup(payload);
            }
            closeSheet();
        } catch (err: unknown) {
            showDialog({
                type: 'error',
                title: 'Erro ao salvar',
                message: err instanceof Error ? err.message : 'Não foi possível salvar o parcelamento.',
            });
        } finally {
            setSaving(false);
        }
    }, [form, editing, insertGroup, updateGroup]);

    // ── Delete ─────────────────────────────────────────────────────────
    const handleDelete = (group: InstallmentGroup) => {
        showDialog({
            type: 'danger',
            title: 'Excluir parcelamento',
            message: `Tem certeza que deseja excluir "${group.description}"? As transações vinculadas não serão excluídas.`,
            confirmText: 'Excluir',
            onConfirm: async () => {
                try {
                    await deleteGroup(group.id);
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

    // ── Render list item ───────────────────────────────────────────────
    const renderItem = ({ item }: { item: InstallmentGroup }) => {
        const card = creditCards.find((c) => c.id === item.credit_card_id);
        const cardColor = card?.color ?? '#6366f1';
        const perInstallment = item.total_amount / item.installments;
        const paid = item.real_paid_installments ?? 0;
        const remaining = item.real_remaining_installments ?? 0;
        const progress = item.installments > 0 ? paid / item.installments : 0;
        const isPaidOff = remaining === 0;
        const lastMonth = lastBillingMonth(item.first_billing_month, item.installments);

        return (
            <View
                style={{
                    backgroundColor: bgCard,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    opacity: isPaidOff ? 0.5 : 1,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                }}
            >
                {/* Row 1: icon + description + actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View
                        style={{
                            width: 38, height: 38, borderRadius: 19,
                            backgroundColor: cardColor + '22',
                            alignItems: 'center', justifyContent: 'center',
                            marginRight: 10,
                        }}
                    >
                        <Feather name="repeat" size={18} color={cardColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {item.description}
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>
                            {card?.name ?? 'Cartão desconhecido'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => openSheet(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 4 }}
                    >
                        <Feather name="edit-2" size={16} color={labelColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 12 }}
                    >
                        <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                {/* Row 2: progress bar */}
                <View style={{ marginBottom: 8 }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: borderColor, overflow: 'hidden' }}>
                        <View
                            style={{
                                height: 6,
                                width: `${Math.round(progress * 100)}%`,
                                borderRadius: 3,
                                backgroundColor: isPaidOff ? '#22c55e' : cardColor,
                            }}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ color: labelColor, fontSize: 11 }}>
                            {paid}/{item.installments} parcelas
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 11 }}>
                            {Math.round(progress * 100)}%
                        </Text>
                    </View>
                </View>

                {/* Row 3: amounts + dates */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                        <Text style={{ color: labelColor, fontSize: 11 }}>
                            {item.installments}x de {formatBRL(perInstallment)}
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 11, marginTop: 2 }}>
                            {item.first_billing_month} → {lastMonth}
                        </Text>
                    </View>
                    {isPaidOff ? (
                        <View style={{ backgroundColor: '#dcfce7', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 }}>
                            <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '600' }}>Quitado</Text>
                        </View>
                    ) : (
                        <View>
                            <Text style={{ color: textColor, fontSize: 14, fontWeight: '700', textAlign: 'right' }}>
                                {formatBRL(remaining * perInstallment)}
                            </Text>
                            <Text style={{ color: labelColor, fontSize: 11, textAlign: 'right' }}>em aberto</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // ── Render ─────────────────────────────────────────────────────────
    const totalAmount = form.total_amount ? parseBRL(form.total_amount) : 0;
    const nInstallments = parseInt(form.installments, 10);
    const previewValid = totalAmount > 0 && nInstallments >= 2;

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 20, paddingVertical: 16,
                    }}
                >
                    <TouchableOpacity
                        onPress={openMenu}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ marginRight: 12 }}
                    >
                        <Feather name="menu" size={22} color={textColor} />
                    </TouchableOpacity>
                    <Text style={{ color: textColor, fontSize: 20, fontWeight: '700', flex: 1 }}>
                        Parcelamentos
                    </Text>
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

                {/* Metric cards */}
                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 }}>
                    <MetricCard
                        label="Total em aberto" value={formatBRL(totalOpen)}
                        color="#ef4444" bgCard={bgCard} textColor={textColor} labelColor={labelColor}
                    />
                    <MetricCard
                        label="Ativos" value={String(activeGroups.length)}
                        color="#6366f1" bgCard={bgCard} textColor={textColor} labelColor={labelColor}
                    />
                    <MetricCard
                        label="Cadastrados" value={String(groups.length)}
                        color="#9ca3af" bgCard={bgCard} textColor={textColor} labelColor={labelColor}
                    />
                </View>

                {loading && !groups.length ? (
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
                        data={groups}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
                                <View
                                    style={{
                                        width: 72, height: 72, borderRadius: 36,
                                        backgroundColor: isDark ? '#1e2540' : '#f0f0ff',
                                        alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 16,
                                    }}
                                >
                                    <Feather name="repeat" size={30} color="#6366f1" />
                                </View>
                                <Text style={{ color: textColor, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                                    Nenhum parcelamento
                                </Text>
                                <Text style={{ color: labelColor, fontSize: 13, textAlign: 'center' }}>
                                    Toque em + para cadastrar um parcelamento.
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
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={closeSheet}
                    />
                    <Animated.View
                        style={{
                            backgroundColor: bgCard,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            maxHeight: '92%',
                            transform: [{ translateY }],
                        }}
                    >
                        {/* Drag handle */}
                        <View {...panHandlers} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: borderColor }} />
                        </View>

                        {/* Sheet header */}
                        <View
                            style={{
                                flexDirection: 'row', alignItems: 'center',
                                paddingHorizontal: 20, paddingVertical: 12,
                            }}
                        >
                            <Text style={{ color: textColor, fontSize: 17, fontWeight: '700', flex: 1 }}>
                                {editing ? 'Editar parcelamento' : 'Novo parcelamento'}
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
                            {/* Credit card selector */}
                            <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
                                Cartão de crédito *
                            </Text>
                            <ScrollView
                                horizontal showsHorizontalScrollIndicator={false}
                                style={{ marginBottom: 14 }}
                                contentContainerStyle={{ gap: 8 }}
                            >
                                {creditCards.map((card) => {
                                    const selected = form.credit_card_id === String(card.id);
                                    return (
                                        <TouchableOpacity
                                            key={card.id}
                                            onPress={() => setForm((f) => ({ ...f, credit_card_id: String(card.id) }))}
                                            style={{
                                                paddingVertical: 8, paddingHorizontal: 14,
                                                borderRadius: 20,
                                                backgroundColor: selected ? (card.color ?? '#6366f1') : inputBg,
                                                borderWidth: 1.5,
                                                borderColor: selected ? (card.color ?? '#6366f1') : borderColor,
                                            }}
                                        >
                                            <Text style={{ color: selected ? '#fff' : textColor, fontSize: 13, fontWeight: '500' }}>
                                                {card.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                                {creditCards.length === 0 && (
                                    <Text style={{ color: labelColor, fontSize: 13, paddingVertical: 8 }}>
                                        Nenhum cartão cadastrado.
                                    </Text>
                                )}
                            </ScrollView>

                            {/* Description */}
                            <FormField label="Descrição *" isDark={isDark} labelColor={labelColor} textColor={textColor} borderColor={borderColor} inputBg={inputBg}>
                                <TextInput
                                    value={form.description}
                                    onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                                    placeholder="Ex: iPhone 15 Pro"
                                    placeholderTextColor={labelColor}
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                />
                            </FormField>

                            {/* Total amount + installments row */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Valor total *</Text>
                                    <View style={{ backgroundColor: inputBg, borderRadius: 10, borderWidth: 1, borderColor }}>
                                        <TextInput
                                            value={form.total_amount}
                                            onChangeText={(t) => setForm((f) => ({ ...f, total_amount: currencyMask(t) }))}
                                            placeholder="0,00"
                                            placeholderTextColor={labelColor}
                                            keyboardType="numeric"
                                            style={{ color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                        />
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: labelColor, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Parcelas *</Text>
                                    <View style={{ backgroundColor: inputBg, borderRadius: 10, borderWidth: 1, borderColor }}>
                                        <TextInput
                                            value={form.installments}
                                            onChangeText={(t) => setForm((f) => ({ ...f, installments: t.replace(/\D/g, '') }))}
                                            placeholder="12"
                                            placeholderTextColor={labelColor}
                                            keyboardType="number-pad"
                                            style={{ color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Preview */}
                            {previewValid && (
                                <View
                                    style={{
                                        backgroundColor: isDark ? '#1e2540' : '#f0f0ff',
                                        borderRadius: 10, padding: 12, marginBottom: 14,
                                        flexDirection: 'row', alignItems: 'center', gap: 8,
                                    }}
                                >
                                    <Feather name="info" size={14} color="#6366f1" />
                                    <Text style={{ color: '#6366f1', fontSize: 13 }}>
                                        {nInstallments}x de {formatBRL(totalAmount / nInstallments)} por mês
                                    </Text>
                                </View>
                            )}

                            {/* First billing month */}
                            <FormField label="Mês da 1ª parcela * (MM/AAAA)" isDark={isDark} labelColor={labelColor} textColor={textColor} borderColor={borderColor} inputBg={inputBg}>
                                <TextInput
                                    value={form.first_billing_month}
                                    onChangeText={(t) => setForm((f) => ({ ...f, first_billing_month: t }))}
                                    placeholder="01/2024"
                                    placeholderTextColor={labelColor}
                                    keyboardType="numeric"
                                    maxLength={7}
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                />
                            </FormField>

                            {/* Category */}
                            <FormField label="Categoria (opcional)" isDark={isDark} labelColor={labelColor} textColor={textColor} borderColor={borderColor} inputBg={inputBg}>
                                <TextInput
                                    value={form.category}
                                    onChangeText={(t) => setForm((f) => ({ ...f, category: t }))}
                                    placeholder="Ex: Eletrônicos"
                                    placeholderTextColor={labelColor}
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14 }}
                                />
                            </FormField>

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
                                        {editing ? 'Salvar alterações' : 'Cadastrar parcelamento'}
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
    bgCard: string;
    textColor: string;
    labelColor: string;
}

function MetricCard({ label, value, color, bgCard, textColor, labelColor }: MetricCardProps) {
    return (
        <View
            style={{
                flex: 1, backgroundColor: bgCard, borderRadius: 12, padding: 12,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
            }}
        >
            <View
                style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: color + '22',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 6,
                }}
            >
                <Feather name="repeat" size={13} color={color} />
            </View>
            <Text style={{ color, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>{value}</Text>
            <Text style={{ color: labelColor, fontSize: 10, lineHeight: 13 }}>{label}</Text>
        </View>
    );
}

interface FormFieldProps {
    label: string;
    children: React.ReactNode;
    isDark: boolean;
    labelColor: string;
    textColor: string;
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
