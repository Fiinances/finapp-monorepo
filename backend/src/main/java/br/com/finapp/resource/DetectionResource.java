package br.com.finapp.resource;

import br.com.finapp.dto.DetectionDto;
import br.com.finapp.security.SecurityService;
import br.com.finapp.service.InstallmentDetectionService;
import br.com.finapp.service.SubscriptionDetectionService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

/**
 * Endpoints de detecção automática de padrões financeiros.
 *
 * GET /detect/subscriptions — algoritmo 5.3: recorrências por frequência +
 * variação ≤5%
 * GET /detect/installments — algoritmo 5.4: parcelamentos por regex N/M na
 * descrição
 *
 * Ambos são read-only e tenant-isolated por userId extraído do JWT.
 */
@Path("/detect")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("**")
public class DetectionResource {

    @Inject
    SecurityService securityService;

    @Inject
    SubscriptionDetectionService subscriptionDetectionService;

    @Inject
    InstallmentDetectionService installmentDetectionService;

    /**
     * Detecta candidatas a assinatura recorrente (RN-03, RN-04, RN-05).
     *
     * @return lista de descrições com ocorrências >= 3 e variação de valor <= 5%
     */
    @GET
    @Path("/subscriptions")
    public Response detectSubscriptions() {
        var userId = securityService.currentUserId();
        List<DetectionDto.DetectedSubscription> result = subscriptionDetectionService.detect(userId);
        return Response.ok(result).build();
    }

    /**
     * Detecta parcelamentos não vinculados por padrão N/M na descrição (RN-06,
     * RN-17).
     *
     * @return lista de grupos de parcelamento candidatos, com first_billing_month
     *         calculado
     */
    @GET
    @Path("/installments")
    public Response detectInstallments() {
        var userId = securityService.currentUserId();
        List<DetectionDto.DetectedInstallment> result = installmentDetectionService.detect(userId);
        return Response.ok(result).build();
    }
}
