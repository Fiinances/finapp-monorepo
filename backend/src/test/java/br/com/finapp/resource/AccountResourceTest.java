package br.com.finapp.resource;

import br.com.finapp.domain.Account;
import br.com.finapp.domain.CreditCard;
import br.com.finapp.repository.AccountRepository;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.SubscriptionRepository;
import br.com.finapp.repository.TransactionRepository;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@QuarkusTest
@TestSecurity(user = "00000000-0000-0000-0000-000000000001", roles = { "user" })
class AccountResourceTest {

    static final UUID TEST_USER = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @InjectMock
    AccountRepository accountRepository;

    @InjectMock
    CreditCardRepository creditCardRepository;

    @InjectMock
    TransactionRepository transactionRepository;

    @InjectMock
    SubscriptionRepository subscriptionRepository;

    // ---------------------------------------------------------------
    // GET /accounts
    // ---------------------------------------------------------------

    @Test
    void list_returnsOkWithAccounts() {
        Account a = buildAccount(1L, "Nubank");
        when(accountRepository.findByUser(TEST_USER)).thenReturn(List.of(a));

        given().when().get("/accounts")
                .then().statusCode(200)
                .body("size()", is(1))
                .body("[0].id", is(1))
                .body("[0].name", is("Nubank"));
    }

    @Test
    void list_emptyReturnsEmptyArray() {
        when(accountRepository.findByUser(TEST_USER)).thenReturn(List.of());

        given().when().get("/accounts")
                .then().statusCode(200)
                .body("size()", is(0));
    }

    // ---------------------------------------------------------------
    // GET /accounts/{id}
    // ---------------------------------------------------------------

    @Test
    void getById_returnsAccount() {
        Account a = buildAccount(1L, "Itaú");
        when(accountRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(a));

        given().when().get("/accounts/1")
                .then().statusCode(200)
                .body("id", is(1))
                .body("name", is("Itaú"));
    }

    @Test
    void getById_notFound_returns404() {
        when(accountRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().get("/accounts/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // POST /accounts
    // ---------------------------------------------------------------

    @Test
    void create_withValidData_returns201() {
        doAnswer(inv -> {
            Account a = inv.getArgument(0);
            a.id = 10L;
            return null;
        }).when(accountRepository).persist(any(Account.class));

        given()
                .contentType("application/json")
                .body("""
                        {"name":"Bradesco","bank":"Bradesco","balance":1500.00,"color":"#CC0000"}
                        """)
                .when().post("/accounts")
                .then().statusCode(201)
                .body("name", is("Bradesco"));
    }

    @Test
    void create_missingName_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"bank":"Bradesco"}
                        """)
                .when().post("/accounts")
                .then().statusCode(400);
    }

    // ---------------------------------------------------------------
    // PUT /accounts/{id}
    // ---------------------------------------------------------------

    @Test
    void update_withValidData_returns200() {
        Account a = buildAccount(1L, "Antigo");
        when(accountRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(a));

        given()
                .contentType("application/json")
                .body("""
                        {"name":"Novo Nome","bank":"BB","balance":999.99}
                        """)
                .when().put("/accounts/1")
                .then().statusCode(200)
                .body("name", is("Novo Nome"));
    }

    @Test
    void update_notFound_returns404() {
        when(accountRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given()
                .contentType("application/json")
                .body("""
                        {"name":"X"}
                        """)
                .when().put("/accounts/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // DELETE /accounts/{id}
    // ---------------------------------------------------------------

    @Test
    void delete_success_returns204() {
        Account a = buildAccount(1L, "Conta");
        when(accountRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(a));
        when(creditCardRepository.findByAccount(TEST_USER, 1L)).thenReturn(List.of());

        given().when().delete("/accounts/1")
                .then().statusCode(204);

        verify(accountRepository).delete(a);
    }

    @Test
    void delete_notFound_returns404() {
        when(accountRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().delete("/accounts/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // Helper
    // ---------------------------------------------------------------

    private Account buildAccount(Long id, String name) {
        Account a = new Account();
        a.id = id;
        a.userId = TEST_USER;
        a.name = name;
        a.bank = "Banco Teste";
        a.balance = BigDecimal.ZERO;
        return a;
    }
}
