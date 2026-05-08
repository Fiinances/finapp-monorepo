import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────────────

export type CandidateConfidence = 'high' | 'medium' | 'low';
export type CandidateInterval = 'weekly' | 'monthly' | 'yearly';
export type CandidateSuggestedType = 'installment' | 'subscription';

export interface SmartCandidate {
    /** Hash único: descrição normalizada + destination_type */
    id: string;
    normalizedDesc: string;
    /** Nome para exibição (capitalizado) */
    displayName: string;
    /** Mediana dos valores observados */
    amount: number;
    /** Número de ocorrências encontradas */
    count: number;
    firstMonth: string; // MM/YYYY
    lastMonth: string;  // MM/YYYY
    /** Intervalo de recorrência detectado */
    interval: CandidateInterval;
    /** Nível de confiança baseado na variação de valor */
    confidence: CandidateConfidence;
    /** Tipo sugerido pelo algoritmo */
    suggestedType: CandidateSuggestedType;
    /** IDs das transações de origem para rastreabilidade */
    rawTransactionIds: number[];
}

export interface UseSmartDetectReturn {
    loading: boolean;
    error: string | null;
    candidates: SmartCandidate[];
    /** Executa a análise no banco de dados */
    analyze: () => Promise<void>;
    /** Remove um candidato da lista local (sem gravar no banco) */
    dismiss: (id: string) => void;
    /** Marca um candidato como criado (feedback visual) */
    markCreated: (id: string) => void;
    created: Set<string>;
    dismissed: Set<string>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Normaliza descrição: remove parcelamento, pontuação e espaços extras */
function normalizeDescription(desc: string): string {
    return desc
        .toLowerCase()
        .replace(/\b\d{1,2}\s*[/\-]\s*\d{1,2}\b/g, '') // Remove "1/12", "03/12", "3-12"
        .replace(/\s*\d+\s*x\s*/gi, '')                  // Remove "12x", "3x "
        .replace(/parc\.?\s*\d+/gi, '')                  // Remove "Parc 3", "PARC.03"
        .replace(/parcela\s*\d+/gi, '')                  // Remove "parcela 3"
        .replace(/[^\w\s]/g, ' ')                        // Remove pontuação
        .replace(/\s+/g, ' ')                            // Colapsa espaços
        .trim();
}

/** Capitaliza a primeira letra de cada palavra */
function capitalize(str: string): string {
    return str
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/** Mediana de um array de números */
function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

/** Variação percentual: (max - min) / avg * 100 */
function variancePercent(values: number[]): number {
    if (values.length <= 1) return 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg === 0) return 0;
    return ((max - min) / avg) * 100;
}

/** Detecta o intervalo dominante em dias entre datas */
function detectInterval(dates: Date[]): CandidateInterval | null {
    if (dates.length < 2) return null;
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
        const diff = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        gaps.push(diff);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    if (avgGap >= 5 && avgGap <= 9) return 'weekly';
    if (avgGap >= 25 && avgGap <= 35) return 'monthly';
    if (avgGap >= 340 && avgGap <= 390) return 'yearly';
    return null;
}

/** Converte data ISO YYYY-MM-DD para chave MM/YYYY */
function isoToMonthKey(iso: string): string {
    const m = iso.match(/^(\d{4})-(\d{2})/);
    if (!m) return '';
    return `${m[2]}/${m[1]}`;
}

/** Converte variação percentual em nível de confiança */
function calcConfidence(variancePct: number): CandidateConfidence {
    if (variancePct < 2) return 'high';
    if (variancePct < 5) return 'medium';
    return 'low';
}

/**
 * Desambigua entre parcelamento e assinatura:
 * - Parcelamento: variação < 2% E duração ≤ 24 meses
 * - Assinatura: qualquer outro caso com recorrência detectada
 */
function suggestType(
    variancePct: number,
    count: number,
): CandidateSuggestedType {
    if (variancePct < 2 && count <= 24) return 'installment';
    return 'subscription';
}

/** Gera um ID estável a partir da descrição normalizada */
function makeId(normalizedDesc: string): string {
    let hash = 0;
    for (let i = 0; i < normalizedDesc.length; i++) {
        hash = ((hash << 5) - hash + normalizedDesc.charCodeAt(i)) | 0;
    }
    return `sd_${Math.abs(hash).toString(16)}`;
}

/** Retorna data ISO de 12 meses atrás */
function twelveMonthsAgo(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().slice(0, 10);
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSmartDetect(): UseSmartDetectReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<SmartCandidate[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [created, setCreated] = useState<Set<string>>(new Set());

    const analyze = useCallback(async () => {
        setLoading(true);
        setError(null);
        setDismissed(new Set());
        setCreated(new Set());

        try {
            // ── 1. Buscar transações bancárias dos últimos 12 meses ────────
            const from = twelveMonthsAgo();
            const { data: txData, error: txErr } = await supabase
                .from('transactions')
                .select('id, description, amount, date, type')
                .is('credit_card_id', null)
                .gte('date', from)
                .order('date', { ascending: true });

            if (txErr) throw new Error(txErr.message);
            const transactions = (txData ?? []) as Pick<
                Transaction,
                'id' | 'description' | 'amount' | 'date' | 'type'
            >[];

            // ── 2. Buscar descrições já cadastradas (deduplicação) ─────────
            const [{ data: existingInstallments }, { data: existingSubscriptions }] =
                await Promise.all([
                    supabase.from('installment_groups').select('description'),
                    supabase.from('subscriptions').select('name'),
                ]);

            const existingNormalized = new Set([
                ...(existingInstallments ?? []).map((r: { description: string }) =>
                    normalizeDescription(r.description)
                ),
                ...(existingSubscriptions ?? []).map((r: { name: string }) =>
                    normalizeDescription(r.name)
                ),
            ]);

            // ── 3. Agrupar por descrição normalizada ──────────────────────
            const groups = new Map<
                string,
                {
                    ids: number[];
                    amounts: number[];
                    dates: Date[];
                    rawDesc: string;
                }
            >();

            for (const tx of transactions) {
                if (!tx.description || !tx.date || tx.amount == null) continue;
                const norm = normalizeDescription(tx.description);
                if (!norm || norm.length < 3) continue;

                if (!groups.has(norm)) {
                    groups.set(norm, { ids: [], amounts: [], dates: [], rawDesc: tx.description });
                }
                const g = groups.get(norm)!;
                g.ids.push(tx.id!);
                g.amounts.push(tx.amount);
                g.dates.push(new Date(tx.date));
            }

            // ── 4. Filtrar e classificar candidatos ───────────────────────
            const result: SmartCandidate[] = [];

            for (const [norm, group] of groups.entries()) {
                // Mínimo 2 ocorrências
                if (group.ids.length < 2) continue;

                // Já cadastrado como parcelamento ou assinatura → pular
                if (existingNormalized.has(norm)) continue;

                const interval = detectInterval(group.dates);
                if (!interval) continue; // padrão não identificável → não é candidato

                const variancePct = variancePercent(group.amounts);

                // Variação máxima para ser candidato: < 5%
                if (variancePct >= 5) continue;

                const confidence = calcConfidence(variancePct);
                const suggestedType = suggestType(variancePct, group.ids.length);
                const sortedDates = [...group.dates].sort((a, b) => a.getTime() - b.getTime());

                result.push({
                    id: makeId(norm),
                    normalizedDesc: norm,
                    displayName: capitalize(norm),
                    amount: median(group.amounts),
                    count: group.ids.length,
                    firstMonth: isoToMonthKey(sortedDates[0].toISOString()),
                    lastMonth: isoToMonthKey(sortedDates[sortedDates.length - 1].toISOString()),
                    interval,
                    confidence,
                    suggestedType,
                    rawTransactionIds: group.ids,
                });
            }

            // Ordenar: confiança alta primeiro, depois por contagem decrescente
            result.sort((a, b) => {
                const confOrder = { high: 0, medium: 1, low: 2 };
                const diff = confOrder[a.confidence] - confOrder[b.confidence];
                if (diff !== 0) return diff;
                return b.count - a.count;
            });

            setCandidates(result);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao analisar transações.');
        } finally {
            setLoading(false);
        }
    }, []);

    const dismiss = useCallback((id: string) => {
        setDismissed((prev) => new Set(prev).add(id));
    }, []);

    const markCreated = useCallback((id: string) => {
        setCreated((prev) => new Set(prev).add(id));
    }, []);

    return {
        loading,
        error,
        candidates,
        analyze,
        dismiss,
        markCreated,
        created,
        dismissed,
    };
}
