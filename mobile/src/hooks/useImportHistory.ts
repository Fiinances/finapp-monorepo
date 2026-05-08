import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBanks } from '@/hooks/useBanks';

export interface ImportRecord {
    id: number;
    destination_type: 'bank_account' | 'credit_card';
    destination_id: number;
    month: string;
    billing_month: string | null;
    file_name: string | null;
    file_format: 'ofx' | 'csv' | null;
    transaction_count: number;
    imported_at: string;
    updated_at: string;
    // Joined client-side:
    destination_name: string;
    destination_color: string | null;
}

export function useImportHistory() {
    const [records, setRecords] = useState<ImportRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { accounts, creditCards } = useBanks();

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const { data, error: fetchError } = await supabase
                .from('import_records')
                .select('*')
                .eq('user_id', user.id)
                .order('imported_at', { ascending: false });

            if (fetchError) throw new Error(fetchError.message);

            const enriched: ImportRecord[] = (data || []).map(r => {
                let name = 'Desconhecido';
                let color = null;

                if (r.destination_type === 'credit_card') {
                    const card = creditCards.find(c => c.id === r.destination_id);
                    if (card) {
                        name = card.name;
                        color = card.color;
                    }
                } else if (r.destination_type === 'bank_account') {
                    const acc = accounts.find(a => a.id === r.destination_id);
                    if (acc) {
                        name = acc.name;
                        color = acc.color;
                    }
                }

                return {
                    ...r,
                    destination_name: name,
                    destination_color: color,
                };
            });

            setRecords(enriched);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao buscar importações.');
        } finally {
            setLoading(false);
        }
    }, [accounts, creditCards]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const deleteRecord = async (id: number) => {
        try {
            const { error: delError } = await supabase
                .from('import_records')
                .delete()
                .eq('id', id);

            if (delError) throw new Error(delError.message);

            setRecords(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            throw err instanceof Error ? err : new Error('Erro ao excluir importação.');
        }
    };

    return {
        records,
        loading,
        error,
        refetch: fetchRecords,
        deleteRecord,
    };
}
