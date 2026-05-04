import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('system');

    const isDark = useMemo(() => {
        if (mode === 'system') return systemScheme === 'dark';
        return mode === 'dark';
    }, [mode, systemScheme]);

    const toggleTheme = useCallback(() => {
        setMode((prev) => {
            if (prev === 'system') return isDark ? 'light' : 'dark';
            return prev === 'dark' ? 'light' : 'dark';
        });
    }, [isDark]);

    const value = useMemo(
        () => ({ mode, isDark, setMode, toggleTheme }),
        [mode, isDark, setMode, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
