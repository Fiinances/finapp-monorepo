package br.com.finapp.dto;

import br.com.finapp.domain.Subscription;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public final class SubscriptionDto {

    private SubscriptionDto() {
    }

    public static class Request {
        @NotBlank
        public String name;
        @NotNull
        public BigDecimal amount;
        @NotNull
        public Subscription.Type type;
        @NotNull
        public Subscription.Period period;
        public LocalDate nextDue;
        public String category;
        public String color;
        public Long accountId;
        public Long creditCardId;
        public Boolean active = true;
    }

    public static class Response {
        public Long id;
        public String name;
        public BigDecimal amount;
        public String type;
        public String period;
        public LocalDate nextDue;
        public String category;
        public String color;
        public Long accountId;
        public Long creditCardId;
        public Boolean active;
        /** Equivalente mensal calculado (RN-18) */
        public BigDecimal monthlyEquivalent;

        public static Response from(Subscription s) {
            var r = new Response();
            r.id = s.id;
            r.name = s.name;
            r.amount = s.amount;
            r.type = s.type.name();
            r.period = s.period.name();
            r.nextDue = s.nextDue;
            r.category = s.category;
            r.color = s.color;
            r.accountId = s.account != null ? s.account.id : null;
            r.creditCardId = s.creditCard != null ? s.creditCard.id : null;
            r.active = s.active;

            // RN-18: equivalente mensal — weekly × 52/12; yearly / 12
            r.monthlyEquivalent = switch (s.period) {
                case weekly -> s.amount.multiply(BigDecimal.valueOf(52))
                        .divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
                case monthly -> s.amount.setScale(2, RoundingMode.HALF_UP);
                case yearly -> s.amount.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            };
            return r;
        }
    }
}
