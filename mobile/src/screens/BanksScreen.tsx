import { Feather } from '@expo/vector-icons';
import { useSideMenu } from '@/contexts/SideMenuContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    ActivityIndicator,
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

import { useBanks } from '@/hooks/useBanks';
import { BankAccount, CreditCard } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface AccountFormState {
    name: string;
    bank: string;
    balance: string;
    color: string;
}

interface CardFormState {
    name: string;
    account_id: string;
    credit_limit: string;
    closing_day: string;
    due_day: string;
    color: string;
}

interface DialogConfig {
    visible: boolean;
    type: 'info' | 'error' | 'danger';
    title: string;
    message: string;
    warningItems?: string[];
    confirmText?: string;
    onConfirm?: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
    '#6366f1', '#3b82f6', '#10b981', '#14b8a6',
    '#f59e0b', '#f97316', '#ef4444', '#8b5cf6',
];

const DEFAULT_COLOR = '#6366f1';

const EMPTY_ACCOUNT_FORM: AccountFormState = {
    name: '', bank: '', balance: '', color: DEFAULT_COLOR,
};

const EMPTY_CARD_FORM: CardFormState = {
    name: '', account_id: '', credit_limit: '', closing_day: '', due_day: '', color: DEFAULT_COLOR,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(val?: number | null) {
    if (val == null) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Currency mask: formats a raw text input as "1.500,00" style */
function currencyMask(input: string): string {
    const digits = input.replace(/\D/g, '');
    if (!digits) return '';
    const number = parseInt(digits, 10) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parses a masked currency string ("1.500,00") back to a float */
function parseCurrency(masked: string): number {
    return parseFloat(masked.replace(/\./g, '').replace(',', '.'));
}

function fmtOptional(val?: number | null, suffix = '') {
    if (val == null) return '—';
    return `${val}${suffix}`;
}

// ── BanksScreen ──────────────────────────────────────────────────────────────

export function BanksScreen() {
    const { openMenu } = useSideMenu();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const inputBg = isDark ? '#252d45' : '#f3f4f8';

    const {
        accounts, creditCards, loading, error, refetch,
        insertAccount, updateAccount, deleteAccount,
        insertCard, updateCard, deleteCard,
    } = useBanks();

    const isEmpty = accounts.length === 0 && creditCards.length === 0;

    // ── Account form state ───────────────────────────────────────────────────

    const [addAccountOpen, setAddAccountOpen] = useState(false);
    const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
    const [accountForm, setAccountForm] = useState<AccountFormState>(EMPTY_ACCOUNT_FORM);
    const [submittingAccount, setSubmittingAccount] = useState(false);

    // ── Card form state ──────────────────────────────────────────────────────

    const [addCardOpen, setAddCardOpen] = useState(false);
    const [editCard, setEditCard] = useState<CreditCard | null>(null);
    const [cardForm, setCardForm] = useState<CardFormState>(EMPTY_CARD_FORM);
    const [submittingCard, setSubmittingCard] = useState(false);

    // ── Add type sheet ───────────────────────────────────────────────────────

    const [addTypeOpen, setAddTypeOpen] = useState(false);

    // ── Dialog state ─────────────────────────────────────────────────────────

    const [dialog, setDialog] = useState<DialogConfig>({ visible: false, type: 'info', title: '', message: '' });
    const closeDialog = useCallback(() => setDialog(d => ({ ...d, visible: false })), []);
    const showDialog = useCallback((config: Omit<DialogConfig, 'visible'>) =>
        setDialog({ ...config, visible: true }), []);

    // ── Account handlers ─────────────────────────────────────────────────────

    const openAddAccount = useCallback(() => {
        setAccountForm(EMPTY_ACCOUNT_FORM);
        setAddAccountOpen(true);
    }, []);

    const openEditAccount = useCallback((acc: BankAccount) => {
        setAccountForm({
            name: acc.name,
            bank: acc.bank ?? '',
            balance: acc.balance != null ? currencyMask(String(Math.round(acc.balance * 100))) : '',
            color: acc.color ?? DEFAULT_COLOR,
        });
        setEditAccount(acc);
    }, []);

    const closeAccountModal = useCallback(() => {
        setAddAccountOpen(false);
        setEditAccount(null);
        setAccountForm(EMPTY_ACCOUNT_FORM);
    }, []);

    const handleSaveAccount = useCallback(async () => {
        if (!accountForm.name.trim()) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'Nome da conta é obrigatório.' });
            return;
        }
        const payload = {
            name: accountForm.name.trim(),
            bank: accountForm.bank.trim() || null,
            balance: accountForm.balance
                ? parseCurrency(accountForm.balance)
                : null,
            color: accountForm.color || DEFAULT_COLOR,
        };
        setSubmittingAccount(true);
        try {
            if (editAccount?.id) {
                await updateAccount(editAccount.id, payload);
            } else {
                await insertAccount(payload);
            }
            closeAccountModal();
        } catch (e) {
            showDialog({ type: 'error', title: 'Erro ao salvar', message: e instanceof Error ? e.message : 'Erro ao salvar conta.' });
        } finally {
            setSubmittingAccount(false);
        }
    }, [accountForm, editAccount, insertAccount, updateAccount, closeAccountModal, showDialog]);

    const handleDeleteAccount = useCallback(
        (acc: BankAccount) => {
            showDialog({
                type: 'danger',
                title: `Excluir "${acc.name}"?`,
                message: 'Esta ação não pode ser desfeita.',
                warningItems: [
                    'Os cartões de crédito vinculados a esta conta serão excluídos.',
                    'Todas as transações e assinaturas vinculadas também serão excluídas.',
                ],
                confirmText: 'Excluir',
                onConfirm: () => {
                    deleteAccount(acc.id).catch((e: unknown) => {
                        showDialog({
                            type: 'error',
                            title: 'Erro ao excluir',
                            message: e instanceof Error ? e.message : 'Não foi possível excluir a conta.',
                        });
                    });
                },
            });
        },
        [deleteAccount, showDialog],
    );

    // ── Card handlers ────────────────────────────────────────────────────────

    const openAddCard = useCallback(() => {
        setCardForm(EMPTY_CARD_FORM);
        setAddCardOpen(true);
    }, []);

    const openEditCard = useCallback((card: CreditCard) => {
        setCardForm({
            name: card.name,
            account_id: card.account_id ? String(card.account_id) : '',
            credit_limit: card.credit_limit != null ? currencyMask(String(Math.round(card.credit_limit * 100))) : '',
            closing_day: card.closing_day != null ? String(card.closing_day) : '',
            due_day: card.due_day != null ? String(card.due_day) : '',
            color: card.color ?? DEFAULT_COLOR,
        });
        setEditCard(card);
    }, []);

    const closeCardModal = useCallback(() => {
        setAddCardOpen(false);
        setEditCard(null);
        setCardForm(EMPTY_CARD_FORM);
    }, []);

    const handleSaveCard = useCallback(async () => {
        if (!cardForm.name.trim()) {
            showDialog({ type: 'info', title: 'Campo obrigatório', message: 'Nome do cartão é obrigatório.' });
            return;
        }
        const closingDay = cardForm.closing_day ? parseInt(cardForm.closing_day, 10) : null;
        const dueDay = cardForm.due_day ? parseInt(cardForm.due_day, 10) : null;
        if (closingDay != null && (closingDay < 1 || closingDay > 31)) {
            showDialog({ type: 'info', title: 'Valor inválido', message: 'Dia de fechamento deve ser entre 1 e 31.' });
            return;
        }
        if (dueDay != null && (dueDay < 1 || dueDay > 31)) {
            showDialog({ type: 'info', title: 'Valor inválido', message: 'Dia de vencimento deve ser entre 1 e 31.' });
            return;
        }
        const payload = {
            name: cardForm.name.trim(),
            account_id: cardForm.account_id ? parseInt(cardForm.account_id, 10) : null,
            credit_limit: cardForm.credit_limit
                ? parseCurrency(cardForm.credit_limit)
                : null,
            closing_day: closingDay,
            due_day: dueDay,
            color: cardForm.color || DEFAULT_COLOR,
        };
        setSubmittingCard(true);
        try {
            if (editCard?.id) {
                await updateCard(editCard.id, payload);
            } else {
                await insertCard(payload);
            }
            closeCardModal();
        } catch (e) {
            showDialog({ type: 'error', title: 'Erro ao salvar', message: e instanceof Error ? e.message : 'Erro ao salvar cartão.' });
        } finally {
            setSubmittingCard(false);
        }
    }, [cardForm, editCard, insertCard, updateCard, closeCardModal, showDialog]);

    const handleDeleteCard = useCallback(
        (card: CreditCard) => {
            showDialog({
                type: 'danger',
                title: `Excluir "${card.name}"?`,
                message: 'Esta ação não pode ser desfeita.',
                warningItems: [
                    'Todas as transações e assinaturas vinculadas a este cartão serão excluídas.',
                ],
                confirmText: 'Excluir',
                onConfirm: () => {
                    deleteCard(card.id).catch((e: unknown) => {
                        showDialog({
                            type: 'error',
                            title: 'Erro ao excluir',
                            message: e instanceof Error ? e.message : 'Não foi possível excluir o cartão.',
                        });
                    });
                },
            });
        },
        [deleteCard, showDialog],
    );

    const handleAddPress = useCallback(() => {
        setAddTypeOpen(true);
    }, []);

    const isAccountModalOpen = addAccountOpen || editAccount != null;
    const isCardModalOpen = addCardOpen || editCard != null;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                    }}
                >
                    <TouchableOpacity
                        onPress={openMenu}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ padding: 4, marginRight: 16 }}
                    >
                        <Feather name="menu" size={22} color={textColor} />
                    </TouchableOpacity>

                    <Text style={{ color: textColor, fontSize: 18, fontWeight: '700', flex: 1 }}>
                        Bancos e Cartões
                    </Text>

                    {!isEmpty ? (
                        <TouchableOpacity
                            onPress={handleAddPress}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{
                                width: 38, height: 38, borderRadius: 19,
                                backgroundColor: '#6366f1',
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Feather name="plus" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 38 }} />
                    )}
                </View>

                {/* Content */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <Feather name="alert-circle" size={36} color="#ef4444" />
                        <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', marginTop: 12 }}>
                            Erro ao carregar dados
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                            {error}
                        </Text>
                        <TouchableOpacity
                            onPress={refetch}
                            style={{
                                marginTop: 20,
                                paddingVertical: 12, paddingHorizontal: 24,
                                backgroundColor: '#6366f1', borderRadius: 12,
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Tentar novamente</Text>
                        </TouchableOpacity>
                    </View>
                ) : isEmpty ? (
                    /* Empty State */
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                        <View
                            style={{
                                width: 80, height: 80, borderRadius: 40,
                                backgroundColor: isDark ? '#252d45' : '#f0f0ff',
                                alignItems: 'center', justifyContent: 'center',
                                marginBottom: 20,
                            }}
                        >
                            <Feather name="credit-card" size={34} color="#6366f1" />
                        </View>
                        <Text style={{ color: textColor, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                            Nenhuma conta cadastrada
                        </Text>
                        <Text
                            style={{
                                color: labelColor, fontSize: 14,
                                textAlign: 'center', lineHeight: 20,
                                marginBottom: 32,
                            }}
                        >
                            Adicione suas contas bancárias e cartões de crédito para organizar suas finanças.
                        </Text>
                        <TouchableOpacity
                            onPress={openAddCard}
                            style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                gap: 8, borderWidth: 1.5, borderColor: '#6366f1',
                                borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
                                marginBottom: 12, width: '100%',
                            }}
                        >
                            <Feather name="credit-card" size={16} color="#6366f1" />
                            <Text style={{ color: '#6366f1', fontWeight: '600', fontSize: 14 }}>
                                Cartão de crédito
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={openAddAccount}
                            style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                gap: 8, backgroundColor: '#6366f1',
                                borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
                                width: '100%',
                            }}
                        >
                            <Feather name="briefcase" size={16} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                                Conta bancária
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Lists */
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                        {accounts.length > 0 && (
                            <View style={{ marginBottom: 28 }}>
                                <Text
                                    style={{
                                        color: labelColor, fontSize: 11, fontWeight: '700',
                                        letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10,
                                    }}
                                >
                                    Contas bancárias
                                </Text>
                                {accounts.map((acc) => (
                                    <AccountRow
                                        key={acc.id}
                                        account={acc}
                                        bgCard={bgCard}
                                        textColor={textColor}
                                        labelColor={labelColor}
                                        borderColor={borderColor}
                                        isDark={isDark}
                                        onEdit={() => openEditAccount(acc)}
                                        onDelete={() => handleDeleteAccount(acc)}
                                    />
                                ))}
                            </View>
                        )}

                        {creditCards.length > 0 && (
                            <View>
                                <Text
                                    style={{
                                        color: labelColor, fontSize: 11, fontWeight: '700',
                                        letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10,
                                    }}
                                >
                                    Cartões de crédito
                                </Text>
                                {creditCards.map((card) => {
                                    const linked = accounts.find((a) => a.id === card.account_id);
                                    return (
                                        <CreditCardRow
                                            key={card.id}
                                            card={card}
                                            linkedAccountName={linked?.name}
                                            bgCard={bgCard}
                                            textColor={textColor}
                                            labelColor={labelColor}
                                            borderColor={borderColor}
                                            isDark={isDark}
                                            onEdit={() => openEditCard(card)}
                                            onDelete={() => handleDeleteCard(card)}
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* Modals */}
            <AccountFormModal
                visible={isAccountModalOpen}
                isEdit={editAccount != null}
                form={accountForm}
                onChange={setAccountForm}
                onSave={handleSaveAccount}
                onClose={closeAccountModal}
                submitting={submittingAccount}
                textColor={textColor}
                labelColor={labelColor}
                bgCard={bgCard}
                inputBg={inputBg}
                borderColor={borderColor}
                isDark={isDark}
            />

            <CardFormModal
                visible={isCardModalOpen}
                isEdit={editCard != null}
                form={cardForm}
                onChange={setCardForm}
                accounts={accounts}
                onSave={handleSaveCard}
                onClose={closeCardModal}
                submitting={submittingCard}
                textColor={textColor}
                labelColor={labelColor}
                bgCard={bgCard}
                inputBg={inputBg}
                borderColor={borderColor}
                isDark={isDark}
            />

            <AddTypeSheet
                visible={addTypeOpen}
                onClose={() => setAddTypeOpen(false)}
                onPickAccount={() => { setAddTypeOpen(false); openAddAccount(); }}
                onPickCard={() => { setAddTypeOpen(false); openAddCard(); }}
                textColor={textColor}
                labelColor={labelColor}
                bgCard={bgCard}
                borderColor={borderColor}
                isDark={isDark}
            />

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

// ── useSwipeToDismiss ────────────────────────────────────────────────────────

function useSwipeToDismiss(onClose: () => void, visible: boolean) {
    const onCloseRef = useRef(onClose);
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!visible) translateY.setValue(0);
    }, [visible, translateY]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) translateY.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 80 || gs.vy > 0.5) {
                    translateY.setValue(0);
                    onCloseRef.current();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 80,
                        friction: 12,
                    }).start();
                }
            },
        })
    ).current;

    return { translateY, panHandlers: panResponder.panHandlers };
}

