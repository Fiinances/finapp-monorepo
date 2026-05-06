import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { Category } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryCreate {
    name: string;
    color?: string | null;
    icon?: string | null;
    type?: string | null;
    parent_id?: number | null;
}

interface UseCategoriesResult {
    categories: Category[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createCategory: (data: CategoryCreate) => Promise<Category>;
    updateCategory: (id: number, patch: Partial<CategoryCreate>) => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useCategories(): UseCategoriesResult {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: e } = await supabase
                .from('transaction_categories')
                .select('*')
                .order('name', { ascending: true });
            if (e) throw new Error(e.message);
            setCategories((data ?? []) as Category[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar categorias.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const createCategory = useCallback(
        async (data: CategoryCreate): Promise<Category> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');
            const { data: row, error: e } = await supabase
                .from('transaction_categories')
                .insert({ ...data, user_id: user.id })
                .select()
                .single();
            if (e) throw new Error(e.message);
            await loadAll();
            return row as Category;
        },
        [loadAll],
    );

    const updateCategory = useCallback(
        async (id: number, patch: Partial<CategoryCreate>) => {
            const { error: e } = await supabase
                .from('transaction_categories')
                .update(patch)
                .eq('id', id);
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    const deleteCategory = useCallback(
        async (id: number) => {
            const { error: e } = await supabase
                .from('transaction_categories')
                .delete()
                .eq('id', id);
            if (e) throw new Error(e.message);
            await loadAll();
        },
        [loadAll],
    );

    return { categories, loading, error, refetch: loadAll, createCategory, updateCategory, deleteCategory };
}
