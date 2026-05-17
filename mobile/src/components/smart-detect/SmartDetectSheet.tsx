import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    PanResponder,
    ScrollView,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartDetect, SmartCandidate } from '@/hooks/useSmartDetect';

interface SmartDetectSheetProps {
    visible: boolean;
    onClose: () => void;
    mode: 'installment' | 'subscription';
    onPrefillInstallment?: (candidate: SmartCandidate, onSuccess: () => void) => void;
    onPrefillSubscription?: (candidate: SmartCandidate, onSuccess: () => void) => void;
}

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SmartDetectSheet({
    visible,
    onClose,
    mode,
    onPrefillInstallment,
    onPrefillSubscription,
}: SmartDetectSheetProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const bgCard = isDark ? '#1a1f2e' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const inputBg = isDark ? '#252d45' : '#f9fafb';

    const { loading, error, candidates, analyze, dismiss, markCreated, created, dismissed } =
        useSmartDetect();

    useEffect(() => {
        if (visible) {
            analyze();
        }
    }, [visible, analyze]);

    // Swipe to dismiss
    const translateY = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) translateY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 80 || g.vy > 0.5) {
                    Animated.timing(translateY, { toValue: 800, duration: 220, useNativeDriver: true }).start(() => {
                        translateY.setValue(0);
                        onClose();
                    });
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    // Lista única de recorrências, sem tabs.
    const filtered = candidates.filter((c) => !dismissed.has(c.id));

    const canCreate = mode === 'installment' ? !!onPrefillInstallment : !!onPrefillSubscription;
    const createLabel = mode === 'installment' ? 'Criar parcelamento' : 'Criar assinatura';

    const handleCreate = (c: SmartCandidate) => {
        if (mode === 'installment' && onPrefillInstallment) {
            onPrefillInstallment(c, () => markCreated(c.id));
            return;
        }

        if (mode === 'subscription' && onPrefillSubscription) {
            onPrefillSubscription(c, () => markCreated(c.id));
        }
    };

    const renderCandidate = (c: SmartCandidate) => {
        const isCreated = created.has(c.id);

        const confidenceColor =
            c.confidence === 'high' ? '#22c55e' : c.confidence === 'medium' ? '#f59e0b' : '#ef4444';
        const confidenceLabel =
            c.confidence === 'high' ? 'Alta' : c.confidence === 'medium' ? 'Média' : 'Baixa';

        return (
            <View
                key={c.id}
                style={{
                    backgroundColor: inputBg,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor,
                    opacity: isCreated ? 0.6 : 1,
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                            {c.displayName}
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 13, marginBottom: 2 }}>
                            {`${formatBRL(c.amount)} • ${c.count} ocorrência${c.count > 1 ? 's' : ''} • ${
                                c.interval === 'weekly' ? 'semanal' : c.interval === 'monthly' ? 'mensal' : 'anual'
                            }`}
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 12 }}>
                            {c.firstMonth} → {c.lastMonth}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? '#1e2540' : '#f0fdf4',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                            }}
                        >
                            <Feather name="shield" size={10} color={confidenceColor} style={{ marginRight: 4 }} />
                            <Text style={{ color: confidenceColor, fontSize: 11, fontWeight: '600' }}>
                                {confidenceLabel}
                            </Text>
                        </View>
                    </View>
                </View>

                {isCreated ? (
                    <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="check-circle" size={14} color="#22c55e" />
                        <Text style={{ color: '#22c55e', fontSize: 13, marginLeft: 6, fontWeight: '600' }}>
                            Criado com sucesso
                        </Text>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                        {canCreate && (
                            <TouchableOpacity
                                onPress={() => handleCreate(c)}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#6366f1',
                                    borderRadius: 8,
                                    paddingVertical: 8,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{createLabel}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => dismiss(c.id)}
                            style={{
                                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                                borderRadius: 8,
                                paddingVertical: 8,
                                paddingHorizontal: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>Ignorar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <Animated.View
                    style={{
                        backgroundColor: bgCard,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        maxHeight: '90%',
                        transform: [{ translateY }],
                    }}
                >
                    <View {...panResponder.panHandlers} style={{ alignItems: 'center', paddingVertical: 14 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: borderColor }} />
                    </View>

                    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: textColor, fontSize: 18, fontWeight: '700' }}>
                                Detectar Recorrências
                            </Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Feather name="x" size={22} color={labelColor} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {loading ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ActivityIndicator color="#6366f1" size="large" />
                                <Text style={{ color: labelColor, marginTop: 12 }}>Analisando transações...</Text>
                            </View>
                        ) : error ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Feather name="alert-circle" size={32} color="#ef4444" />
                                <Text style={{ color: '#ef4444', marginTop: 12, textAlign: 'center' }}>{error}</Text>
                            </View>
                        ) : filtered.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Feather name="search" size={32} color={borderColor} />
                                <Text style={{ color: textColor, fontSize: 16, fontWeight: '600', marginTop: 12 }}>
                                    Nenhuma recorrência encontrada
                                </Text>
                                <Text style={{ color: labelColor, textAlign: 'center', marginTop: 8 }}>
                                    Importe mais transações para que o algoritmo possa identificar recorrências.
                                </Text>
                            </View>
                        ) : (
                            filtered.map(renderCandidate)
                        )}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}