// ── AddTypeSheet ─────────────────────────────────────────────────────────────

interface AddTypeSheetProps {
    visible: boolean;
    onClose: () => void;
    onPickAccount: () => void;
    onPickCard: () => void;
    textColor: string;
    labelColor: string;
    bgCard: string;
    borderColor: string;
    isDark: boolean;
}

function AddTypeSheet({
    visible, onClose, onPickAccount, onPickCard,
    textColor, labelColor, bgCard, borderColor, isDark,
}: AddTypeSheetProps) {
    const { translateY, panHandlers } = useSwipeToDismiss(onClose, visible);
    const overlayBg = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)';
    const itemBg = isDark ? '#252d45' : '#f8f9fc';
    const accentBg = isDark ? '#2a2c4a' : '#ededff';

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={{ flex: 1, backgroundColor: overlayBg, justifyContent: 'flex-end' }}
            >
                {/* Sheet — stops tap propagation */}
                <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                    <Animated.View
                        style={{
                            backgroundColor: bgCard,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingTop: 12,
                            paddingBottom: 36,
                            paddingHorizontal: 20,
                            transform: [{ translateY }],
                        }}
                    >
                        {/* Drag handle — swipe down to close */}
                        <View
                            {...panHandlers}
                            style={{
                                alignSelf: 'center',
                                paddingVertical: 10,
                                paddingHorizontal: 40,
                                marginBottom: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 40, height: 4,
                                    borderRadius: 2,
                                    backgroundColor: isDark ? '#3d4a6b' : '#d1d5db',
                                }}
                            />
                        </View>

                        {/* Title row */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 20,
                            }}
                        >
                            <Text style={{ color: textColor, fontSize: 17, fontWeight: '700' }}>
                                O que deseja adicionar?
                            </Text>
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="x" size={20} color={labelColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Option: Conta bancária */}
                        <TouchableOpacity
                            onPress={onPickAccount}
                            activeOpacity={0.75}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 16,
                                backgroundColor: itemBg,
                                borderWidth: 1,
                                borderColor,
                                borderRadius: 16,
                                paddingVertical: 16,
                                paddingHorizontal: 18,
                                marginBottom: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    backgroundColor: accentBg,
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Feather name="briefcase" size={20} color="#6366f1" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }}>
                                    Conta bancária
                                </Text>
                                <Text style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>
                                    Corrente, poupança ou carteira
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={16} color={labelColor} />
                        </TouchableOpacity>

                        {/* Option: Cartão de crédito */}
                        <TouchableOpacity
                            onPress={onPickCard}
                            activeOpacity={0.75}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 16,
                                backgroundColor: itemBg,
                                borderWidth: 1,
                                borderColor,
                                borderRadius: 16,
                                paddingVertical: 16,
                                paddingHorizontal: 18,
                                marginBottom: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    backgroundColor: accentBg,
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Feather name="credit-card" size={20} color="#6366f1" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }}>
                                    Cartão de crédito
                                </Text>
                                <Text style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>
                                    Limite, fechamento e vencimento
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={16} color={labelColor} />
                        </TouchableOpacity>

                        {/* Cancel */}
                        <TouchableOpacity
                            onPress={onClose}
                            activeOpacity={0.75}
                            style={{
                                alignItems: 'center',
                                paddingVertical: 14,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor,
                                marginTop: 4,
                            }}
                        >
                            <Text style={{ color: labelColor, fontSize: 14, fontWeight: '600' }}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

