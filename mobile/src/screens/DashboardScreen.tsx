import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PieChart } from 'react-native-gifted-charts';
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboard } from '@/hooks/useDashboard';
import { AppHeader } from '@/components/ui';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { formatCurrency } from '@/utils/transactions';
import type { AppTabParamList } from '@/navigation/types';
import type { Transaction } from '@/types';

export function DashboardScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const innerBg = isDark ? '#252d45' : '#f3f4f8';

    const { openMenu } = useSideMenu();
    const navigation = useNavigation<NativeStackNavigationProp<AppTabParamList>>();

    const {
        loading,
        error,
        selectedMonth,
        setSelectedMonth,
        refetch,
        saldo,
        saldoPercent,
        entradas,
        essentialTotal,
        nonEssentialTotal,
        investimentos,
        recentTransactions,
    } = useDashboard();

    const now = new Date();
    const maxMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const isAtMax = selectedMonth >= maxMonth;
    const totalGastos = essentialTotal + nonEssentialTotal;

    if (loading && !entradas && !recentTransactions.length) {
        return (
            <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={isDark ? '#e5e7eb' : '#6366f1'} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ── */}
                <AppHeader
                    title="Dashboard"
                    onLeftPress={openMenu}
                />

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={refetch}
                            tintColor={isDark ? '#e5e7eb' : '#6366f1'}
                        />
                    }
                >
                    {/* ── Month Selector ── */}
                    <View style={{
                        backgroundColor: bgCard,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        marginBottom: 16,
                    }}>
                        <TouchableOpacity
                            onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Feather name="chevron-left" size={20} color={textColor} />
                        </TouchableOpacity>

                        <Text style={{
                            color: textColor,
                            fontSize: 15,
                            fontWeight: '600',
                            textTransform: 'capitalize',
                        }}>
                            {getMonthLabel(selectedMonth)}
                        </Text>

                        <TouchableOpacity
                            onPress={() => { if (!isAtMax) setSelectedMonth(shiftMonth(selectedMonth, 1)); }}
                            disabled={isAtMax}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ opacity: isAtMax ? 0.3 : 1 }}
                        >
                            <Feather name="chevron-right" size={20} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Error banner ── */}
                    {error && (
                        <View style={{
                            backgroundColor: isDark ? '#3b1515' : '#fef2f2',
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 16,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
                            <TouchableOpacity onPress={refetch}>
                                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
                                    Tentar novamente
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Saldo Atual card ── */}
                    <View style={{
                        backgroundColor: bgCard,
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 16,
                        shadowColor: '#000',
                        shadowOpacity: isDark ? 0.3 : 0.07,
                        shadowRadius: 10,
                        elevation: 3,
                    }}>
                        <Text style={{ color: labelColor, fontSize: 13, marginBottom: 6 }}>
                            Saldo Atual
                        </Text>
                        <Text style={{ color: textColor, fontSize: 32, fontWeight: '700', marginBottom: 12 }}>
                            {formatCurrency(saldo)}
                        </Text>

                        {saldoPercent !== null && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: saldoPercent >= 0
                                    ? (isDark ? '#14532d' : '#dcfce7')
                                    : (isDark ? '#3b1515' : '#fee2e2'),
                                borderRadius: 20,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                alignSelf: 'flex-start',
                                marginBottom: 16,
                            }}>
                                <Feather
                                    name={saldoPercent >= 0 ? 'arrow-up' : 'arrow-down'}
                                    size={11}
                                    color={saldoPercent >= 0 ? '#22c55e' : '#ef4444'}
                                />
                                <Text style={{
                                    color: saldoPercent >= 0 ? '#22c55e' : '#ef4444',
                                    fontSize: 12,
                                    fontWeight: '600',
                                    marginLeft: 4,
                                }}>
                                    {saldoPercent >= 0 ? '+' : ''}{saldoPercent.toFixed(0)}% em relação ao mês anterior
                                </Text>
                            </View>
                        )}

                        {/* Entradas / Gastos row */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{
                                flex: 1,
                                backgroundColor: innerBg,
                                borderRadius: 10,
                                padding: 12,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Feather name="arrow-down-circle" size={13} color="#22c55e" />
                                    <Text style={{ color: labelColor, fontSize: 11, marginLeft: 5 }}>Entradas</Text>
                                </View>
                                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#22c55e', fontWeight: '700', fontSize: 14 }}>
                                    {formatCurrency(entradas)}
                                </Text>
                            </View>
                            <View style={{
                                flex: 1,
                                backgroundColor: innerBg,
                                borderRadius: 10,
                                padding: 12,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Feather name="bar-chart-2" size={13} color="#3b82f6" />
                                    <Text style={{ color: labelColor, fontSize: 11, marginLeft: 5 }}>Investido</Text>
                                </View>
                                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#3b82f6', fontWeight: '700', fontSize: 14 }}>
                                    {formatCurrency(investimentos)}
                                </Text>
                            </View>
                            <View style={{
                                flex: 1,
                                backgroundColor: innerBg,
                                borderRadius: 10,
                                padding: 12,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Feather name="arrow-up-circle" size={13} color="#ef4444" />
                                    <Text style={{ color: labelColor, fontSize: 11, marginLeft: 5 }}>Gastos</Text>
                                </View>
                                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>
                                    {formatCurrency(totalGastos)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Resumo do Mês ── */}
                    <View style={{
                        backgroundColor: bgCard,
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 16,
                        shadowColor: '#000',
                        shadowOpacity: isDark ? 0.3 : 0.07,
                        shadowRadius: 10,
                        elevation: 3,
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: textColor, marginBottom: 16 }}>
                            Resumo do Mês
                        </Text>

                        {/* Entradas row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{
                                width: 28, height: 28, borderRadius: 6,
                                backgroundColor: isDark ? '#14532d' : '#dcfce7',
                                justifyContent: 'center', alignItems: 'center', marginRight: 10,
                            }}>
                                <Feather name="trending-up" size={14} color="#22c55e" />
                            </View>
                            <Text style={{ flex: 1, color: labelColor, fontSize: 14 }}>Entradas</Text>
                            <Text style={{ color: '#22c55e', fontWeight: '600', fontSize: 14 }}>
                                {formatCurrency(entradas)}
                            </Text>
                        </View>

                        {/* Essenciais row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{
                                width: 12, height: 12, borderRadius: 6,
                                backgroundColor: '#6366f1',
                                marginRight: 10, marginLeft: 8,
                            }} />
                            <Text style={{ flex: 1, color: labelColor, fontSize: 14 }}>Essenciais</Text>
                            <Text style={{ color: '#6366f1', fontWeight: '600', fontSize: 14 }}>
                                {formatCurrency(essentialTotal)}
                            </Text>
                        </View>

                        {/* Não Essenciais row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <View style={{
                                width: 12, height: 12, borderRadius: 6,
                                backgroundColor: isDark ? '#4b5563' : '#d1d5db',
                                marginRight: 10, marginLeft: 8,
                            }} />
                            <Text style={{ flex: 1, color: labelColor, fontSize: 14 }}>Não Essenciais</Text>
                            <Text style={{ color: labelColor, fontWeight: '600', fontSize: 14 }}>
                                {formatCurrency(nonEssentialTotal)}
                            </Text>
                        </View>

                        {/* Donut chart */}
                        {totalGastos > 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                                <PieChart
                                    data={[
                                        { value: essentialTotal > 0 ? essentialTotal : 0.001, color: '#6366f1' },
                                        { value: nonEssentialTotal > 0 ? nonEssentialTotal : 0.001, color: isDark ? '#4b5563' : '#e5e7eb' },
                                    ]}
                                    donut
                                    radius={85}
                                    innerRadius={58}
                                    innerCircleColor={bgCard}
                                    centerLabelComponent={() => (
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: labelColor, fontSize: 11 }}>Gastos</Text>
                                            <Text style={{ color: textColor, fontSize: 14, fontWeight: '700' }}>
                                                {formatCurrency(totalGastos)}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                                <Text style={{ color: labelColor, fontSize: 13 }}>
                                    Nenhum gasto registrado neste mês
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* ── Últimas Transações ── */}
                    <View>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 12,
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textColor }}>
                                Últimas Transações
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Transactions' as any)}>
                                <Text style={{ color: '#6366f1', fontSize: 13, fontWeight: '500' }}>
                                    Ver todas
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{
                            backgroundColor: bgCard,
                            borderRadius: 16,
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOpacity: isDark ? 0.3 : 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}>
                            {recentTransactions.length === 0 ? (
                                <Text style={{ color: labelColor, textAlign: 'center', padding: 24, fontSize: 13 }}>
                                    Nenhuma transação neste mês.
                                </Text>
                            ) : (
                                recentTransactions.map((tx, idx) => (
                                    <TransactionRow
                                        key={tx.id}
                                        tx={tx}
                                        isLast={idx === recentTransactions.length - 1}
                                        borderColor={borderColor}
                                        textColor={textColor}
                                        labelColor={labelColor}
                                    />
                                ))
                            )}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shiftMonth(my: string, delta: number): string {
    const [mStr, yStr] = my.split('/');
    let m = parseInt(mStr, 10) + delta;
    let y = parseInt(yStr, 10);
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    return `${String(m).padStart(2, '0')}/${y}`;
}

function getMonthLabel(my: string): string {
    if (!my) return '';
    const [mStr, yStr] = my.split('/');
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return `${months[parseInt(mStr, 10) - 1]} ${yStr}`;
}

function formatTxDate(dateStr: string): string {
    const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number);
    const txDate = new Date(y, m - 1, d);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.floor((todayStart.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${String(d).padStart(2, '0')} de ${months[m - 1]}`;
}

function txSubLabel(tx: Transaction): string {
    if (tx.type === 'income') return 'Receita';
    if (tx.type === 'investment') return 'Investimento';
    if (tx.type === 'card_payment') return 'Pgto. Cartão';
    if (tx.type === 'transfer') return 'Transferência';
    if (tx.is_essential) return 'Essencial';
    return tx.category?.name ?? 'Despesa';
}

function txIconName(tx: Transaction): string {
    if (tx.type === 'income') return 'dollar-sign';
    if (tx.type === 'investment') return 'bar-chart-2';
    if (tx.type === 'card_payment') return 'credit-card';
    if (tx.type === 'transfer') return 'repeat';
    return 'shopping-bag';
}

function txIconBg(tx: Transaction): string {
    if (tx.type === 'income') return '#dcfce7';
    if (tx.type === 'investment') return '#dbeafe';
    if (tx.type === 'card_payment') return '#ede9fe';
    if (tx.type === 'transfer') return '#fef9c3';
    const c = tx.category?.color;
    if (c) return c + '22';
    return '#ede9fe';
}

function txIconFg(tx: Transaction): string {
    if (tx.type === 'income') return '#22c55e';
    if (tx.type === 'investment') return '#3b82f6';
    if (tx.type === 'card_payment') return '#7c3aed';
    if (tx.type === 'transfer') return '#ca8a04';
    return tx.category?.color ?? '#6366f1';
}

// ── TransactionRow component ─────────────────────────────────────────────────

interface TxRowProps {
    tx: Transaction;
    isLast: boolean;
    borderColor: string;
    textColor: string;
    labelColor: string;
}

function TransactionRow({ tx, isLast, borderColor, textColor, labelColor }: TxRowProps) {
    const isIncome = tx.type === 'income';
    const amountColor = isIncome ? '#22c55e' : '#ef4444';
    const amountPrefix = isIncome ? '+' : '-';

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: borderColor,
        }}>
            <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: txIconBg(tx),
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
            }}>
                <Feather name={txIconName(tx) as any} size={18} color={txIconFg(tx)} />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: textColor, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                    {tx.description}
                </Text>
                <Text style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>
                    {formatTxDate(tx.date)} · {txSubLabel(tx)}
                </Text>
            </View>

            <Text style={{ color: amountColor, fontWeight: '600', fontSize: 14 }}>
                {amountPrefix}{formatCurrency(tx.amount)}
            </Text>
        </View>
    );
}
