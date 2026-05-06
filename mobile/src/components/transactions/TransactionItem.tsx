import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { Transaction } from '@/types';
import { TYPE_COLORS, TYPE_LABELS, formatCurrency } from '@/utils/transactions';
import { Card } from '../ui/Card';

interface Props {
    transaction: Transaction;
    onPress?: (transaction: Transaction) => void;
}

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
    income: 'arrow-down-left',
    expense: 'arrow-up-right',
    investment: 'trending-up',
    transfer: 'repeat',
    card_payment: 'credit-card',
};

function parseDayDate(date: string): { day: string; weekday: string } {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return { day: '??', weekday: '???' };
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return { day: m[3], weekday: weekdays[d.getDay()] };
}

export function TransactionItem({ transaction, onPress }: Props) {
    const isDark = useColorScheme() === 'dark';
    const { type, description, amount, date, category } = transaction;
    const color = TYPE_COLORS[type].light;
    const icon = TYPE_ICONS[type] ?? 'circle';
    const { day, weekday } = parseDayDate(date);

    const textPrimary = isDark ? '#f1f5f9' : '#1a1f2e';
    const textMuted = isDark ? '#6b7280' : '#9ca3af';
    const dividerColor = isDark ? '#2d3748' : '#e5e7eb';
    const categoryBg = category?.color ? `${category.color}22` : `${color}18`;
    const categoryColor = category?.color ?? color;

    return (
        <Pressable
            onPress={() => onPress?.(transaction)}
            style={({ pressed }) => ({
                marginHorizontal: 12,
                marginVertical: 3,
                opacity: pressed ? 0.75 : 1,
            })}
        >
            <Card
                size="md"
                variant="elevated"
                className='m-3'
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.25 : 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                }}
            >
                {/* Coluna de data */}
                <View style={{ alignItems: 'center', width: 30, marginRight: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary, lineHeight: 22 }}>
                        {day}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: textMuted, textTransform: 'uppercase' }}>
                        {weekday}
                    </Text>
                </View>

                {/* Divisor vertical */}
                <View style={{ width: 1, height: 36, backgroundColor: dividerColor, marginRight: 12 }} />

                {/* Ícone do tipo */}
                <View
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        backgroundColor: `${color}20`,
                    }}
                >
                    <Feather name={icon} size={17} color={color} />
                </View>

                {/* Descrição + categoria */}
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text
                        numberOfLines={1}
                        style={{ fontSize: 14, fontWeight: '600', color: textPrimary, marginBottom: 4 }}
                    >
                        {description}
                    </Text>
                    {category ? (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                alignSelf: 'flex-start',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 6,
                                backgroundColor: categoryBg,
                            }}
                        >
                            <View
                                style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 3,
                                    backgroundColor: categoryColor,
                                }}
                            />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: categoryColor }}>
                                {category.name}
                            </Text>
                        </View>
                    ) : (
                        <Text style={{ fontSize: 11, color: textMuted }}>{TYPE_LABELS[type]}</Text>
                    )}
                </View>

                {/* Valor */}
                <Text style={{ fontSize: 15, fontWeight: '700', color, flexShrink: 0 }}>
                    {type === 'income' ? '+' : '−'}{formatCurrency(Math.abs(amount))}
                </Text>
            </Card>
        </Pressable >
    );
}

