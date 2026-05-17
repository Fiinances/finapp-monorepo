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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const registerSchema = z
    .object({
        email: z
            .string()
            .min(1, 'E-mail obrigatório.')
            .email('Informe um e-mail válido.'),
        password: z
            .string()
            .min(1, 'Senha obrigatória.')
            .min(8, 'A senha deve ter pelo menos 8 caracteres.')
            .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula.')
            .regex(/[0-9]/, 'Inclua ao menos um número.'),
        confirm: z.string().min(1, 'Confirme sua senha.'),
    })
    .superRefine((data, ctx) => {
        if (data.confirm !== data.password) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirm'],
                message: 'As senhas não coincidem.',
            });
        }
    });

type FieldErrors = { email: string; password: string; confirm: string };

const EMPTY_ERRORS: FieldErrors = { email: '', password: '', confirm: '' };

function parseErrors(result: z.ZodSafeParseError<unknown>): FieldErrors {
    const errors = { ...EMPTY_ERRORS };
    for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field in errors && !errors[field]) {
            errors[field] = issue.message;
        }
    }
    return errors;
}

interface PasswordStrength {
    score: number; // 0-4
    label: string;
    color: string;
}

function getPasswordStrength(pwd: string): PasswordStrength {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const levels: PasswordStrength[] = [
        { score: 0, label: '', color: '' },
        { score: 1, label: 'Fraca', color: '#ef4444' },
        { score: 2, label: 'Média', color: '#f97316' },
        { score: 3, label: 'Forte', color: '#84cc16' },
        { score: 4, label: 'Muito forte', color: '#22c55e' },
    ];
    return levels[score];
}



export function RegisterScreen({ navigation }: Props) {
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS);
    const [submitError, setSubmitError] = useState('');

    const strength = getPasswordStrength(password);

    async function handleRegister() {
        setSubmitError('');
        const result = registerSchema.safeParse({ email: email.trim(), password, confirm });
        if (!result.success) {
            setFieldErrors(parseErrors(result));
            return;
        }

        setLoading(true);
        const { error } = await signUp(email.trim(), password);
        setLoading(false);

        if (error) {
            setSubmitError(error);
        } else {
            navigation.navigate('Login');
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0f1117]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-6"
            >
                <Pressable onPress={() => navigation.goBack()} className="mb-6">
                    <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af]" style={{ fontFamily: typography.fontFamily.medium }}>← Voltar</Text>
                </Pressable>

                <Text className="text-2xl font-bold text-[#1a1f2e] dark:text-[#f8f9fc] mb-2" style={{ fontFamily: typography.fontFamily.bold }}>
                    Criar conta
                </Text>
                <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-8" style={{ fontFamily: typography.fontFamily.regular }}>
                    Comece a organizar suas finanças
                </Text>

                {/* E-mail */}
                <Text className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] mb-1 uppercase tracking-wide" style={{ fontFamily: typography.fontFamily.medium }}>
                    E-mail
                </Text>
                <TextInput
                    className={`border rounded-lg px-4 py-3 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e] ${fieldErrors.email
                        ? 'border-[#ef4444]'
                        : 'border-[#e5e7eb] dark:border-[#374151]'
                        }`}
                    placeholder="seu@email.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(v) => {
                        setEmail(v);
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                    }}
                    style={{ fontFamily: typography.fontFamily.regular }}
                />
                {fieldErrors.email ? (
                    <Text className="text-xs text-[#ef4444] mt-1 mb-3">{fieldErrors.email}</Text>
                ) : (
                    <View className="mb-4" />
                )}

                {/* Senha */}
                <Text className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] mb-1 uppercase tracking-wide" style={{ fontFamily: typography.fontFamily.medium }}>
                    Senha
                </Text>
                <TextInput
                    className={`border rounded-lg px-4 py-3 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e] ${fieldErrors.password
                        ? 'border-[#ef4444]'
                        : 'border-[#e5e7eb] dark:border-[#374151]'
                        }`}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={password}
                    onChangeText={(v) => {
                        setPassword(v);
                        if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                    }}
                    style={{ fontFamily: typography.fontFamily.regular }}
                />
                {/* Barra de força de senha */}
                {password.length > 0 && (
                    <View className="mt-2">
                        <View className="flex-row gap-1">
                            {[1, 2, 3, 4].map((level) => (
                                <View
                                    key={level}
                                    style={{
                                        flex: 1,
                                        height: 3,
                                        borderRadius: 2,
                                        backgroundColor: strength.score >= level ? strength.color : '#e5e7eb',
                                    }}
                                />
                            ))}
                        </View>
                        {strength.label ? (
                            <Text style={{ color: strength.color }} className="text-xs mt-1">
                                Força da senha: {strength.label}
                            </Text>
                        ) : null}
                    </View>
                )}
                {fieldErrors.password ? (
                    <Text className="text-xs text-[#ef4444] mt-1 mb-3">{fieldErrors.password}</Text>
                ) : (
                    <View className="mb-4" />
                )}

                {/* Confirmar senha */}
                <Text className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] mb-1 uppercase tracking-wide" style={{ fontFamily: typography.fontFamily.medium }}>
                    Confirmar senha
                </Text>
                <TextInput
                    className={`border rounded-lg px-4 py-3 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e] ${fieldErrors.confirm
                        ? 'border-[#ef4444]'
                        : 'border-[#e5e7eb] dark:border-[#374151]'
                        }`}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={confirm}
                    onChangeText={(v) => {
                        setConfirm(v);
                        if (fieldErrors.confirm) setFieldErrors(prev => ({ ...prev, confirm: '' }));
                    }}
                    style={{ fontFamily: typography.fontFamily.regular }}
                />
                {fieldErrors.confirm ? (
                    <Text className="text-xs text-[#ef4444] mt-1 mb-3">{fieldErrors.confirm}</Text>
                ) : (
                    <View className="mb-6" />
                )}

                {/* Erro de servidor */}
                {submitError ? (
                    <Text className="text-xs text-[#ef4444] mb-4 text-center">{submitError}</Text>
                ) : null}

                <Pressable
                    onPress={handleRegister}
                    disabled={loading}
                    className={`rounded-lg py-3 items-center ${loading ? 'bg-[#1a1f2e]/50 dark:bg-[#e5e7eb]/50' : 'bg-[#1a1f2e] dark:bg-[#e5e7eb]'}`}
                >
                    <Text className="text-sm font-semibold text-white dark:text-[#0f1117]" style={{ fontFamily: typography.fontFamily.semiBold }}>
                        {loading ? 'Cadastrando…' : 'Criar conta'}
                    </Text>
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

