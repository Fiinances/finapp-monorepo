import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InstallmentGroup, CreditCard } from '@/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse MM/YYYY → { month: 1-based, year } */
function parseMonthYear(my: string): { month: number; year: number } {
    const [m, y] = my.split('/').map(Number);
    return { month: m, year: y };
}

/** Compute paid and remaining installments based on today's date */
function computeInstallmentProgress(group: InstallmentGroup): InstallmentGroup {
    const now = new Date();
    const nowMonth = now.getMonth() + 1; // 1-based
    const nowYear = now.getFullYear();

    const { month: startMonth, year: startYear } = parseMonthYear(group.first_billing_month);

    // Months elapsed since first billing (inclusive of current billing month)
    const monthsElapsed =
        (nowYear - startYear) * 12 + (nowMonth - startMonth) + 1;

    const paid = Math.min(Math.max(monthsElapsed, 0), group.installments);
    const remaining = group.installments - paid;

    return {
        ...group,
        real_paid_installments: paid,
        real_remaining_installments: Math.max(remaining, 0),
    };
}

// ── Hook ────────────────────────────────────────────────────────────────────

interface UseInstallmentsReturn {
    groups: InstallmentGroup[];
    creditCards: CreditCard[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    insertGroup: (
        data: Omit<InstallmentGroup, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'real_paid_installments' | 'real_remaining_installments'>
    ) => Promise<void>;
    updateGroup: (
        id: number,
        data: Partial<Omit<InstallmentGroup, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'real_paid_installments' | 'real_remaining_installments'>>
    ) => Promise<void>;
    deleteGroup: (id: number) => Promise<void>;
}

export function useInstallments(): UseInstallmentsReturn {
    const [groups, setGroups] = useState<InstallmentGroup[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [groupsRes, cardsRes] = await Promise.all([
                supabase
                    .from('installment_groups')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('credit_cards')
                    .select('id, name, color, closing_day, due_day')
                    .order('name'),
            ]);

            if (groupsRes.error) throw groupsRes.error;
            if (cardsRes.error) throw cardsRes.error;

            const computed = (groupsRes.data ?? []).map(computeInstallmentProgress);
            setGroups(computed);
            setCreditCards(cardsRes.data ?? []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar parcelamentos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const insertGroup = useCallback(
        async (data: Omit<InstallmentGroup, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'real_paid_installments' | 'real_remaining_installments'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const { error: err } = await supabase.from('installment_groups').insert({
                ...data,
                user_id: user.id,
            });
            if (err) throw err;
            await fetchAll();
        },
        [fetchAll],
    );

    const updateGroup = useCallback(
        async (
            id: number,
            data: Partial<Omit<InstallmentGroup, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'real_paid_installments' | 'real_remaining_installments'>>,
        ) => {
            const { error: err } = await supabase
                .from('installment_groups')
                .update(data)
                .eq('id', id);
            if (err) throw err;
            await fetchAll();
        },
        [fetchAll],
    );

    const deleteGroup = useCallback(async (id: number) => {
        const { error: err } = await supabase
            .from('installment_groups')
            .delete()
            .eq('id', id);
        if (err) throw err;
        await fetchAll();
    }, [fetchAll]);

    return { groups, creditCards, loading, error, refetch: fetchAll, insertGroup, updateGroup, deleteGroup };
}
