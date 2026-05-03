package br.com.finapp.repository;

import br.com.finapp.domain.Transaction;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório de transações financeiras.
 *
 * RN-05: deduplicação por external_id (FITID do OFX).
 * RN-07: transação pertence a account OU credit_card.
 */
@ApplicationScoped
public class TransactionRepository implements PanacheRepository<Transaction> {

    public List<Transaction> findByUser(UUID userId) {
        return list("userId = ?1 ORDER BY date DESC", userId);
    }

    public List<Transaction> findByUserAndType(UUID userId, Transaction.Type type) {
        return list("userId = ?1 AND type = ?2 ORDER BY date DESC", userId, type);
    }

    public List<Transaction> findByAccount(UUID userId, Long accountId) {
        return list("userId = ?1 AND account.id = ?2 ORDER BY date DESC", userId, accountId);
    }

    public List<Transaction> findByCard(UUID userId, Long cardId) {
        return list("userId = ?1 AND creditCard.id = ?2 ORDER BY date DESC", userId, cardId);
    }

    /** Transações de uma fatura de cartão específica (MM/YYYY) */
    public List<Transaction> findByBillingMonth(UUID userId, Long cardId, String billingMonth) {
        return list(
            "userId = ?1 AND creditCard.id = ?2 AND billingMonth = ?3 ORDER BY date DESC",
            userId, cardId, billingMonth
        );
    }

    public Optional<Transaction> findByIdAndUser(Long id, UUID userId) {
        return find("id = ?1 AND userId = ?2", id, userId).firstResultOptional();
    }

    public long deleteByIdAndUser(Long id, UUID userId) {
        return delete("id = ?1 AND userId = ?2", id, userId);
    }

    /** Verifica duplicata por external_id antes de importar (RN-05) */
    public boolean existsByExternalId(UUID userId, String externalId) {
        return count("userId = ?1 AND externalId = ?2", userId, externalId) > 0;
    }
}
