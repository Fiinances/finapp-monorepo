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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 18
                }}
            >
                <TouchableOpacity
                    onPress={openMenu}
                    style={{ padding: 4, marginRight: 16 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="menu" size={22} color={textColor} />
                </TouchableOpacity>

                <Text style={{ fontSize: 18, fontWeight: '700', color: textColor, flex: 1 }}>
                    Transações
                </Text>
            </View>

            {/* Lista */}
            <View style={{ flex: 1, backgroundColor: bg }}>
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
