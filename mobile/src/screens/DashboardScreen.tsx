import { Feather } from '@expo/vector-icons';
import React from 'react';
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

    // Current month key for maxMonth constraint
    const now = new Date();
    const keys = (() => {
        const result: string[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
        }
        return result;
    })();

    // Summary for the selected month
    const currentSummary = monthlyData.find(d => d.monthYear === selectedMonth) ?? monthlyData[monthlyData.length - 1];

    // Month label helper (MMM YYYY format)
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
                                {monthLabel(selectedMonth)}
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

                    {/* Monthly bar chart */}
                    {monthlyData.length > 0 && <MonthlyChart data={monthlyData} />}


                    {/* Global month selector — below 12-month chart, above detailed charts */}
                    <MonthSelector
                        selectedMonth={selectedMonth}
                        onMonthChange={setSelectedMonth}
                        maxMonth={keys[keys.length - 1]}
                        isDark={isDark}
                        textColor={textColor}
                        labelColor={labelColor}
                        bgCard={bgCard}
                        borderColor={borderColor}
                    />

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

                    {/* Category donut chart */}
                    <CategoryChart
                        slices={categorySlices}
                        selectedMonth={selectedMonth}
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

// ---- Month Selector ----
interface MonthSelectorProps {
    selectedMonth: string; // MM/YYYY
    maxMonth: string;      // MM/YYYY — can't go beyond this
    onMonthChange: (m: string) => void;
    isDark: boolean;
    textColor: string;
    labelColor: string;
    bgCard: string;
    borderColor: string;
}

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
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function MonthSelector({
    selectedMonth,
    maxMonth,
    onMonthChange,
    isDark,
    textColor,
    labelColor,
    bgCard,
    borderColor,
}: MonthSelectorProps) {
    const isAtMax = selectedMonth >= maxMonth;

    return (
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
                marginBottom: 16,
            }}
        >
            <TouchableOpacity
                onPress={() => onMonthChange(addMonth(selectedMonth, -1))}
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
                onPress={() => { if (!isAtMax) onMonthChange(addMonth(selectedMonth, 1)); }}
                activeOpacity={isAtMax ? 1 : 0.7}
                disabled={isAtMax}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ opacity: isAtMax ? 0.3 : 1 }}
            >
                <Feather name="chevron-right" size={20} color={textColor} />
            </TouchableOpacity>
        </View>
    );
}
