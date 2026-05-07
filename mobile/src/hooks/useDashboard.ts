import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, Subscription } from '@/types';

// --- Monthly bar chart types ---
export interface MonthlyBarData {
    /** MM/YYYY */
    monthYear: string;
    income: number;
    expense: number;
    investment: number;
    /** income - expense (investment excluded per RN-02) */
    net: number;
}

// --- Category pie chart types ---
export interface CategorySlice {
    id: number | null;
    name: string;
    color: string;
    value: number;
}

// --- Subscription totals ---
export interface SubscriptionTotals {
    monthlyTotal: number;
    yearlyTotal: number;
}

// --- Hook return type ---
export interface DashboardData {
    /** Last 12 months ordered oldest→newest */
    monthlyData: MonthlyBarData[];
    /** Expense slices for selected month (max 9 + "outras") */
    categorySlices: CategorySlice[];
    subscriptions: Subscription[];
    subscriptionTotals: SubscriptionTotals;
    loading: boolean;
    error: string | null;
    /** MM/YYYY selected for the category chart */
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    refetch: () => void;
}

// Deterministic category colors fallback palette
const CATEGORY_COLORS = [
    '#22c55e', '#ef4444', '#f59e0b', '#6366f1', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

function parseYearMonth(date: string): string {
    if (!date) return '';
    // Handle YYYY-MM-DD
    const iso = date.match(/^(\d{4})-(\d{2})/);
    if (iso) return `${iso[2]}/${iso[1]}`;
    // Handle DD/MM/YYYY
    const br = date.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[2]}/${br[3]}`;
    return date;
}

function monthYearToSortKey(my: string): number {
    const [m, y] = my.split('/');
    return parseInt(y, 10) * 100 + parseInt(m, 10);
}

function last12MonthKeys(): string[] {
    const result: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const y = String(d.getFullYear());
        result.push(`${m}/${y}`);
    }
    return result;
}

function monthlyEquivalent(amount: number, period: Subscription['period']): number {
    if (period === 'weekly') return (amount * 52) / 12;
    if (period === 'yearly') return amount / 12;
    return amount;
}

function yearlyEquivalent(amount: number, period: Subscription['period']): number {
    if (period === 'weekly') return amount * 52;
    if (period === 'monthly') return amount * 12;
    return amount;
}

export function useDashboard(): DashboardData {
    const keys = last12MonthKeys();
    const currentMonth = keys[keys.length - 1];

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch last 12 months of transactions
            const [mm, yy] = keys[0].split('/');
            const from = `${yy}-${mm}-01`;

            const { data: txData, error: txErr } = await supabase
                .from('transactions')
                .select('*, category:transaction_categories(*)')
                .is('credit_card_id', null) // RN-09: Ignorar cartões no Dashboard
                .gte('date', from)
                .order('date', { ascending: true });

            if (txErr) throw new Error(txErr.message);

            // Fetch active subscriptions
            const { data: subData, error: subErr } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('active', 1);

            if (subErr) throw new Error(subErr.message);

            setTransactions((txData as Transaction[]) ?? []);
            setSubscriptions((subData as Subscription[]) ?? []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // --- Monthly bar data (RN-01: exclude transfer/card_payment; RN-02: investment not in net; RN-09: no credit cards) ---
    const monthlyData: MonthlyBarData[] = keys.map((monthYear) => {
        const filtered = transactions.filter(
            (t) =>
                t.type !== 'transfer' &&
                t.type !== 'card_payment' &&
                parseYearMonth(t.date) === monthYear,
        );
        const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const investment = filtered.filter((t) => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
        return { monthYear, income, expense, investment, net: income - expense };
    });

    // --- Category slices (RN-03: use date NOT billing_month; RN-04: "Sem categoria") ---
    const categorySlices: CategorySlice[] = (() => {
        const expensesInMonth = transactions.filter(
            (t) => t.type === 'expense' && parseYearMonth(t.date) === selectedMonth,
        );
        const grouped = new Map<number | null, { name: string; color: string; value: number }>();
        for (const t of expensesInMonth) {
            const catId = t.category_id ?? null;
            const catName = t.category?.name ?? 'Sem categoria';
            const catColor = t.category?.color ?? null;
            const existing = grouped.get(catId);
            if (existing) {
                existing.value += t.amount;
            } else {
                grouped.set(catId, { name: catName, color: catColor ?? '', value: t.amount });
            }
        }

        // Sort descending by value
        const sorted = Array.from(grouped.entries())
            .map(([id, v], i) => ({
                id,
                name: v.name,
                color: v.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                value: v.value,
            }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length <= 9) return sorted;

        const top9 = sorted.slice(0, 9);
        const rest = sorted.slice(9).reduce((s, c) => s + c.value, 0);
        return [
            ...top9,
            { id: null, name: `+${sorted.length - 9} outras`, color: '#94a3b8', value: rest },
        ];
    })();

    // --- Subscription totals ---
    const subscriptionTotals: SubscriptionTotals = subscriptions
        .filter((s) => s.active === 1)
        .reduce(
            (acc, s) => ({
                monthlyTotal: acc.monthlyTotal + monthlyEquivalent(s.amount, s.period),
                yearlyTotal: acc.yearlyTotal + yearlyEquivalent(s.amount, s.period),
            }),
            { monthlyTotal: 0, yearlyTotal: 0 },
        );

    return {
        monthlyData,
        categorySlices,
        subscriptions: subscriptions.filter((s) => s.active === 1),
        subscriptionTotals,
        loading,
        error,
        selectedMonth,
        setSelectedMonth,
        refetch: fetchAll,
    };
}
