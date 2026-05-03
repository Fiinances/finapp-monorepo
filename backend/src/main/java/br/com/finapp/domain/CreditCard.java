package br.com.finapp.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade: credit_cards
 *
 * Cartão de crédito vinculado a uma conta bancária.
 * closing_day: dia de fechamento da fatura (1-31)
 * due_day: dia de vencimento da fatura (1-31)
 *
 * Transações após closing_day pertencem ao mês seguinte (RN-09).
 */
@Entity
@Table(name = "credit_cards")
public class CreditCard extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    public UUID userId;

    /** Conta vinculada (ON DELETE CASCADE no banco) */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    public Account account;

    @NotBlank
    @Column(nullable = false)
    public String name;

    /** Cor hex para identificação visual */
    public String color;

    /** Limite de crédito */
    @Column(name = "credit_limit", precision = 15, scale = 2)
    public BigDecimal creditLimit;

    /**
     * Dia de fechamento da fatura (1-31).
     * Transações com day > closingDay → fatura do mês seguinte (RN-09).
     */
    @Min(1) @Max(31)
    @Column(name = "closing_day")
    public Integer closingDay;

    /** Dia de vencimento da fatura (1-31) */
    @Min(1) @Max(31)
    @Column(name = "due_day")
    public Integer dueDay;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

}
