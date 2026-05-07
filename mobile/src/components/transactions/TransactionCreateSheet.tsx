import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import { BankAccount, Category, CreditCard, TransactionType } from '@/types';
import { TYPE_COLORS, TYPE_LABELS } from '@/utils/transactions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionCreate {
    description: string;
    amount: number;
    type: TransactionType;
    date: string;           // YYYY-MM-DD
    category_id: number | null;
    account_id: number | null;
    credit_card_id: number | null;
}

interface Props {
    visible: boolean;
    categories: Category[];
    accounts: BankAccount[];
    creditCards: CreditCard[];
    saving?: boolean;
    onSave: (data: TransactionCreate) => Promise<void>;
    onClose: () => void;
    onCreateCategory?: (name: string) => Promise<Category>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES: { value: TransactionType; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { value: 'expense', icon: 'arrow-up-right' },
    { value: 'income', icon: 'arrow-down-left' },
    { value: 'card_payment', icon: 'credit-card' },
    { value: 'transfer', icon: 'repeat' },
    { value: 'investment', icon: 'trending-up' },
];

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.92;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Date → YYYY-MM-DD */
function dateToISO(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
}

/** Date → DD/MM/YYYY */
function formatDateBR(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${mo}/${d.getFullYear()}`;
}

/** "1.234,56" or "1234.56" → number */
function parseInputAmount(raw: string): number | null {
    const cleaned = raw.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) || n < 0 ? null : n;
}

type LinkType = 'account' | 'card';

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionCreateSheet({
    visible,
    categories,
    accounts,
    creditCards,
    saving = false,
    onSave,
    onClose,
    onCreateCategory,
}: Props) {
    const isDark = useColorScheme() === 'dark';

    const insets = useSafeAreaInsets();

    // Theme tokens
    const bgSheet = isDark ? '#111827' : '#ffffff';
    const bgInput = isDark ? '#1e2433' : '#f3f4f6';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#1e2433' : '#e5e7eb';
    const handleColor = isDark ? '#374151' : '#d1d5db';
    const accent = '#6366f1';

    // Draft state
    const [type, setType] = useState<TransactionType>('expense');
    const [description, setDesc] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [linkType, setLinkType] = useState<LinkType>('account');
    const [accountId, setAccountId] = useState<number | null>(null);
    const [creditCardId, setCreditCardId] = useState<number | null>(null);
    const [errors, setErrors] = useState<Partial<Record<'description' | 'amount' | 'link', string>>>({});

    // Category autocomplete
    const [catQuery, setCatQuery] = useState('');
    const [catOpen, setCatOpen] = useState(false);
    const [createCatError, setCreateCatError] = useState('');
    const [creatingCat, setCreatingCat] = useState(false);

    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;

    const onCloseRef = useRef(() => { Keyboard.dismiss(); onClose(); });
    useEffect(() => { onCloseRef.current = () => { Keyboard.dismiss(); onClose(); }; }, [onClose]);

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

    // Reset state when sheet opens
    useEffect(() => {
        if (visible) {
            setType('expense');
            setDesc('');
            setAmountStr('');
            setSelectedDate(new Date());
            setShowDatePicker(false);
            setCategoryId(null);
            setLinkType('account');
            setAccountId(null);
            setCreditCardId(null);
            setErrors({});
            setCatQuery('');
            setCatOpen(false);
            setCreateCatError('');
        }
    }, [visible]);

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

    // When switching link type, clear the other selection
    useEffect(() => {
        if (linkType !== 'account') setAccountId(null);
        if (linkType !== 'card') setCreditCardId(null);
    }, [linkType]);

    async function handleCreateCategoryInline() {
        const name = catQuery.trim();
        if (!name || !onCreateCategory) return;
        setCreatingCat(true);
        setCreateCatError('');
        try {
            const created = await onCreateCategory(name);
            setCategoryId(created.id);
            setCatQuery('');
            setCatOpen(false);
        } catch (e) {
            setCreateCatError(e instanceof Error ? e.message : 'Erro ao criar categoria.');
        } finally {
            setCreatingCat(false);
        }
    }

    async function handleSave() {
        const errs: typeof errors = {};

        const trimDesc = description.trim();
        if (!trimDesc) errs.description = 'Descrição obrigatória';

        const parsedAmount = parseInputAmount(amountStr);
        if (parsedAmount === null) errs.amount = 'Informe um valor válido';

        if (linkType === 'account' && accountId === null) errs.link = 'Selecione uma conta';
        if (linkType === 'card' && creditCardId === null) errs.link = 'Selecione um cartão de crédito';

        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }

        setErrors({});
        await onSave({
            description: trimDesc,
            amount: parsedAmount!,
            type,
            date: dateToISO(selectedDate),
            category_id: categoryId,
            account_id: linkType === 'account' ? accountId : null,
            credit_card_id: linkType === 'card' ? creditCardId : null,
        });
    }

    function handleClose() {
        Keyboard.dismiss();
        onClose();
    }

    const typeColor = TYPE_COLORS[type]?.light ?? accent;

    const selectedCat = categories.find(c => c.id === categoryId) ?? null;
    const catFiltered = catQuery.trim()
        ? categories.filter(c => c.name.toLowerCase().includes(catQuery.trim().toLowerCase()))
        : categories;
    const catCanCreate = !!onCreateCategory && catQuery.trim().length > 0
        && !categories.some(c => c.name.toLowerCase() === catQuery.trim().toLowerCase());

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
                            Nova transação
                        </Text>
                        <TouchableOpacity
                            onPress={handleClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Feather name="x" size={20} color={labelColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
                    >
                        {/* ── Tipo de transação ── */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: labelColor, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Tipo de transação
                        </Text>
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
                                            fontWeight: '600',
                                            color: active ? color : labelColor,
                                        }}>
                                            {TYPE_LABELS[value]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* ── Descrição ── */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: labelColor, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Descrição
                        </Text>
                        <TextInput
                            value={description}
                            onChangeText={(v) => { setDesc(v); setErrors((e) => ({ ...e, description: undefined })); }}
                            placeholder="Ex: Supermercado, Salário..."
                            placeholderTextColor={labelColor}
                            style={{
                                backgroundColor: bgInput,
                                color: textColor,
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                                fontSize: 15,
                                marginBottom: errors.description ? 4 : 20,
                            }}
                        />
                        {errors.description && (
                            <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{errors.description}</Text>
                        )}

                        {/* ── Valor + Data ── */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: labelColor, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Valor (R$)
                                </Text>
                                <TextInput
                                    value={amountStr}
                                    onChangeText={(v) => {
                                        const digits = v.replace(/\D/g, '');
                                        setAmountStr(digits ? (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
                                        setErrors((e) => ({ ...e, amount: undefined }));
                                    }}
                                    placeholder="0,00"
                                    placeholderTextColor={labelColor}
                                    keyboardType="number-pad"
                                    style={{
                                        backgroundColor: bgInput,
                                        color: typeColor,
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        fontSize: 15,
                                        fontWeight: '700',
                                    }}
                                />
                                {errors.amount && (
                                    <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.amount}</Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: labelColor, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Data
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                        backgroundColor: bgInput,
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        paddingVertical: 13,
                                    }}
                                >
                                    <Feather name="calendar" size={15} color={labelColor} />
                                    <Text style={{ fontSize: 15, color: textColor }}>
                                        {formatDateBR(selectedDate)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── Categoria ── */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: labelColor, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Categoria
                        </Text>
                        <View style={{ marginBottom: 24 }}>
                            {selectedCat ? (
                                <TouchableOpacity
                                    onPress={() => { setCategoryId(null); setCatQuery(''); setCatOpen(true); }}
                                    activeOpacity={0.7}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 10,
                                        backgroundColor: bgInput,
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        borderWidth: 1.5,
                                        borderColor: selectedCat.color ?? accent,
                                    }}
                                >
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: selectedCat.color ?? accent }} />
                                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: selectedCat.color ?? accent }}>
                                        {selectedCat.name}
                                    </Text>
                                    <Feather name="x" size={16} color={labelColor} />
                                </TouchableOpacity>
                            ) : (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: bgInput,
                                    borderRadius: 12,
                                    paddingHorizontal: 14,
                                    borderWidth: 1.5,
                                    borderColor: catOpen ? accent : 'transparent',
                                }}>
                                    <Feather name="search" size={15} color={labelColor} />
                                    <TextInput
                                        value={catQuery}
                                        onChangeText={(v) => { setCatQuery(v); setCatOpen(true); setCreateCatError(''); }}
                                        onFocus={() => setCatOpen(true)}
                                        onBlur={() => setTimeout(() => setCatOpen(false), 150)}
                                        placeholder="Buscar ou criar categoria..."
                                        placeholderTextColor={labelColor}
                                        style={{ flex: 1, color: textColor, fontSize: 15, paddingVertical: 12, marginLeft: 8 }}
                                    />
                                    {catQuery.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => { setCatQuery(''); setCatOpen(true); }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Feather name="x" size={16} color={labelColor} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            {catOpen && !selectedCat && (
                                <View style={{
                                    backgroundColor: isDark ? '#1e2433' : '#f9fafb',
                                    borderRadius: 12,
                                    marginTop: 6,
                                    overflow: 'hidden',
                                    borderWidth: 1,
                                    borderColor: borderColor,
                                }}>
                                    {catQuery.length === 0 && (
                                        <TouchableOpacity
                                            onPress={() => { setCategoryId(null); setCatOpen(false); }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingHorizontal: 14,
                                                paddingVertical: 12,
                                                borderBottomWidth: categories.length > 0 ? 1 : 0,
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
                                            onPress={() => { setCategoryId(cat.id); setCatOpen(false); setCatQuery(''); setCreateCatError(''); }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingHorizontal: 14,
                                                paddingVertical: 12,
                                                borderBottomWidth: idx < catFiltered.length - 1 || catCanCreate ? 1 : 0,
                                                borderBottomColor: borderColor,
                                            }}
                                        >
                                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color ?? accent }} />
                                            <Text style={{ flex: 1, fontSize: 14, color: textColor }}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    {catFiltered.length === 0 && catQuery.length > 0 && !catCanCreate && (
                                        <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                                            <Text style={{ fontSize: 14, color: labelColor }}>Nenhuma categoria encontrada</Text>
                                        </View>
                                    )}
                                    {catCanCreate && (
                                        <TouchableOpacity
                                            onPress={handleCreateCategoryInline}
                                            disabled={creatingCat}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingHorizontal: 14,
                                                paddingVertical: 12,
                                            }}
                                        >
                                            {creatingCat
                                                ? <ActivityIndicator size="small" color={accent} />
                                                : <Feather name="plus-circle" size={15} color={accent} />}
                                            <Text style={{ fontSize: 14, color: accent, fontWeight: '600' }}>
                                                Criar "{catQuery.trim()}"
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    {!!createCatError && (
                                        <Text style={{ color: '#ef4444', fontSize: 12, paddingHorizontal: 14, paddingBottom: 10 }}>
                                            {createCatError}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* ── Vínculo (conta / cartão) ── */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: labelColor, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Vínculo
                        </Text>

                        {/* Toggle buttons */}
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            {([
                                { key: 'account' as LinkType, label: 'Conta', icon: 'home' as const },
                                { key: 'card' as LinkType, label: 'Cartão', icon: 'credit-card' as const },
                            ] as { key: LinkType; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[]).map(({ key, label, icon }) => {
                                const active = linkType === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => setLinkType(key)}
                                        style={{
                                            flex: 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                            backgroundColor: active ? `${accent}22` : bgInput,
                                            borderWidth: 1.5,
                                            borderColor: active ? accent : 'transparent',
                                        }}
                                    >
                                        <Feather name={icon} size={14} color={active ? accent : labelColor} />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? accent : labelColor }}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {errors.link && (
                            <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{errors.link}</Text>
                        )}

                        {/* Accounts list */}
                        {linkType === 'account' && (
                            <View style={{ gap: 8, marginBottom: 8 }}>
                                {accounts.length === 0 ? (
                                    <Text style={{ color: labelColor, fontSize: 13, fontStyle: 'italic' }}>
                                        Nenhuma conta cadastrada
                                    </Text>
                                ) : (
                                    accounts.map((acc) => {
                                        const active = accountId === acc.id;
                                        return (
                                            <TouchableOpacity
                                                key={acc.id}
                                                onPress={() => setAccountId(active ? null : acc.id)}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 12,
                                                    borderRadius: 12,
                                                    backgroundColor: active ? `${accent}18` : bgInput,
                                                    borderWidth: 1.5,
                                                    borderColor: active ? accent : 'transparent',
                                                }}
                                            >
                                                <View style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 10,
                                                    backgroundColor: acc.color ? `${acc.color}30` : `${accent}22`,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Feather name="home" size={15} color={acc.color ?? accent} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                                                        {acc.name}
                                                    </Text>
                                                    {acc.bank && (
                                                        <Text style={{ fontSize: 12, color: labelColor }}>{acc.bank}</Text>
                                                    )}
                                                </View>
                                                {active && (
                                                    <Feather name="check-circle" size={18} color={accent} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        )}

                        {/* Credit cards list */}
                        {linkType === 'card' && (
                            <View style={{ gap: 8, marginBottom: 8 }}>
                                {creditCards.length === 0 ? (
                                    <Text style={{ color: labelColor, fontSize: 13, fontStyle: 'italic' }}>
                                        Nenhum cartão cadastrado
                                    </Text>
                                ) : (
                                    creditCards.map((card) => {
                                        const active = creditCardId === card.id;
                                        return (
                                            <TouchableOpacity
                                                key={card.id}
                                                onPress={() => setCreditCardId(active ? null : card.id)}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 12,
                                                    borderRadius: 12,
                                                    backgroundColor: active ? `${accent}18` : bgInput,
                                                    borderWidth: 1.5,
                                                    borderColor: active ? accent : 'transparent',
                                                }}
                                            >
                                                <View style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 10,
                                                    backgroundColor: card.color ? `${card.color}30` : `${accent}22`,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Feather name="credit-card" size={15} color={card.color ?? accent} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                                                        {card.name}
                                                    </Text>
                                                    {card.credit_limit != null && (
                                                        <Text style={{ fontSize: 12, color: labelColor }}>
                                                            Limite: {card.credit_limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </Text>
                                                    )}
                                                </View>
                                                {active && (
                                                    <Feather name="check-circle" size={18} color={accent} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* iOS Date Picker Modal */}
                    {Platform.OS === 'ios' && (
                        <Modal transparent animationType="fade" visible={showDatePicker} statusBarTranslucent>
                            <Pressable
                                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <View style={{ backgroundColor: bgSheet, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 32 }}>
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode="date"
                                        display="spinner"
                                        locale="pt-BR"
                                        textColor={textColor}
                                        onChange={(_, date) => { if (date) setSelectedDate(date); }}
                                        style={{ backgroundColor: bgSheet }}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(false)}
                                        style={{ marginHorizontal: 16, paddingVertical: 14, backgroundColor: accent, borderRadius: 14, alignItems: 'center' }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirmar</Text>
                                    </TouchableOpacity>
                                </View>
                            </Pressable>
                        </Modal>
                    )}
                    {/* Android Date Picker */}
                    {showDatePicker && Platform.OS === 'android' && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="calendar"
                            onChange={(_, date) => {
                                setShowDatePicker(false);
                                if (date) setSelectedDate(date);
                            }}
                        />
                    )}

                    {/* ── Footer ── */}
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        paddingBottom: Math.max(insets.bottom, 16) + 16,
                        backgroundColor: bgSheet,
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                    }}>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 14,
                                backgroundColor: bgInput,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: labelColor, fontSize: 15, fontWeight: '600' }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 14,
                                backgroundColor: accent,
                                alignItems: 'center',
                                opacity: saving ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                                {saving ? 'Salvando…' : 'Criar'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
