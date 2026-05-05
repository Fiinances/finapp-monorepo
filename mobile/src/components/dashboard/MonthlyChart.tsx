import React from 'react';
import { View, Text, ScrollView, useColorScheme } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { MonthlyBarData } from '@/hooks/useDashboard';
import { formatCurrency } from '@/utils/transactions';

interface Props {
    data: MonthlyBarData[];
}

const INCOME_COLOR = '#22c55e';
const EXPENSE_COLOR = '#ef4444';
const INVEST_COLOR = '#f59e0b';
const NET_COLOR = '#6366f1';

export function MonthlyChart({ data }: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';

    if (!data.length) return null;

    // gifted-charts BarChart expects grouped bars via `stackData`
    // We build a grouped bar: [income, expense, investment] per month
    const barData = data.flatMap((item) => {
        const label = item.monthYear.slice(0, 2); // e.g. "01"
        return [
            {
                value: item.income,
                label,
                frontColor: INCOME_COLOR,
                spacing: 2,
                labelTextStyle: { color: labelColor, fontSize: 9 },
            },
            {
                value: item.expense,
                frontColor: EXPENSE_COLOR,
                spacing: 2,
            },
            {
                value: item.investment,
                frontColor: INVEST_COLOR,
                spacing: 16,
            },
        ];
    });

    // Net line via lineData (gifted-charts supports lineData overlay)
    const lineData = data.map((item) => ({ value: item.net }));

    // Legend
    const legend = [
        { color: INCOME_COLOR, label: 'Receita' },
        { color: EXPENSE_COLOR, label: 'Despesa' },
        { color: INVEST_COLOR, label: 'Investimento' },
        { color: NET_COLOR, label: 'Saldo' },
    ];

    return (
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
            <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
                Últimos 12 meses
            </Text>

            {/* Legend */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 8 }}>
                {legend.map((item) => (
                    <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                        <View
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: item.color,
                                marginRight: 4,
                            }}
                        />
                        <Text style={{ color: labelColor, fontSize: 11 }}>{item.label}</Text>
                    </View>
                ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                    data={barData}
                    lineData={lineData}
                    lineDataSet={[{ dataPointsColor: NET_COLOR, color: NET_COLOR, thickness: 2 }]}
                    showLine
                    lineConfig={{ color: NET_COLOR, thickness: 2, dataPointsRadius: 3, dataPointsColor: NET_COLOR }}
                    width={data.length * 56}
                    barWidth={12}
                    barBorderRadius={4}
                    noOfSections={4}
                    yAxisTextStyle={{ color: labelColor, fontSize: 9 }}
                    xAxisLabelTextStyle={{ color: labelColor, fontSize: 9 }}
                    rulesColor={isDark ? '#374151' : '#e5e7eb'}
                    yAxisColor={isDark ? '#374151' : '#e5e7eb'}
                    xAxisColor={isDark ? '#374151' : '#e5e7eb'}
                    backgroundColor={bgCard}
                    isAnimated
                    animationDuration={400}
                    renderTooltip={(item: { value: number }) => (
                        <View
                            style={{
                                backgroundColor: isDark ? '#374151' : '#f9fafb',
                                padding: 4,
                                borderRadius: 4,
                            }}
                        >
                            <Text style={{ color: textColor, fontSize: 11 }}>
                                {formatCurrency(item.value)}
                            </Text>
                        </View>
                    )}
                />
            </ScrollView>
        </View>
    );
}
