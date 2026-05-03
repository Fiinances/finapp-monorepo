package br.com.finapp.resource;

import br.com.finapp.domain.TransactionCategory;
import br.com.finapp.repository.TransactionCategoryRepository;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
@TestSecurity(user = "00000000-0000-0000-0000-000000000001", roles = { "user" })
class CategoryResourceTest {

    static final UUID TEST_USER = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @InjectMock
    TransactionCategoryRepository categoryRepository;

    // ---------------------------------------------------------------
    // GET /categories
    // ---------------------------------------------------------------

    @Test
    void list_returnsCategories() {
        TransactionCategory c = buildCategory(1L, "Alimentação");
        when(categoryRepository.findByUser(TEST_USER)).thenReturn(List.of(c));

        given().when().get("/categories")
                .then().statusCode(200)
                .body("size()", is(1))
                .body("[0].name", is("Alimentação"));
    }

    @Test
    void list_empty_returnsEmptyArray() {
        when(categoryRepository.findByUser(TEST_USER)).thenReturn(List.of());

        given().when().get("/categories")
                .then().statusCode(200)
                .body("size()", is(0));
    }

    // ---------------------------------------------------------------
    // GET /categories/{id}
    // ---------------------------------------------------------------

    @Test
    void getById_returnsCategory() {
        TransactionCategory c = buildCategory(1L, "Saúde");
        when(categoryRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(c));

        given().when().get("/categories/1")
                .then().statusCode(200)
                .body("name", is("Saúde"))
                .body("id", is(1));
    }

    @Test
    void getById_notFound_returns404() {
        when(categoryRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().get("/categories/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // POST /categories
    // ---------------------------------------------------------------

    @Test
    void create_withValidData_returns201() {
        doAnswer(inv -> {
            TransactionCategory c = inv.getArgument(0);
            c.id = 7L;
            return null;
        }).when(categoryRepository).persist(any(TransactionCategory.class));

        given()
                .contentType("application/json")
                .body("""
                        {"name":"Lazer","color":"#00FF00","type":"expense"}
                        """)
                .when().post("/categories")
                .then().statusCode(201)
                .body("name", is("Lazer"));
    }

    @Test
    void create_missingName_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"color":"#FF0000"}
                        """)
                .when().post("/categories")
                .then().statusCode(400);
    }

    // ---------------------------------------------------------------
    // PUT /categories/{id}
    // ---------------------------------------------------------------

    @Test
    void update_withValidData_returns200() {
        TransactionCategory c = buildCategory(1L, "Antigo");
        when(categoryRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(c));

        given()
                .contentType("application/json")
                .body("""
                        {"name":"Atualizado"}
                        """)
                .when().put("/categories/1")
                .then().statusCode(200)
                .body("name", is("Atualizado"));
    }

    @Test
    void update_notFound_returns404() {
        when(categoryRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given()
                .contentType("application/json")
                .body("""
                        {"name":"X"}
                        """)
                .when().put("/categories/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // DELETE /categories/{id}
    // ---------------------------------------------------------------

    @Test
    void delete_success_returns204() {
        when(categoryRepository.deleteByIdAndUser(1L, TEST_USER)).thenReturn(1L);

        given().when().delete("/categories/1")
                .then().statusCode(204);
    }

    @Test
    void delete_notFound_returns404() {
        when(categoryRepository.deleteByIdAndUser(99L, TEST_USER)).thenReturn(0L);

        given().when().delete("/categories/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // Helper
    // ---------------------------------------------------------------

    private TransactionCategory buildCategory(Long id, String name) {
        TransactionCategory c = new TransactionCategory();
        c.id = id;
        c.userId = TEST_USER;
        c.name = name;
        c.type = "expense";
        return c;
    }
}
