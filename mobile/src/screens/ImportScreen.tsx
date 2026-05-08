/**
 * ImportScreen — Fluxo de importação OFX/CSV
 *
 * Spec: _reversa_sdd/sdd/import.md
 * Step 1: Selecionar formato (OFX/CSV) + escolher arquivo
 * Step 2: Preview editável + destino (conta/cartão) + confirmação
 */

import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSideMenu } from '@/contexts/SideMenuContext';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase';
import type { BankAccount, Category, CreditCard, TransactionType } from '@/types';
import { AppHeader } from '@/components/ui';
import {
    inferBillingMonth,
    mapCsvToTransactions,
    mapOfxToTransactions,
    type PreviewTransaction,
} from '@/utils/importParsers';
import { formatDate } from '@/utils/transactions';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CYCLE: TransactionType[] = [
    'income',
    'expense',
    'investment',
    'transfer',
    'card_payment',
];

const TYPE_LABELS: Record<TransactionType, string> = {
    income: 'Receita',
    expense: 'Despesa',
    investment: 'Invest.',
    transfer: 'Transfer.',
    card_payment: 'Fatura',
};

const TYPE_COLORS: Record<TransactionType, string> = {
    income: '#10b981',
    expense: '#ef4444',
    investment: '#6366f1',
    transfer: '#3b82f6',
    card_payment: '#f59e0b',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function cycleType(current: TransactionType): TransactionType {
    const idx = TYPE_CYCLE.indexOf(current);
    return TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length];
}

