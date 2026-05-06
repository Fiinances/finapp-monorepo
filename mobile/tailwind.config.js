/** @type {import('tailwindcss').Config} */
module.exports = {
    // NativeWind v4: aponta para todos os arquivos TS/TSX do projeto
    content: [
        './App.{ts,tsx}',
        './index.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
    ],
    darkMode: 'media',
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                // Cores do design system Finapp (light/dark via variáveis semânticas)
                brand: {
                    bg: '#ffffff',
                    'bg-dark': '#0f1117',
                    card: '#ffffff',
                    'card-dark': '#1a1f2e',
                    primary: '#1a1f2e',
                    'primary-dark': '#e5e7eb',
                    secondary: '#f3f4f8',
                    'secondary-dark': '#2a3040',
                    muted: '#6b7280',
                    'muted-dark': '#9ca3af',
                    border: '#e5e7eb',
                    'border-dark': 'rgba(255,255,255,0.10)',
                    destructive: '#dc2626',
                    'destructive-dark': '#f87171',
                },
                // Cores funcionais (hardcoded no design system)
                income: '#22c55e',   // green-500 — Receita / Sucesso
                expense: '#ef4444',  // red-500 — Despesa / Erro
                invest: '#f59e0b',   // amber-500 — Investimento / Alerta
                balance: '#6366f1',  // indigo-500 — Saldo líquido
                transfer: '#3b82f6', // blue-500 — Transferência
                payment: '#8b5cf6',  // purple-500 — Pgto. Cartão
            },
            borderRadius: {
                // Tokens do design system (base: 0.625rem = 10px)
                sm: '6px',
                md: '8px',
                lg: '10px',
                xl: '14px',
                '2xl': '18px',
                '3xl': '22px',
                '4xl': '26px',
            },
        },
    },
    plugins: [],
    blocklist: ['[-3:BRT]'],
};
