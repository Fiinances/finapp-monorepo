import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Subscription, BankAccount, CreditCard } from '@/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

export function monthlyEquivalent(sub: Subscription): number {
    switch (sub.period) {
        case 'weekly':
            return (sub.amount * 52) / 12;
        case 'yearly':
            return sub.amount / 12;
        default:
            return sub.amount;
    }
}

export function resolveAccountName(
    sub: Subscription,
    accounts: BankAccount[],
    creditCards: CreditCard[],
): string {
    if (sub.credit_card_id) {
        const card = creditCards.find((c) => c.id === sub.credit_card_id);
        return card?.name ?? '—';
    }
    if (sub.account_id) {
        const acc = accounts.find((a) => a.id === sub.account_id);
        return acc?.name ?? '—';
    }
    return '—';
}

// ── Hook ────────────────────────────────────────────────────────────────────

interface UseSubscriptionsReturn {
    subscriptions: Subscription[];
    accounts: BankAccount[];
    creditCards: CreditCard[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    insertSubscription: (
        data: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    ) => Promise<void>;
    updateSubscription: (
        id: number,
        data: Partial<Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
    ) => Promise<void>;
    deleteSubscription: (id: number) => Promise<void>;
    toggleActive: (id: number, current: boolean) => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsReturn {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [subsRes, accRes, cardsRes] = await Promise.all([
                supabase
                    .from('subscriptions')
                    .select('*')
                    .order('name'),
                supabase
                    .from('accounts')
                    .select('id, name, bank, color')
                    .order('name'),
                supabase
                    .from('credit_cards')
                    .select('id, name, color, closing_day, due_day')
                    .order('name'),
            ]);

            if (subsRes.error) throw subsRes.error;
            if (accRes.error) throw accRes.error;
            if (cardsRes.error) throw cardsRes.error;

            setSubscriptions(subsRes.data ?? []);
            setAccounts(accRes.data ?? []);
            setCreditCards(cardsRes.data ?? []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar assinaturas.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const insertSubscription = useCallback(
        async (data: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const { error: err } = await supabase.from('subscriptions').insert({
                ...data,
                user_id: user.id,
            });
            if (err) throw err;
            await fetchAll();
        },
        [fetchAll],
    );

    const updateSubscription = useCallback(
        async (
            id: number,
            data: Partial<Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
        ) => {
            const { error: err } = await supabase
                .from('subscriptions')
                .update(data)
                .eq('id', id);
            if (err) throw err;
            await fetchAll();
        },
        [fetchAll],
    );

    const deleteSubscription = useCallback(async (id: number) => {
        const { error: err } = await supabase
            .from('subscriptions')
            .delete()
            .eq('id', id);
        if (err) throw err;
        await fetchAll();
    }, [fetchAll]);

    /** Optimistic toggle — flips local state immediately, then persists */
    const toggleActive = useCallback(async (id: number, current: boolean) => {
        const newValue = !current;
        setSubscriptions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, active: newValue } : s)),
        );
        const { error: err } = await supabase
            .from('subscriptions')
            .update({ active: newValue })
            .eq('id', id);
        if (err) {
            // Revert on failure
            setSubscriptions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, active: current } : s)),
            );
            throw err;
        }
    }, []);

    return {
        subscriptions,
        accounts,
        creditCards,
        loading,
        error,
        refetch: fetchAll,
        insertSubscription,
        updateSubscription,
        deleteSubscription,
        toggleActive,
    };
}
