import React from 'react';
import { Pressable, Text, View } from 'react-native';

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
    const { type, description, amount, date, category } = transaction;
    const color = TYPE_COLORS[type].light;
    const sign = TYPE_SIGN[type];

    return (
        <Pressable
            onPress={() => onPress?.(transaction)}
            className="flex-row items-center px-4 py-3 bg-white dark:bg-[#1a1f2e] active:opacity-70"
        >
            {/* Indicador de tipo */}
            <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3 shrink-0"
                style={{ backgroundColor: `${color}22` }}
            >
                <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                />
            </View>

            {/* Descrição + categoria */}
            <View className="flex-1 mr-2">
                <Text
                    numberOfLines={1}
                    className="text-sm font-medium text-[#1a1f2e] dark:text-[#f8f9fc]"
                >
                    {description}
                </Text>
                <Text className="text-xs text-[#6b7280] dark:text-[#9ca3af] mt-0.5">
                    {category?.name ?? '—'} · {formatDate(date)}
                </Text>
            </View>

            {/* Valor */}
            <Text
                className="text-sm font-semibold"
                style={{ color }}
            >
                {sign}
                {formatCurrency(Math.abs(amount))}
            </Text>
        </Pressable>
    );
}
