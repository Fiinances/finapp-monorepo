import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Category, TransactionType } from '@/types';
import { TransactionFilters } from '@/hooks/useTransactionFilters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    visible: boolean;
    filters: TransactionFilters;
    categories: Category[];
    onApply: (filters: TransactionFilters) => void;
    onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Card_payment and credit_card types removed — those live in the Bills screen
const TYPES: { value: TransactionType; label: string; icon: string }[] = [
    { value: 'income', label: 'Entrada', icon: 'arrow-down-left' },
    { value: 'expense', label: 'Saída', icon: 'arrow-up-right' },
    { value: 'transfer', label: 'Transf.', icon: 'repeat' },
    { value: 'investment', label: 'Invest.', icon: 'trending-up' },
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
    const insets = useSafeAreaInsets();
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const bgSheet = isDark ? '#111827' : '#ffffff';
    const bgInput = isDark ? '#1e2433' : '#f3f4f6';
    const pillActiveBg = '#6366f1';
    const borderColor = isDark ? '#1e2433' : '#e5e7eb';
    const handleColor = isDark ? '#374151' : '#d1d5db';
    const accent = '#6366f1';

    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;

    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) slideAnim.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 80 || gs.vy > 0.4) {
                    Animated.timing(slideAnim, {
                        toValue: SHEET_H,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => onCloseRef.current());
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        damping: 24,
                        stiffness: 200,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // local draft state (only committed on Apply)
    const [draft, setDraft] = useState<TransactionFilters>(filters);

    // Category autocomplete state
    const [catQuery, setCatQuery] = useState('');
    const [catOpen, setCatOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            setDraft(filters);
            setCatQuery('');
            setCatOpen(false);
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
        setCatQuery('');
        setCatOpen(false);
    }

    function toggleType(type: TransactionType) {
        setDraft((d) => {
            const exists = d.types.includes(type);
            return { ...d, types: exists ? d.types.filter((t) => t !== type) : [...d.types, type] };
        });
    }

    function selectCategory(id: number | 'uncategorized') {
        setDraft((d) => {
            if (d.categoryIds.includes(id)) return d; // already selected
            return { ...d, categoryIds: [...d.categoryIds, id] };
        });
        setCatQuery('');
        setCatOpen(false);
    }

    function removeCategory(id: number | 'uncategorized') {
        setDraft((d) => ({ ...d, categoryIds: d.categoryIds.filter((c) => c !== id) }));
    }

    const maxMonth = currentMonthYear();
    const displayMonth = draft.month ?? currentMonthYear();
    const isAtMax = displayMonth >= maxMonth;

    // Filtered category suggestions (exclude already selected)
    const catFiltered = categories.filter((c) => {
        const matchesQuery = catQuery.trim()
            ? c.name.toLowerCase().includes(catQuery.trim().toLowerCase())
            : true;
        const notSelected = !draft.categoryIds.includes(c.id);
        return matchesQuery && notSelected;
    });

    const uncategorizedSelected = draft.categoryIds.includes('uncategorized');

    // Resolve display name for a selected categoryId
    function getCatLabel(id: number | 'uncategorized'): string {
        if (id === 'uncategorized') return 'Sem categoria';
        return categories.find((c) => c.id === id)?.name ?? `#${id}`;
    }

    function getCatColor(id: number | 'uncategorized'): string {
        if (id === 'uncategorized') return labelColor;
        return categories.find((c) => c.id === id)?.color ?? accent;
    }

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
                {/* Drag handle — swipe down to close */}
                <View
                    {...panResponder.panHandlers}
                    style={{ alignItems: 'center', paddingVertical: 14 }}
                >
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
                        <Text style={{ color: accent, fontSize: 14, fontWeight: '600' }}>Limpar tudo</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Mês ── */}
                    <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Mês
                    </Text>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: bgInput,
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
                                        backgroundColor: active ? pillActiveBg : bgInput,
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

                    {/* ── Categoria (autocomplete) ── */}
                    {categories.length > 0 && (
                        <>
                            <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Categoria
                            </Text>

                            {/* Selected category chips */}
                            {draft.categoryIds.length > 0 && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                    {draft.categoryIds.map((id) => (
                                        <TouchableOpacity
                                            key={id}
                                            onPress={() => removeCategory(id)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 6,
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 20,
                                                backgroundColor: `${getCatColor(id)}22`,
                                                borderWidth: 1,
                                                borderColor: getCatColor(id),
                                            }}
                                        >
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getCatColor(id) }} />
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: getCatColor(id) }}>
                                                {getCatLabel(id)}
                                            </Text>
                                            <Feather name="x" size={11} color={getCatColor(id)} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Autocomplete input */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: bgInput,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                borderWidth: 1.5,
                                borderColor: catOpen ? accent : 'transparent',
                                marginBottom: catOpen ? 0 : 20,
                            }}>
                                <Feather name="search" size={15} color={labelColor} />
                                <TextInput
                                    value={catQuery}
                                    onChangeText={(v) => { setCatQuery(v); setCatOpen(true); }}
                                    onFocus={() => setCatOpen(true)}
                                    onBlur={() => setTimeout(() => setCatOpen(false), 150)}
                                    placeholder="Buscar categoria..."
                                    placeholderTextColor={labelColor}
                                    style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 11, marginLeft: 8 }}
                                />
                                {catQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => { setCatQuery(''); setCatOpen(true); }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Feather name="x" size={15} color={labelColor} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Dropdown suggestions */}
                            {catOpen && (
                                <View style={{
                                    backgroundColor: isDark ? '#1e2433' : '#f9fafb',
                                    borderRadius: 12,
                                    marginTop: 4,
                                    marginBottom: 20,
                                    overflow: 'hidden',
                                    borderWidth: 1,
                                    borderColor: borderColor,
                                }}>
                                    {/* "Sem categoria" option */}
                                    {!uncategorizedSelected && (catQuery.trim() === '' || 'sem categoria'.includes(catQuery.toLowerCase())) && (
                                        <TouchableOpacity
                                            onPress={() => selectCategory('uncategorized')}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingHorizontal: 14,
                                                paddingVertical: 11,
                                                borderBottomWidth: catFiltered.length > 0 ? 1 : 0,
                                                borderBottomColor: borderColor,
                                            }}
                                        >
                                            <Feather name="slash" size={14} color={labelColor} />
                                            <Text style={{ fontSize: 14, color: labelColor }}>Sem categoria</Text>
                                        </TouchableOpacity>
                                    )}

                                    {catFiltered.map((cat, idx) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => selectCategory(cat.id)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingHorizontal: 14,
                                                paddingVertical: 11,
                                                borderBottomWidth: idx < catFiltered.length - 1 ? 1 : 0,
                                                borderBottomColor: borderColor,
                                            }}
                                        >
                                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color ?? accent }} />
                                            <Text style={{ flex: 1, fontSize: 14, color: textColor }}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    ))}

                                    {catFiltered.length === 0 && uncategorizedSelected && catQuery.trim().length > 0 && (
                                        <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                                            <Text style={{ fontSize: 14, color: labelColor }}>Nenhuma categoria encontrada</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>

                {/* Apply button — absolute at bottom */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 16,
                    paddingBottom: Math.max(insets.bottom, 16) + 12,
                    backgroundColor: bgSheet,
                    borderTopWidth: 1,
                    borderTopColor: borderColor,
                }}>
                    <TouchableOpacity
                        onPress={handleApply}
                        style={{
                            backgroundColor: accent,
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
