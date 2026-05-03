package br.com.finapp.resource;

import br.com.finapp.dto.DashboardDto;
import br.com.finapp.security.SecurityService;
import br.com.finapp.service.DashboardService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.YearMonth;
import java.util.List;

/**
 * API de agregação para o Dashboard mobile.
 *
 * GET /dashboard/monthly → MonthlyIncomeExpenseChart
 * GET /dashboard/categories → CategoryExpenseChart
 * GET /dashboard/card-faturas → CreditCardFaturaChart
 * GET /dashboard/subscriptions-summary → AccountSubscriptionsCalendar
 */
@Path("/dashboard")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("**")
public class DashboardResource {

    @Inject
    DashboardService service;

    @Inject
    SecurityService security;

    // -------------------------------------------------------------------------
    // GET /dashboard/monthly?accountId=
    // -------------------------------------------------------------------------

    /**
     * Retorna os últimos 12 meses com receita, despesa, investimento e saldo
     * líquido.
     *
     * RN-01: exclui tipos 'transfer' e 'card_payment'
     * RN-02: net = income - expense (investment NÃO reduz net)
     * RN-08: meses sem transações aparecem com zero
     */
    @GET
    @Path("/monthly")
    public Response getMonthly(
            @QueryParam("accountId") Long accountId) {

        List<DashboardDto.MonthlyItem> result = service.getMonthly(security.currentUserId(), accountId);

        return Response.ok(result).build();
    }

    // -------------------------------------------------------------------------
    // GET /dashboard/categories?year=&month=&accountId=&cardIds=
    // -------------------------------------------------------------------------

    /**
     * Retorna despesas agrupadas por categoria para o mês/ano informado.
     *
     * RN-03: agrupamento usa campo 'date' (não 'billing_month')
     * RN-04: categoria nula/em branco → "Sem categoria"
     *
     * @param year  ano (ex: 2025)
     * @param month mês 1-12 (ex: 5)
     */
    @GET
    @Path("/categories")
    public Response getCategories(
            @QueryParam("year") Integer year,
            @QueryParam("month") Integer month,
            @QueryParam("accountId") Long accountId,
            @QueryParam("cardIds") List<Long> cardIds) {

        YearMonth now = YearMonth.now();
        int y = (year != null) ? year : now.getYear();
        int m = (month != null) ? month : now.getMonthValue();

        if (m < 1 || m > 12) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"month deve estar entre 1 e 12\"}")
                    .build();
        }

        List<DashboardDto.CategoryItem> result = service.getCategories(security.currentUserId(), y, m, accountId,
                cardIds);

        return Response.ok(result).build();
    }

    // -------------------------------------------------------------------------
    // GET /dashboard/card-faturas?cardIds=
    // -------------------------------------------------------------------------

    /**
     * Retorna total de despesas por cartão nos últimos 6 meses de fatura.
     *
     * RN-05: usa billing_month da transação; fallback para TO_CHAR(date,'MM/YYYY')
     */
    @GET
    @Path("/card-faturas")
    public Response getCardFaturas(
            @QueryParam("cardIds") List<Long> cardIds) {

        List<DashboardDto.CardFaturaItem> result = service.getCardFaturas(security.currentUserId(), cardIds);

        return Response.ok(result).build();
    }

    // -------------------------------------------------------------------------
    // GET /dashboard/subscriptions-summary?accountId=&cardIds=
    // -------------------------------------------------------------------------

    /**
     * Retorna total mensal e anual de assinaturas ativas (expense) do usuário.
     *
     * RN-06: apenas subscriptions com active=true e type='expense'.
     * Retorna 204 No Content se não houver nenhuma.
     */
    @GET
    @Path("/subscriptions-summary")
    public Response getSubscriptionsSummary(
            @QueryParam("accountId") Long accountId,
            @QueryParam("cardIds") List<Long> cardIds) {

        DashboardDto.SubscriptionsSummary result = service.getSubscriptionsSummary(security.currentUserId(), accountId,
                cardIds);

        if (result == null) {
            return Response.noContent().build();
        }

        return Response.ok(result).build();
    }
}
