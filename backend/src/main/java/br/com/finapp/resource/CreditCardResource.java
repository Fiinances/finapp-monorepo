package br.com.finapp.resource;

import br.com.finapp.domain.Account;
import br.com.finapp.domain.CreditCard;
import br.com.finapp.dto.CreditCardDto;
import br.com.finapp.repository.AccountRepository;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.SubscriptionRepository;
import br.com.finapp.repository.TransactionRepository;
import br.com.finapp.security.SecurityService;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Endpoints de Cartões de Crédito.
 *
 * Todas as operações são isoladas por user_id (JWT sub claim).
 * Cartão deve sempre pertencer a uma conta do mesmo usuário.
 *
 * DELETE: cascata sobre transações e assinaturas vinculadas ao cartão.
 */
@Path("/cards")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CreditCardResource {

    @Inject
    CreditCardRepository creditCardRepository;

    @Inject
    AccountRepository accountRepository;

    @Inject
    TransactionRepository transactionRepository;

    @Inject
    SubscriptionRepository subscriptionRepository;

    @Inject
    SecurityService securityService;

    /**
     * Lista todos os cartões do usuário.
     */
    @GET
    public List<CreditCardDto.Response> list() {
        UUID userId = securityService.currentUserId();
        return creditCardRepository.findByUser(userId)
                .stream()
                .map(CreditCardDto.Response::from)
                .collect(Collectors.toList());
    }

    /**
     * Lista cartões filtrados por conta.
     */
    @GET
    @Path("/by-account/{accountId}")
    public List<CreditCardDto.Response> listByAccount(@PathParam("accountId") Long accountId) {
        UUID userId = securityService.currentUserId();
        return creditCardRepository.findByAccount(userId, accountId)
                .stream()
                .map(CreditCardDto.Response::from)
                .collect(Collectors.toList());
    }

    /**
     * Busca cartão por ID.
     */
    @GET
    @Path("/{id}")
    public CreditCardDto.Response getById(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        CreditCard card = creditCardRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Cartão não encontrado: " + id));
        return CreditCardDto.Response.from(card);
    }

    /**
     * Cria novo cartão de crédito.
     * A conta informada em accountId deve pertencer ao usuário.
     */
    @POST
    @Transactional
    public Response create(@Valid CreditCardDto.Request req) {
        UUID userId = securityService.currentUserId();
        Account account = resolveAccount(req.accountId, userId);

        CreditCard card = new CreditCard();
        card.userId = userId;
        card.account = account;
        applyRequest(req, card);
        creditCardRepository.persist(card);

        return Response.status(Response.Status.CREATED)
                .entity(CreditCardDto.Response.from(card))
                .build();
    }

    /**
     * Atualiza cartão existente.
     * Permite mover o cartão para outra conta do mesmo usuário.
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public CreditCardDto.Response update(@PathParam("id") Long id, @Valid CreditCardDto.Request req) {
        UUID userId = securityService.currentUserId();
        CreditCard card = creditCardRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Cartão não encontrado: " + id));

        if (req.accountId != null && (card.account == null || !req.accountId.equals(card.account.id))) {
            card.account = resolveAccount(req.accountId, userId);
        }
        applyRequest(req, card);
        return CreditCardDto.Response.from(card);
    }

    /**
     * Remove cartão com cascata sobre transações e assinaturas vinculadas.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        CreditCard card = creditCardRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Cartão não encontrado: " + id));

        // Cascata: transações e assinaturas do cartão
        transactionRepository.delete("userId = ?1 AND creditCard.id = ?2", userId, id);
        subscriptionRepository.delete("userId = ?1 AND creditCard.id = ?2", userId, id);

        creditCardRepository.delete(card);

        return Response.noContent().build();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Account resolveAccount(Long accountId, UUID userId) {
        return accountRepository.findByIdAndUser(accountId, userId)
                .orElseThrow(() -> new NotFoundException("Conta não encontrada: " + accountId));
    }

    private void applyRequest(CreditCardDto.Request req, CreditCard card) {
        card.name = req.name;
        card.color = req.color;
        card.creditLimit = req.creditLimit;
        card.closingDay = req.closingDay;
        card.dueDay = req.dueDay;
    }
}
