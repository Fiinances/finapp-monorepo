import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionFilterSheet, TransactionList } from '@/components/transactions';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { useTransactions } from '@/hooks/useTransactions';
import { Category } from '@/types';

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
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#6b7280' : '#9ca3af';
    const borderColor = isDark ? '#1e2433' : '#e5e7eb';

    const { filters, setMonth, toggleType, toggleCategory, setImportSource, activeCount } =
        useTransactionFilters();

    const [sheetVisible, setSheetVisible] = useState(false);

    const { transactions: allTransactions, loading, refetch } = useTransactions();

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
                const src = t.credit_card_id != null
                    ? 'credit_card'
                    : t.bank_account_id != null ? 'bank_account' : 'manual';
                if (src !== filters.importSource) return false;
            }
            return true;
        });
    }, [allTransactions, filters]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                }}
            >
                <TouchableOpacity
                    onPress={openMenu}
                    style={{ padding: 4, marginRight: 12 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="menu" size={22} color={textColor} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>
                        Transações
                    </Text>
                    {filters.month && (
                        <Text style={{ fontSize: 12, color: labelColor, marginTop: 1 }}>
                            {monthLabelShort(filters.month)}
                        </Text>
                    )}
                </View>

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

            {/* Lista */}
            <View style={{ flex: 1 }}>
                <TransactionList
                    transactions={transactions}
                    loading={loading}
                    onRefresh={refetch}
                    refreshing={loading}
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
        </SafeAreaView>
    );
}
