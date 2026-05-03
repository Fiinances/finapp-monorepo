package br.com.finapp.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTOs para os algoritmos de detecção de padrões financeiros.
 *
 * DetectedSubscription — resultado de detectSubscriptions() (algoritmo 5.3)
 * DetectedInstallment — resultado de detectInstallments() (algoritmo 5.4)
 */
public final class DetectionDto {

    private DetectionDto() {
    }

    /**
     * Assinatura recorrente detectada por frequência + variação de valor.
     *
     * RN-03: apenas type = expense
     * RN-04: variação máxima 5%
     * RN-05: mínimo 3 ocorrências
     */
    public static class DetectedSubscription {
        /** Descrição da transação usada para agrupamento */
        public String description;
        /** Quantidade de ocorrências encontradas */
        public long occurrences;
        /** Valor médio das transações */
        public BigDecimal avgAmount;
        /** Menor valor encontrado */
        public BigDecimal minAmount;
        /** Maior valor encontrado */
        public BigDecimal maxAmount;
        /** Data da primeira ocorrência */
        public String firstDate;
        /** Data da última ocorrência */
        public String lastDate;
    }

    /**
     * Parcelamento detectado por regex N/M na descrição de transações de cartão.
     *
     * RN-06: janela de 2 meses para busca
     * RN-07: first_billing_month calculado retroativamente
     */
    public static class DetectedInstallment {
        /** ID do cartão ao qual as transações pertencem */
        public Long creditCardId;
        /** Descrição base (sem a parte N/M) */
        public String description;
        /** Número total de parcelas detectado */
        public int totalInstallments;
        /** Valor de cada parcela (amount de uma das transações) */
        public BigDecimal installmentAmount;
        /** Valor total calculado: installmentAmount × totalInstallments */
        public BigDecimal totalAmount;
        /**
         * Mês da primeira parcela (MM/YYYY), calculado retroativamente
         * a partir do installment_number da transação mais antiga encontrada.
         */
        public String firstBillingMonth;
        /** IDs das transações que compõem este parcelamento */
        public List<Long> transactionIds;
    }
}
