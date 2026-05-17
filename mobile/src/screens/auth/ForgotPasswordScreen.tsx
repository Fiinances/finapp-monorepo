import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useAuth } from '@/contexts/AuthContext';
import { AuthStackParamList } from '@/navigation/types';
import { typography } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const emailSchema = z.object({
    email: z.string().min(1, 'E-mail obrigatório.').email('Informe um e-mail válido.'),
});

export function ForgotPasswordScreen({ navigation }: Props) {
    const { sendPasswordOtp } = useAuth();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSend() {
        setSubmitError('');
        const result = emailSchema.safeParse({ email: email.trim() });
        if (!result.success) {
            setEmailError(result.error.issues[0]?.message ?? 'E-mail inválido.');
            return;
        }
        setEmailError('');
        setLoading(true);
        const { error } = await sendPasswordOtp(email.trim());
        setLoading(false);
        if (error) {
            setSubmitError(error);
        } else {
            navigation.navigate('ResetPassword', { email: email.trim() });
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0f1117]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-6"
            >
                <Pressable onPress={() => navigation.goBack()} className="mb-8">
                    <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af]" style={{ fontFamily: typography.fontFamily.medium }}>← Voltar</Text>
                </Pressable>

                <Text className="text-2xl font-bold text-[#1a1f2e] dark:text-[#f8f9fc] mb-2" style={{ fontFamily: typography.fontFamily.bold }}>
                    Esqueceu a senha?
                </Text>
                <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-8" style={{ fontFamily: typography.fontFamily.regular }}>
                    Informe seu e-mail e enviaremos um código de 6 dígitos.
                </Text>

                <Text className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] mb-1 uppercase tracking-wide" style={{ fontFamily: typography.fontFamily.medium }}>
                    E-mail
                </Text>
                <TextInput
                    className={`border rounded-lg px-4 py-3 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e] ${emailError ? 'border-[#ef4444]' : 'border-[#e5e7eb] dark:border-[#374151]'}`}
                    placeholder="seu@email.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(v) => {
                        setEmail(v);
                        if (emailError) setEmailError('');
                    }}
                    style={{ fontFamily: typography.fontFamily.regular }}
                />
                {emailError ? (
                    <Text className="text-xs text-[#ef4444] mt-1 mb-3">{emailError}</Text>
                ) : (
                    <View className="mb-4" />
                )}

                {submitError ? (
                    <Text className="text-xs text-[#ef4444] mb-4 text-center">{submitError}</Text>
                ) : null}

                <Pressable
                    onPress={handleSend}
                    disabled={loading}
                    className={`rounded-lg py-3 items-center ${loading ? 'bg-[#1a1f2e]/50 dark:bg-[#e5e7eb]/50' : 'bg-[#1a1f2e] dark:bg-[#e5e7eb]'}`}
                >
                    <Text className="text-sm font-semibold text-white dark:text-[#0f1117]" style={{ fontFamily: typography.fontFamily.semiBold }}>
                        {loading ? 'Enviando…' : 'Enviar código'}
                    </Text>
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
