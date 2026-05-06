import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    useColorScheme,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboard } from '@/hooks/useDashboard';
import { MonthlyChart, CategoryChart, SubscriptionsList } from '@/components/dashboard';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { formatCurrency } from '@/utils/transactions';

export function DashboardScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';

    const { openMenu } = useSideMenu();

    const {
        monthlyData,
        categorySlices,
        subscriptions,
        subscriptionTotals,
        loading,
        error,
        selectedMonth,
        setSelectedMonth,
        refetch,
    } = useDashboard();

    // Current month summary (last item in monthlyData)
    const currentSummary = monthlyData[monthlyData.length - 1];
    const displayMonth = selectedMonth;

    // Available months for CategoryChart selector (most-recent-first)
    const availableMonths = useMemo(
        () => [...monthlyData].reverse().map((d) => d.monthYear),
        [monthlyData],
    );

    // Month label for the header
    const monthLabel = (my: string) => {
        if (!my) return '';
        const [m, y] = my.split('/');
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
        ];
        return `${months[parseInt(m, 10) - 1]} ${y}`;
    };

    if (loading && !monthlyData.length) {
        return (
            <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={isDark ? '#e5e7eb' : '#1a1f2e'} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={refetch}
                            tintColor={isDark ? '#e5e7eb' : '#1a1f2e'}
                        />
                    }
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center', paddingVertical: 14,
                        }}
                    >
                        <TouchableOpacity
                            onPress={openMenu}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ padding: 4, marginRight: 16 }}
                        >
                            <Feather name="menu" size={22} color={textColor} />
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                            <Text style={{ color: textColor, fontSize: 18, fontWeight: '700' }}>
                                Dashboard
                            </Text>
                            <Text style={{ color: labelColor, fontSize: 13, marginTop: 2 }}>
                                {monthLabel(displayMonth)}
                            </Text>
                        </View>
                    </View>

                    {/* Error banner */}
                    {error && (
                        <View
                            style={{
                                backgroundColor: '#fef2f2',
                                borderRadius: 10,
                                padding: 12,
                                marginBottom: 16,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
                            <TouchableOpacity onPress={refetch}>
                                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
                                    Tentar novamente
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Summary cards row */}
                    {currentSummary && (
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginBottom: 16,
                            }}
                        >
                            <SummaryCard
                                label="Receita"
                                value={currentSummary.income}
                                color="#22c55e"
                                bgCard={bgCard}
                                textColor={textColor}
                                labelColor={labelColor}
                            />
                            <SummaryCard
                                label="Despesa"
                                value={currentSummary.expense}
                                color="#ef4444"
                                bgCard={bgCard}
                                textColor={textColor}
                                labelColor={labelColor}
                            />
                            <SummaryCard
                                label="Saldo"
                                value={currentSummary.net}
                                color="#6366f1"
                                bgCard={bgCard}
                                textColor={textColor}
                                labelColor={labelColor}
                            />
                        </View>
                    )}

                    {/* Monthly bar chart */}
                    {monthlyData.length > 0 && <MonthlyChart data={monthlyData} />}

                    {/* Category donut chart */}
                    <CategoryChart
                        slices={categorySlices}
                        selectedMonth={selectedMonth}
                        onMonthChange={setSelectedMonth}
                        availableMonths={availableMonths}
                    />

                    {/* Subscriptions list (null if empty — RN-06) */}
                    <SubscriptionsList subscriptions={subscriptions} totals={subscriptionTotals} />
                </ScrollView>
            </SafeAreaView>


        </View>
    );
}

// ---- Internal summary card ----
interface SummaryCardProps {
    label: string;
    value: number;
    color: string;
    bgCard: string;
    textColor: string;
    labelColor: string;
}

function SummaryCard({ label, value, color, bgCard, textColor, labelColor }: SummaryCardProps) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bgCard,
                borderRadius: 12,
                padding: 12,
                alignItems: 'flex-start',
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 1,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: color,
                        marginRight: 5,
                    }}
                />
                <Text style={{ color: labelColor, fontSize: 11 }}>{label}</Text>
            </View>
            <Text
                style={{ color: textColor, fontSize: 13, fontWeight: '700' }}
                numberOfLines={1}
                adjustsFontSizeToFit
            >
                {formatCurrency(value)}
            </Text>
        </View>
    );
}