/** Returns the current month in MM/YYYY format */
function currentMonthYear(): string {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function deriveMonth(transactions: PreviewTransaction[]): string {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
        if (!t.date) continue;
        const parts = t.date.split('-');
        if (parts.length >= 2) {
            const key = `${parts[1]}/${parts[0]}`;
            counts[key] = (counts[key] || 0) + 1;
        }
    }
    let max = 0;
    let best = currentMonthYear();
    for (const [key, count] of Object.entries(counts)) {
        if (count > max) {
            max = count;
            best = key;
        }
    }
    return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// ImportScreen
// ─────────────────────────────────────────────────────────────────────────────

export function ImportScreen() {
    const { openMenu } = useSideMenu();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // ── Colors ────────────────────────────────────────────────────────────────
    const bg = isDark ? '#0f1219' : '#f5f7fa';
    const cardBg = isDark ? '#1a1f2e' : '#ffffff';
    const textPrimary = isDark ? '#e5e7eb' : '#1a1f2e';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const inputBg = isDark ? '#252d45' : '#f3f4f8';

    // ── State ─────────────────────────────────────────────────────────────────
    type KindType = 'ofx' | 'csv';
    type StepType = 'upload' | 'preview';

    const [step, setStep] = useState<StepType>('upload');
    const [kind, setKind] = useState<KindType>('ofx');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [previewRows, setPreviewRows] = useState<PreviewTransaction[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [accountId, setAccountId] = useState<string>('');  // "a:ID" | "c:ID"
    const [billingMonth, setBillingMonth] = useState(currentMonthYear());

    // Category picker modal state
    const { categories, createCategory } = useCategories();

    // Pre-fetched map of external_id → { category_id, account_id, credit_card_id } for existing transactions
    const [existingTxMap, setExistingTxMap] = useState<Map<string, { category_id: number | null, account_id: number | null, credit_card_id: number | null }>>(new Map());

    // ── Load accounts & cards ─────────────────────────────────────────────────
    useEffect(() => {
        void loadDestinations();
    }, []);

    const loadDestinations = async () => {
        const [accRes, cardRes] = await Promise.all([
            supabase.from('accounts').select('*').order('name'),
            supabase.from('credit_cards').select('*').order('name'),
        ]);
        if (accRes.data) setAccounts(accRes.data as BankAccount[]);
        if (cardRes.data) setCreditCards(cardRes.data as CreditCard[]);

        // Pre-select first account
        if (accRes.data && accRes.data.length > 0) {
            setAccountId(`a:${accRes.data[0].id}`);
        }
    };

    // ── File picker ───────────────────────────────────────────────────────────
    const handlePickFile = useCallback(async () => {
        setError(null);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;
            const asset = result.assets[0];
            if (!asset) return;

            setLoading(true);
            setFileName(asset.name);

            // expo-file-system v19 new API: use File class with bytes() to support
            // both UTF-8 and ISO-8859-1 (used by Brazilian bank OFX exports).
            const fsFile = new FileSystem.File(asset.uri);
            const bytes = await fsFile.bytes();
            let content: string;
            try {
                content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            } catch {
                content = new TextDecoder('iso-8859-1').decode(bytes);
            }

            let rows: PreviewTransaction[];
            if (kind === 'ofx') {
                rows = mapOfxToTransactions(content);
            } else {
                rows = mapCsvToTransactions(content);
            }

            if (rows.length === 0) {
                setError('Nenhuma transação encontrada no arquivo.');
                return;
            }

            // Infer billing month if card is already selected
            const selectedCard = getSelectedCard();
            if (selectedCard?.closing_day) {
                const inferred = inferBillingMonth(rows, selectedCard.closing_day, currentMonthYear());
                setBillingMonth(inferred);
            }

            // Pre-fetch existing external_ids to mark rows as new/update and preserve category_id
            const externalIds = rows
                .map(r => r.external_id)
                .filter((id): id is string => !!id);
            let newExistingTxMap = new Map<string, { category_id: number | null, account_id: number | null, credit_card_id: number | null }>();
            if (externalIds.length > 0) {
                const { data: { user: previewUser } } = await supabase.auth.getUser();
                if (previewUser) {
                    const { data: existing } = await supabase
                        .from('transactions')
                        .select('external_id, category_id, account_id, credit_card_id')
                        .eq('user_id', previewUser.id)
                        .in('external_id', externalIds);
                    if (existing) {
                        newExistingTxMap = new Map(
                            existing.map(t => [
                                t.external_id as string,
                                { 
                                    category_id: t.category_id as number | null,
                                    account_id: t.account_id as number | null,
                                    credit_card_id: t.credit_card_id as number | null,
                                },
                            ])
                        );
                    }
                }
            }
            setExistingTxMap(newExistingTxMap);

            const markedRows = rows.map(r => ({
                ...r,
                importStatus: (r.external_id && newExistingTxMap.has(r.external_id))
                    ? 'update' as const
                    : 'new' as const,
            }));

            setPreviewRows(markedRows);
            setStep('preview');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao ler arquivo.');
        } finally {
            setLoading(false);
        }
    }, [kind, accountId]);

    // ── Preview row mutations ─────────────────────────────────────────────────
    const updateRow = useCallback((key: string, patch: Partial<PreviewTransaction>) => {
        setPreviewRows(prev =>
            prev.map(r => r._key === key ? { ...r, ...patch } : r)
        );
    }, []);

    const removeRow = useCallback((key: string) => {
        setPreviewRows(prev => prev.filter(r => r._key !== key));
    }, []);

    const cycleRowType = useCallback((key: string, current: TransactionType) => {
        updateRow(key, { type: cycleType(current) });
    }, [updateRow]);

    // ── Account/card selection helpers ────────────────────────────────────────
    const isCard = accountId.startsWith('c:');

    function getSelectedCard(): CreditCard | undefined {
        if (!isCard) return undefined;
        const id = parseInt(accountId.slice(2), 10);
        return creditCards.find(c => c.id === id);
    }

    const handleSelectAccountId = (val: string) => {
        setAccountId(val);
        if (val.startsWith('c:')) {
            const id = parseInt(val.slice(2), 10);
            const card = creditCards.find(c => c.id === id);
            if (card?.closing_day && previewRows.length > 0) {
                const inferred = inferBillingMonth(previewRows, card.closing_day, currentMonthYear());
                setBillingMonth(inferred);
            }
        }
    };

    // ── Confirm import ────────────────────────────────────────────────────────
    const handleConfirm = async () => {
        if (previewRows.length === 0) return;
        if (!accountId) {
            Alert.alert('Atenção', 'Selecione uma conta ou cartão de destino.');
            return;
        }
        if (isCard && !billingMonth.match(/^\d{2}\/\d{4}$/)) {
            Alert.alert('Atenção', 'Informe o mês de fatura no formato MM/AAAA.');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const cardId = isCard ? parseInt(accountId.slice(2), 10) : null;
            const acctId = !isCard ? parseInt(accountId.slice(2), 10) : null;
            const destId = isCard ? cardId : acctId;
            const destType = isCard ? 'credit_card' : 'bank_account';

            // Deduplicate by external_id (keep last occurrence)
            const deduplicatedMap = new Map<string, PreviewTransaction>();
            for (const row of previewRows) {
                if (row.external_id) {
                    deduplicatedMap.set(row.external_id, row);
                } else {
                    deduplicatedMap.set(row._key, row);
                }
            }
            const uniqueRows = Array.from(deduplicatedMap.values());
            const totalProcessed = uniqueRows.length;

            let newCount = 0;
            let updateCount = 0;
            let sourceChangeCount = 0;

            // Step 1: UPSERT em import_records
            const { data: record, error: recordError } = await supabase
                .from('import_records')
                .upsert({
                    user_id: user.id,
                    destination_type: destType,
                    destination_id: destId,
                    month: deriveMonth(uniqueRows),
                    billing_month: isCard ? billingMonth : null,
                    file_name: fileName,
                    file_format: kind,
                    transaction_count: totalProcessed,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,destination_type,destination_id,month',
                })
                .select('id')
                .single();

            if (recordError) throw new Error(`Erro ao registrar importação: ${recordError.message}`);

            // Step 2: Deletar transações antigas deste import_id
            await supabase
                .from('transactions')
                .delete()
                .eq('import_id', record.id);

            // Step 3: Inserir novas transações com import_id
            const insertRows = uniqueRows.map(r => {
                const existing = r.external_id ? existingTxMap.get(r.external_id) : undefined;
                
                if (existing) {
                    updateCount++;
                    if (
                        (isCard && existing.account_id != null) || 
                        (!isCard && existing.credit_card_id != null) ||
                        (isCard && existing.credit_card_id != null && existing.credit_card_id !== cardId) ||
                        (!isCard && existing.account_id != null && existing.account_id !== acctId)
                    ) {
                        sourceChangeCount++;
                    }
                } else {
                    newCount++;
                }

                return {
                    user_id: user.id,
                    description: r.description,
                    amount: r.amount,
                    type: r.type,
                    date: r.date,
                    source: r.source,
                    external_id: r.external_id ?? null,
                    installment_number: r.installment_number ?? null,
                    // Preserve existing category_id if not manually set in this import
                    category_id: r.category_id ?? existing?.category_id ?? null,
                    account_id: acctId,
                    credit_card_id: cardId,
                    billing_month: isCard ? billingMonth : null,
                    import_id: record.id,
                };
            });

            const { error: insertError } = await supabase
                .from('transactions')
                .upsert(insertRows, { onConflict: 'user_id,external_id', ignoreDuplicates: false });

            if (insertError) throw new Error(`Erro ao salvar transações: ${insertError.message}`);


            const lines = [
                `📥 Processadas: ${totalProcessed}`,
                `✅ Novas: ${newCount}`,
                ...(updateCount > 0 ? [`🔄 Atualizadas: ${updateCount}`] : []),
                ...(sourceChangeCount > 0 ? [`   ↳ source alterado: ${sourceChangeCount}`] : []),
            ];

            Alert.alert(
                'Importação concluída',
                lines.join('\n'),
                [{ text: 'OK', onPress: resetState }],
            );
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao importar.');
        } finally {
            setSaving(false);
        }
    };

    const resetState = () => {
        setStep('upload');
        setFileName('');
        setPreviewRows([]);
        setExistingTxMap(new Map());
        setError(null);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
            {/* ── Header ── */}
            <AppHeader
                title="Importar Extrato"
                onLeftPress={openMenu}
                rightElement={
                    step === 'preview' ? (
                        <TouchableOpacity onPress={resetState} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Feather name="x" size={20} color={textMuted} />
                        </TouchableOpacity>
                    ) : null
                }
            />

            {/* ── Step indicator ── */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
                {(['upload', 'preview'] as StepType[]).map((s, i) => (
                    <View
                        key={s}
                        style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            backgroundColor: step === s || (i === 1 && step === 'preview')
                                ? '#6366f1'
                                : borderColor,
                        }}
                    />
                ))}
            </View>

            {step === 'upload'
                ? <UploadStep
                    isDark={isDark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    borderColor={borderColor}
                    inputBg={inputBg}
                    kind={kind}
                    setKind={setKind}
                    fileName={fileName}
                    loading={loading}
                    error={error}
                    onPickFile={handlePickFile}
                />
                : <PreviewStep
                    isDark={isDark}
                    bg={bg}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    borderColor={borderColor}
                    inputBg={inputBg}
                    rows={previewRows}
                    accounts={accounts}
                    creditCards={creditCards}
                    accountId={accountId}
                    billingMonth={billingMonth}
                    isCard={isCard}
                    saving={saving}
                    onSelectAccount={handleSelectAccountId}
                    onBillingMonthChange={setBillingMonth}
                    onCycleType={cycleRowType}
                    onUpdateDesc={(key, desc) => updateRow(key, { description: desc })}
                    onRemoveRow={removeRow}
                    onConfirm={handleConfirm}
                    categories={categories}
                    onSelectCategory={(key, catId) => updateRow(key, { category_id: catId })}
                    onCreateCategory={async (name) => createCategory({ name })}
                />
            }
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Upload
// ─────────────────────────────────────────────────────────────────────────────

interface UploadStepProps {
    isDark: boolean;
    cardBg: string;
    textPrimary: string;
    textMuted: string;
    borderColor: string;
    inputBg: string;
    kind: 'ofx' | 'csv';
    setKind: (k: 'ofx' | 'csv') => void;
    fileName: string;
    loading: boolean;
    error: string | null;
    onPickFile: () => void;
}

function UploadStep({
    isDark, cardBg, textPrimary, textMuted, borderColor, inputBg,
    kind, setKind, fileName, loading, error, onPickFile,
}: UploadStepProps) {
    return (
        <ScrollView
            contentContainerStyle={{ padding: 16, gap: 16 }}
            keyboardShouldPersistTaps="handled"
        >
            {/* Format selector */}
            <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor }}>
                <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '600' }}>
                    Formato do arquivo
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(['ofx', 'csv'] as const).map(f => (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setKind(f)}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 10,
                                alignItems: 'center',
                                backgroundColor: kind === f ? '#6366f1' : inputBg,
                                borderWidth: kind === f ? 0 : 1,
                                borderColor,
                            }}
                        >
                            <Text
                                style={{
                                    color: kind === f ? '#fff' : textMuted,
                                    fontWeight: '600',
                                    fontSize: 13,
                                }}
                            >
                                {f.toUpperCase()}
                            </Text>
                            <Text style={{ color: kind === f ? 'rgba(255,255,255,0.8)' : textMuted, fontSize: 11 }}>
                                {f === 'ofx' ? 'OFX' : 'Planilha'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Pick file button */}
            <TouchableOpacity
                onPress={onPickFile}
                disabled={loading}
                style={{
                    backgroundColor: '#6366f1',
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 10,
                    opacity: loading ? 0.7 : 1,
                }}
            >
                {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Feather name="upload" size={18} color="#fff" />
                }
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {loading ? 'Lendo arquivo…' : 'Escolher arquivo'}
                </Text>
            </TouchableOpacity>

            {/* File name badge */}
            {!!fileName && (
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: cardBg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor,
                    }}
                >
                    <Feather name="file-text" size={16} color={textMuted} />
                    <Text style={{ color: textPrimary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                        {fileName}
                    </Text>
                </View>
            )}

            {/* Error */}
            {!!error && (
                <View
                    style={{
                        backgroundColor: isDark ? '#2d1515' : '#fef2f2',
                        borderRadius: 10,
                        padding: 12,
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'flex-start',
                    }}
                >
                    <Feather name="alert-circle" size={16} color="#ef4444" style={{ marginTop: 1 }} />
                    <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
                </View>
            )}

            {/* Tips */}
            <View
                style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    padding: 14,
                    gap: 8,
                    borderWidth: 1,
                    borderColor,
                }}
            >
                <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {kind === 'ofx' ? 'Formato OFX' : 'Formato CSV'}
                </Text>
                {kind === 'ofx' ? (
                    <>
                        <TipLine icon="check-circle" color="#10b981" text="Exportado diretamente pelo banco (Bradesco, Itaú, BB, Caixa)" />
                        <TipLine icon="check-circle" color="#10b981" text="Deduplicação automática por FITID" />
                        <TipLine icon="check-circle" color="#10b981" text="Data e tipo de transação preservados" />
                    </>
                ) : (
                    <>
                        <TipLine icon="check-circle" color="#10b981" text="Exportado pelo Nubank, C6 Bank e outros" />
                        <TipLine icon="info" color="#3b82f6" text="Colunas: data, descrição, valor (auto-detectadas)" />
                        <TipLine icon="info" color="#3b82f6" text="Suporta vírgula e ponto como separadores decimais" />
                    </>
                )}
            </View>
        </ScrollView>
    );
}

