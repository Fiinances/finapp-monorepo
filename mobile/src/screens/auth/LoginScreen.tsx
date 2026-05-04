import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert('Erro', 'Preencha e-mail e senha.');
            return;
        }
        setLoading(true);
        const { error } = await signIn(email.trim(), password);
        setLoading(false);
        if (error) Alert.alert('Erro ao entrar', error);
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0f1117]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-6"
            >
                <Text className="text-2xl font-bold text-[#1a1f2e] dark:text-[#f8f9fc] mb-2">
                    Finapp
                </Text>
                <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-8">
                    Controle financeiro pessoal
                </Text>

                <Text className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] mb-1 uppercase tracking-wide">
                    E-mail
                </Text>
                <TextInput
                    className="border border-[#e5e7eb] dark:border-[#374151] rounded-lg px-4 py-3 mb-4 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e]"
                    placeholder="seu@email.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                />

                <Text className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] mb-1 uppercase tracking-wide">
                    Senha
                </Text>
                <TextInput
                    className="border border-[#e5e7eb] dark:border-[#374151] rounded-lg px-4 py-3 mb-6 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e]"
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <Pressable
                    onPress={handleLogin}
                    disabled={loading}
                    className={`rounded-lg py-3 items-center ${loading ? 'bg-[#1a1f2e]/50 dark:bg-[#e5e7eb]/50' : 'bg-[#1a1f2e] dark:bg-[#e5e7eb]'}`}
                >
                    <Text className="text-sm font-semibold text-white dark:text-[#0f1117]">
                        {loading ? 'Entrando…' : 'Entrar'}
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => navigation.navigate('Register')}
                    className="mt-4 items-center"
                >
                    <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        Não tem conta?{' '}
                        <Text className="font-semibold text-[#1a1f2e] dark:text-[#e5e7eb]">
                            Cadastrar
                        </Text>
                    </Text>
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
