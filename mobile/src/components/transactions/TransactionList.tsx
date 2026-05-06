import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    SectionList,
    SectionListData,
    Text,
    useColorScheme,
    View,
} from 'react-native';

import { MonthSummary, Transaction } from '@/types';
import { buildSummaries, formatCurrency } from '@/utils/transactions';
import { TransactionItem } from './TransactionItem';

interface Props {
    transactions: Transaction[];
    loading?: boolean;
    onPressItem?: (transaction: Transaction) => void;
    onRefresh?: () => void;
    refreshing?: boolean;
    ListEmptyComponent?: React.ReactElement;
}

type Section = SectionListData<Transaction, { title: string; summary: MonthSummary }>;

function SectionHeader({ summary }: { summary: MonthSummary }) {
    const isDark = useColorScheme() === 'dark';
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: isDark ? '#0f1117' : '#f9fafb',
            }}
        >
            <Text
                style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isDark ? '#9ca3af' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                }}
            >
                {summary.monthYear}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                {summary.income > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#22c55e' }}>
                        +{formatCurrency(summary.income)}
                    </Text>
                )}
                {summary.expense > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#ef4444' }}>
                        -{formatCurrency(summary.expense)}
                    </Text>
                )}
            </View>
        </View>
    );
}

function Separator() {
    const isDark = useColorScheme() === 'dark';
    return (
        <View
            style={{
                height: 1,
                backgroundColor: isDark ? '#374151' : '#f3f4f6',
                marginHorizontal: 16,
            }}
        />
    );
}

export function TransactionList({
    transactions,
    loading = false,
    onPressItem,
    onRefresh,
    refreshing = false,
    ListEmptyComponent,
}: Props) {
    const isDark = useColorScheme() === 'dark';

    const sections: Section[] = buildSummaries(transactions).map((summary) => ({
        title: summary.monthYear,
        summary,
        data: summary.transactions,
    }));

    const renderItem = useCallback(
        ({ item }: { item: Transaction }) => (
            <TransactionItem transaction={item} onPress={onPressItem} />
        ),
        [onPressItem],
    );

    const renderSectionHeader = useCallback(
        ({ section }: { section: Section }) => (
            <SectionHeader summary={section.summary} />
        ),
        [],
    );

    if (loading && transactions.length === 0) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <SectionList<Transaction, Section>
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ItemSeparatorComponent={Separator}
            stickySectionHeadersEnabled
            onRefresh={onRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
                ListEmptyComponent ?? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
                        <Text style={{ fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280' }}>
                            Nenhuma transação encontrada.
                        </Text>
                    </View>
                )
            }
            contentContainerStyle={transactions.length === 0 ? { flex: 1 } : undefined}
        />
    );
}