function TipLine({ icon, color, text }: { icon: React.ComponentProps<typeof Feather>['name']; color: string; text: string }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Feather name={icon} size={14} color={color} style={{ marginTop: 2 }} />
            <Text style={{ color, fontSize: 12, flex: 1 }}>{text}</Text>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Preview
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewStepProps {
    isDark: boolean;
    bg: string;
    cardBg: string;
    textPrimary: string;
    textMuted: string;
    borderColor: string;
    inputBg: string;
    rows: PreviewTransaction[];
    accounts: BankAccount[];
    creditCards: CreditCard[];
    accountId: string;
    billingMonth: string;
    isCard: boolean;
    saving: boolean;
    onSelectAccount: (val: string) => void;
    onBillingMonthChange: (val: string) => void;
    onCycleType: (key: string, current: TransactionType) => void;
    onUpdateDesc: (key: string, desc: string) => void;
    onRemoveRow: (key: string) => void;
    onConfirm: () => void;
    categories: Category[];
    onSelectCategory: (key: string, catId: number | null) => void;
    onCreateCategory: (name: string) => Promise<Category>;
}

function PreviewStep({
    isDark, bg, cardBg, textPrimary, textMuted, borderColor, inputBg,
    rows, accounts, creditCards, accountId, billingMonth, isCard, saving,
    onSelectAccount, onBillingMonthChange, onCycleType, onUpdateDesc, onRemoveRow, onConfirm,
    categories, onSelectCategory, onCreateCategory,
}: PreviewStepProps) {

    const [destinationModal, setDestinationModal] = useState(false);
    const [categoryPickerRow, setCategoryPickerRow] = useState<string | null>(null);
    const [newCatName, setNewCatName] = useState('');
    const [creatingCat, setCreatingCat] = useState(false);
    const [createCatError, setCreateCatError] = useState('');
    const [showNewCatInput, setShowNewCatInput] = useState(false);

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) { setCreateCatError('Nome obrigatório'); return; }
        setCreatingCat(true);
        try {
            const cat = await onCreateCategory(newCatName.trim());
            if (categoryPickerRow) onSelectCategory(categoryPickerRow, cat.id);
            setCategoryPickerRow(null);
            setNewCatName('');
            setShowNewCatInput(false);
            setCreateCatError('');
        } catch {
            setCreateCatError('Erro ao criar categoria');
        } finally {
            setCreatingCat(false);
        }
    };

    const selectedLabel = (() => {
        if (!accountId) return 'Selecionar destino';
        if (accountId.startsWith('a:')) {
            const id = parseInt(accountId.slice(2), 10);
            const acc = accounts.find(a => a.id === id);
            return acc ? `${acc.name}${acc.bank ? ` · ${acc.bank}` : ''}` : 'Conta';
        }
        const id = parseInt(accountId.slice(2), 10);
        const card = creditCards.find(c => c.id === id);
        return card ? card.name : 'Cartão';
    })();

    const insets = useSafeAreaInsets();

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Summary bar */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    marginTop: 16,
                    paddingVertical: 10,
                    backgroundColor: cardBg,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                }}
            >
                <Text style={{ color: textMuted, fontSize: 12 }}>
                    {(() => {
                        const n = rows.filter(r => r.importStatus === 'new').length;
                        const u = rows.filter(r => r.importStatus === 'update').length;
                        if (n > 0 && u > 0) return `✨ ${n} nova${n !== 1 ? 's' : ''} · 🔄 ${u} atual.`;
                        if (u > 0) return `🔄 ${u} atualizar`;
                        return `${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'}`;
                    })()}
                </Text>
                <Text style={{ color: textMuted, fontSize: 12 }}>
                    Total: {rows.reduce((s, r) => s + (r.type === 'income' ? r.amount : -r.amount), 0)
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
            </View>

            {/* Destination selector */}
            <View
                style={{
                    backgroundColor: cardBg,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                    gap: 8,
                }}
            >
                <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Destino
                </Text>
                <TouchableOpacity
                    onPress={() => setDestinationModal(true)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: inputBg,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        gap: 8,
                        borderWidth: 1,
                        borderColor,
                    }}
                >
                    <Feather
                        name={isCard ? 'credit-card' : 'briefcase'}
                        size={16}
                        color="#6366f1"
                    />
                    <Text style={{ flex: 1, color: textPrimary, fontSize: 14 }}>{selectedLabel}</Text>
                    <Feather name="chevron-down" size={15} color={textMuted} />
                </TouchableOpacity>

                {isCard && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: textMuted, fontSize: 12, width: 70 }}>Mês fatura:</Text>
                        <TextInput
                            value={billingMonth}
                            onChangeText={onBillingMonthChange}
                            placeholder="MM/AAAA"
                            placeholderTextColor={textMuted}
                            maxLength={7}
                            keyboardType="numeric"
                            style={{
                                flex: 1,
                                backgroundColor: inputBg,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                color: textPrimary,
                                fontSize: 14,
                                borderWidth: 1,
                                borderColor,
                            }}
                        />
                    </View>
                )}
            </View>

            {/* Transaction list */}
            <FlatList
                data={rows}
                keyExtractor={item => item._key}
                contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                renderItem={({ item }) => (
                    <PreviewRow
                        row={item}
                        isDark={isDark}
                        cardBg={cardBg}
                        textPrimary={textPrimary}
                        textMuted={textMuted}
                        borderColor={borderColor}
                        inputBg={inputBg}
                        onCycleType={() => onCycleType(item._key, item.type)}
                        onUpdateDesc={desc => onUpdateDesc(item._key, desc)}
                        onRemove={() => onRemoveRow(item._key)}
                        categoryName={categories.find(c => c.id === item.category_id)?.name ?? null}
                        onPressCategory={() => setCategoryPickerRow(item._key)}
                    />
                )}
            />

            {/* Category picker modal */}
            <Modal
                visible={categoryPickerRow !== null}
                transparent
                animationType="fade"
                onRequestClose={() => { setCategoryPickerRow(null); setShowNewCatInput(false); setNewCatName(''); setCreateCatError(''); }}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    onPress={() => { setCategoryPickerRow(null); setShowNewCatInput(false); setNewCatName(''); setCreateCatError(''); }}
                >
                    <Pressable
                        style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(insets.bottom + 12, 24) }}
                        onPress={() => { }}
                    >
                        <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 16 }}>Categoria</Text>
                        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                            {/* No category option */}
                            <TouchableOpacity
                                onPress={() => { if (categoryPickerRow) onSelectCategory(categoryPickerRow, null); setCategoryPickerRow(null); }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}
                            >
                                <Feather name="x-circle" size={16} color={textMuted} />
                                <Text style={{ color: textMuted, fontSize: 14 }}>Sem categoria</Text>
                            </TouchableOpacity>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => { if (categoryPickerRow) onSelectCategory(categoryPickerRow, cat.id); setCategoryPickerRow(null); }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}
                                >
                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cat.color ?? '#9ca3af' }} />
                                    <Text style={{ color: textPrimary, fontSize: 14 }}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {/* New category */}
                        {!showNewCatInput ? (
                            <TouchableOpacity
                                onPress={() => setShowNewCatInput(true)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}
                            >
                                <Feather name="plus-circle" size={16} color="#6366f1" />
                                <Text style={{ color: '#6366f1', fontSize: 14, fontWeight: '600' }}>Nova categoria</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ marginTop: 12, gap: 8 }}>
                                <TextInput
                                    value={newCatName}
                                    onChangeText={text => { setNewCatName(text); setCreateCatError(''); }}
                                    placeholder="Nome da categoria"
                                    placeholderTextColor={textMuted}
                                    style={{ backgroundColor: inputBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: textPrimary, borderWidth: 1, borderColor: createCatError ? '#ef4444' : borderColor }}
                                    autoFocus
                                />
                                {!!createCatError && <Text style={{ color: '#ef4444', fontSize: 12 }}>{createCatError}</Text>}
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={() => { setShowNewCatInput(false); setNewCatName(''); setCreateCatError(''); }}
                                        style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor, alignItems: 'center' }}
                                    >
                                        <Text style={{ color: textMuted }}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCreateCategory}
                                        disabled={creatingCat}
                                        style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center' }}
                                    >
                                        {creatingCat
                                            ? <ActivityIndicator size="small" color="#fff" />
                                            : <Text style={{ color: '#fff', fontWeight: '600' }}>Criar</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Confirm button (floating) */}
            <View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 16,
                    paddingBottom: Math.max(insets.bottom + 8, 24),
                    backgroundColor: bg,
                    borderTopWidth: 1,
                    borderTopColor: borderColor,
                }}
            >
                <TouchableOpacity
                    onPress={onConfirm}
                    disabled={saving || rows.length === 0}
                    style={{
                        backgroundColor: '#6366f1',
                        borderRadius: 14,
                        paddingVertical: 16,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 10,
                        opacity: saving || rows.length === 0 ? 0.6 : 1,
                    }}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Feather name="check-circle" size={18} color="#fff" />
                    }
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                        {saving ? 'Importando…' : `Importar ${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'}`}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Destination picker modal */}
            <Modal
                visible={destinationModal}
                transparent
                animationType="slide"
                onRequestClose={() => setDestinationModal(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onPress={() => setDestinationModal(false)}
                />
                <View
                    style={{
                        backgroundColor: cardBg,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 16,
                        paddingBottom: Math.max(insets.bottom + 16, 16),
                        maxHeight: '70%',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                    }}
                >
                    <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>
                        Selecionar destino
                    </Text>

                    <ScrollView>
                        {accounts.length > 0 && (
                            <>
                                <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                                    Contas bancárias
                                </Text>
                                {accounts.map(acc => (
                                    <TouchableOpacity
                                        key={`a:${acc.id}`}
                                        onPress={() => { onSelectAccount(`a:${acc.id}`); setDestinationModal(false); }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            paddingHorizontal: 14,
                                            borderRadius: 10,
                                            marginBottom: 4,
                                            backgroundColor: accountId === `a:${acc.id}` ? (isDark ? '#252d45' : '#f0f0ff') : 'transparent',
                                            gap: 10,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: 5,
                                                backgroundColor: acc.color ?? '#6366f1',
                                            }}
                                        />
                                        <Text style={{ color: textPrimary, flex: 1 }}>
                                            {acc.name}{acc.bank ? ` · ${acc.bank}` : ''}
                                        </Text>
                                        {accountId === `a:${acc.id}` && (
                                            <Feather name="check" size={15} color="#6366f1" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}

                        {creditCards.length > 0 && (
                            <>
                                <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 }}>
                                    Cartões de crédito
                                </Text>
                                {creditCards.map(card => (
                                    <TouchableOpacity
                                        key={`c:${card.id}`}
                                        onPress={() => { onSelectAccount(`c:${card.id}`); setDestinationModal(false); }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            paddingHorizontal: 14,
                                            borderRadius: 10,
                                            marginBottom: 4,
                                            backgroundColor: accountId === `c:${card.id}` ? (isDark ? '#252d45' : '#f0f0ff') : 'transparent',
                                            gap: 10,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: 5,
                                                backgroundColor: card.color ?? '#6366f1',
                                            }}
                                        >
                                            <Feather name="credit-card" size={9} color="#fff" style={{ position: 'absolute', top: 0.5, left: 0.5 }} />
                                        </View>
                                        <Text style={{ color: textPrimary, flex: 1 }}>
                                            {card.name}
                                            {card.closing_day ? ` · fecha dia ${card.closing_day}` : ''}
                                        </Text>
                                        {accountId === `c:${card.id}` && (
                                            <Feather name="check" size={15} color="#6366f1" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview row component
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewRowProps {
    row: PreviewTransaction;
    isDark: boolean;
    cardBg: string;
    textPrimary: string;
    textMuted: string;
    borderColor: string;
    inputBg: string;
    onCycleType: () => void;
    onUpdateDesc: (desc: string) => void;
    onRemove: () => void;
    categoryName?: string | null;
    onPressCategory?: () => void;
}

function PreviewRow({
    row, isDark, cardBg, textPrimary, textMuted, borderColor, inputBg,
    onCycleType, onUpdateDesc, onRemove, categoryName, onPressCategory,
}: PreviewRowProps) {
    const color = TYPE_COLORS[row.type];
    const label = TYPE_LABELS[row.type];

    return (
        <View
            style={{
                backgroundColor: cardBg,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor,
                gap: 8,
            }}
        >
            {/* Row: description + remove */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                    value={row.description}
                    onChangeText={onUpdateDesc}
                    style={{
                        flex: 1,
                        color: textPrimary,
                        fontSize: 13,
                        backgroundColor: inputBg,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor,
                    }}
                    placeholderTextColor={textMuted}
                />
                {row.importStatus === 'update' && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: isDark ? '#2d2510' : '#fef3c7' }}>
                        <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '600' }}>🔄 Atualizar</Text>
                    </View>
                )}
                <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="trash-2" size={15} color={isDark ? '#5a3a3a' : '#fca5a5'} />
                </TouchableOpacity>
            </View>

            {/* Row: date + type badge + amount */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: textMuted, fontSize: 12, width: 84 }}>{formatDate(row.date)}</Text>

                <TouchableOpacity
                    onPress={onCycleType}
                    style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: `${color}22`,
                        borderWidth: 1,
                        borderColor: `${color}66`,
                    }}
                >
                    <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <Text
                    style={{
                        color: row.type === 'income' ? '#10b981' : '#ef4444',
                        fontSize: 13,
                        fontWeight: '600',
                    }}
                >
                    {row.type === 'income' ? '+' : '-'} {fmtCurrency(row.amount)}
                </Text>
            </View>

            {/* Row: category */}
            <TouchableOpacity
                onPress={onPressCategory}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    alignSelf: 'flex-start',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: categoryName ? '#6366f1' : borderColor,
                    backgroundColor: categoryName ? (isDark ? '#1e1b4b' : '#eef2ff') : 'transparent',
                }}
            >
                <Feather name="tag" size={11} color={categoryName ? '#6366f1' : textMuted} />
                <Text style={{ fontSize: 11, color: categoryName ? '#6366f1' : textMuted }}>
                    {categoryName ?? 'Sem categoria'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
