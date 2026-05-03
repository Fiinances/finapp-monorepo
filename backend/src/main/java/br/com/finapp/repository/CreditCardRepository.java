package br.com.finapp.repository;

import br.com.finapp.domain.CreditCard;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CreditCardRepository implements PanacheRepository<CreditCard> {

    public List<CreditCard> findByUser(UUID userId) {
        return list("userId = ?1 ORDER BY name ASC", userId);
    }

    public List<CreditCard> findByAccount(UUID userId, Long accountId) {
        return list("userId = ?1 AND account.id = ?2 ORDER BY name ASC", userId, accountId);
    }

    public Optional<CreditCard> findByIdAndUser(Long id, UUID userId) {
        return find("id = ?1 AND userId = ?2", id, userId).firstResultOptional();
    }

    public long deleteByIdAndUser(Long id, UUID userId) {
        return delete("id = ?1 AND userId = ?2", id, userId);
    }
}
