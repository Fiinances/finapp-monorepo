import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ListRenderItemInfo,
    SectionList,
    SectionListData,
    Text,
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
    return (
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#f9fafb] dark:bg-[#0f1117]">
            <Text className="text-xs font-semibold text-[#6b7280] dark:text-[#9ca3af] uppercase tracking-wide">
                {summary.monthYear}
            </Text>
            <View className="flex-row gap-3">
                {summary.income > 0 && (
                    <Text className="text-xs font-medium text-[#22c55e]">
                        +{formatCurrency(summary.income)}
                    </Text>
                )}
                {summary.expense > 0 && (
                    <Text className="text-xs font-medium text-[#ef4444]">
                        -{formatCurrency(summary.expense)}
                    </Text>
                )}
            </View>
        </View>
    );
}

function Separator() {
    return <View className="h-px bg-[#f3f4f6] dark:bg-[#374151] mx-4" />;
}

export function TransactionList({
    transactions,
    loading = false,
    onPressItem,
    onRefresh,
    refreshing = false,
    ListEmptyComponent,
}: Props) {
    const sections: Section[] = buildSummaries(transactions).map((summary) => ({
        title: summary.monthYear,
        summary,
        data: summary.transactions,
    }));

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<Transaction>) => (
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
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#1a1f2e" />
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
                    <View className="flex-1 items-center justify-center py-16">
                        <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                            Nenhuma transação encontrada.
                        </Text>
                    </View>
                )
            }
            contentContainerStyle={transactions.length === 0 ? { flex: 1 } : undefined}
        />
    );
}
