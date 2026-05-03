package br.com.finapp.resource;

import br.com.finapp.domain.CreditCard;
import br.com.finapp.domain.InstallmentGroup;
import br.com.finapp.dto.InstallmentGroupDto;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.InstallmentGroupRepository;
import br.com.finapp.security.SecurityService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * CRUD de grupos de parcelamento.
 *
 * GET /installments — lista todos do usuário (com campos computados)
 * GET /installments/{id} — busca por id
 * POST /installments — cria novo grupo
 * PUT /installments/{id} — atualiza grupo existente
 * DELETE /installments/{id} — remove grupo (desvincula transações via SET NULL
 * no banco)
 *
 * Regras implementadas:
 * RN-12 (min 2 parcelas — validado em @Min na entidade)
 * RN-15 (progresso por meses decorridos — calculado em
 * InstallmentGroupDto.Response.from)
 * RN-16 (delete desvincula transações — SET NULL no banco)
 * Q-06 (bloqueia first_billing_month no futuro — correção de bug do legado)
 */
@Path("/installments")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("**")
public class InstallmentGroupResource {

    private static final Pattern MONTH_YEAR_PATTERN = Pattern.compile("^(0[1-9]|1[0-2])/\\d{4}$");
    private static final DateTimeFormatter MONTH_YEAR_FMT = DateTimeFormatter.ofPattern("MM/yyyy");

    @Inject
    SecurityService securityService;

    @Inject
    InstallmentGroupRepository installmentGroupRepository;

    @Inject
    CreditCardRepository creditCardRepository;

    @GET
    public Response list() {
        var userId = securityService.currentUserId();
        List<InstallmentGroupDto.Response> result = installmentGroupRepository.findByUser(userId)
                .stream()
                .map(InstallmentGroupDto.Response::from)
                .collect(Collectors.toList());
        return Response.ok(result).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        var userId = securityService.currentUserId();
        return installmentGroupRepository.findByIdAndUser(id, userId)
                .map(g -> Response.ok(InstallmentGroupDto.Response.from(g)).build())
                .orElse(Response.status(Response.Status.NOT_FOUND).build());
    }

    @POST
    @Transactional
    public Response create(@Valid InstallmentGroupDto.Request req) {
        var userId = securityService.currentUserId();

        var validationError = validateFirstBillingMonth(req.firstBillingMonth);
        if (validationError != null)
            return validationError;

        CreditCard card = creditCardRepository.findByIdAndUser(req.creditCardId, userId)
                .orElse(null);
        if (card == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Cartão não encontrado\"}")
                    .build();
        }

        var group = new InstallmentGroup();
        group.userId = userId;
        group.creditCard = card;
        group.description = req.description;
        group.totalAmount = req.totalAmount;
        group.installments = req.installments;
        group.firstBillingMonth = req.firstBillingMonth;
        group.category = req.category;
        installmentGroupRepository.persist(group);

        return Response.status(Response.Status.CREATED)
                .entity(InstallmentGroupDto.Response.from(group))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") Long id, @Valid InstallmentGroupDto.Request req) {
        var userId = securityService.currentUserId();

        var validationError = validateFirstBillingMonth(req.firstBillingMonth);
        if (validationError != null)
            return validationError;

        var group = installmentGroupRepository.findByIdAndUser(id, userId).orElse(null);
        if (group == null)
            return Response.status(Response.Status.NOT_FOUND).build();

        if (req.creditCardId != null) {
            CreditCard card = creditCardRepository.findByIdAndUser(req.creditCardId, userId)
                    .orElse(null);
            if (card == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Cartão não encontrado\"}")
                        .build();
            }
            group.creditCard = card;
        }

        group.description = req.description;
        group.totalAmount = req.totalAmount;
        group.installments = req.installments;
        group.firstBillingMonth = req.firstBillingMonth;
        group.category = req.category;

        return Response.ok(InstallmentGroupDto.Response.from(group)).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        var userId = securityService.currentUserId();
        long deleted = installmentGroupRepository.deleteByIdAndUser(id, userId);
        if (deleted == 0)
            return Response.status(Response.Status.NOT_FOUND).build();
        // RN-16: transações vinculadas ficam com installment_group_id = NULL via ON
        // DELETE SET NULL
        return Response.noContent().build();
    }

    /**
     * Valida formato MM/YYYY e bloqueia meses futuros (correção Q-06).
     *
     * @return Response de erro ou null se válido
     */
    private Response validateFirstBillingMonth(String value) {
        if (value == null || !MONTH_YEAR_PATTERN.matcher(value).matches()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"firstBillingMonth deve estar no formato MM/YYYY\"}")
                    .build();
        }
        try {
            YearMonth ym = YearMonth.parse(value, MONTH_YEAR_FMT);
            if (ym.isAfter(YearMonth.now())) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\":\"firstBillingMonth não pode ser um mês futuro\"}")
                        .build();
            }
        } catch (DateTimeParseException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"firstBillingMonth inválido\"}")
                    .build();
        }
        return null;
    }
}
