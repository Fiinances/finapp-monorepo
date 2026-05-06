import React from 'react';
import { View, ViewProps } from 'react-native';

type CardSize = 'sm' | 'md' | 'lg';
type CardVariant = 'elevated' | 'outline' | 'ghost' | 'filled';

type ICardProps = ViewProps & {
    className?: string;
    size?: CardSize;
    variant?: CardVariant;
};

const SIZE_CLASSES: Record<CardSize, string> = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
};

const VARIANT_CLASSES: Record<CardVariant, string> = {
    elevated: 'bg-brand-card dark:bg-brand-card-dark rounded-xl shadow shadow-black/10',
    outline: 'bg-brand-card dark:bg-brand-card-dark rounded-xl border border-brand-border dark:border-brand-border-dark',
    ghost: 'bg-transparent rounded-xl',
    filled: 'bg-brand-secondary dark:bg-brand-secondary-dark rounded-xl',
};

const Card = React.forwardRef<React.ComponentRef<typeof View>, ICardProps>(
    function Card({ className = '', size = 'md', variant = 'elevated', ...props }, ref) {
        const classes = `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim();
        return <View className={classes} {...props} ref={ref} />;
    }
);

Card.displayName = 'Card';

export { Card };
