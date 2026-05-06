import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { BankAccount, CreditCard } from '@/types';

interface UseBanksResult {
    accounts: BankAccount[];
    creditCards: CreditCard[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    insertAccount: (data: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateAccount: (id: number, data: Partial<Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
    deleteAccount: (id: number) => Promise<void>;
    insertCard: (data: Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateCard: (id: number, data: Partial<Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
    deleteCard: (id: number) => Promise<void>;
}

export function useBanks(): UseBanksResult {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [accountsRes, cardsRes] = await Promise.all([
                supabase.from('accounts').select('*').order('name', { ascending: true }),
                supabase.from('credit_cards').select('*').order('name', { ascending: true }),
            ]);

            if (accountsRes.error) throw new Error(accountsRes.error.message);
            if (cardsRes.error) throw new Error(cardsRes.error.message);

            setAccounts((accountsRes.data ?? []) as BankAccount[]);
            setCreditCards((cardsRes.data ?? []) as CreditCard[]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const insertAccount = useCallback(
        async (data: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');
            const { error: e } = await supabase.from('accounts').insert({ ...data, user_id: user.id });
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    const updateAccount = useCallback(
        async (id: number, data: Partial<Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>>) => {
            const { error: e } = await supabase.from('accounts').update(data).eq('id', id);
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    const deleteAccount = useCallback(
        async (id: number) => {
            // Cascade: delete credit cards, then transactions linked to account, then account
            const { data: cards } = await supabase
                .from('credit_cards')
                .select('id')
                .eq('account_id', id);

            if (cards && cards.length > 0) {
                const cardIds = cards.map((c: { id: number }) => c.id);
                // Delete transactions linked to these cards
                await supabase.from('transactions').delete().in('credit_card_id', cardIds);
                // Delete installment groups linked to these cards
                await supabase.from('installment_groups').delete().in('credit_card_id', cardIds);
                // Delete subscriptions linked to these cards
                await supabase.from('subscriptions').delete().in('credit_card_id', cardIds);
                // Delete the cards themselves
                await supabase.from('credit_cards').delete().in('id', cardIds);
            }

            // Delete transactions linked directly to account
            await supabase.from('transactions').delete().eq('account_id', id);
            // Delete subscriptions linked to account
            await supabase.from('subscriptions').delete().eq('account_id', id);

            const { error: e } = await supabase.from('accounts').delete().eq('id', id);
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    const insertCard = useCallback(
        async (data: Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');
            const { error: e } = await supabase.from('credit_cards').insert({ ...data, user_id: user.id });
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    const updateCard = useCallback(
        async (id: number, data: Partial<Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>>) => {
            const { error: e } = await supabase.from('credit_cards').update(data).eq('id', id);
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    const deleteCard = useCallback(
        async (id: number) => {
            // Delete transactions and installment groups linked to this card first
            await supabase.from('transactions').delete().eq('credit_card_id', id);
            await supabase.from('installment_groups').delete().eq('credit_card_id', id);
            await supabase.from('subscriptions').delete().eq('credit_card_id', id);

            const { error: e } = await supabase.from('credit_cards').delete().eq('id', id);
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    return {
        accounts,
        creditCards,
        loading,
        error,
        refetch: loadAll,
        insertAccount,
        updateAccount,
        deleteAccount,
        insertCard,
        updateCard,
        deleteCard,
    };
}
