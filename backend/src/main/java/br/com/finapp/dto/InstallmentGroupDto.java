package br.com.finapp.dto;

import br.com.finapp.domain.InstallmentGroup;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

public final class InstallmentGroupDto {

    private InstallmentGroupDto() {
    }

    public static class Request {
        @NotNull
        public Long creditCardId;
        @NotBlank
        public String description;
        @NotNull
        public BigDecimal totalAmount;
        @NotNull
        @Min(2)
        public Integer installments;
        @NotBlank
        public String firstBillingMonth; // MM/YYYY
        public String category;
    }

    public static class Response {
        public Long id;
        public Long creditCardId;
        public String creditCardName;
        public String description;
        public BigDecimal totalAmount;
        public Integer installments;
        public String firstBillingMonth;
        public String category;
        /** Campos calculados em runtime (RN-15) */
        public Integer realPaidInstallments;
        public Integer realRemainingInstallments;
        public BigDecimal realPaidAmount;
        public BigDecimal realRemainingAmount;

        public static Response from(InstallmentGroup g) {
            var r = new Response();
            r.id = g.id;
            r.creditCardId = g.creditCard != null ? g.creditCard.id : null;
            r.creditCardName = g.creditCard != null ? g.creditCard.name : null;
            r.description = g.description;
            r.totalAmount = g.totalAmount;
            r.installments = g.installments;
            r.firstBillingMonth = g.firstBillingMonth;
            r.category = g.category;

            // Algoritmo 5.2 — progresso calculado por meses decorridos (RN-07/RN-15)
            try {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/yyyy");
                YearMonth start = YearMonth.parse(g.firstBillingMonth, fmt);
                YearMonth now = YearMonth.now();
                long monthsBetween = start.until(now, java.time.temporal.ChronoUnit.MONTHS);
                int paid = (int) Math.min(Math.max(monthsBetween + 1, 0), g.installments);
                int remaining = g.installments - paid;
                BigDecimal perInstallment = g.totalAmount.divide(
                        BigDecimal.valueOf(g.installments), 2, RoundingMode.HALF_UP);
                r.realPaidInstallments = paid;
                r.realRemainingInstallments = remaining;
                r.realPaidAmount = perInstallment.multiply(BigDecimal.valueOf(paid))
                        .setScale(2, RoundingMode.HALF_UP);
                r.realRemainingAmount = g.totalAmount.subtract(r.realPaidAmount)
                        .setScale(2, RoundingMode.HALF_UP);
            } catch (Exception ignored) {
                r.realPaidInstallments = 0;
                r.realRemainingInstallments = g.installments;
                r.realPaidAmount = BigDecimal.ZERO;
                r.realRemainingAmount = g.totalAmount;
            }
            return r;
        }
    }
}