// ── AccountRow ───────────────────────────────────────────────────────────────

interface AccountRowProps {
    account: BankAccount;
    bgCard: string;
    textColor: string;
    labelColor: string;
    borderColor: string;
    isDark: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

function AccountRow({
    account, bgCard, textColor, labelColor, borderColor, onEdit, onDelete,
}: AccountRowProps) {
    const accentColor = account.color ?? DEFAULT_COLOR;
    return (
        <View
            style={{
                backgroundColor: bgCard,
                borderRadius: 14,
                marginBottom: 10,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor,
                flexDirection: 'row',
            }}
        >
            {/* Color bar */}
            <View style={{ width: 5, backgroundColor: accentColor }} />

            {/* Content */}
            <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14 }}>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }}>
                    {account.name}
                </Text>
                {account.bank ? (
                    <Text style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>
                        {account.bank}
                    </Text>
                ) : null}
                <Text style={{ color: accentColor, fontSize: 16, fontWeight: '700', marginTop: 8 }}>
                    {fmtCurrency(account.balance)}
                </Text>
            </View>

            {/* Actions */}
            <View style={{ justifyContent: 'center', gap: 0, paddingRight: 8 }}>
                <TouchableOpacity
                    onPress={onEdit}
                    hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                    style={{ padding: 8 }}
                >
                    <Feather name="edit-2" size={15} color={labelColor} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onDelete}
                    hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 8 }}
                >
                    <Feather name="trash-2" size={15} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── CreditCardRow ────────────────────────────────────────────────────────────

