package br.com.finapp.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Entidade: transactions
 *
 * Registro financeiro principal do sistema.
 *
 * RN-01: amount sempre >= 0; type determina sinal
 * RN-02: types válidos: income, expense, investment, transfer, card_payment
 * RN-03: transfer e card_payment não contam como despesa nos totais
 * RN-04: investment não entra no cálculo de total (income - expense)
 * RN-05: deduplicação por external_id (FITID do OFX)
 * RN-07: pertence a account OU credit_card, nunca ambos (constraint no banco)
 */
@Entity
@Table(name = "transactions")
public class Transaction extends PanacheEntityBase {

    public enum Type {
        income, expense, investment, transfer, card_payment
    }

    public enum Source {
        manual, csv, ofx
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    public UUID userId;

    /** Conta vinculada (mutuamente exclusiva com creditCard — RN-07) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    public Account account;

    /** Cartão de crédito vinculado (mutuamente exclusivo com account — RN-07) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_card_id")
    public CreditCard creditCard;

    @NotNull
    @Column(nullable = false)
    public LocalDate date;

    @NotBlank
    @Column(nullable = false)
    public String description;

    /** Sempre >= 0. O sinal é determinado por type. (RN-01) */
    @NotNull
    @DecimalMin("0.0")
    @Column(nullable = false, precision = 15, scale = 2)
    public BigDecimal amount;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public Type type;

    /** Categoria textual livre (campo legado) */
    public String category;

    @Enumerated(EnumType.STRING)
    public Source source;

    /**
     * ID externo para deduplicação de OFX (FITID).
     * UNIQUE por user_id no banco (RN-05).
     */
    @Column(name = "external_id")
    public String externalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    public TransactionCategory category_rel;

    /**
     * Mês de referência da fatura do cartão (MM/YYYY).
     * RN-08: formato MM/YYYY.
     * RN-09: determinado pelo closing_day do cartão.
     */
    @Column(name = "billing_month")
    public String billingMonth;

    /** Parcelamento ao qual esta transação pertence */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installment_group_id")
    public InstallmentGroup installmentGroup;

    /** Número da parcela (1-based) */
    @Column(name = "installment_number")
    public Integer installmentNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

}
