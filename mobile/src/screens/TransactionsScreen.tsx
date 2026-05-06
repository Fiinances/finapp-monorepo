import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionList } from '@/components/transactions';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { useTransactions } from '@/hooks/useTransactions';

export function TransactionsScreen() {
    const isDark = useColorScheme() === 'dark';
    const { openMenu } = useSideMenu();
    const { transactions, loading, refetch } = useTransactions();

    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const borderColor = isDark ? '#1e2433' : '#e5e7eb';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                }}
            >
                <TouchableOpacity
                    onPress={openMenu}
                    style={{ padding: 4, marginRight: 12 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="menu" size={22} color={textColor} />
                </TouchableOpacity>

                <Text style={{ fontSize: 18, fontWeight: '700', color: textColor, flex: 1 }}>
                    Transações
                </Text>

                <TouchableOpacity
                    style={{
                        padding: 8,
                        borderRadius: 10,
                        backgroundColor: isDark ? '#1e2433' : '#eef2ff',
                    }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                    <Feather name="filter" size={16} color="#6366f1" />
                </TouchableOpacity>
            </View>

            {/* Lista */}
            <View style={{ flex: 1 }}>
                <TransactionList
                    transactions={transactions}
                    loading={loading}
                    onRefresh={refetch}
                    refreshing={loading}
                />
            </View>
        </SafeAreaView>
    );
}
