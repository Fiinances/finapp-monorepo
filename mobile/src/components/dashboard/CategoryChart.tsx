import React, { useMemo } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { CategorySlice } from '@/hooks/useDashboard';
import { formatCurrency } from '@/utils/transactions';

interface Props {
    slices: CategorySlice[];
    selectedMonth: string; // MM/YYYY
}

export function CategoryChart({ slices, selectedMonth: _selectedMonth }: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';

    const pieData = useMemo(
        () =>
            slices.map((s) => ({
                value: s.value,
                color: s.color,
                text: '',
            })),
        [slices],
    );

    const total = slices.reduce((s, c) => s + c.value, 0);

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
                Despesas por categoria
            </Text>

            {slices.length === 0 ? (
                <Text style={{ color: labelColor, fontSize: 13, textAlign: 'center', paddingVertical: 24 }}>
                    Nenhuma despesa registrada neste mês.
                </Text>
            ) : (
                <View style={{ alignItems: 'center' }}>
                    <PieChart
                        data={pieData}
                        donut
                        radius={90}
                        innerRadius={58}
                        innerCircleColor={bgCard}
                        centerLabelComponent={() => (
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: labelColor, fontSize: 10 }}>Total</Text>
                                <Text style={{ color: textColor, fontSize: 13, fontWeight: '700' }}>
                                    {formatCurrency(total)}
                                </Text>
                            </View>
                        )}
                    />

                    {/* Legend */}
                    <View style={{ width: '100%', marginTop: 16 }}>
                        {slices.map((s) => (
                            <View
                                key={`${s.id}-${s.name}`}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 6,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 5,
                                            backgroundColor: s.color,
                                            marginRight: 8,
                                        }}
                                    />
                                    <Text
                                        style={{ color: textColor, fontSize: 13, flex: 1 }}
                                        numberOfLines={1}
                                    >
                                        {s.name}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ color: labelColor, fontSize: 11 }}>
                                        {total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : '0%'}
                                    </Text>
                                    <Text style={{ color: textColor, fontSize: 12, fontWeight: '500', minWidth: 80, textAlign: 'right' }}>
                                        {formatCurrency(s.value)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}
