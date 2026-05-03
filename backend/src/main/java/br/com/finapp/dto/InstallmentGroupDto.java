package br.com.finapp.dto;

import br.com.finapp.domain.InstallmentGroup;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

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
            return r;
        }
    }
}
