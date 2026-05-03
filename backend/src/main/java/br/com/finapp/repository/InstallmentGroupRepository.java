package br.com.finapp.repository;

import br.com.finapp.domain.InstallmentGroup;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório de grupos de parcelamento.
 *
 * RN-12: mínimo 2 parcelas (validado na entidade/serviço).
 * RN-16: deletar grupo desvincula transações (SET NULL no banco).
 */
@ApplicationScoped
public class InstallmentGroupRepository implements PanacheRepository<InstallmentGroup> {

    public List<InstallmentGroup> findByUser(UUID userId) {
        return list("userId = ?1 ORDER BY createdAt DESC", userId);
    }

    public List<InstallmentGroup> findByCard(UUID userId, Long cardId) {
        return list("userId = ?1 AND creditCard.id = ?2 ORDER BY createdAt DESC", userId, cardId);
    }

    public Optional<InstallmentGroup> findByIdAndUser(Long id, UUID userId) {
        return find("id = ?1 AND userId = ?2", id, userId).firstResultOptional();
    }

    public long deleteByIdAndUser(Long id, UUID userId) {
        return delete("id = ?1 AND userId = ?2", id, userId);
    }
}
