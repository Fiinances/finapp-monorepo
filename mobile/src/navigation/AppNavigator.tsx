import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';

import { SideMenu } from '@/components/ui';
import { SideMenuProvider, useSideMenu } from '@/contexts/SideMenuContext';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { BanksScreen } from '@/screens/BanksScreen';
import { InstallmentsScreen } from '@/screens/InstallmentsScreen';
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen';
import { AppTabParamList } from './types';

const Stack = createNativeStackNavigator<AppTabParamList>();

function AppNavigatorInner() {
    const { isMenuOpen, closeMenu } = useSideMenu();
    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Transactions" component={PlaceholderScreen} />
                <Stack.Screen name="Banks" component={BanksScreen} />
                <Stack.Screen name="More" component={PlaceholderScreen} />
                <Stack.Screen name="Installments" component={InstallmentsScreen} />
                <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
            </Stack.Navigator>
            <SideMenu visible={isMenuOpen} onClose={closeMenu} />
        </View>
    );
}

export function AppNavigator() {
    return (
        <SideMenuProvider>
            <AppNavigatorInner />
        </SideMenuProvider>
    );
}
