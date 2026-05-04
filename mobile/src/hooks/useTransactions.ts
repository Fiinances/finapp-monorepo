import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { MonthSummary, Transaction } from '@/types';
import { buildSummaries } from '@/utils/transactions';

interface UseTransactionsResult {
    transactions: Transaction[];
    summaries: MonthSummary[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useTransactions(): UseTransactionsResult {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
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
            setTransactions(rows);
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

    return { transactions, summaries, loading, error, refetch: fetch };
}
