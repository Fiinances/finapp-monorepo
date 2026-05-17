import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    PressableProps,
    Text,
} from 'react-native';
import { typography } from '@/theme';

interface ButtonProps extends PressableProps {
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    loading?: boolean;
    className?: string;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
        'bg-brand-primary dark:bg-brand-primary-dark',
    secondary:
        'bg-brand-secondary dark:bg-brand-secondary-dark border border-brand-border dark:border-brand-border-dark',
    ghost: 'bg-transparent',
    destructive: 'bg-destructive dark:bg-destructive-dark',
};

const labelStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'text-white dark:text-[#0f1117]',
    secondary: 'text-brand-primary dark:text-brand-primary-dark',
    ghost: 'text-brand-primary dark:text-brand-primary-dark',
    destructive: 'text-white',
};

export function Button({
    label,
    variant = 'primary',
    loading = false,
    disabled,
    className = '',
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            disabled={isDisabled}
            className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${variantStyles[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' ? '#ffffff' : '#1a1f2e'}
                />
            ) : (
                <Text
                    className={`text-sm ${labelStyles[variant]}`}
                    style={{ fontFamily: typography.fontFamily.semiBold }}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}
