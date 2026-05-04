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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
        if (!email || !password || !confirm) {
            Alert.alert('Erro', 'Preencha todos os campos.');
            return;
        }
        if (password !== confirm) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        setLoading(true);
        const { error } = await signUp(email.trim(), password);
        setLoading(false);
        if (error) {
            Alert.alert('Erro ao cadastrar', error);
        } else {
            Alert.alert(
                'Cadastro realizado',
                'Verifique seu e-mail para confirmar a conta.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
            );
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0f1117]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-6"
            >
                <Pressable onPress={() => navigation.goBack()} className="mb-6">
                    <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af]">← Voltar</Text>
                </Pressable>

                <Text className="text-2xl font-bold text-[#1a1f2e] dark:text-[#f8f9fc] mb-2">
                    Criar conta
                </Text>
                <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-8">
                    Comece a organizar suas finanças
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
                    className="border border-[#e5e7eb] dark:border-[#374151] rounded-lg px-4 py-3 mb-4 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e]"
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <Text className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] mb-1 uppercase tracking-wide">
                    Confirmar senha
                </Text>
                <TextInput
                    className="border border-[#e5e7eb] dark:border-[#374151] rounded-lg px-4 py-3 mb-6 text-sm text-[#1a1f2e] dark:text-[#f8f9fc] bg-white dark:bg-[#1a1f2e]"
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={confirm}
                    onChangeText={setConfirm}
                />

                <Pressable
                    onPress={handleRegister}
                    disabled={loading}
                    className={`rounded-lg py-3 items-center ${loading ? 'bg-[#1a1f2e]/50 dark:bg-[#e5e7eb]/50' : 'bg-[#1a1f2e] dark:bg-[#e5e7eb]'}`}
                >
                    <Text className="text-sm font-semibold text-white dark:text-[#0f1117]">
                        {loading ? 'Cadastrando…' : 'Criar conta'}
                    </Text>
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
