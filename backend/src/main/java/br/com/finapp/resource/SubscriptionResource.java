package br.com.finapp.resource;

import br.com.finapp.domain.Subscription;
import br.com.finapp.dto.SubscriptionDto;
import br.com.finapp.repository.AccountRepository;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.SubscriptionRepository;
import br.com.finapp.security.SecurityService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * CRUD de assinaturas recorrentes.
 *
 * GET /subscriptions — lista todas do usuário
 * GET /subscriptions/active — somente ativas (RN-19 dashboard)
 * GET /subscriptions/due-soon — vencimento nos próximos 7 dias (RN-20)
 * POST /subscriptions — cria assinatura
 * PUT /subscriptions/{id} — atualiza assinatura (incluindo toggle active)
 * DELETE /subscriptions/{id} — remove assinatura
 *
 * Regras implementadas:
 * RN-18: monthlyEquivalent calculado em SubscriptionDto.Response.from
 * RN-19: inativas excluídas dos totais (filtro no endpoint /active)
 * RN-20: alerta de vencimento — janela de 7 dias no endpoint /due-soon
 * RN-21: next_due NÃO é atualizado automaticamente (lacuna documentada)
 */
@Path("/subscriptions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("**")
public class SubscriptionResource {

    @Inject
    SecurityService securityService;

    @Inject
    SubscriptionRepository subscriptionRepository;

    @Inject
    AccountRepository accountRepository;

    @Inject
    CreditCardRepository creditCardRepository;

    @GET
    public Response list() {
        var userId = securityService.currentUserId();
        List<SubscriptionDto.Response> result = subscriptionRepository.findByUser(userId)
                .stream()
                .map(SubscriptionDto.Response::from)
                .collect(Collectors.toList());
        return Response.ok(result).build();
    }

    @GET
    @Path("/active")
    public Response listActive() {
        var userId = securityService.currentUserId();
        List<SubscriptionDto.Response> result = subscriptionRepository.findActiveByUser(userId)
                .stream()
                .map(SubscriptionDto.Response::from)
                .collect(Collectors.toList());
        return Response.ok(result).build();
    }

    /**
     * Assinaturas com next_due entre hoje e hoje + 7 dias (RN-20).
     */
    @GET
    @Path("/due-soon")
    public Response dueSoon() {
        var userId = securityService.currentUserId();
        LocalDate today = LocalDate.now();
        List<SubscriptionDto.Response> result = subscriptionRepository
                .findDueSoon(userId, today, today.plusDays(7))
                .stream()
                .map(SubscriptionDto.Response::from)
                .collect(Collectors.toList());
        return Response.ok(result).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        var userId = securityService.currentUserId();
        return subscriptionRepository.findByIdAndUser(id, userId)
                .map(s -> Response.ok(SubscriptionDto.Response.from(s)).build())
                .orElse(Response.status(Response.Status.NOT_FOUND).build());
    }

    @POST
    @Transactional
    public Response create(@Valid SubscriptionDto.Request req) {
        var userId = securityService.currentUserId();

        var sub = new Subscription();
        sub.userId = userId;
        sub.name = req.name;
        sub.amount = req.amount;
        sub.type = req.type;
        sub.period = req.period;
        sub.nextDue = req.nextDue;
        sub.category = req.category;
        sub.color = req.color;
        sub.active = req.active != null ? req.active : Boolean.TRUE;

        if (req.accountId != null) {
            var account = accountRepository.findByIdAndUser(req.accountId, userId).orElse(null);
            if (account == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Conta não encontrada\"}")
                        .build();
            }
            sub.account = account;
        }

        if (req.creditCardId != null) {
            var card = creditCardRepository.findByIdAndUser(req.creditCardId, userId).orElse(null);
            if (card == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Cartão não encontrado\"}")
                        .build();
            }
            sub.creditCard = card;
        }

        subscriptionRepository.persist(sub);
        return Response.status(Response.Status.CREATED)
                .entity(SubscriptionDto.Response.from(sub))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") Long id, @Valid SubscriptionDto.Request req) {
        var userId = securityService.currentUserId();

        var sub = subscriptionRepository.findByIdAndUser(id, userId).orElse(null);
        if (sub == null)
            return Response.status(Response.Status.NOT_FOUND).build();

        sub.name = req.name;
        sub.amount = req.amount;
        sub.type = req.type;
        sub.period = req.period;
        sub.nextDue = req.nextDue;
        sub.category = req.category;
        sub.color = req.color;
        sub.active = req.active != null ? req.active : sub.active;

        sub.account = null;
        if (req.accountId != null) {
            var account = accountRepository.findByIdAndUser(req.accountId, userId).orElse(null);
            if (account == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Conta não encontrada\"}")
                        .build();
            }
            sub.account = account;
        }

        sub.creditCard = null;
        if (req.creditCardId != null) {
            var card = creditCardRepository.findByIdAndUser(req.creditCardId, userId).orElse(null);
            if (card == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Cartão não encontrado\"}")
                        .build();
            }
            sub.creditCard = card;
        }

        return Response.ok(SubscriptionDto.Response.from(sub)).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        var userId = securityService.currentUserId();
        long deleted = subscriptionRepository.deleteByIdAndUser(id, userId);
        if (deleted == 0)
            return Response.status(Response.Status.NOT_FOUND).build();
        return Response.noContent().build();
    }
}
