package br.com.finapp.resource;

import br.com.finapp.domain.Account;
import br.com.finapp.domain.CreditCard;
import br.com.finapp.dto.AccountDto;
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
 * Endpoints de Contas Bancárias.
 *
 * Todas as operações são isoladas por user_id (JWT sub claim).
 *
 * RN-01: saldo é campo manual/informativo — não calculado pelas transações.
 * RN-09: exclusão de conta implementa cascata completa (bug fix do legado):
 * transações, assinaturas e cartões vinculados são deletados.
 */
@Path("/accounts")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AccountResource {

    @Inject
    AccountRepository accountRepository;

    @Inject
    CreditCardRepository creditCardRepository;

    @Inject
    TransactionRepository transactionRepository;

    @Inject
    SubscriptionRepository subscriptionRepository;

    @Inject
    SecurityService securityService;

    /**
     * Lista todas as contas do usuário, ordenadas por nome.
     */
    @GET
    public List<AccountDto.Response> list() {
        UUID userId = securityService.currentUserId();
        return accountRepository.findByUser(userId)
                .stream()
                .map(AccountDto.Response::from)
                .collect(Collectors.toList());
    }

    /**
     * Busca conta por ID.
     */
    @GET
    @Path("/{id}")
    public AccountDto.Response getById(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        Account account = accountRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Conta não encontrada: " + id));
        return AccountDto.Response.from(account);
    }

    /**
     * Cria nova conta bancária.
     */
    @POST
    @Transactional
    public Response create(@Valid AccountDto.Request req) {
        UUID userId = securityService.currentUserId();

        Account account = new Account();
        account.userId = userId;
        applyRequest(req, account);
        accountRepository.persist(account);

        return Response.status(Response.Status.CREATED)
                .entity(AccountDto.Response.from(account))
                .build();
    }

    /**
     * Atualiza conta existente.
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public AccountDto.Response update(@PathParam("id") Long id, @Valid AccountDto.Request req) {
        UUID userId = securityService.currentUserId();

        Account account = accountRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Conta não encontrada: " + id));

        applyRequest(req, account);
        return AccountDto.Response.from(account);
    }

    /**
     * Remove conta com cascata completa (RN-09 — bug fix do legado).
     *
     * Ordem de deleção:
     * 1. Transações e assinaturas de cada cartão vinculado
     * 2. Transações e assinaturas diretas da conta
     * 3. Cartões vinculados
     * 4. Conta
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        Account account = accountRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Conta não encontrada: " + id));

        // Cascata: cartões → transações e assinaturas de cada cartão
        List<CreditCard> cards = creditCardRepository.findByAccount(userId, id);
        for (CreditCard card : cards) {
            transactionRepository.delete("userId = ?1 AND creditCard.id = ?2", userId, card.id);
            subscriptionRepository.delete("userId = ?1 AND creditCard.id = ?2", userId, card.id);
        }

        // Cascata: transações e assinaturas diretas da conta
        transactionRepository.delete("userId = ?1 AND account.id = ?2", userId, id);
        subscriptionRepository.delete("userId = ?1 AND account.id = ?2", userId, id);

        // Cascata: cartões
        creditCardRepository.delete("userId = ?1 AND account.id = ?2", userId, id);

        // Deleta a conta
        accountRepository.delete(account);

        return Response.noContent().build();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void applyRequest(AccountDto.Request req, Account account) {
        account.name = req.name;
        account.bank = req.bank;
        account.balance = req.balance;
        account.color = req.color;
    }
}
