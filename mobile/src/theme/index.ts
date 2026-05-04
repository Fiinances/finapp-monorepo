import { config as defaultConfig } from '@gluestack-ui/themed/build/theme';

// Extensão do tema Gluestack UI com as cores semânticas do Finapp
export const finappTheme = {
    ...defaultConfig,
    tokens: {
        ...defaultConfig.tokens,
        colors: {
            ...defaultConfig.tokens.colors,
            // Cores funcionais do Finapp
            income: '#22c55e',
            expense: '#ef4444',
            invest: '#f59e0b',
            balance: '#6366f1',
            transfer: '#3b82f6',
            payment: '#8b5cf6',
            // Neutros light
            brandBg: '#ffffff',
            brandCard: '#ffffff',
            brandPrimary: '#1a1f2e',
            brandSecondary: '#f3f4f8',
            brandMuted: '#6b7280',
            brandBorder: '#e5e7eb',
            brandDestructive: '#dc2626',
        },
    },
    components: {
        ...defaultConfig.components,
    },
};

// Tokens de tipografia (Poppins — aplicado via fontFamily nas telas)
export const typography = {
    fontFamily: {
        regular: 'Poppins_400Regular',
        medium: 'Poppins_500Medium',
        semiBold: 'Poppins_600SemiBold',
        bold: 'Poppins_700Bold',
    },
    fontSize: {
        pageTitle: 20,
        monetaryValue: 24,
        cardTitle: 16,
        body: 14,
        caption: 12,
    },
    fontWeight: {
        pageTitle: '600',
        monetaryValue: '700',
        cardTitle: '600',
        body: '400',
        caption: '400',
    },
};
