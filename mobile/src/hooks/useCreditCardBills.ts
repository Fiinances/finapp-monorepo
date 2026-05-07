import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, CreditCard } from '@/types';

export interface CardBreakdown {
    cardId: number;
    cardName: string;
    color: string;
    amount: number;
}

export interface BillChartData {
    month: string; // MM/YYYY
    total: number;
    breakdown: CardBreakdown[];
}

export interface CreditCardBillsData {
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    chartData: BillChartData[];
    monthlyTransactions: Transaction[];
    creditCards: CreditCard[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

function last6MonthKeys(): string[] {
    const result: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const y = String(d.getFullYear());
        result.push(`${m}/${y}`);
    }
    return result;
}

// Function to resolve transaction billing month
function txBillingMonth(t: Transaction): string {
    if (t.billing_month) return t.billing_month;
    const iso = t.date.match(/^(\d{4})-(\d{2})/);
    if (iso) return `${iso[2]}/${iso[1]}`;
    return t.date;
}

export function useCreditCardBills(): CreditCardBillsData {
    const keys = last6MonthKeys();
    const currentMonth = keys[keys.length - 1];

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch cards
            const { data: cardsData, error: cardsErr } = await supabase
                .from('credit_cards')
                .select('*')
                .order('name', { ascending: true });

            if (cardsErr) throw new Error(cardsErr.message);

            // Fetch transactions for credit cards (last 6 months approximation)
            const [mm, yy] = keys[0].split('/');
            const from = `${yy}-${mm}-01`;

            // We fetch transactions where credit_card_id is not null
            // For now, we fetch from a reasonable date range
            const { data: txData, error: txErr } = await supabase
                .from('transactions')
                .select('*, category:transaction_categories(*)')
                .not('credit_card_id', 'is', null)
                .gte('date', from)
                .order('date', { ascending: false });

            if (txErr) throw new Error(txErr.message);

            setCreditCards((cardsData as CreditCard[]) ?? []);
            setTransactions((txData as Transaction[]) ?? []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar dados das faturas');
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Build chart data
    const chartData: BillChartData[] = keys.map((month) => {
        const txsInMonth = transactions.filter((t) => txBillingMonth(t) === month);
        
        let total = 0;
        const breakdownMap = new Map<number, CardBreakdown>();

        // Initialize breakdown with 0 for all active cards to ensure stable legend/stack, or just include cards that have transactions
        // The spec says: "A barra é dividida verticalmente em segmentos proporcionais ao gasto de cada cartão"
        // Let's build breakdown map
        creditCards.forEach((card) => {
            breakdownMap.set(card.id, {
                cardId: card.id,
                cardName: card.name,
                color: card.color || '#9ca3af',
                amount: 0,
            });
        });

        // RN-01: "O gráfico e a listagem devem considerar o valor líquido... somando saídas e abatendo estornos"
        txsInMonth.forEach((t) => {
            if (t.credit_card_id === null) return;
            const bd = breakdownMap.get(t.credit_card_id);
            if (!bd) return;
            
            // Expense adds to the total bill, income/refund subtracts from the bill
            const sign = t.type === 'income' ? -1 : 1;
            bd.amount += t.amount * sign;
        });

        const breakdown = Array.from(breakdownMap.values()).filter(bd => bd.amount !== 0);
        breakdown.forEach(bd => {
            total += bd.amount;
        });

        return {
            month,
            total,
            breakdown,
        };
    });

    // Transactions for the selected month
    const monthlyTransactions = transactions.filter((t) => txBillingMonth(t) === selectedMonth);

    return {
        selectedMonth,
        setSelectedMonth,
        chartData,
        monthlyTransactions,
        creditCards,
        loading,
        error,
        refetch: fetchAll,
    };
}
