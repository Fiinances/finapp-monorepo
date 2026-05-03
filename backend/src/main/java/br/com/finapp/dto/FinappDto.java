package br.com.finapp.dto;

import br.com.finapp.domain.Account;
import br.com.finapp.domain.CreditCard;
import br.com.finapp.domain.InstallmentGroup;
import br.com.finapp.domain.Subscription;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTOs das demais entidades do Finapp.
 */
public final class FinappDto {

    private FinappDto() {}

    // ======================================================
    // ACCOUNT
    // ======================================================
    public static class AccountRequest {
        @NotBlank public String name;
        public String bank;
        public BigDecimal balance;
        public String color;
    }

    public static class AccountResponse {
        public Long id;
        public String name;
        public String bank;
        public BigDecimal balance;
        public String color;

        public static AccountResponse from(Account a) {
            var r = new AccountResponse();
            r.id = a.id;
            r.name = a.name;
            r.bank = a.bank;
            r.balance = a.balance;
            r.color = a.color;
            return r;
        }
    }

    // ======================================================
    // CREDIT CARD
    // ======================================================
    public static class CreditCardRequest {
        @NotNull public Long accountId;
        @NotBlank public String name;
        public String color;
        public BigDecimal creditLimit;
        @Min(1) @Max(31) public Integer closingDay;
        @Min(1) @Max(31) public Integer dueDay;
    }

    public static class CreditCardResponse {
        public Long id;
        public Long accountId;
        public String name;
        public String color;
        public BigDecimal creditLimit;
        public Integer closingDay;
        public Integer dueDay;

        public static CreditCardResponse from(CreditCard c) {
            var r = new CreditCardResponse();
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

    // ======================================================
    // INSTALLMENT GROUP
    // ======================================================
    public static class InstallmentGroupRequest {
        @NotNull public Long creditCardId;
        @NotBlank public String description;
        @NotNull public BigDecimal totalAmount;
        @NotNull @Min(2) public Integer installments;
        @NotBlank public String firstBillingMonth; // MM/YYYY
        public String category;
    }

    public static class InstallmentGroupResponse {
        public Long id;
        public Long creditCardId;
        public String creditCardName;
        public String description;
        public BigDecimal totalAmount;
        public Integer installments;
        public String firstBillingMonth;
        public String category;
        // Campos calculados em runtime (RN-15)
        public Integer realPaidInstallments;
        public Integer realRemainingInstallments;
        public BigDecimal realPaidAmount;
        public BigDecimal realRemainingAmount;

        public static InstallmentGroupResponse from(InstallmentGroup g) {
            var r = new InstallmentGroupResponse();
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

    // ======================================================
    // SUBSCRIPTION
    // ======================================================
    public static class SubscriptionRequest {
        @NotBlank public String name;
        @NotNull public BigDecimal amount;
        @NotNull public Subscription.Type type;
        @NotNull public Subscription.Period period;
        public LocalDate nextDue;
        public String category;
        public String color;
        public Long accountId;
        public Long creditCardId;
        public Boolean active = true;
    }

    public static class SubscriptionResponse {
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

        public static SubscriptionResponse from(Subscription s) {
            var r = new SubscriptionResponse();
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
            return r;
        }
    }

    // ======================================================
    // CATEGORY
    // ======================================================
    public static class CategoryRequest {
        @NotBlank public String name;
        public String color;
        public String icon;
        public String type; // 'income' | 'expense'
        public Long parentId;
    }

    public static class CategoryResponse {
        public Long id;
        public String name;
        public String color;
        public String icon;
        public String type;
        public Long parentId;

        public static CategoryResponse from(br.com.finapp.domain.TransactionCategory c) {
            var r = new CategoryResponse();
            r.id = c.id;
            r.name = c.name;
            r.color = c.color;
            r.icon = c.icon;
            r.type = c.type;
            r.parentId = c.parent != null ? c.parent.id : null;
            return r;
        }
    }
}
