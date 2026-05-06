import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

import { Category, TransactionType } from '@/types';
import { ImportSource, TransactionFilters } from '@/hooks/useTransactionFilters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    visible: boolean;
    filters: TransactionFilters;
    categories: Category[];
    onApply: (filters: TransactionFilters) => void;
    onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES: { value: TransactionType; label: string; icon: string }[] = [
    { value: 'income', label: 'Entrada', icon: 'arrow-down-left' },
    { value: 'expense', label: 'Saída', icon: 'arrow-up-right' },
    { value: 'transfer', label: 'Transf.', icon: 'repeat' },
    { value: 'investment', label: 'Invest.', icon: 'trending-up' },
    { value: 'card_payment', label: 'Fatura', icon: 'credit-card' },
];

const ORIGINS: { value: ImportSource; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'bank_account', label: 'Conta' },
    { value: 'credit_card', label: 'Cartão' },
    { value: 'manual', label: 'Manual' },
];

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.88;

// ─── Month helpers ────────────────────────────────────────────────────────────

function addMonth(my: string, delta: 1 | -1): string {
    const [mStr, yStr] = my.split('/');
    let m = parseInt(mStr, 10) + delta;
    let y = parseInt(yStr, 10);
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    return `${String(m).padStart(2, '0')}/${y}`;
}

function currentMonthYear(): string {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function monthLabel(my: string): string {
    if (!my) return '';
    const [mStr, yStr] = my.split('/');
    const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionFilterSheet({ visible, filters, categories, onApply, onClose }: Props) {
    const isDark = useColorScheme() === 'dark';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const bgSheet = isDark ? '#111827' : '#ffffff';
    const pillBg = isDark ? '#1e2433' : '#f3f4f6';
    const pillActiveBg = '#6366f1';
    const borderColor = isDark ? '#1e2433' : '#e5e7eb';
    const handleColor = isDark ? '#374151' : '#d1d5db';

    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;

    // local draft state (only committed on Apply)
    const [draft, setDraft] = useState<TransactionFilters>(filters);

    useEffect(() => {
        if (visible) {
            setDraft(filters);
            Animated.spring(slideAnim, {
                toValue: 0,
                damping: 24,
                stiffness: 200,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SHEET_H,
                duration: 220,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleApply() {
        onApply(draft);
        onClose();
    }

    function handleClear() {
        const defaultMonth = currentMonthYear();
        setDraft({ month: defaultMonth, types: [], categoryIds: [], importSource: 'all' });
    }

    function toggleType(type: TransactionType) {
        setDraft((d) => {
            const exists = d.types.includes(type);
            return { ...d, types: exists ? d.types.filter((t) => t !== type) : [...d.types, type] };
        });
    }

    function toggleCategory(id: number | 'uncategorized') {
        setDraft((d) => {
            const exists = d.categoryIds.includes(id);
            return {
                ...d,
                categoryIds: exists ? d.categoryIds.filter((c) => c !== id) : [...d.categoryIds, id],
            };
        });
    }

    const maxMonth = currentMonthYear();
    const displayMonth = draft.month ?? currentMonthYear();
    const isAtMax = displayMonth >= maxMonth;

    return (
        <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
            {/* Backdrop */}
            <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
                activeOpacity={1}
                onPress={onClose}
            />

            {/* Sheet */}
            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: SHEET_H,
                    backgroundColor: bgSheet,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                {/* Drag handle */}
                <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: handleColor }} />
                </View>

                {/* Header row */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                }}>
                    <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>
                        Filtrar transações
                    </Text>
                    <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: '#6366f1', fontSize: 14, fontWeight: '600' }}>Limpar tudo</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Mês ── */}
                    <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Mês
                    </Text>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: pillBg,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginBottom: 20,
                    }}>
                        <TouchableOpacity
                            onPress={() => setDraft((d) => ({ ...d, month: addMonth(displayMonth, -1) }))}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Feather name="chevron-left" size={18} color={textColor} />
                        </TouchableOpacity>
                        <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }}>
                            {monthLabel(displayMonth)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => { if (!isAtMax) setDraft((d) => ({ ...d, month: addMonth(displayMonth, 1) })); }}
                            disabled={isAtMax}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ opacity: isAtMax ? 0.3 : 1 }}
                        >
                            <Feather name="chevron-right" size={18} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Tipo ── */}
                    <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Tipo de transação
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {TYPES.map(({ value, label, icon }) => {
                            const active = draft.types.includes(value);
                            return (
                                <TouchableOpacity
                                    key={value}
                                    onPress={() => toggleType(value)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        backgroundColor: active ? pillActiveBg : pillBg,
                                    }}
                                >
                                    <Feather name={icon as any} size={13} color={active ? '#ffffff' : labelColor} />
                                    <Text style={{ fontSize: 13, color: active ? '#ffffff' : textColor, fontWeight: active ? '600' : '400' }}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* ── Categoria ── */}
                    {categories.length > 0 && (
                        <>
                            <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Categoria
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                <TouchableOpacity
                                    onPress={() => toggleCategory('uncategorized')}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        backgroundColor: draft.categoryIds.includes('uncategorized') ? pillActiveBg : pillBg,
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 13,
                                        color: draft.categoryIds.includes('uncategorized') ? '#ffffff' : textColor,
                                        fontWeight: draft.categoryIds.includes('uncategorized') ? '600' : '400',
                                    }}>
                                        Sem categoria
                                    </Text>
                                </TouchableOpacity>
                                {categories.map((cat) => {
                                    const active = draft.categoryIds.includes(cat.id);
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => toggleCategory(cat.id)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 6,
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                backgroundColor: active ? (cat.color ?? pillActiveBg) : pillBg,
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, color: active ? '#ffffff' : textColor, fontWeight: active ? '600' : '400' }}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* ── Origem ── */}
                    <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Origem
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                        {ORIGINS.map(({ value, label }) => {
                            const active = draft.importSource === value;
                            return (
                                <TouchableOpacity
                                    key={value}
                                    onPress={() => setDraft((d) => ({ ...d, importSource: value }))}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        backgroundColor: active ? pillActiveBg : pillBg,
                                    }}
                                >
                                    <Text style={{ fontSize: 13, color: active ? '#ffffff' : textColor, fontWeight: active ? '600' : '400' }}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Apply button — absolute at bottom */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 16,
                    paddingBottom: 28,
                    backgroundColor: bgSheet,
                    borderTopWidth: 1,
                    borderTopColor: borderColor,
                }}>
                    <TouchableOpacity
                        onPress={handleApply}
                        style={{
                            backgroundColor: '#6366f1',
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                            Aplicar filtros
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}
