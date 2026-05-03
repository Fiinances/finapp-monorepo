package br.com.finapp;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.openapi.annotations.OpenAPIDefinition;
import org.eclipse.microprofile.openapi.annotations.info.Info;

/**
 * Endpoint raiz da API — health check básico.
 * O health check completo está em /q/health via SmallRye Health.
 */
@Path("/")
@OpenAPIDefinition(
    info = @Info(
        title = "Finapp API",
        version = "1.0.0",
        description = "API REST do Finapp — Controle Financeiro Pessoal"
    )
)
public class FinappResource {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public String health() {
        return "{\"status\":\"UP\",\"service\":\"finapp-backend\",\"version\":\"1.0.0\"}";
    }
}
