import { useCallback, useEffect, useState } from 'react';

import { TransactionCreate } from '@/components/transactions/TransactionCreateSheet';
import { TransactionPatch } from '@/components/transactions/TransactionEditSheet';
import { supabase } from '@/lib/supabase';
import { MonthSummary, Transaction } from '@/types';
import { buildSummaries, txBillingMonth } from '@/utils/transactions';
import { TransactionFilters } from './useTransactionFilters';

interface UseTransactionsResult {
    transactions: Transaction[];
    summaries: MonthSummary[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateTransaction: (id: number, patch: TransactionPatch) => Promise<void>;
    deleteTransaction: (id: number) => Promise<void>;
    createTransaction: (data: TransactionCreate) => Promise<void>;
}

function applyFilters(rows: Transaction[], filters: TransactionFilters): Transaction[] {
    return rows.filter((t) => {
        if (filters.month && txBillingMonth(t) !== filters.month) return false;
        if (filters.types.length && !filters.types.includes(t.type)) return false;
        if (filters.categoryIds.length) {
            const catId: number | 'uncategorized' = t.category_id ?? 'uncategorized';
            if (!filters.categoryIds.includes(catId)) return false;
        }
        if (filters.importSource !== 'all') {
            if (filters.importSource === 'credit_card' && t.credit_card_id == null) return false;
            if (filters.importSource === 'bank_account' && t.account_id == null) return false;
        }
        return true;
    });
}

export function useTransactions(filters?: TransactionFilters): UseTransactionsResult {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [summaries, setSummaries] = useState<MonthSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: sbError } = await supabase
                .from('transactions')
                .select('*, category:transaction_categories(*)')
                .order('date', { ascending: false });

            if (sbError) throw new Error(sbError.message);

            const rows = (data ?? []) as Transaction[];
            setAllTransactions(rows);
            setSummaries(buildSummaries(rows));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar transações.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetch();
    }, [fetch]);

    const updateTransaction = useCallback(async (id: number, patch: TransactionPatch): Promise<void> => {
        const { error: sbError } = await supabase
            .from('transactions')
            .update({
                description: patch.description,
                amount: patch.amount,
                type: patch.type,
                date: patch.date,
                category_id: patch.category_id,
                is_essential: patch.is_essential,
            })
            .eq('id', id);

        if (sbError) throw new Error(sbError.message);
        await fetch();
    }, [fetch]);

    const deleteTransaction = useCallback(async (id: number): Promise<void> => {
        const { error: sbError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (sbError) throw new Error(sbError.message);
        await fetch();
    }, [fetch]);

    const createTransaction = useCallback(async (data: TransactionCreate): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        // billing_month: MM/YYYY derived from date when linked to a card
        const m = data.date.match(/^(\d{4})-(\d{2})/);
        const billingMonth = m ? `${m[2]}/${m[1]}` : null;

        const { error: sbError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                description: data.description,
                amount: data.amount,
                type: data.type,
                date: data.date,
                category_id: data.category_id,
                account_id: data.account_id,
                credit_card_id: data.credit_card_id,
                billing_month: data.credit_card_id ? billingMonth : null,
                is_essential: data.is_essential,
            });

        if (sbError) throw new Error(sbError.message);
        await fetch();
    }, [fetch]);

    const transactions = filters ? applyFilters(allTransactions, filters) : allTransactions;

    return { transactions, summaries, loading, error, refetch: fetch, updateTransaction, deleteTransaction, createTransaction };
}
