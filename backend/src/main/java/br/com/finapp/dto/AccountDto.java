package br.com.finapp.dto;

import br.com.finapp.domain.Account;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public final class AccountDto {

    private AccountDto() {
    }

    public static class Request {
        @NotBlank
        public String name;
        public String bank;
        public BigDecimal balance;
        public String color;
    }

    public static class Response {
        public Long id;
        public String name;
        public String bank;
        public BigDecimal balance;
        public String color;

        public static Response from(Account a) {
            var r = new Response();
            r.id = a.id;
            r.name = a.name;
            r.bank = a.bank;
            r.balance = a.balance;
            r.color = a.color;
            return r;
        }
    }
}
