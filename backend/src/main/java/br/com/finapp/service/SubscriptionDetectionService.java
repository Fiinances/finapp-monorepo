package br.com.finapp.service;

import br.com.finapp.dto.DetectionDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Detecção de assinaturas recorrentes — algoritmo 5.3 (ipc-db.md).
 *
 * Critérios (RN-03, RN-04, RN-05):
 * - Apenas transações do tipo 'expense'
 * - Mínimo 3 ocorrências com a mesma descrição
 * - Variação de valor <= 5% (MAX - MIN) / AVG < 0.05
 *
 * Resultado ordenado por número de ocorrências DESC.
 */
@ApplicationScoped
public class SubscriptionDetectionService {

    @Inject
    EntityManager em;

    /**
     * Detecta candidatas a assinatura recorrente para o usuário.
     *
     * @param userId UUID do usuário autenticado (isolamento por tenant)
     * @return lista de {@link DetectionDto.DetectedSubscription}
     */
    @SuppressWarnings("unchecked")
    public List<DetectionDto.DetectedSubscription> detect(UUID userId) {
        // Porta fiel do algoritmo 5.3 de ipc-db.md para PostgreSQL/JPQL nativo
        String sql = """
                SELECT
                    t.description,
                    COUNT(*)                        AS occurrences,
                    AVG(t.amount)                   AS avg_amount,
                    MIN(t.amount)                   AS min_amount,
                    MAX(t.amount)                   AS max_amount,
                    CAST(MIN(t.date) AS VARCHAR)    AS first_date,
                    CAST(MAX(t.date) AS VARCHAR)    AS last_date
                FROM transactions t
                WHERE t.user_id = CAST(:userId AS uuid)
                  AND t.type = 'expense'
                GROUP BY t.description
                HAVING COUNT(*) >= 3
                   AND (MAX(t.amount) - MIN(t.amount)) / NULLIF(AVG(t.amount), 0) < 0.05
                ORDER BY occurrences DESC
                """;

        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("userId", userId.toString())
                .getResultList();

        return rows.stream().map(row -> {
            var dto = new DetectionDto.DetectedSubscription();
            dto.description = (String) row[0];
            dto.occurrences = ((Number) row[1]).longValue();
            dto.avgAmount = toBigDecimal(row[2]);
            dto.minAmount = toBigDecimal(row[3]);
            dto.maxAmount = toBigDecimal(row[4]);
            dto.firstDate = row[5] != null ? row[5].toString() : null;
            dto.lastDate = row[6] != null ? row[6].toString() : null;
            return dto;
        }).collect(Collectors.toList());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null)
            return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd)
            return bd;
        return new BigDecimal(value.toString());
    }
}
