import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

interface TypographyProps extends TextProps {
    variant?: 'pageTitle' | 'monetaryValue' | 'cardTitle' | 'body' | 'caption';
    className?: string;
}

const variantStyles: Record<NonNullable<TypographyProps['variant']>, string> = {
    pageTitle: 'text-xl font-semibold text-brand-primary dark:text-brand-primary-dark',
    monetaryValue: 'text-2xl font-bold text-brand-primary dark:text-brand-primary-dark',
    cardTitle: 'text-base font-semibold text-brand-primary dark:text-brand-primary-dark',
    body: 'text-sm font-normal text-brand-muted dark:text-brand-muted-dark',
    caption: 'text-xs font-normal text-brand-muted dark:text-brand-muted-dark',
};

export function Typography({
    variant = 'body',
    className = '',
    children,
    ...props
}: TypographyProps) {
    return (
        <RNText className={`${variantStyles[variant]} ${className}`} {...props}>
            {children}
        </RNText>
    );
}
