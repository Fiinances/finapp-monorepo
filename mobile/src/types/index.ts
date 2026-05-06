export type TransactionType =
    | 'income'
    | 'expense'
    | 'transfer'
    | 'investment'
    | 'card_payment';

export interface Category {
    id: number;
    name: string;
    color?: string | null;
    icon?: string | null;
    type?: TransactionType | null;
    parent_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: TransactionType;
    date: string;          // ISO YYYY-MM-DD
    billing_month?: string | null; // MM/YYYY
    category_id?: number | null;
    category?: Category | null;
    bank_account_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface MonthSummary {
    monthYear: string; // MM/YYYY
    income: number;
    expense: number;
    investment: number;
    total: number;
    transactions: Transaction[];
}

export interface BankAccount {
    id: number;
    name: string;
    bank?: string | null;
    balance?: number | null;
    color?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreditCard {
    id: number;
    account_id?: number | null;
    name: string;
    color?: string | null;
    credit_limit?: number | null;
    closing_day?: number | null;
    due_day?: number | null;
    created_at?: string;
    updated_at?: string;
}

export type SubscriptionPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Subscription {
    id: number;
    name: string;
    amount: number;
    period: SubscriptionPeriod;
    type: 'income' | 'expense';
    active: 0 | 1;
    bank_account_id?: number | null;
    credit_card_id?: number | null;
    created_at?: string;
    updated_at?: string;
}
