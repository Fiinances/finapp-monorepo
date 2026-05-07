import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface BulkDeleteSheetProps {
    visible: boolean;
    title: string;
    description: string;
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export function BulkDeleteSheet({
    visible,
    title,
    description,
    loading = false,
    onConfirm,
    onClose,
}: BulkDeleteSheetProps) {
    const isDark = useColorScheme() === 'dark';
    const insets = useSafeAreaInsets();

    const bgSheet = isDark ? '#1a1f2e' : '#ffffff';
    const bgOverlay = 'rgba(0,0,0,0.55)';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';
    const divider = isDark ? '#2d3550' : '#e5e7eb';
    const bgCancel = isDark ? '#252d45' : '#f3f4f8';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: bgOverlay }}>
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={1}
                    onPress={loading ? undefined : onClose}
                />
                <View
                    style={{
                        backgroundColor: bgSheet,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        paddingTop: 12,
                        paddingHorizontal: 20,
                        paddingBottom: Math.max(insets.bottom + 16, 24),
                        shadowColor: '#000',
                        shadowOpacity: 0.2,
                        shadowOffset: { width: 0, height: -4 },
                        shadowRadius: 16,
                        elevation: 16,
                    }}
                >
                    {/* Handle bar */}
                    <View
                        style={{
                            width: 36,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: divider,
                            alignSelf: 'center',
                            marginBottom: 20,
                        }}
                    />

                    {/* Warning icon */}
                    <View
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 26,
                            backgroundColor: isDark ? '#3b1515' : '#fef2f2',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Feather name="trash-2" size={22} color="#ef4444" />
                    </View>

                    {/* Title */}
                    <Text
                        style={{
                            color: textColor,
                            fontSize: 17,
                            fontWeight: '700',
                            marginBottom: 8,
                        }}
                    >
                        {title}
                    </Text>

                    {/* Description */}
                    <Text
                        style={{
                            color: labelColor,
                            fontSize: 14,
                            lineHeight: 20,
                            marginBottom: 28,
                        }}
                    >
                        {description}
                    </Text>

                    {/* Confirm button */}
                    <TouchableOpacity
                        onPress={onConfirm}
                        disabled={loading}
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: '#ef4444',
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 10,
                            opacity: loading ? 0.7 : 1,
                            flexDirection: 'row',
                            gap: 8,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                            <Feather name="trash-2" size={16} color="#ffffff" />
                        )}
                        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                            {loading ? 'Excluindo...' : 'Excluir tudo'}
                        </Text>
                    </TouchableOpacity>

                    {/* Cancel button */}
                    <TouchableOpacity
                        onPress={onClose}
                        disabled={loading}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: bgCancel,
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }}>
                            Cancelar
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
