package br.com.finapp.service;

import br.com.finapp.domain.Subscription;
import br.com.finapp.dto.DashboardDto;
import br.com.finapp.repository.SubscriptionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Lógica de agregação para os 4 componentes do Dashboard.
 *
 * Endpoints servidos:
 * GET /dashboard/monthly → MonthlyIncomeExpenseChart
 * GET /dashboard/categories → CategoryExpenseChart
 * GET /dashboard/card-faturas → CreditCardFaturaChart
 * GET /dashboard/subscriptions-summary → AccountSubscriptionsCalendar
 */
@ApplicationScoped
public class DashboardService {

    @Inject
    EntityManager em;

    @Inject
    SubscriptionRepository subscriptionRepository;

    private static final DateTimeFormatter BILLING_FMT = DateTimeFormatter.ofPattern("MM/yyyy");
    private static final DateTimeFormatter YEAR_MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    // -------------------------------------------------------------------------
    // 1. Gráfico de receita/despesa mensal — últimos 12 meses
    // -------------------------------------------------------------------------

    @Transactional
    public List<DashboardDto.MonthlyItem> getMonthly(UUID userId, Long accountId) {

        YearMonth now = YearMonth.now();
        LocalDate since = now.minusMonths(11).atDay(1);

        // RN-01: exclui transfer e card_payment
        StringBuilder sql = new StringBuilder(
                "SELECT TO_CHAR(date, 'YYYY-MM') AS ym, " +
                        "SUM(CASE WHEN type = 'income'     THEN amount ELSE 0::numeric END) AS income, " +
                        "SUM(CASE WHEN type = 'expense'    THEN amount ELSE 0::numeric END) AS expense, " +
                        "SUM(CASE WHEN type = 'investment' THEN amount ELSE 0::numeric END) AS investment " +
                        "FROM transactions " +
                        "WHERE user_id = :userId " +
                        "  AND type NOT IN ('transfer', 'card_payment') " +
                        "  AND date >= :since");
        if (accountId != null) {
            sql.append(" AND account_id = :accountId");
        }
        sql.append(" GROUP BY ym ORDER BY ym ASC");

        var query = em.createNativeQuery(sql.toString());
        query.setParameter("userId", userId);
        query.setParameter("since", since);
        if (accountId != null) {
            query.setParameter("accountId", accountId);
        }

        // RN-08: inicializa os 12 meses com zero para garantir série completa
        Map<String, BigDecimal[]> map = new LinkedHashMap<>();
        for (int i = 11; i >= 0; i--) {
            map.put(now.minusMonths(i).format(YEAR_MONTH_FMT),
                    new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO });
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        for (Object[] row : rows) {
            String ym = (String) row[0];
            if (map.containsKey(ym)) {
                BigDecimal[] v = map.get(ym);
                v[0] = toBD(row[1]); // income
                v[1] = toBD(row[2]); // expense
                v[2] = toBD(row[3]); // investment
            }
        }

        return map.entrySet().stream().map(e -> {
            BigDecimal income = e.getValue()[0];
            BigDecimal expense = e.getValue()[1];
            BigDecimal investment = e.getValue()[2];
            BigDecimal net = income.subtract(expense); // RN-02: investment NÃO entra no net
            return new DashboardDto.MonthlyItem(e.getKey(), income, expense, investment, net);
        }).collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // 2. Gráfico de despesas por categoria — mês/ano específico
    // -------------------------------------------------------------------------

    @Transactional
    public List<DashboardDto.CategoryItem> getCategories(UUID userId, int year, int month,
            Long accountId, List<Long> cardIds) {
        String yearMonth = String.format("%04d-%02d", year, month);
        boolean hasAccount = accountId != null;
        boolean hasCards = cardIds != null && !cardIds.isEmpty();

        // RN-03: agrupamento usa campo 'date', não 'billing_month'
        StringBuilder sql = new StringBuilder(
                "SELECT COALESCE(NULLIF(TRIM(category), ''), 'Sem categoria') AS cat, " +
                        "SUM(amount) AS total " +
                        "FROM transactions " +
                        "WHERE user_id = :userId " +
                        "  AND type = 'expense' " +
                        "  AND TO_CHAR(date, 'YYYY-MM') = :yearMonth");
        if (hasAccount && hasCards) {
            sql.append(" AND (account_id = :accountId OR credit_card_id IN (:cardIds))");
        } else if (hasAccount) {
            sql.append(" AND account_id = :accountId");
        } else if (hasCards) {
            sql.append(" AND credit_card_id IN (:cardIds)");
        }
        sql.append(" GROUP BY cat ORDER BY total DESC");

        var query = em.createNativeQuery(sql.toString());
        query.setParameter("userId", userId);
        query.setParameter("yearMonth", yearMonth);
        if (hasAccount)
            query.setParameter("accountId", accountId);
        if (hasCards)
            query.setParameter("cardIds", cardIds);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        return rows.stream()
                .map(r -> new DashboardDto.CategoryItem((String) r[0], toBD(r[1])))
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // 3. Gráfico de fatura de cartão — últimos 6 meses de fatura
    // -------------------------------------------------------------------------

    @Transactional
    public List<DashboardDto.CardFaturaItem> getCardFaturas(UUID userId, List<Long> cardIds) {

        YearMonth now = YearMonth.now();
        List<String> months = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            months.add(now.minusMonths(i).format(BILLING_FMT));
        }

        boolean hasCards = cardIds != null && !cardIds.isEmpty();

        // RN-05: usa billing_month como preferencial; fallback para
        // TO_CHAR(date,'MM/YYYY')
        StringBuilder sql = new StringBuilder(
                "SELECT COALESCE(t.billing_month, TO_CHAR(t.date, 'MM/YYYY')) AS bm, " +
                        "t.credit_card_id, cc.name AS card_name, SUM(t.amount) AS total " +
                        "FROM transactions t " +
                        "JOIN credit_cards cc ON cc.id = t.credit_card_id " +
                        "WHERE t.user_id = :userId " +
                        "  AND t.type = 'expense' " +
                        "  AND t.credit_card_id IS NOT NULL " +
                        "  AND COALESCE(t.billing_month, TO_CHAR(t.date, 'MM/YYYY')) IN (:months)");
        if (hasCards) {
            sql.append(" AND t.credit_card_id IN (:cardIds)");
        }
        sql.append(" GROUP BY bm, t.credit_card_id, cc.name ORDER BY bm DESC, t.credit_card_id ASC");

        var query = em.createNativeQuery(sql.toString());
        query.setParameter("userId", userId);
        query.setParameter("months", months);
        if (hasCards)
            query.setParameter("cardIds", cardIds);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        return rows.stream()
                .map(r -> new DashboardDto.CardFaturaItem(
                        (String) r[0],
                        ((Number) r[1]).longValue(),
                        (String) r[2],
                        toBD(r[3])))
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // 4. Resumo de assinaturas — somente ativas e do tipo expense (RN-06)
    // -------------------------------------------------------------------------

    @Transactional
    public DashboardDto.SubscriptionsSummary getSubscriptionsSummary(UUID userId,
            Long accountId,
            List<Long> cardIds) {
        boolean hasAccount = accountId != null;
        boolean hasCards = cardIds != null && !cardIds.isEmpty();

        List<Subscription> all = subscriptionRepository.findActiveByUser(userId);

        // RN-06: apenas assinaturas expense; filtra por conta/cartão se informado
        List<Subscription> filtered = all.stream()
                .filter(s -> s.type == Subscription.Type.expense)
                .filter(s -> {
                    if (!hasAccount && !hasCards)
                        return true;
                    boolean matchAccount = hasAccount && s.account != null
                            && s.account.id.equals(accountId);
                    boolean matchCard = hasCards && s.creditCard != null
                            && cardIds.contains(s.creditCard.id);
                    return matchAccount || matchCard;
                })
                .collect(Collectors.toList());

        // RN-06: retorna null se não houver assinaturas ativas
        if (filtered.isEmpty()) {
            return null;
        }

        BigDecimal monthlyTotal = BigDecimal.ZERO;
        BigDecimal yearlyTotal = BigDecimal.ZERO;
        List<DashboardDto.SubscriptionItem> items = new ArrayList<>();

        for (Subscription s : filtered) {
            BigDecimal monthly;
            BigDecimal yearly;
            switch (s.period) {
                case weekly -> {
                    monthly = s.amount.multiply(BigDecimal.valueOf(52))
                            .divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
                    yearly = s.amount.multiply(BigDecimal.valueOf(52))
                            .setScale(2, RoundingMode.HALF_UP);
                }
                case monthly -> {
                    monthly = s.amount.setScale(2, RoundingMode.HALF_UP);
                    yearly = s.amount.multiply(BigDecimal.valueOf(12))
                            .setScale(2, RoundingMode.HALF_UP);
                }
                case yearly -> {
                    monthly = s.amount.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
                    yearly = s.amount.setScale(2, RoundingMode.HALF_UP);
                }
                default -> {
                    monthly = BigDecimal.ZERO;
                    yearly = BigDecimal.ZERO;
                }
            }

            monthlyTotal = monthlyTotal.add(monthly);
            yearlyTotal = yearlyTotal.add(yearly);
            items.add(new DashboardDto.SubscriptionItem(
                    s.id,
                    s.name,
                    s.amount.setScale(2, RoundingMode.HALF_UP),
                    s.period.name(),
                    monthly,
                    yearly));
        }

        return new DashboardDto.SubscriptionsSummary(
                monthlyTotal.setScale(2, RoundingMode.HALF_UP),
                yearlyTotal.setScale(2, RoundingMode.HALF_UP),
                items);
    }

    // -------------------------------------------------------------------------
    // Utilitário: converte resultado de query nativa → BigDecimal scale=2
    // -------------------------------------------------------------------------

    private static BigDecimal toBD(Object value) {
        if (value == null)
            return BigDecimal.ZERO;
        BigDecimal bd = (value instanceof BigDecimal b) ? b : new BigDecimal(value.toString());
        return bd.setScale(2, RoundingMode.HALF_UP);
    }
}
