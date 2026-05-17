import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { typography } from '@/theme';

interface TypographyProps extends TextProps {
    variant?: 'pageTitle' | 'monetaryValue' | 'cardTitle' | 'body' | 'caption';
    className?: string;
}

const variantStyles: Record<NonNullable<TypographyProps['variant']>, string> = {
    pageTitle: 'text-xl text-brand-primary dark:text-brand-primary-dark',
    monetaryValue: 'text-2xl text-brand-primary dark:text-brand-primary-dark',
    cardTitle: 'text-base text-brand-primary dark:text-brand-primary-dark',
    body: 'text-sm text-brand-muted dark:text-brand-muted-dark',
    caption: 'text-xs text-brand-muted dark:text-brand-muted-dark',
};

const variantFontFamily: Record<NonNullable<TypographyProps['variant']>, string> = {
    pageTitle: typography.fontFamily.semiBold,
    monetaryValue: typography.fontFamily.bold,
    cardTitle: typography.fontFamily.semiBold,
    body: typography.fontFamily.regular,
    caption: typography.fontFamily.regular,
};

export function Typography({
    variant = 'body',
    className = '',
    children,
    ...props
}: TypographyProps) {
    return (
        <RNText
            className={`${variantStyles[variant]} ${className}`}
            {...props}
            style={[{ fontFamily: variantFontFamily[variant] }, props.style]}
        >
            {children}
        </RNText>
    );
}
