import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, useColorScheme } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { MonthlyBarData } from '@/hooks/useDashboard';
import { formatCurrency } from '@/utils/transactions';

interface Props {
    data: MonthlyBarData[];
}

const INCOME_COLOR = '#22c55e';
const EXPENSE_COLOR = '#ef4444';
const INVEST_COLOR = '#f59e0b';

export function MonthlyChart({ data }: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';

    if (!data.length) return null;

    const scrollRef = useRef<ScrollView>(null);
    const [selected, setSelected] = useState<{ label: string; value: number; color: string } | null>(null);

    const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // gifted-charts BarChart expects grouped bars via a flat array with spacing
    // We build a grouped bar: [income, expense, investment] per month
    const barData = data.flatMap((item) => {

        const monthIdx = parseInt(item.monthYear.slice(0, 2), 10) - 1;
        const label = MONTH_ABBR[monthIdx] ?? item.monthYear.slice(0, 2);
        return [
            {
                value: item.income,
                label,
                frontColor: INCOME_COLOR,
                spacing: 2,
                labelTextStyle: { color: labelColor, fontSize: 9 },
                onPress: () => setSelected({ label: `${label} · Receita`, value: item.income, color: INCOME_COLOR }),
            },
            {
                value: item.expense,
                frontColor: EXPENSE_COLOR,
                spacing: 2,
                onPress: () => setSelected({ label: `${label} · Despesa`, value: item.expense, color: EXPENSE_COLOR }),
            },
            {
                value: item.investment,
                frontColor: INVEST_COLOR,
                spacing: 16,
                onPress: () => setSelected({ label: `${label} · Investimento`, value: item.investment, color: INVEST_COLOR }),
            },
        ];
    });

    // Legend
    const legend = [
        { color: INCOME_COLOR, label: 'Receita' },
        { color: EXPENSE_COLOR, label: 'Despesa' },
        { color: INVEST_COLOR, label: 'Investimento' },
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
            <Pressable onPress={() => setSelected(null)}>
                <View style={{ position: 'relative' }}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
                    >
                        <BarChart
                            data={barData}
                            width={data.length * 100}
                            height={200}
                            barWidth={24}
                            barBorderRadius={4}
                            noOfSections={4}
                            initialSpacing={8}
                            yAxisTextStyle={{ color: labelColor, fontSize: 9 }}
                            xAxisLabelTextStyle={{ color: labelColor, fontSize: 9 }}
                            rulesColor={isDark ? '#374151' : '#e5e7eb'}
                            yAxisColor={isDark ? '#374151' : '#e5e7eb'}
                            xAxisColor={isDark ? '#374151' : '#e5e7eb'}
                        />
                    </ScrollView>

                    {selected && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                            }}
                        >
                            <View
                                style={{
                                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                    borderRadius: 8,
                                    paddingVertical: 6,
                                    paddingHorizontal: 10,
                                    borderLeftWidth: 3,
                                    borderLeftColor: selected.color,
                                    shadowColor: '#000',
                                    shadowOpacity: 0.15,
                                    shadowRadius: 6,
                                    elevation: 6,
                                }}
                            >
                                <Text style={{ color: labelColor, fontSize: 10, marginBottom: 2 }}>{selected.label}</Text>
                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '700' }}>
                                    {formatCurrency(selected.value)}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    );
}
