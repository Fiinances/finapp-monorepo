import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionCreateSheet, TransactionEditSheet, TransactionFilterSheet, TransactionList } from '@/components/transactions';
import type { TransactionCreate } from '@/components/transactions';
import { AppHeader, BulkDeleteSheet } from '@/components/ui';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBanks } from '@/hooks/useBanks';
import { useCategories } from '@/hooks/useCategories';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { useTransactions } from '@/hooks/useTransactions';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types';

function shiftMonth(my: string, delta: number): string {
    const [mStr, yStr] = my.split('/');
    let m = parseInt(mStr, 10) + delta;
    let y = parseInt(yStr, 10);
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    return `${String(m).padStart(2, '0')}/${y}`;
}

function getMonthLabel(my: string): string {
    if (!my) return '';
    const [mStr, yStr] = my.split('/');
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return `${months[parseInt(mStr, 10) - 1]} ${yStr}`;
}

function monthLabelShort(my: string): string {
    if (!my) return '';
    const [mStr, yStr] = my.split('/');
    const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function TransactionsScreen() {
    const isDark = useColorScheme() === 'dark';
    const { openMenu } = useSideMenu();

    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';

    const { filters, setMonth, toggleType, toggleCategory, setImportSource, activeCount } =
        useTransactionFilters();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [editTarget, setEditTarget] = useState<Transaction | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editDeleting, setEditDeleting] = useState(false);
    const [createVisible, setCreateVisible] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);

    const { transactions: allTransactions, loading, refetch, updateTransaction, deleteTransaction, createTransaction } = useTransactions();
    const { accounts, creditCards } = useBanks();
    const { categories, createCategory } = useCategories();
    const { user } = useAuth();

    const now = new Date();
    const maxMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const currentMonth = filters.month ?? maxMonth;
    const isAtMax = currentMonth >= maxMonth;

    const transactions = useMemo(() => {
        return allTransactions.filter((t) => {
            // Exibe apenas transações bancárias — cartões têm tela própria (Faturas)
            if (t.credit_card_id != null) return false;
            const txMonth = t.billing_month ?? (() => {
                const m = t.date.match(/^(\d{4})-(\d{2})/);
                return m ? `${m[2]}/${m[1]}` : '';
            })();
            if (filters.month && txMonth !== filters.month) return false;
            if (filters.types.length && !filters.types.includes(t.type)) return false;
            if (filters.categoryIds.length) {
                const catId: number | 'uncategorized' = t.category_id ?? 'uncategorized';
                if (!filters.categoryIds.includes(catId)) return false;
            }
            if (filters.importSource !== 'all') {
                if (filters.importSource === 'credit_card' && t.credit_card_id == null) return false;
                if (filters.importSource === 'bank_account' && t.account_id == null) return false;
            }
            return true;
        });
    }, [allTransactions, filters]);

    async function handleSaveEdit(id: number, patch: Parameters<typeof updateTransaction>[1]) {
        setEditSaving(true);
        try {
            await updateTransaction(id, patch);
            setEditTarget(null);
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.');
        } finally {
            setEditSaving(false);
        }
    }

    async function handleDeleteFromSheet(id: number) {
        setEditDeleting(true);
        try {
            await deleteTransaction(id);
            setEditTarget(null);
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir.');
        } finally {
            setEditDeleting(false);
        }
    }

    async function handleSaveCreate(data: TransactionCreate) {
        setCreateSaving(true);
        try {
            await createTransaction(data);
            setCreateVisible(false);
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível criar.');
        } finally {
            setCreateSaving(false);
        }
    }



    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
            {/* Header */}
            <AppHeader
                title="Transações"
                subtitle={filters.month ? monthLabelShort(filters.month) : undefined}
                onLeftPress={openMenu}
                rightElement={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => setSheetVisible(true)}
                            style={{
                                padding: 8,
                                borderRadius: 10,
                                backgroundColor: activeCount > 0
                                    ? '#6366f1'
                                    : isDark ? '#1e2433' : '#eef2ff',
                            }}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Feather
                                    name="filter"
                                    size={16}
                                    color={activeCount > 0 ? '#ffffff' : '#6366f1'}
                                />
                                {activeCount > 0 && (
                                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                                        {activeCount}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Month Selector */}
            <View style={{
                backgroundColor: bgCard,
                marginHorizontal: 16,
                marginTop: 12,
                marginBottom: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 10,
            }}>
                <TouchableOpacity
                    onPress={() => setMonth(shiftMonth(currentMonth, -1))}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Feather name="chevron-left" size={20} color={textColor} />
                </TouchableOpacity>

                <Text style={{
                    color: textColor,
                    fontSize: 15,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                }}>
                    {getMonthLabel(currentMonth)}
                </Text>

                <TouchableOpacity
                    onPress={() => { if (!isAtMax) setMonth(shiftMonth(currentMonth, 1)); }}
                    disabled={isAtMax}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ opacity: isAtMax ? 0.3 : 1 }}
                >
                    <Feather name="chevron-right" size={20} color={textColor} />
                </TouchableOpacity>
            </View>

            {/* Lista */}
            <View style={{ flex: 1 }}>
                <TransactionList
                    transactions={transactions}
                    loading={loading}
                    onRefresh={refetch}
                    refreshing={loading}
                    onPressItem={(tx) => setEditTarget(tx)}
                />
            </View>

            {/* FAB — nova transação */}
            <TouchableOpacity
                onPress={() => setCreateVisible(true)}
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 20,
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#6366f1',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#6366f1',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <Feather name="plus" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Filter Sheet */}
            <TransactionFilterSheet
                visible={sheetVisible}
                filters={filters}
                categories={categories}
                onClose={() => setSheetVisible(false)}
                onApply={(applied) => {
                    setMonth(applied.month);
                    applied.types.forEach((type) => {
                        if (!filters.types.includes(type)) toggleType(type);
                    });
                    filters.types.forEach((type) => {
                        if (!applied.types.includes(type)) toggleType(type);
                    });
                    applied.categoryIds.forEach((id) => {
                        if (!filters.categoryIds.includes(id)) toggleCategory(id);
                    });
                    filters.categoryIds.forEach((id) => {
                        if (!applied.categoryIds.includes(id)) toggleCategory(id);
                    });
                    setImportSource(applied.importSource);
                }}
            />
            {/* Edit Sheet */}
            <TransactionEditSheet
                visible={editTarget !== null}
                transaction={editTarget}
                categories={categories}
                saving={editSaving}
                deleting={editDeleting}
                onSave={handleSaveEdit}
                onDelete={handleDeleteFromSheet}
                onClose={() => setEditTarget(null)}
            />
            {/* Create Sheet */}
            <TransactionCreateSheet
                visible={createVisible}
                categories={categories}
                accounts={accounts}
                creditCards={creditCards}
                saving={createSaving}
                onSave={handleSaveCreate}
                onClose={() => setCreateVisible(false)}
                onCreateCategory={async (name) => createCategory({ name })}
            />
        </SafeAreaView>
    );
}
