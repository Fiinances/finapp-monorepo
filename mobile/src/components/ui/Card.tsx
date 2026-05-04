import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
    className?: string;
}

export function Card({ className = '', children, ...props }: CardProps) {
    return (
        <View
            className={`bg-brand-card dark:bg-brand-card-dark rounded-lg border border-brand-border dark:border-brand-border-dark p-4 ${className}`}
            {...props}
        >
            {children}
        </View>
    );
}
