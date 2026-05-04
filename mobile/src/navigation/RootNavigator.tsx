import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export function RootNavigator() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white dark:bg-[#0f1117]">
                <ActivityIndicator size="large" color="#1a1f2e" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {session ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}
