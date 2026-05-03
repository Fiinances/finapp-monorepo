package br.com.finapp.security;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;

import java.util.UUID;

/**
 * Serviço de segurança — extrai o user_id do JWT do Supabase Auth.
 *
 * O JWT emitido pelo Supabase contém o claim "sub" com o UUID do usuário.
 * Todas as queries devem filtrar por user_id = currentUserId() para
 * garantir isolamento de dados (complementa o RLS do PostgreSQL).
 */
@RequestScoped
public class SecurityService {

    @Inject
    SecurityIdentity identity;

    /**
     * Retorna o UUID do usuário autenticado a partir do claim "sub" do JWT.
     *
     * @return UUID do usuário atual
     * @throws jakarta.ws.rs.NotAuthorizedException se não autenticado
     */
    public UUID currentUserId() {
        String sub = identity.getPrincipal().getName();
        return UUID.fromString(sub);
    }

    /**
     * Retorna true se o usuário está autenticado.
     */
    public boolean isAuthenticated() {
        return !identity.isAnonymous();
    }
}
