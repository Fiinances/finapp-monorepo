package br.com.finapp.dto;

import br.com.finapp.domain.CreditCard;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public final class CreditCardDto {

    private CreditCardDto() {
    }

    public static class Request {
        @NotNull
        public Long accountId;
        @NotBlank
        public String name;
        public String color;
        public BigDecimal creditLimit;
        @Min(1)
        @Max(31)
        public Integer closingDay;
        @Min(1)
        @Max(31)
        public Integer dueDay;
    }

    public static class Response {
        public Long id;
        public Long accountId;
        public String name;
        public String color;
        public BigDecimal creditLimit;
        public Integer closingDay;
        public Integer dueDay;

        public static Response from(CreditCard c) {
            var r = new Response();
            r.id = c.id;
            r.accountId = c.account != null ? c.account.id : null;
            r.name = c.name;
            r.color = c.color;
            r.creditLimit = c.creditLimit;
            r.closingDay = c.closingDay;
            r.dueDay = c.dueDay;
            return r;
        }
    }
}
