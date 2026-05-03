package br.com.finapp.resource;

import br.com.finapp.domain.Account;
import br.com.finapp.domain.CreditCard;
import br.com.finapp.domain.InstallmentGroup;
import br.com.finapp.domain.Transaction;
import br.com.finapp.domain.TransactionCategory;
import br.com.finapp.dto.TransactionDto;
import br.com.finapp.repository.AccountRepository;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.InstallmentGroupRepository;
import br.com.finapp.repository.TransactionCategoryRepository;
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
 * Endpoints de Transações Financeiras.
 *
 * Todas as operações são isoladas por user_id (JWT sub claim).
 *
 * RN-01: amount sempre >= 0; type determina sinal
 * RN-02: total = income - expense (investment não entra)
 * RN-03: transfer e card_payment somam em expense
 * RN-04: billing_month priorizado sobre date para agrupamento
 * RN-05: deduplicação por external_id
 * RN-07: transação pertence a account OU credit_card, nunca ambos
 */
@Path("/transactions")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TransactionResource {

    @Inject
    TransactionRepository transactionRepository;

    @Inject
    TransactionCategoryRepository categoryRepository;

    @Inject
    AccountRepository accountRepository;

    @Inject
    CreditCardRepository creditCardRepository;

    @Inject
    InstallmentGroupRepository installmentGroupRepository;

    @Inject
    SecurityService securityService;

    /**
     * Lista transações do usuário autenticado.
     *
     * Filtros opcionais:
     * - type: income | expense | investment | transfer | card_payment
     * - accountId: ID da conta
     * - cardId: ID do cartão de crédito
     * - billingMonth: MM/YYYY (requer cardId)
     */
    @GET
    public List<TransactionDto.Response> list(
            @QueryParam("type") String type,
            @QueryParam("accountId") Long accountId,
            @QueryParam("cardId") Long cardId,
            @QueryParam("billingMonth") String billingMonth) {

        UUID userId = securityService.currentUserId();
        List<Transaction> txs;

        if (cardId != null && billingMonth != null) {
            txs = transactionRepository.findByBillingMonth(userId, cardId, billingMonth);
        } else if (cardId != null) {
            txs = transactionRepository.findByCard(userId, cardId);
        } else if (accountId != null) {
            txs = transactionRepository.findByAccount(userId, accountId);
        } else if (type != null) {
            Transaction.Type txType = Transaction.Type.valueOf(type);
            txs = transactionRepository.findByUserAndType(userId, txType);
        } else {
            txs = transactionRepository.findByUser(userId);
        }

        return txs.stream().map(TransactionDto.Response::from).collect(Collectors.toList());
    }

    /**
     * Busca transação por ID.
     */
    @GET
    @Path("/{id}")
    public TransactionDto.Response getById(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        Transaction tx = transactionRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Transação não encontrada: " + id));
        return TransactionDto.Response.from(tx);
    }

    /**
     * Cria nova transação.
     *
     * RN-07: account_id e credit_card_id são mutuamente exclusivos.
     */
    @POST
    @Transactional
    public Response create(@Valid TransactionDto.Request req) {
        UUID userId = securityService.currentUserId();

        Transaction tx = new Transaction();
        tx.userId = userId;
        applyRequest(req, tx, userId);
        transactionRepository.persist(tx);

        return Response.status(Response.Status.CREATED)
                .entity(TransactionDto.Response.from(tx))
                .build();
    }

    /**
     * Atualiza transação existente.
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public TransactionDto.Response update(@PathParam("id") Long id, @Valid TransactionDto.Request req) {
        UUID userId = securityService.currentUserId();

        Transaction tx = transactionRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Transação não encontrada: " + id));

        applyRequest(req, tx, userId);
        return TransactionDto.Response.from(tx);
    }

    /**
     * Remove transação por ID.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        long deleted = transactionRepository.deleteByIdAndUser(id, userId);
        if (deleted == 0) {
            throw new NotFoundException("Transação não encontrada: " + id);
        }
        return Response.noContent().build();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void applyRequest(TransactionDto.Request req, Transaction tx, UUID userId) {
        tx.date = req.date;
        tx.description = req.description;
        tx.amount = req.amount;
        tx.type = req.type;
        tx.category = req.category;
        tx.source = req.source;
        tx.externalId = req.externalId;
        tx.billingMonth = req.billingMonth;
        tx.installmentNumber = req.installmentNumber;

        // Vincula conta (mutuamente exclusiva com cartão — RN-07)
        if (req.accountId != null) {
            Account account = accountRepository.findByIdAndUser(req.accountId, userId)
                    .orElseThrow(() -> new NotFoundException("Conta não encontrada: " + req.accountId));
            tx.account = account;
            tx.creditCard = null;
        } else if (req.creditCardId != null) {
            CreditCard card = creditCardRepository.findByIdAndUser(req.creditCardId, userId)
                    .orElseThrow(() -> new NotFoundException("Cartão não encontrado: " + req.creditCardId));
            tx.creditCard = card;
            tx.account = null;
        } else {
            tx.account = null;
            tx.creditCard = null;
        }

        // Vincula categoria
        if (req.categoryId != null) {
            TransactionCategory cat = categoryRepository.findByIdAndUser(req.categoryId, userId)
                    .orElseThrow(() -> new NotFoundException("Categoria não encontrada: " + req.categoryId));
            tx.category_rel = cat;
        } else {
            tx.category_rel = null;
        }

        // Vincula grupo de parcelamento
        if (req.installmentGroupId != null) {
            InstallmentGroup group = installmentGroupRepository.findByIdAndUser(req.installmentGroupId, userId)
                    .orElseThrow(() -> new NotFoundException("Parcelamento não encontrado: " + req.installmentGroupId));
            tx.installmentGroup = group;
        } else {
            tx.installmentGroup = null;
        }
    }
}
