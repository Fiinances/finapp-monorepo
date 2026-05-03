package br.com.finapp.repository;

import br.com.finapp.domain.TransactionCategory;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório de categorias de transação.
 *
 * RN-01 (categories): listagem ordenada por nome.
 * RN-23: suporte a hierarquia via parent_id.
 */
@ApplicationScoped
public class TransactionCategoryRepository implements PanacheRepository<TransactionCategory> {

    /** Todas as categorias do usuário, ordenadas por nome */
    public List<TransactionCategory> findByUser(UUID userId) {
        return list("userId = ?1 ORDER BY name ASC", userId);
    }

    /** Apenas categorias raiz (sem pai) */
    public List<TransactionCategory> findRootByUser(UUID userId) {
        return list("userId = ?1 AND parent IS NULL ORDER BY name ASC", userId);
    }

    /** Subcategorias de um pai específico */
    public List<TransactionCategory> findChildrenOf(UUID userId, Long parentId) {
        return list("userId = ?1 AND parent.id = ?2 ORDER BY name ASC", userId, parentId);
    }

    /** Busca por ID garantindo que pertence ao usuário (segurança) */
    public Optional<TransactionCategory> findByIdAndUser(Long id, UUID userId) {
        return find("id = ?1 AND userId = ?2", id, userId).firstResultOptional();
    }

    public long deleteByIdAndUser(Long id, UUID userId) {
        return delete("id = ?1 AND userId = ?2", id, userId);
    }
}
