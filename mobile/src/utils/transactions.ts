import { MonthSummary, Transaction, TransactionType } from '@/types';

// ─── Formatação ──────────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function formatDate(date: string): string {
    // Accepts YYYY-MM-DD, returns DD/MM/YYYY
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return date;
}

export function parseYearMonth(date: string): string {
    // YYYY-MM-DD → MM/YYYY
    const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[2]}/${isoMatch[1]}`;
    // DD/MM/YYYY → MM/YYYY
    const brMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) return `${brMatch[2]}/${brMatch[3]}`;
    return '';
}

export function txBillingMonth(t: Transaction): string {
    if (t.billing_month) return t.billing_month;
    return parseYearMonth(t.date);
}

// ─── Agrupamento ─────────────────────────────────────────────────────────────

export function buildSummaries(transactions: Transaction[]): MonthSummary[] {
    const map = new Map<string, MonthSummary>();

    for (const t of transactions) {
        const key = txBillingMonth(t);
        if (!map.has(key)) {
            map.set(key, { monthYear: key, income: 0, expense: 0, investment: 0, total: 0, transactions: [] });
        }
        const entry = map.get(key)!;
        entry.transactions.push(t);
        if (t.type === 'income') {
            entry.income += t.amount;
        } else if (t.type === 'investment') {
            entry.investment += t.amount;
        } else {
            // expense | transfer | card_payment
            entry.expense += t.amount;
        }
        entry.total = entry.income - entry.expense;
    }

    // Sort: most recent first — convert MM/YYYY → YYYY-MM for safe comparison
    return Array.from(map.values()).sort((a, b) => {
        const toSortKey = (s: string) => {
            const [mm, yyyy] = s.split('/');
            return `${yyyy}-${mm}`;
        };
        return toSortKey(b.monthYear).localeCompare(toSortKey(a.monthYear));
    });
}

// ─── Cores por tipo ──────────────────────────────────────────────────────────

export const TYPE_COLORS: Record<TransactionType, { light: string; dark: string }> = {
    income: { light: '#22c55e', dark: '#22c55e' },
    expense: { light: '#ef4444', dark: '#ef4444' },
    investment: { light: '#f59e0b', dark: '#f59e0b' },
    transfer: { light: '#3b82f6', dark: '#3b82f6' },
    card_payment: { light: '#8b5cf6', dark: '#8b5cf6' },
};

export const TYPE_LABELS: Record<TransactionType, string> = {
    income: 'Receita',
    expense: 'Despesa',
    investment: 'Investimento',
    transfer: 'Transferência',
    card_payment: 'Fatura',
};

export const TYPE_SIGN: Record<TransactionType, '+' | '-'> = {
    income: '+',
    expense: '-',
    investment: '-',
    transfer: '-',
    card_payment: '-',
};
