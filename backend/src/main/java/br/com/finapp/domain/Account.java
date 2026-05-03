package br.com.finapp.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade: accounts
 *
 * Conta bancária do usuário (corrente, poupança, etc).
 * O campo balance é manual/informativo — não é calculado
 * automaticamente a partir das transações (G-02 / RN-36 do domain.md).
 */
@Entity
@Table(name = "accounts")
public class Account extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    public UUID userId;

    @NotBlank
    @Column(nullable = false)
    public String name;

    /** Nome do banco (ex: "Nubank", "Bradesco") */
    public String bank;

    /**
     * Saldo informativo/manual — não calculado automaticamente.
     * G-02: intencional por design (confirmado pelo proprietário).
     */
    @Column(precision = 15, scale = 2)
    public BigDecimal balance;

    /** Cor hex para identificação visual */
    public String color;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

}