interface CreditCardRowProps {
    card: CreditCard;
    linkedAccountName?: string;
    bgCard: string;
    textColor: string;
    labelColor: string;
    borderColor: string;
    isDark: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

function CreditCardRow({
    card, linkedAccountName, bgCard, textColor, labelColor, borderColor, onEdit, onDelete,
}: CreditCardRowProps) {
    const accentColor = card.color ?? DEFAULT_COLOR;
    return (
        <View
            style={{
                backgroundColor: bgCard,
                borderRadius: 14,
                marginBottom: 10,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor,
                flexDirection: 'row',
            }}
        >
            {/* Color bar */}
            <View style={{ width: 5, backgroundColor: accentColor }} />

            {/* Content */}
            <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14 }}>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }}>
                    {card.name}
                </Text>
                {linkedAccountName ? (
                    <Text style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>
                        {linkedAccountName}
                    </Text>
                ) : null}
                <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
                    {card.credit_limit != null && (
                        <View>
                            <Text style={{ color: labelColor, fontSize: 10 }}>Limite</Text>
                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
                                {fmtCurrency(card.credit_limit)}
                            </Text>
                        </View>
                    )}
                    {card.closing_day != null && (
                        <View>
                            <Text style={{ color: labelColor, fontSize: 10 }}>Fechamento</Text>
                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
                                Dia {fmtOptional(card.closing_day)}
                            </Text>
                        </View>
                    )}
                    {card.due_day != null && (
                        <View>
                            <Text style={{ color: labelColor, fontSize: 10 }}>Vencimento</Text>
                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
                                Dia {fmtOptional(card.due_day)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Actions */}
            <View style={{ justifyContent: 'center', paddingRight: 8 }}>
                <TouchableOpacity
                    onPress={onEdit}
                    hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                    style={{ padding: 8 }}
                >
                    <Feather name="edit-2" size={15} color={labelColor} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onDelete}
                    hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 8 }}
                >
                    <Feather name="trash-2" size={15} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                    key={c}
                    onPress={() => onSelect(c)}
                    style={{
                        width: 30, height: 30, borderRadius: 15,
                        backgroundColor: c,
                        borderWidth: selected === c ? 3 : 0,
                        borderColor: '#fff',
                        shadowColor: c,
                        shadowOpacity: selected === c ? 0.6 : 0,
                        shadowOffset: { width: 0, height: 2 },
                        shadowRadius: 4,
                        elevation: selected === c ? 4 : 0,
                    }}
                />
            ))}
        </View>
    );
}

