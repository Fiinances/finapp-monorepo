package br.com.finapp.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade: installment_groups
 *
 * Grupo de parcelamento: compra feita no cartão dividida em N parcelas.
 *
 * RN-12: mínimo 2 parcelas
 * RN-14: valor por parcela = total_amount / installments (distribuição uniforme)
 * RN-15: progresso calculado por meses decorridos desde first_billing_month
 * RN-16: deletar grupo desvincula transações (SET NULL), não as deleta
 * RN-17: detecção automática por padrão N/M, N-M ou N DE M na descrição
 *
 * Campos computados (NÃO persistidos, calculados no serviço):
 *   - realPaidInstallments = monthsBetween(first_billing_month, today) + 1
 *   - realRemainingInstallments = installments - realPaidInstallments
 *   - realPaidAmount = (total_amount / installments) * realPaidInstallments
 *   - realRemainingAmount = total_amount - realPaidAmount
 */
@Entity
@Table(name = "installment_groups")
public class InstallmentGroup extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    public UUID userId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_card_id", nullable = false)
    public CreditCard creditCard;

    @NotBlank
    @Column(nullable = false)
    public String description;

    @NotNull
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    public BigDecimal totalAmount;

    /**
     * Número total de parcelas.
     * RN-12: mínimo 2.
     */
    @Min(2)
    @NotNull
    @Column(nullable = false)
    public Integer installments;

    /**
     * Mês da primeira parcela no formato MM/YYYY.
     * G-06: validação de data futura deve ser aplicada no serviço.
     */
    @NotBlank
    @Column(name = "first_billing_month", nullable = false)
    public String firstBillingMonth;

    public String category;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

}
