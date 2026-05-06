import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    onLeftPress: () => void;
    leftIcon?: React.ComponentProps<typeof Feather>['name'];
    rightElement?: React.ReactNode;
}

export function AppHeader({
    title,
    subtitle,
    onLeftPress,
    leftIcon = 'menu',
    rightElement,
}: AppHeaderProps) {
    const isDark = useColorScheme() === 'dark';

    const border = isDark ? '#1e2433' : '#e5e7eb';
    const textColor = isDark ? '#e5e7eb' : '#1a1f2e';
    const subColor = isDark ? '#9ca3af' : '#6b7280';

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: border,
            }}
        >
            <TouchableOpacity
                onPress={onLeftPress}
                style={{ padding: 4, marginRight: 16 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Feather name={leftIcon} size={22} color={textColor} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text style={{ fontSize: 12, color: subColor, marginTop: 1 }}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {rightElement ?? null}
        </View>
    );
}
