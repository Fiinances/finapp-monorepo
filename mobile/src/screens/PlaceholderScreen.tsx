import React from 'react';
import { Text, View } from 'react-native';

export function PlaceholderScreen({ route }: { route: { name: string } }) {
    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-[#0f1117]">
            <Text className="text-[#6b7280] dark:text-[#9ca3af]">{route.name}</Text>
        </View>
    );
}
