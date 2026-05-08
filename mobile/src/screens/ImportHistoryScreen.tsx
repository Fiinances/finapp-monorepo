import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, BulkDeleteSheet } from '@/components/ui';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { ImportRecord, useImportHistory } from '@/hooks/useImportHistory';
import { formatDate } from '@/utils/transactions';

type FilterType = 'all' | 'credit_card' | 'bank_account';

function currentMonthYear(): string {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function addMonth(my: string, delta: 1 | -1): string {
    const [mStr, yStr] = my.split('/');
    let m = parseInt(mStr, 10) + delta;
    let y = parseInt(yStr, 10);
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    return `${String(m).padStart(2, '0')}/${y}`;
}

function monthLabel(my: string): string {
    if (!my) return '';
    const [mStr, yStr] = my.split('/');
    const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

export function ImportHistoryScreen() {
    const isDark = useColorScheme() === 'dark';
    const bg = isDark ? '#0f1117' : '#f5f6f8';
    const cardBg = isDark ? '#1a1f2e' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const pillBg = isDark ? '#252d45' : '#f3f4f8';

    const { openMenu } = useSideMenu();
    const { records, loading, error, refetch, deleteRecord } = useImportHistory();

    const [month, setMonth] = useState<string>(currentMonthYear());
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');

    const [deleteTarget, setDeleteTarget] = useState<ImportRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (r.month !== month) return false;
            if (typeFilter !== 'all' && r.destination_type !== typeFilter) return false;
            return true;
        });
    }, [records, month, typeFilter]);

    async function handleConfirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteRecord(deleteTarget.id);
            setDeleteTarget(null);
            Alert.alert('Sucesso', 'Importação excluída com sucesso.');
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir.');
        } finally {
            setDeleting(false);
        }
    }

    const renderCard = ({ item }: { item: ImportRecord }) => {
        const isCard = item.destination_type === 'credit_card';

        return (
            <View
                style={{
                    backgroundColor: cardBg,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: item.destination_color ? `${item.destination_color}15` : (isDark ? '#2d3550' : '#f3f4f8'),
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Feather name={isCard ? 'credit-card' : 'briefcase'} size={18} color={item.destination_color || textColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                                {item.destination_name}
                            </Text>
                            <Text style={{ color: labelColor, fontSize: 13 }}>
                                {isCard ? 'Cartão de Crédito' : 'Conta Bancária'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setDeleteTarget(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ padding: 4 }}
                    >
                        <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                <View style={{ marginTop: 16, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: labelColor, fontSize: 13 }}>Competência</Text>
                        <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>
                            {monthLabel(item.month)}
                        </Text>
                    </View>
                    {isCard && item.billing_month && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: labelColor, fontSize: 13 }}>Fatura</Text>
                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>
                                Fatura {item.billing_month}
                            </Text>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: labelColor, fontSize: 13 }}>Transações</Text>
                        <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>
                            {item.transaction_count} {item.transaction_count === 1 ? 'transação' : 'transações'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: labelColor, fontSize: 13 }}>Formato e Data</Text>
                        <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>
                            {(item.file_format || 'Desconhecido').toUpperCase()} • {new Date(item.imported_at).toLocaleDateString('pt-BR')}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
            <AppHeader
                title="Importações"
                onLeftPress={openMenu}
            />

            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                {/* Month Selector */}
                <View
                    style={{
                        backgroundColor: cardBg,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: borderColor,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        marginBottom: 12,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => setMonth(addMonth(month, -1))}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Feather name="chevron-left" size={20} color={textColor} />
                    </TouchableOpacity>

                    <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }}>
                        {monthLabel(month)}
                    </Text>

                    <TouchableOpacity
                        onPress={() => setMonth(addMonth(month, 1))}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Feather name="chevron-right" size={20} color={textColor} />
                    </TouchableOpacity>
                </View>

                {/* Type Filter */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {(['all', 'credit_card', 'bank_account'] as FilterType[]).map(t => {
                        const active = typeFilter === t;
                        const label = t === 'all' ? 'Todos' : t === 'credit_card' ? 'Cartão' : 'Conta';
                        return (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setTypeFilter(t)}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    borderRadius: 16,
                                    backgroundColor: active ? '#6366f1' : pillBg,
                                    borderWidth: 1,
                                    borderColor: active ? '#6366f1' : borderColor,
                                }}
                            >
                                <Text style={{ color: active ? '#fff' : textColor, fontSize: 13, fontWeight: '500' }}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#6366f1" size="large" />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Feather name="alert-circle" size={32} color="#ef4444" style={{ marginBottom: 12 }} />
                    <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center' }}>{error}</Text>
                    <TouchableOpacity onPress={refetch} style={{ marginTop: 16, padding: 12, backgroundColor: '#ef4444', borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Tentar novamente</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredRecords}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderCard}
                    contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                    refreshing={loading}
                    onRefresh={refetch}
                    ListEmptyComponent={
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#2d3550' : '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Feather name="inbox" size={28} color={labelColor} />
                            </View>
                            <Text style={{ color: textColor, fontSize: 17, fontWeight: '600', marginBottom: 8 }}>
                                Nenhuma importação
                            </Text>
                            <Text style={{ color: labelColor, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                                Você ainda não realizou importações para este mês ou tipo selecionado.
                            </Text>
                        </View>
                    }
                />
            )}

            <BulkDeleteSheet
                visible={deleteTarget !== null}
                title="Excluir importação?"
                description={
                    deleteTarget
                        ? `Isso removerá as ${deleteTarget.transaction_count} transações importadas de ${deleteTarget.destination_name} em ${monthLabel(deleteTarget.month)}. Transações criadas manualmente não serão afetadas.`
                        : ''
                }
                loading={deleting}
                onConfirm={handleConfirmDelete}
                onClose={() => !deleting && setDeleteTarget(null)}
            />
        </SafeAreaView>
    );
}
