import React from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { Transaction } from '@/types';
import {
    TYPE_COLORS,
    TYPE_SIGN,
    formatCurrency,
    formatDate,
} from '@/utils/transactions';

interface Props {
    transaction: Transaction;
    onPress?: (transaction: Transaction) => void;
}

export function TransactionItem({ transaction, onPress }: Props) {
    const isDark = useColorScheme() === 'dark';
    const { type, description, amount, date, category } = transaction;
    const color = TYPE_COLORS[type].light;
    const sign = TYPE_SIGN[type];

    return (
        <Pressable
            onPress={() => onPress?.(transaction)}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: isDark ? '#1a1f2e' : '#ffffff',
                opacity: pressed ? 0.7 : 1,
            })}
        >
            {/* Indicador de tipo */}
            <View
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    backgroundColor: `${color}22`,
                }}
            >
                <View
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: color,
                    }}
                />
            </View>

            {/* Descrição + categoria */}
            <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: isDark ? '#f8f9fc' : '#1a1f2e',
                    }}
                >
                    {description}
                </Text>
                <Text
                    style={{
                        fontSize: 12,
                        color: isDark ? '#9ca3af' : '#6b7280',
                        marginTop: 2,
                    }}
                >
                    {category?.name ?? '—'} · {formatDate(date)}
                </Text>
            </View>

            {/* Valor */}
            <Text style={{ fontSize: 14, fontWeight: '600', color }}>
                {sign}{formatCurrency(Math.abs(amount))}
            </Text>
        </Pressable>
    );
}
