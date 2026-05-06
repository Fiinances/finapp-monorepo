import { Feather } from '@expo/vector-icons';
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

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMonthYear(monthYear: string): string {
    const [mm, yyyy] = monthYear.split('/');
    const idx = parseInt(mm, 10) - 1;
    return `${MONTH_NAMES[idx] ?? mm} ${yyyy}`;
}

function SectionHeader({ summary }: { summary: MonthSummary }) {
    const isDark = useColorScheme() === 'dark';
    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const textPrimary = isDark ? '#e2e8f0' : '#1e293b';
    const textMuted = isDark ? '#6b7280' : '#9ca3af';
    const balance = summary.income - summary.expense;
    const balanceColor = balance >= 0 ? '#22c55e' : '#ef4444';

    return (
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, backgroundColor: bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, letterSpacing: 0.2 }}>
                    {formatMonthYear(summary.monthYear)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, color: textMuted }}>saldo</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: balanceColor }}>
                        {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
                {summary.income > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="arrow-down-left" size={11} color="#22c55e" />
                        <Text style={{ fontSize: 11, fontWeight: '500', color: '#22c55e' }}>
                            {formatCurrency(summary.income)}
                        </Text>
                    </View>
                )}
                {summary.expense > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="arrow-up-right" size={11} color="#ef4444" />
                        <Text style={{ fontSize: 11, fontWeight: '500', color: '#ef4444' }}>
                            {formatCurrency(summary.expense)}
                        </Text>
                    </View>
                )}
                {summary.investment > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="trending-up" size={11} color="#f59e0b" />
                        <Text style={{ fontSize: 11, fontWeight: '500', color: '#f59e0b' }}>
                            {formatCurrency(summary.investment)}
                        </Text>
                    </View>
                )}
            </View>
        </View>
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
            stickySectionHeadersEnabled
            onRefresh={onRefresh}
            refreshing={refreshing}
            contentContainerStyle={
                transactions.length === 0
                    ? { flex: 1 }
                    : { paddingBottom: 24 }
            }
            ListEmptyComponent={
                ListEmptyComponent ?? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 10 }}>
                        <View
                            style={{
                                width: 60,
                                height: 60,
                                borderRadius: 30,
                                backgroundColor: isDark ? '#1e2433' : '#eef2ff',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 4,
                            }}
                        >
                            <Feather name="inbox" size={26} color="#6366f1" />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' }}>
                            Nenhuma transação
                        </Text>
                        <Text style={{ fontSize: 12, color: isDark ? '#6b7280' : '#9ca3af', textAlign: 'center', paddingHorizontal: 40 }}>
                            Importe um extrato ou adicione transações manualmente.
                        </Text>
                    </View>
                )
            }
        />
    );
}
