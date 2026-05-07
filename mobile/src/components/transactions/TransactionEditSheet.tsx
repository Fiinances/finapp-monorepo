import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Category, Transaction, TransactionType } from '@/types';
import { TYPE_COLORS, TYPE_LABELS } from '@/utils/transactions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionPatch {
    description: string;
    amount: number;
    type: TransactionType;
    date: string;       // YYYY-MM-DD
    category_id: number | null;
}

interface Props {
    visible: boolean;
    transaction: Transaction | null;
    categories: Category[];
    saving?: boolean;
    deleting?: boolean;
    onSave: (id: number, patch: TransactionPatch) => Promise<void>;
    onDelete?: (id: number) => Promise<void>;
    onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES: { value: TransactionType; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { value: 'income', icon: 'arrow-down-left' },
    { value: 'expense', icon: 'arrow-up-right' },
    { value: 'transfer', icon: 'repeat' },
    { value: 'investment', icon: 'trending-up' },
    { value: 'card_payment', icon: 'credit-card' },
];

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.88;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD → DD/MM/YYYY */
function isoToBR(iso: string): string {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** DD/MM/YYYY → YYYY-MM-DD. Returns null when invalid. */
function brToISO(br: string): string | null {
    const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    if (isNaN(date.getTime())) return null;
    return `${y}-${mo}-${d}`;
}

/** number → "1.234,56" (input display, no R$ prefix) */
function toInputAmount(value: number): string {
    return Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1.234,56" or "1234.56" → number */
function parseInputAmount(raw: string): number | null {
    // Accept both pt-BR (1.234,56) and plain (1234.56)
    const cleaned = raw.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) || n < 0 ? null : n;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionEditSheet({ visible, transaction, categories, saving = false, deleting = false, onSave, onDelete, onClose }: Props) {
    const isDark = useColorScheme() === 'dark';
    const insets = useSafeAreaInsets();

    // Theme tokens
    const bgSheet = isDark ? '#111827' : '#ffffff';
    const bgInput = isDark ? '#1e2433' : '#f3f4f6';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#1e2433' : '#e5e7eb';
    const handleColor = isDark ? '#374151' : '#d1d5db';
    const errorColor = '#ef4444';
    const accent = '#6366f1';

    // Draft state
    const [type, setType] = useState<TransactionType>('expense');
    const [description, setDesc] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [dateStr, setDateStr] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [errors, setErrors] = useState<Partial<Record<'description' | 'amount' | 'date', string>>>({});

    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;

    // Keep a stable ref to the close handler so the PanResponder closure is never stale
    const handleCloseRef = useRef(() => { Keyboard.dismiss(); onClose(); });
    useEffect(() => { handleCloseRef.current = () => { Keyboard.dismiss(); onClose(); }; }, [onClose]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) slideAnim.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 80 || gs.vy > 0.4) {
                    Keyboard.dismiss();
                    Animated.timing(slideAnim, {
                        toValue: SCREEN_H,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => handleCloseRef.current());
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

    // Sync draft when transaction changes
    useEffect(() => {
        if (transaction) {
            setType(transaction.type);
            setDesc(transaction.description);
            setAmountStr(toInputAmount(transaction.amount));
            setDateStr(isoToBR(transaction.date));
            setCategoryId(transaction.category_id ?? null);
            setErrors({});
        }
    }, [transaction]);

    // Slide animation
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                damping: 24,
                stiffness: 200,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_H,
                duration: 220,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    // Validate & save
    async function handleSave() {
        if (!transaction) return;
        const errs: typeof errors = {};

        const trimDesc = description.trim();
        if (!trimDesc) errs.description = 'Descrição obrigatória';

        const parsedAmount = parseInputAmount(amountStr);
        if (parsedAmount === null) errs.amount = 'Valor inválido (ex: 1.234,56)';

        const isoDate = brToISO(dateStr);
        if (!isoDate) errs.date = 'Data inválida (DD/MM/AAAA)';

        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }

        setErrors({});
        await onSave(transaction.id, {
            description: trimDesc,
            amount: parsedAmount!,
            type,
            date: isoDate!,
            category_id: categoryId,
        });
    }

    function handleClose() {
        Keyboard.dismiss();
        onClose();
    }

    function handleDelete() {
        if (!transaction || !onDelete) return;
        Alert.alert(
            'Excluir transação',
            `Deseja excluir "${transaction.description}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir', style: 'destructive', onPress: async () => {
                        try { await onDelete(transaction.id); }
                        catch (e) { Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir.'); }
                    },
                },
            ]
        );
    }

    const typeColor = TYPE_COLORS[type]?.light ?? accent;

    return (
        <Modal
            transparent
            animationType="none"
            visible={visible}
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            {/* Backdrop */}
            <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                onPress={handleClose}
            />

            {/* Sheet */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
            >
                <Animated.View
                    style={{
                        height: SHEET_H,
                        backgroundColor: bgSheet,
                        borderTopLeftRadius: 22,
                        borderTopRightRadius: 22,
                        transform: [{ translateY: slideAnim }],
                        overflow: 'hidden',
                    }}
                >
                    {/* Drag handle — swipe down to close */}
                    <View
                        {...panResponder.panHandlers}
                        style={{ alignItems: 'center', paddingVertical: 14 }}
                    >
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: handleColor }} />
                    </View>

                    {/* Header */}
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
                            Editar transação
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {onDelete && (
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    disabled={deleting || saving}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={{ opacity: deleting ? 0.5 : 1 }}
                                >
                                    <Feather name="trash-2" size={19} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather name="x" size={20} color={labelColor} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
                    >
                        {/* ── Tipo de transação ── */}
                        <Text style={styles.sectionLabel(labelColor)}>Tipo de transação</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                            style={{ marginBottom: 20 }}
                        >
                            {TYPES.map(({ value, icon }) => {
                                const active = type === value;
                                const color = TYPE_COLORS[value]?.light ?? accent;
                                return (
                                    <TouchableOpacity
                                        key={value}
                                        onPress={() => setType(value)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                            paddingHorizontal: 14,
                                            paddingVertical: 9,
                                            borderRadius: 12,
                                            backgroundColor: active ? `${color}22` : bgInput,
                                            borderWidth: 1.5,
                                            borderColor: active ? color : 'transparent',
                                        }}
                                    >
                                        <Feather name={icon} size={14} color={active ? color : labelColor} />
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: active ? '700' : '500',
                                            color: active ? color : labelColor,
                                        }}>
                                            {TYPE_LABELS[value]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* ── Descrição ── */}
                        <Text style={styles.sectionLabel(labelColor)}>Descrição</Text>
                        <TextInput
                            value={description}
                            onChangeText={(t) => { setDesc(t); setErrors((e) => ({ ...e, description: undefined })); }}
                            placeholder="Ex: Mercado, Netflix..."
                            placeholderTextColor={labelColor}
                            returnKeyType="next"
                            style={styles.input(isDark, bgInput, textColor, !!errors.description)}
                        />
                        {errors.description && (
                            <Text style={styles.errorText(errorColor)}>{errors.description}</Text>
                        )}

                        {/* ── Valor + Data (row) ── */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            {/* Valor */}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionLabel(labelColor)}>Valor (R$)</Text>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: bgInput,
                                    borderRadius: 12,
                                    borderWidth: 1.5,
                                    borderColor: errors.amount ? errorColor : 'transparent',
                                    paddingHorizontal: 12,
                                }}>
                                    <Text style={{ color: typeColor, fontWeight: '700', fontSize: 15, marginRight: 4 }}>
                                        R$
                                    </Text>
                                    <TextInput
                                        value={amountStr}
                                        onChangeText={(t) => { setAmountStr(t); setErrors((e) => ({ ...e, amount: undefined })); }}
                                        keyboardType="decimal-pad"
                                        placeholder="0,00"
                                        placeholderTextColor={labelColor}
                                        style={{
                                            flex: 1,
                                            fontSize: 16,
                                            fontWeight: '600',
                                            color: textColor,
                                            paddingVertical: 12,
                                        }}
                                    />
                                </View>
                                {errors.amount && (
                                    <Text style={styles.errorText(errorColor)}>{errors.amount}</Text>
                                )}
                            </View>

                            {/* Data */}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionLabel(labelColor)}>Data</Text>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: bgInput,
                                    borderRadius: 12,
                                    borderWidth: 1.5,
                                    borderColor: errors.date ? errorColor : 'transparent',
                                    paddingHorizontal: 12,
                                }}>
                                    <Feather name="calendar" size={14} color={labelColor} style={{ marginRight: 6 }} />
                                    <TextInput
                                        value={dateStr}
                                        onChangeText={(t) => { setDateStr(t); setErrors((e) => ({ ...e, date: undefined })); }}
                                        keyboardType="numeric"
                                        placeholder="DD/MM/AAAA"
                                        placeholderTextColor={labelColor}
                                        maxLength={10}
                                        style={{
                                            flex: 1,
                                            fontSize: 14,
                                            color: textColor,
                                            paddingVertical: 12,
                                        }}
                                    />
                                </View>
                                {errors.date && (
                                    <Text style={styles.errorText(errorColor)}>{errors.date}</Text>
                                )}
                            </View>
                        </View>

                        {/* ── Categoria ── */}
                        <Text style={[styles.sectionLabel(labelColor), { marginTop: 20 }]}>Categoria</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                        >
                            {/* Sem categoria */}
                            <TouchableOpacity
                                onPress={() => setCategoryId(null)}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: categoryId === null
                                        ? `${accent}20`
                                        : bgInput,
                                    borderWidth: 1.5,
                                    borderColor: categoryId === null ? accent : 'transparent',
                                }}
                            >
                                <Text style={{
                                    fontSize: 13,
                                    fontWeight: categoryId === null ? '700' : '500',
                                    color: categoryId === null ? accent : labelColor,
                                }}>
                                    Sem categoria
                                </Text>
                            </TouchableOpacity>

                            {categories.map((cat) => {
                                const active = categoryId === cat.id;
                                const chipColor = cat.color ?? accent;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => setCategoryId(cat.id)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 5,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            backgroundColor: active ? `${chipColor}22` : bgInput,
                                            borderWidth: 1.5,
                                            borderColor: active ? chipColor : 'transparent',
                                        }}
                                    >
                                        <View style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: chipColor,
                                        }} />
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: active ? '700' : '500',
                                            color: active ? chipColor : labelColor,
                                        }}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </ScrollView>

                    {/* ── Footer ── */}
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        paddingHorizontal: 16,
                        paddingBottom: insets.bottom + 16,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                        backgroundColor: bgSheet,
                        flexDirection: 'row',
                        gap: 10,
                    }}>
                        <TouchableOpacity
                            onPress={handleClose}
                            disabled={saving}
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 14,
                                backgroundColor: bgInput,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '600', color: labelColor }}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={{
                                flex: 2,
                                paddingVertical: 14,
                                borderRadius: 14,
                                backgroundColor: saving ? `${accent}80` : accent,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            {saving && (
                                <Feather name="loader" size={16} color="#ffffff" />
                            )}
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const styles = {
    sectionLabel: (color: string) => ({
        fontSize: 11,
        fontWeight: '600' as const,
        color,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.6,
        marginBottom: 8,
    }),
    input: (isDark: boolean, bg: string, textColor: string, hasError: boolean) => ({
        backgroundColor: bg,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: textColor,
        marginBottom: 4,
        borderWidth: 1.5,
        borderColor: hasError ? '#ef4444' : 'transparent',
    }),
    errorText: (color: string) => ({
        fontSize: 11,
        color,
        marginBottom: 12,
        marginLeft: 4,
    }),
};
