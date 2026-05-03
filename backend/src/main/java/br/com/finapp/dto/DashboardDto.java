package br.com.finapp.dto;

import java.math.BigDecimal;
import java.util.List;

public final class DashboardDto {

    private DashboardDto() {
    }

    /**
     * Item do gráfico de receita/despesa mensal.
     * month: YYYY-MM
     * net = income - expense (investment NÃO entra no net — RN-02)
     */
    public record MonthlyItem(
            String month,
            BigDecimal income,
            BigDecimal expense,
            BigDecimal investment,
            BigDecimal net) {
    }

    /**
     * Item do gráfico de despesas por categoria.
     * Categorias nulas/vazias → "Sem categoria" (RN-04)
     */
    public record CategoryItem(
            String category,
            BigDecimal total) {
    }

    /**
     * Item do gráfico de fatura de cartão.
     * billingMonth: MM/YYYY (campo billing_month da transação, fallback de date —
     * RN-05)
     */
    public record CardFaturaItem(
            String billingMonth,
            Long creditCardId,
            String creditCardName,
            BigDecimal total) {
    }

    /**
     * Item de assinatura no resumo.
     */
    public record SubscriptionItem(
            Long id,
            String name,
            BigDecimal amount,
            String period,
            BigDecimal monthlyEquivalent,
            BigDecimal yearlyEquivalent) {
    }

    /**
     * Resumo de assinaturas ativas.
     * Retorna null se não houver assinaturas (RN-06).
     */
    public record SubscriptionsSummary(
            BigDecimal monthlyTotal,
            BigDecimal yearlyTotal,
            List<SubscriptionItem> items) {
    }
}