// ── Shared form field ────────────────────────────────────────────────────────

interface FieldProps {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
    textColor: string;
    labelColor: string;
    inputBg: string;
    borderColor: string;
}

function FormField({
    label, value, onChangeText, placeholder, keyboardType = 'default',
    textColor, labelColor, inputBg, borderColor,
}: FieldProps) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                {label}
            </Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={labelColor}
                keyboardType={keyboardType}
                style={{
                    backgroundColor: inputBg,
                    borderWidth: 1, borderColor,
                    borderRadius: 10,
                    paddingVertical: 12, paddingHorizontal: 14,
                    color: textColor, fontSize: 14,
                }}
            />
        </View>
    );
}

// ── AccountFormModal ─────────────────────────────────────────────────────────

interface AccountFormModalProps {
    visible: boolean;
    isEdit: boolean;
    form: AccountFormState;
    onChange: React.Dispatch<React.SetStateAction<AccountFormState>>;
    onSave: () => Promise<void>;
    onClose: () => void;
    submitting: boolean;
    textColor: string;
    labelColor: string;
    bgCard: string;
    inputBg: string;
    borderColor: string;
    isDark: boolean;
}

function AccountFormModal({
    visible, isEdit, form, onChange, onSave, onClose, submitting,
    textColor, labelColor, bgCard, inputBg, borderColor, isDark,
}: AccountFormModalProps) {
    const { translateY, panHandlers } = useSwipeToDismiss(onClose, visible);
    const bgModal = isDark ? '#0f1117' : '#f5f6f8';
    const titleText = isEdit ? 'Editar Conta' : 'Nova Conta';

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                <Animated.View
                    style={{
                        backgroundColor: bgCard,
                        borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20,
                        maxHeight: '90%',
                        transform: [{ translateY }],
                    }}
                >
                    {/* Handle — swipe down to close */}
                    <View
                        {...panHandlers}
                        style={{
                            alignSelf: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 40,
                            marginBottom: 10,
                        }}
                    >
                        <View
                            style={{
                                width: 40, height: 4,
                                borderRadius: 2, backgroundColor: isDark ? '#3d4a6b' : '#d1d5db',
                            }}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <Text style={{ color: textColor, fontSize: 17, fontWeight: '700' }}>
                            {titleText}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={20} color={labelColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <FormField
                            label="Nome *"
                            value={form.name}
                            onChangeText={(v) => onChange((f) => ({ ...f, name: v }))}
                            placeholder="Ex: Nubank"
                            textColor={textColor}
                            labelColor={labelColor}
                            inputBg={inputBg}
                            borderColor={borderColor}
                        />
                        <FormField
                            label="Banco"
                            value={form.bank}
                            onChangeText={(v) => onChange((f) => ({ ...f, bank: v }))}
                            placeholder="Ex: Nubank"
                            textColor={textColor}
                            labelColor={labelColor}
                            inputBg={inputBg}
                            borderColor={borderColor}
                        />
                        <FormField
                            label="Saldo atual"
                            value={form.balance}
                            onChangeText={(v) => onChange((f) => ({ ...f, balance: currencyMask(v) }))}
                            placeholder="0,00"
                            keyboardType="decimal-pad"
                            textColor={textColor}
                            labelColor={labelColor}
                            inputBg={inputBg}
                            borderColor={borderColor}
                        />

                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10 }}>
                                Cor
                            </Text>
                            <ColorPicker
                                selected={form.color}
                                onSelect={(c) => onChange((f) => ({ ...f, color: c }))}
                            />
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        onPress={onSave}
                        disabled={submitting}
                        style={{
                            backgroundColor: '#6366f1',
                            borderRadius: 12, paddingVertical: 15,
                            alignItems: 'center', marginTop: 8,
                            opacity: submitting ? 0.7 : 1,
                        }}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {isEdit ? 'Salvar alterações' : 'Adicionar conta'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ── CardFormModal ────────────────────────────────────────────────────────────

interface CardFormModalProps {
    visible: boolean;
    isEdit: boolean;
    form: CardFormState;
    onChange: React.Dispatch<React.SetStateAction<CardFormState>>;
    accounts: BankAccount[];
    onSave: () => Promise<void>;
    onClose: () => void;
    submitting: boolean;
    textColor: string;
    labelColor: string;
    bgCard: string;
    inputBg: string;
    borderColor: string;
    isDark: boolean;
}

function CardFormModal({
    visible, isEdit, form, onChange, accounts, onSave, onClose, submitting,
    textColor, labelColor, bgCard, inputBg, borderColor, isDark,
}: CardFormModalProps) {
    const { translateY, panHandlers } = useSwipeToDismiss(onClose, visible);
    const titleText = isEdit ? 'Editar Cartão' : 'Novo Cartão';
    const selectedAccountBg = isDark ? '#252d45' : '#f0f0ff';

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                <Animated.View
                    style={{
                        backgroundColor: bgCard,
                        borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20,
                        maxHeight: '90%',
                        transform: [{ translateY }],
                    }}
                >
                    {/* Handle — swipe down to close */}
                    <View
                        {...panHandlers}
                        style={{
                            alignSelf: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 40,
                            marginBottom: 10,
                        }}
                    >
                        <View
                            style={{
                                width: 40, height: 4,
                                borderRadius: 2, backgroundColor: isDark ? '#3d4a6b' : '#d1d5db',
                            }}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <Text style={{ color: textColor, fontSize: 17, fontWeight: '700' }}>
                            {titleText}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={20} color={labelColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <FormField
                            label="Nome *"
                            value={form.name}
                            onChangeText={(v) => onChange((f) => ({ ...f, name: v }))}
                            placeholder="Ex: Nubank Platinum"
                            textColor={textColor}
                            labelColor={labelColor}
                            inputBg={inputBg}
                            borderColor={borderColor}
                        />

                        {/* Account picker */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                                Conta vinculada
                            </Text>
                            {/* None option */}
                            <TouchableOpacity
                                onPress={() => onChange((f) => ({ ...f, account_id: '' }))}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                    paddingVertical: 10,
                                    paddingHorizontal: 12,
                                    borderRadius: 10,
                                    borderWidth: 1.5,
                                    borderColor: form.account_id === '' ? '#6366f1' : borderColor,
                                    backgroundColor: form.account_id === '' ? selectedAccountBg : 'transparent',
                                    marginBottom: 6,
                                }}
                            >
                                <View
                                    style={{
                                        width: 12, height: 12, borderRadius: 6,
                                        backgroundColor: isDark ? '#4b5563' : '#d1d5db',
                                    }}
                                />
                                <Text style={{ color: labelColor, fontSize: 14, flex: 1 }}>
                                    Nenhuma (independente)
                                </Text>
                                {form.account_id === '' && (
                                    <Feather name="check" size={14} color="#6366f1" />
                                )}
                            </TouchableOpacity>
                            {accounts.map((acc) => {
                                const isSelected = String(acc.id) === form.account_id;
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        onPress={() => onChange((f) => ({ ...f, account_id: String(acc.id) }))}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 10,
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderRadius: 10,
                                            borderWidth: 1.5,
                                            borderColor: isSelected ? '#6366f1' : borderColor,
                                            backgroundColor: isSelected ? selectedAccountBg : 'transparent',
                                            marginBottom: 6,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 12, height: 12, borderRadius: 6,
                                                backgroundColor: acc.color ?? DEFAULT_COLOR,
                                            }}
                                        />
                                        <Text style={{ color: textColor, fontSize: 14, flex: 1 }}>
                                            {acc.name}
                                        </Text>
                                        {isSelected && (
                                            <Feather name="check" size={14} color="#6366f1" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <FormField
                            label="Limite de crédito"
                            value={form.credit_limit}
                            onChangeText={(v) => onChange((f) => ({ ...f, credit_limit: currencyMask(v) }))}
                            placeholder="0,00"
                            keyboardType="decimal-pad"
                            textColor={textColor}
                            labelColor={labelColor}
                            inputBg={inputBg}
                            borderColor={borderColor}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <FormField
                                    label="Dia de fechamento"
                                    value={form.closing_day}
                                    onChangeText={(v) => onChange((f) => ({ ...f, closing_day: v }))}
                                    placeholder="1–31"
                                    keyboardType="number-pad"
                                    textColor={textColor}
                                    labelColor={labelColor}
                                    inputBg={inputBg}
                                    borderColor={borderColor}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <FormField
                                    label="Dia de vencimento"
                                    value={form.due_day}
                                    onChangeText={(v) => onChange((f) => ({ ...f, due_day: v }))}
                                    placeholder="1–31"
                                    keyboardType="number-pad"
                                    textColor={textColor}
                                    labelColor={labelColor}
                                    inputBg={inputBg}
                                    borderColor={borderColor}
                                />
                            </View>
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginBottom: 10 }}>
                                Cor
                            </Text>
                            <ColorPicker
                                selected={form.color}
                                onSelect={(c) => onChange((f) => ({ ...f, color: c }))}
                            />
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        onPress={onSave}
                        disabled={submitting}
                        style={{
                            backgroundColor: '#6366f1',
                            borderRadius: 12, paddingVertical: 15,
                            alignItems: 'center', marginTop: 8,
                            opacity: submitting ? 0.7 : 1,
                        }}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {isEdit ? 'Salvar alterações' : 'Adicionar cartão'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ── AppDialog ────────────────────────────────────────────────────────────────

interface AppDialogProps {
    visible: boolean;
    type: 'info' | 'error' | 'danger';
    title: string;
    message: string;
    warningItems?: string[];
    confirmText?: string;
    onClose: () => void;
    onConfirm?: () => void;
    isDark: boolean;
    textColor: string;
    bgCard: string;
    labelColor: string;
}

function AppDialog({
    visible, type, title, message, warningItems,
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
    const warnBg = isDark ? '#2d1f1f' : '#fff5f5';

    const handleConfirmPress = () => {
        onClose();
        if (onConfirm) onConfirm();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={type !== 'danger' ? onClose : undefined}
                style={{
                    flex: 1,
                    backgroundColor: overlayBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 28,
                }}
            >
                <View
                    onStartShouldSetResponder={() => true}
                    style={{
                        backgroundColor: bgCard,
                        borderRadius: 20,
                        padding: 24,
                        width: '100%',
                        alignItems: 'center',
                    }}
                >
                    {/* Icon */}
                    <View
                        style={{
                            width: 64, height: 64, borderRadius: 32,
                            backgroundColor: iconBg,
                            alignItems: 'center', justifyContent: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Feather name={iconName} size={28} color={iconColor} />
                    </View>

                    {/* Title */}
                    <Text
                        style={{
                            color: textColor, fontSize: 17, fontWeight: '700',
                            textAlign: 'center', marginBottom: 8,
                        }}
                    >
                        {title}
                    </Text>

                    {/* Message */}
                    <Text
                        style={{
                            color: labelColor, fontSize: 14,
                            textAlign: 'center', lineHeight: 20,
                            marginBottom: warningItems && warningItems.length > 0 ? 16 : 24,
                        }}
                    >
                        {message}
                    </Text>

                    {/* Warning items */}
                    {warningItems && warningItems.length > 0 && (
                        <View
                            style={{
                                backgroundColor: warnBg,
                                borderRadius: 10, padding: 12,
                                width: '100%', marginBottom: 24,
                                gap: 8,
                            }}
                        >
                            {warningItems.map((item, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                    <Feather name="alert-triangle" size={13} color="#ef4444" style={{ marginTop: 1 }} />
                                    <Text style={{ color: isDark ? '#f87171' : '#dc2626', fontSize: 12, lineHeight: 18, flex: 1 }}>
                                        {item}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Buttons */}
                    {type === 'danger' ? (
                        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                            <TouchableOpacity
                                onPress={onClose}
                                style={{
                                    flex: 1, paddingVertical: 13, borderRadius: 12,
                                    borderWidth: 1.5,
                                    borderColor: isDark ? '#3d4a6b' : '#e5e7eb',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: labelColor, fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleConfirmPress}
                                style={{
                                    flex: 1, paddingVertical: 13, borderRadius: 12,
                                    backgroundColor: '#ef4444',
                                    alignItems: 'center',
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
                                backgroundColor: '#6366f1',
                                alignItems: 'center',
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
