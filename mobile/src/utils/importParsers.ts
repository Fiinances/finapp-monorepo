/**
 * Import Parsers — OFX & CSV for React Native
 *
 * Spec: _reversa_sdd/sdd/import.md
 */

import Papa from 'papaparse';
import type { TransactionType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PreviewTransaction {
    _key: string;               // local unique key for list rendering
    description: string;
    amount: number;             // always positive
    type: TransactionType;
    date: string;               // ISO YYYY-MM-DD
    source: 'csv' | 'ofx';
    external_id?: string;       // OFX FITID
    installment_number?: number | null;
    category_id?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes various date string formats to ISO YYYY-MM-DD.
 * Handles: "DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"
 */
export function normalizeDateToISO(raw: string): string {
    if (!raw) return raw;
    const trimmed = raw.trim();

    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

    // DD/MM/YYYY or DD-MM-YYYY
    const ddMmYyyy = trimmed.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})/);
    if (ddMmYyyy) return `${ddMmYyyy[3]}-${ddMmYyyy[2]}-${ddMmYyyy[1]}`;

    return trimmed;
}

/**
 * Extracts YYYY-MM-DD from OFX date string like "20250115120000[-3:BRT]".
 */
export function parseOfxDate(raw: string): string {
    const match = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) return raw;
    return `${match[1]}-${match[2]}-${match[3]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Installment detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects installment pattern like "3/12", "03-12", "3 DE 12" in a description.
 * Returns { current, total } or null.
 */
export function detectInstallment(desc: string): { current: number; total: number } | null {
    const match = desc.match(/\b(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2})\b/i);
    if (!match) return null;
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (total < 2 || current < 1 || current > total) return null;
    return { current, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing month inference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infers billing_month (MM/YYYY) for a credit card statement by majority vote
 * based on the card's closing_day.
 */
export function inferBillingMonth(
    transactions: PreviewTransaction[],
    closingDay: number,
    fallback: string,
): string {
    const votes: Record<string, number> = {};
    for (const t of transactions) {
        const iso = normalizeDateToISO(t.date);
        const [year, month, day] = iso.split('-').map(Number);
        if (!year || !month || !day) continue;

        let billMonth = month;
        let billYear = year;
        if (day > closingDay) {
            billMonth += 1;
            if (billMonth > 12) { billMonth = 1; billYear++; }
        }
        const key = `${String(billMonth).padStart(2, '0')}/${billYear}`;
        votes[key] = (votes[key] ?? 0) + 1;
    }

    let winner = fallback;
    let max = 0;
    for (const [key, count] of Object.entries(votes)) {
        if (count > max) { winner = key; max = count; }
    }
    return winner;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a CSV string into PreviewTransaction[].
 * Throws if required columns (date, description, amount) cannot be detected.
 */
export function mapCsvToTransactions(csvText: string): PreviewTransaction[] {
    const result = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: '',      // auto-detect
    });

    const headers: string[] = result.meta.fields ?? [];

    const find = (candidates: string[]): string | undefined =>
        headers.find(h => candidates.some(c => h.toLowerCase().includes(c)));

    const dateCol = find(['data', 'date', 'dt']);
    const descCol = find(['descri', 'historico', 'histórico', 'title', 'lancamento', 'lançamento', 'memo', 'payee', 'name']);
    const amtCol = find(['valor', 'amount', 'value', 'montante']);

    if (!dateCol || !descCol || !amtCol) {
        const missing: string[] = [];
        if (!dateCol) missing.push('data');
        if (!descCol) missing.push('descrição');
        if (!amtCol) missing.push('valor');
        throw new Error(`Não foi possível identificar as colunas: ${missing.join(', ')}`);
    }

    const txs: PreviewTransaction[] = [];
    let idx = 0;
    for (const row of result.data) {
        const rawDate = row[dateCol]?.trim() ?? '';
        const rawDesc = row[descCol]?.trim() ?? '';
        const rawAmt = row[amtCol];

        if (!rawDate || !rawDesc) continue;

        let rawAmount: number;
        if (typeof rawAmt === 'number') {
            rawAmount = rawAmt;
        } else {
            const str = (rawAmt ?? '').replace(/\./g, '').replace(',', '.');
            rawAmount = parseFloat(str);
        }
        if (isNaN(rawAmount)) continue;

        const absAmount = Math.abs(rawAmount);
        const type: TransactionType = rawAmount >= 0 ? 'income' : 'expense';
        const date = normalizeDateToISO(rawDate);
        const installment = detectInstallment(rawDesc);

        txs.push({
            _key: `csv-${idx++}`,
            description: rawDesc,
            amount: absAmount,
            type,
            date,
            source: 'csv',
            installment_number: installment?.current ?? null,
        });
    }

    return txs;
}

// ─────────────────────────────────────────────────────────────────────────────
// OFX parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the value of an OFX tag (SGML-style, single line).
 * Example: extractTag("<DTPOSTED>20250115\n...", "DTPOSTED") → "20250115"
 */
function extractTag(text: string, tag: string): string | null {
    const match = text.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'));
    return match ? match[1].trim() : null;
}

/**
 * Extracts all occurrences of a block-like tag from OFX text.
 * Returns array of sub-strings, each containing one <STMTTRN>...</STMTTRN> block.
 */
function extractBlocks(text: string, openTag: string, closeTag: string): string[] {
    const blocks: string[] = [];
    const re = new RegExp(`<${openTag}>([\\s\\S]*?)<\\/${closeTag}>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        blocks.push(match[1]);
    }
    // If no closing tags (SGML-style OFX without closing tags), split by open tag
    if (blocks.length === 0) {
        const parts = text.split(new RegExp(`<${openTag}>`, 'i'));
        for (let i = 1; i < parts.length; i++) {
            blocks.push(parts[i]);
        }
    }
    return blocks;
}

/**
 * Parses OFX text content into PreviewTransaction[].
 */
export function mapOfxToTransactions(ofxText: string): PreviewTransaction[] {
    const txs: PreviewTransaction[] = [];
    let idx = 0;

    // Find STMTTRN blocks (both bank and credit card statements use the same structure)
    const blocks = extractBlocks(ofxText, 'STMTTRN', 'STMTTRN');

    for (const block of blocks) {
        const dtPosted = extractTag(block, 'DTPOSTED');
        const trnAmt = extractTag(block, 'TRNAMT');
        const trnType = extractTag(block, 'TRNTYPE');
        const memo = extractTag(block, 'MEMO');
        const name = extractTag(block, 'NAME');
        const fitid = extractTag(block, 'FITID');

        if (!dtPosted || !trnAmt) continue;

        const rawAmount = parseFloat((trnAmt ?? '0').replace(',', '.'));
        if (isNaN(rawAmount)) continue;

        const absAmount = Math.abs(rawAmount);
        let type: TransactionType;
        if (trnType?.toUpperCase() === 'CREDIT') {
            type = 'income';
        } else if (trnType?.toUpperCase() === 'DEBIT') {
            type = 'expense';
        } else {
            // Fallback: use sign
            type = rawAmount >= 0 ? 'income' : 'expense';
        }

        const description = (memo ?? name ?? 'Sem descrição').trim();
        const date = parseOfxDate(dtPosted);
        const installment = detectInstallment(description);

        txs.push({
            _key: `ofx-${idx++}`,
            description,
            amount: absAmount,
            type,
            date,
            source: 'ofx',
            external_id: fitid ?? undefined,
            installment_number: installment?.current ?? null,
        });
    }

    return txs;
}
