package br.com.finapp.dto;

import br.com.finapp.domain.Transaction;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTOs de Transação — separação entre representação REST e entidade JPA.
 */
public final class TransactionDto {

    private TransactionDto() {}

    /** Payload de criação/atualização */
    public static class Request {
        public Long accountId;
        public Long creditCardId;

        @NotNull
        public LocalDate date;

        @NotBlank
        public String description;

        @NotNull
        @DecimalMin("0.0")
        public BigDecimal amount;

        @NotNull
        public Transaction.Type type;

        public String category;
        public Transaction.Source source;
        public String externalId;
        public Long categoryId;
        public String billingMonth;
        public Long installmentGroupId;
        public Integer installmentNumber;
    }

    /** Payload de resposta */
    public static class Response {
        public Long id;
        public Long accountId;
        public Long creditCardId;
        public LocalDate date;
        public String description;
        public BigDecimal amount;
        public String type;
        public String category;
        public String source;
        public String externalId;
        public Long categoryId;
        public String categoryName;
        public String categoryColor;
        public String categoryIcon;
        public String billingMonth;
        public Long installmentGroupId;
        public Integer installmentNumber;

        public static Response from(br.com.finapp.domain.Transaction t) {
            var r = new Response();
            r.id = t.id;
            r.accountId = t.account != null ? t.account.id : null;
            r.creditCardId = t.creditCard != null ? t.creditCard.id : null;
            r.date = t.date;
            r.description = t.description;
            r.amount = t.amount;
            r.type = t.type.name();
            r.category = t.category;
            r.source = t.source != null ? t.source.name() : null;
            r.externalId = t.externalId;
            r.billingMonth = t.billingMonth;
            r.installmentGroupId = t.installmentGroup != null ? t.installmentGroup.id : null;
            r.installmentNumber = t.installmentNumber;
            if (t.category_rel != null) {
                r.categoryId = t.category_rel.id;
                r.categoryName = t.category_rel.name;
                r.categoryColor = t.category_rel.color;
                r.categoryIcon = t.category_rel.icon;
            }
            return r;
        }
    }

    /** Resultado de importação em lote */
    public static class ImportResult {
        public int inserted;
        public int skipped;

        public ImportResult(int inserted, int skipped) {
            this.inserted = inserted;
            this.skipped = skipped;
        }
    }
}
