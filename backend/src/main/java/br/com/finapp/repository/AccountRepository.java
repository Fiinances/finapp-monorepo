package br.com.finapp.repository;

import br.com.finapp.domain.Account;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class AccountRepository implements PanacheRepository<Account> {

    public List<Account> findByUser(UUID userId) {
        return list("userId = ?1 ORDER BY name ASC", userId);
    }

    public Optional<Account> findByIdAndUser(Long id, UUID userId) {
        return find("id = ?1 AND userId = ?2", id, userId).firstResultOptional();
    }

    public long deleteByIdAndUser(Long id, UUID userId) {
        return delete("id = ?1 AND userId = ?2", id, userId);
    }
}
