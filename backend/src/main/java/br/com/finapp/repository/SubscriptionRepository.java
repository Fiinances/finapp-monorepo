package br.com.finapp.repository;

import br.com.finapp.domain.Subscription;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório de assinaturas recorrentes.
 *
 * RN-19: inativas não entram nos totais → filtro por active=true.
 * RN-20: alerta de vencimento em até 7 dias.
 */
@ApplicationScoped
public class SubscriptionRepository implements PanacheRepository<Subscription> {

    public List<Subscription> findByUser(UUID userId) {
        return list("userId = ?1 ORDER BY name ASC", userId);
    }

    public List<Subscription> findActiveByUser(UUID userId) {
        return list("userId = ?1 AND active = true ORDER BY name ASC", userId);
    }

    /**
     * Assinaturas com vencimento entre duas datas (RN-20: alerta 7 dias).
     * Uso: findDueSoon(userId, LocalDate.now(), LocalDate.now().plusDays(7))
     */
    public List<Subscription> findDueSoon(UUID userId, LocalDate from, LocalDate until) {
        return list(
            "userId = ?1 AND active = true AND nextDue >= ?2 AND nextDue <= ?3",
            userId, from, until
        );
    }

    public Optional<Subscription> findByIdAndUser(Long id, UUID userId) {
        return find("id = ?1 AND userId = ?2", id, userId).firstResultOptional();
    }

    public long deleteByIdAndUser(Long id, UUID userId) {
        return delete("id = ?1 AND userId = ?2", id, userId);
    }
}
