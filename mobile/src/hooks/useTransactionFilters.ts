import { useState } from 'react';
import { TransactionType } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImportSource = 'all' | 'bank_account' | 'credit_card';

export interface TransactionFilters {
    month: string | null;                       // 'MM/YYYY' ou null = todos os meses
    types: TransactionType[];                   // [] = todos os tipos
    categoryIds: (number | 'uncategorized')[]; // [] = todas as categorias
    importSource: ImportSource;
}

function currentMonthYear(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = String(d.getFullYear());
    return `${m}/${y}`;
}

const DEFAULT_FILTERS: TransactionFilters = {
    month: currentMonthYear(),
    types: [],
    categoryIds: [],
    importSource: 'all',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTransactionFiltersResult {
    filters: TransactionFilters;
    setMonth: (month: string | null) => void;
    toggleType: (type: TransactionType) => void;
    toggleCategory: (id: number | 'uncategorized') => void;
    setImportSource: (source: ImportSource) => void;
    clearFilters: () => void;
    activeCount: number;
}

export function useTransactionFilters(): UseTransactionFiltersResult {
    const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);

    const defaultMonth = currentMonthYear();

    const activeCount =
        (filters.month !== defaultMonth ? 1 : 0) +
        (filters.types.length > 0 ? 1 : 0) +
        (filters.categoryIds.length > 0 ? 1 : 0) +
        (filters.importSource !== 'all' ? 1 : 0);

    function setMonth(month: string | null) {
        setFilters((f) => ({ ...f, month }));
    }

    function toggleType(type: TransactionType) {
        setFilters((f) => {
            const exists = f.types.includes(type);
            return {
                ...f,
                types: exists ? f.types.filter((t) => t !== type) : [...f.types, type],
            };
        });
    }

    function toggleCategory(id: number | 'uncategorized') {
        setFilters((f) => {
            const exists = f.categoryIds.includes(id);
            return {
                ...f,
                categoryIds: exists
                    ? f.categoryIds.filter((c) => c !== id)
                    : [...f.categoryIds, id],
            };
        });
    }

    function setImportSource(source: ImportSource) {
        setFilters((f) => ({ ...f, importSource: source }));
    }

    function clearFilters() {
        setFilters(DEFAULT_FILTERS);
    }

    return {
        filters,
        setMonth,
        toggleType,
        toggleCategory,
        setImportSource,
        clearFilters,
        activeCount,
    };
}
