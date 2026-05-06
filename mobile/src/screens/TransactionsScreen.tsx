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

import { TransactionEditSheet, TransactionFilterSheet, TransactionList } from '@/components/transactions';
import { AppHeader } from '@/components/ui';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { useTransactions } from '@/hooks/useTransactions';
import { Category, Transaction } from '@/types';

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

    const { filters, setMonth, toggleType, toggleCategory, setImportSource, activeCount } =
        useTransactionFilters();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [editTarget, setEditTarget] = useState<Transaction | null>(null);
    const [editSaving, setEditSaving] = useState(false);

    const { transactions: allTransactions, loading, refetch, updateTransaction } = useTransactions();

    const categories = useMemo<Category[]>(() => {
        const map = new Map<number, Category>();
        for (const t of allTransactions) {
            if (t.category && t.category_id != null) {
                map.set(t.category_id, t.category);
            }
        }
        return Array.from(map.values());
    }, [allTransactions]);

    const transactions = useMemo(() => {
        return allTransactions.filter((t) => {
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
            {/* Header */}
            <AppHeader
                title="Transações"
                subtitle={filters.month ? monthLabelShort(filters.month) : undefined}
                onLeftPress={openMenu}
                rightElement={
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
                }
            />

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
                onSave={handleSaveEdit}
                onClose={() => setEditTarget(null)}
            />
        </SafeAreaView>
    );
}
