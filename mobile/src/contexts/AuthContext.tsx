import { Session, User } from '@supabase/supabase-js';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { supabase } from '@/lib/supabase';

interface AuthContextValue {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    sendPasswordOtp: (email: string) => Promise<{ error: string | null }>;
    resetPasswordWithOtp: (email: string, otp: string, newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    const sendPasswordOtp = useCallback(async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
        });
        return { error: error?.message ?? null };
    }, []);

    const resetPasswordWithOtp = useCallback(async (email: string, otp: string, newPassword: string) => {
        const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email',
        });
        if (verifyError) return { error: verifyError.message };
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        return { error: updateError?.message ?? null };
    }, []);

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            loading,
            signIn,
            signUp,
            signOut,
            sendPasswordOtp,
            resetPasswordWithOtp,
        }),
        [session, loading, signIn, signUp, signOut, sendPasswordOtp, resetPasswordWithOtp],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
