import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Subscription } from '@/types';
import { SubscriptionTotals } from '@/hooks/useDashboard';
import { formatCurrency } from '@/utils/transactions';

interface Props {
    subscriptions: Subscription[];
    totals: SubscriptionTotals;
}

const PERIOD_LABEL: Record<Subscription['period'], string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
};

export function SubscriptionsList({ subscriptions, totals }: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const dividerColor = isDark ? '#374151' : '#f3f4f6';

    // RN-06: return null if no active subscriptions
    if (!subscriptions.length) return null;

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
                Assinaturas ativas
            </Text>

            {subscriptions.map((sub, idx) => (
                <View key={sub.id}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 10,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
                                {sub.name}
                            </Text>
                            <Text style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>
                                {PERIOD_LABEL[sub.period]}
                            </Text>
                        </View>
                        <Text
                            style={{
                                color: sub.type === 'income' ? '#22c55e' : '#ef4444',
                                fontSize: 14,
                                fontWeight: '600',
                            }}
                        >
                            {sub.type === 'income' ? '+' : '-'}{formatCurrency(sub.amount)}
                        </Text>
                    </View>
                    {idx < subscriptions.length - 1 && (
                        <View style={{ height: 1, backgroundColor: dividerColor }} />
                    )}
                </View>
            ))}

            {/* Totals row */}
            <View
                style={{
                    borderTopWidth: 1,
                    borderTopColor: dividerColor,
                    marginTop: 8,
                    paddingTop: 12,
                    gap: 6,
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: labelColor, fontSize: 13 }}>Total mensal equiv.</Text>
                    <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
                        {formatCurrency(totals.monthlyTotal)}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: labelColor, fontSize: 13 }}>Total anual equiv.</Text>
                    <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
                        {formatCurrency(totals.yearlyTotal)}
                    </Text>
                </View>
            </View>
        </View>
    );
}
