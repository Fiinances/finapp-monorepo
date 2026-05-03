package br.com.finapp.resource;

import br.com.finapp.domain.TransactionCategory;
import br.com.finapp.dto.CategoryDto;
import br.com.finapp.repository.TransactionCategoryRepository;
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
 * Endpoints de Categorias de Transações.
 *
 * Todas as operações são isoladas por user_id (JWT sub claim).
 *
 * RN-01: listagem ordenada por nome
 * RN-02: create retorna a row completa (não apenas o id)
 * RN-03: parent_id ON DELETE SET NULL — deletar pai não deleta filhos
 * RN-04: category_id ON DELETE SET NULL — deletar categoria não deleta
 * transações
 * RN-07: não há página dedicada — gestão via API
 * RN-08: type é nullable — sem enum fixo
 */
@Path("/categories")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CategoryResource {

    @Inject
    TransactionCategoryRepository categoryRepository;

    @Inject
    SecurityService securityService;

    /**
     * Lista todas as categorias do usuário, ordenadas por nome (RN-01).
     */
    @GET
    public List<CategoryDto.Response> list() {
        UUID userId = securityService.currentUserId();
        return categoryRepository.findByUser(userId)
                .stream()
                .map(CategoryDto.Response::from)
                .collect(Collectors.toList());
    }

    /**
     * Busca categoria por ID.
     */
    @GET
    @Path("/{id}")
    public CategoryDto.Response getById(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        TransactionCategory cat = categoryRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Categoria não encontrada: " + id));
        return CategoryDto.Response.from(cat);
    }

    /**
     * Cria nova categoria e retorna a row completa (RN-02).
     *
     * Necessário retornar o id gerado imediatamente para vinculação com transações.
     */
    @POST
    @Transactional
    public Response create(@Valid CategoryDto.Request req) {
        UUID userId = securityService.currentUserId();

        TransactionCategory cat = new TransactionCategory();
        cat.userId = userId;
        applyRequest(req, cat, userId);
        categoryRepository.persist(cat);

        return Response.status(Response.Status.CREATED)
                .entity(CategoryDto.Response.from(cat))
                .build();
    }

    /**
     * Atualiza categoria existente.
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public CategoryDto.Response update(@PathParam("id") Long id, @Valid CategoryDto.Request req) {
        UUID userId = securityService.currentUserId();

        TransactionCategory cat = categoryRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new NotFoundException("Categoria não encontrada: " + id));

        applyRequest(req, cat, userId);
        return CategoryDto.Response.from(cat);
    }

    /**
     * Remove categoria por ID.
     *
     * RN-03: transações vinculadas terão category_id = NULL (ON DELETE SET NULL no
     * banco).
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        UUID userId = securityService.currentUserId();
        long deleted = categoryRepository.deleteByIdAndUser(id, userId);
        if (deleted == 0) {
            throw new NotFoundException("Categoria não encontrada: " + id);
        }
        return Response.noContent().build();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void applyRequest(CategoryDto.Request req, TransactionCategory cat, UUID userId) {
        cat.name = req.name;
        cat.color = req.color;
        cat.icon = req.icon;
        cat.type = req.type;

        // Vincula categoria pai (hierarquia — RN-23)
        if (req.parentId != null) {
            TransactionCategory parent = categoryRepository.findByIdAndUser(req.parentId, userId)
                    .orElseThrow(() -> new NotFoundException("Categoria pai não encontrada: " + req.parentId));
            cat.parent = parent;
        } else {
            cat.parent = null;
        }
    }
}
