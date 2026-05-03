package br.com.finapp.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade: subscriptions
 *
 * Assinatura/cobrança recorrente do usuário.
 *
 * RN-18: equivalente mensal = weekly × 52/12; yearly / 12
 * RN-19: inactive (active=false) não entra nos totais do dashboard
 * RN-20: alerta se next_due <= hoje + 7 dias
 * RN-21: next_due NÃO é atualizado automaticamente (lacuna confirmada)
 * RN-22: detecção por ≥ 3 ocorrências, variação < 5%, apenas expense
 */
@Entity
@Table(name = "subscriptions")
public class Subscription extends PanacheEntityBase {

    public enum Type {
        expense, income
    }

    public enum Period {
        weekly, monthly, yearly
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    public UUID userId;

    @NotBlank
    @Column(nullable = false)
    public String name;

    @NotNull
    @Column(nullable = false, precision = 15, scale = 2)
    public BigDecimal amount;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public Type type;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public Period period;

    /**
     * Próximo vencimento.
     * RN-21: NÃO atualizado automaticamente após vencimento.
     * Automação futura planejada (confirmado pelo proprietário).
     */
    @Column(name = "next_due")
    public LocalDate nextDue;

    public String category;

    public String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    public Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_card_id")
    public CreditCard creditCard;

    /** Assinatura ativa ou não. Inativas não entram nos totais (RN-19). */
    @Column(nullable = false)
    public Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

}
