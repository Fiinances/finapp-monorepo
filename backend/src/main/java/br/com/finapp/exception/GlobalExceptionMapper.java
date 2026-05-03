package br.com.finapp.exception;

import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Mapeador global de exceções — retorna respostas JSON padronizadas.
 *
 * Formato de erro:
 * {
 *   "error": "mensagem",
 *   "details": [...],    // apenas para erros de validação
 *   "timestamp": "..."
 * }
 */
@Provider
public class GlobalExceptionMapper {

    @Provider
    public static class NotFoundMapper implements ExceptionMapper<NotFoundException> {
        @Override
        public Response toResponse(NotFoundException ex) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(errorBody(ex.getMessage() != null ? ex.getMessage() : "Recurso não encontrado"))
                .build();
        }
    }

    @Provider
    public static class ValidationMapper implements ExceptionMapper<ConstraintViolationException> {
        @Override
        public Response toResponse(ConstraintViolationException ex) {
            var violations = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.toList());

            return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of(
                    "error", "Dados inválidos",
                    "details", violations,
                    "timestamp", Instant.now().toString()
                ))
                .build();
        }
    }

    @Provider
    public static class GenericMapper implements ExceptionMapper<Exception> {
        @Override
        public Response toResponse(Exception ex) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(errorBody("Erro interno. Tente novamente."))
                .build();
        }
    }

    private static Map<String, Object> errorBody(String message) {
        return Map.of(
            "error", message,
            "timestamp", Instant.now().toString()
        );
    }
}
