import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { BanksScreen } from '@/screens/BanksScreen';
import { AppTabParamList } from './types';

const Stack = createNativeStackNavigator<AppTabParamList>();

export function AppNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Transactions" component={PlaceholderScreen} />
            <Stack.Screen name="Banks" component={BanksScreen} />
            <Stack.Screen name="More" component={PlaceholderScreen} />
        </Stack.Navigator>
    );
}
