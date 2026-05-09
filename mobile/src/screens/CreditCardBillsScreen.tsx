import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionEditSheet, TransactionList } from '@/components/transactions';
import { AppHeader } from '@/components/ui';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { useTransactions } from '@/hooks/useTransactions';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/transactions';

function addMonth(my: string, delta: 1 | -1): string {
    const [mStr, yStr] = my.split('/');
    let m = parseInt(mStr, 10) + delta;
    let y = parseInt(yStr, 10);
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    return `${String(m).padStart(2, '0')}/${y}`;
}

function monthLabel(my: string): string {
    if (!my) return '';
    const [mStr, yStr] = my.split('/');
    const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

export function CreditCardBillsScreen() {
    const isDark = useColorScheme() === 'dark';
    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';

    const { openMenu } = useSideMenu();
    const {
        selectedMonth,
        setSelectedMonth,
        chartData,
        monthlyTransactions,
        loading,
        refetch,
    } = useCreditCardBills();

    const { updateTransaction, deleteTransaction } = useTransactions();
    const { categories } = useCategories();

    const [editTarget, setEditTarget] = useState<Transaction | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editDeleting, setEditDeleting] = useState(false);

    async function handleSaveEdit(id: number, patch: Parameters<typeof updateTransaction>[1]) {
        setEditSaving(true);
        try {
            await updateTransaction(id, patch);
            setEditTarget(null);
            refetch();
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
            refetch();
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir.');
        } finally {
            setEditDeleting(false);
        }
    }



    // Build Gifted Charts stackData format
    const stackData = chartData.map((d) => {
        const [mStr] = d.month.split('/');
        const monthIdx = parseInt(mStr, 10) - 1;
        const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const labelStr = MONTH_ABBR[monthIdx] ?? mStr;

        const stacks = d.breakdown.map(bd => ({
            value: bd.amount > 0 ? bd.amount : 0,
            color: bd.color,
            marginBottom: 2,
        }));

        if (stacks.length === 0) {
            stacks.push({ value: 0, color: 'transparent', marginBottom: 0 });
        }

        return {
            stacks,
            label: labelStr,
            monthKey: d.month,
        };
    });

    const isAtMax = chartData.length > 0 && selectedMonth >= chartData[chartData.length - 1].month;
    const currentMonthData = chartData.find(d => d.month === selectedMonth);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
            <AppHeader
                title="Faturas"
                subtitle="Cartões de Crédito"
                onLeftPress={openMenu}
            />

            {loading && chartData.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#6366f1" size="large" />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Header macro area */}
                    <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>

                        {/* Stacked Chart */}
                        <View
                            style={{
                                backgroundColor: bgCard,
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 16,
                                shadowColor: '#000',
                                shadowOpacity: 0.06,
                                shadowRadius: 8,
                                elevation: 2,
                            }}
                        >
                            <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', marginBottom: 16 }}>
                                Evolução de Gastos
                            </Text>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <BarChart
                                    stackData={stackData}
                                    width={Math.max(stackData.length * 50, 300)}
                                    height={120}
                                    barWidth={28}
                                    barBorderRadius={4}
                                    noOfSections={4}
                                    initialSpacing={16}
                                    spacing={32}
                                    yAxisTextStyle={{ color: labelColor, fontSize: 9 }}
                                    xAxisLabelTextStyle={{ color: labelColor, fontSize: 10, fontWeight: '500' }}
                                    rulesColor={isDark ? '#374151' : '#e5e7eb'}
                                    yAxisColor={isDark ? '#374151' : '#e5e7eb'}
                                    xAxisColor={isDark ? '#374151' : '#e5e7eb'}
                                    onPress={(item: any) => {
                                        if (item.monthKey) setSelectedMonth(item.monthKey);
                                    }}
                                />
                            </ScrollView>
                        </View>

                        {/* Month Selector */}
                        <View
                            style={{
                                backgroundColor: bgCard,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: borderColor,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => setSelectedMonth(addMonth(selectedMonth, -1))}
                                activeOpacity={0.7}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather name="chevron-left" size={20} color={textColor} />
                            </TouchableOpacity>

                            <Text
                                style={{
                                    color: textColor,
                                    fontSize: 15,
                                    fontWeight: '600',
                                    minWidth: 100,
                                    textAlign: 'center',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {monthLabel(selectedMonth)}
                            </Text>

                            <TouchableOpacity
                                onPress={() => { if (!isAtMax) setSelectedMonth(addMonth(selectedMonth, 1)); }}
                                activeOpacity={isAtMax ? 1 : 0.7}
                                disabled={isAtMax}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={{ opacity: isAtMax ? 0.3 : 1 }}
                            >
                                <Feather name="chevron-right" size={20} color={textColor} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Totalizer Header and List */}
                    <View style={{ flex: 1 }}>
                        <View style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            backgroundColor: bgCard,
                            borderBottomWidth: 1,
                            borderBottomColor: borderColor,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: labelColor, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' }}>
                                Total da Fatura
                            </Text>
                            <Text style={{ color: textColor, fontSize: 18, fontWeight: '700' }}>
                                {formatCurrency(currentMonthData?.total || 0)}
                            </Text>
                        </View>

                        <TransactionList
                            transactions={monthlyTransactions}
                            loading={loading}
                            onRefresh={refetch}
                            refreshing={loading}
                            onPressItem={(tx) => setEditTarget(tx)}
                        />
                    </View>
                </View>
            )}

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

        </SafeAreaView>
    );
}
