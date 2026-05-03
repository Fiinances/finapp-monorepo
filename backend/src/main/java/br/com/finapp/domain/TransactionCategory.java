package br.com.finapp.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

/**
 * Entidade: transaction_categories
 *
 * Categorias hierárquicas de transações financeiras.
 * Suporta parent_id (auto-referência) para hierarquia pai-filho.
 * Cada categoria pertence a um único usuário (user_id = Supabase Auth UUID).
 *
 * RN-23: suporte a hierarquia via parent_id
 * RN-24: type pode ser 'income' ou 'expense'
 */
@Entity
@Table(name = "transaction_categories")
public class TransactionCategory extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    /** UUID do usuário autenticado (Supabase Auth) */
    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    public UUID userId;

    @NotBlank
    @Column(nullable = false)
    public String name;

    /** Cor hex (ex: #f97316) */
    public String color;

    /** Emoji ou nome de ícone */
    public String icon;

    /** 'income' | 'expense' */
    public String type;

    /** Referência ao pai para hierarquia (nullable = raiz) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    public TransactionCategory parent;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

}
