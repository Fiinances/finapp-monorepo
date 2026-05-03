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
import static org.mockito.Mockito.*;

@QuarkusTest
@TestSecurity(user = "00000000-0000-0000-0000-000000000001", roles = { "user" })
class CreditCardResourceTest {

    static final UUID TEST_USER = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @InjectMock
    CreditCardRepository creditCardRepository;

    @InjectMock
    AccountRepository accountRepository;

    @InjectMock
    TransactionRepository transactionRepository;

    @InjectMock
    SubscriptionRepository subscriptionRepository;

    // ---------------------------------------------------------------
    // GET /cards
    // ---------------------------------------------------------------

    @Test
    void list_returnsOkWithCards() {
        Account acc = buildAccount(1L);
        CreditCard c = buildCard(1L, "Nubank Black", acc);
        when(creditCardRepository.findByUser(TEST_USER)).thenReturn(List.of(c));

        given().when().get("/cards")
                .then().statusCode(200)
                .body("size()", is(1))
                .body("[0].name", is("Nubank Black"));
    }

    // ---------------------------------------------------------------
    // GET /cards/by-account/{accountId}
    // ---------------------------------------------------------------

    @Test
    void listByAccount_returnsCards() {
        Account acc = buildAccount(2L);
        CreditCard c = buildCard(1L, "Itaú Gold", acc);
        when(creditCardRepository.findByAccount(TEST_USER, 2L)).thenReturn(List.of(c));

        given().when().get("/cards/by-account/2")
                .then().statusCode(200)
                .body("[0].name", is("Itaú Gold"));
    }

    // ---------------------------------------------------------------
    // GET /cards/{id}
    // ---------------------------------------------------------------

    @Test
    void getById_returnsCard() {
        Account acc = buildAccount(1L);
        CreditCard c = buildCard(1L, "Inter", acc);
        when(creditCardRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(c));

        given().when().get("/cards/1")
                .then().statusCode(200)
                .body("name", is("Inter"))
                .body("accountId", is(1));
    }

    @Test
    void getById_notFound_returns404() {
        when(creditCardRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().get("/cards/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // POST /cards
    // ---------------------------------------------------------------

    @Test
    void create_withValidData_returns201() {
        Account acc = buildAccount(1L);
        when(accountRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(acc));
        doAnswer(inv -> {
            CreditCard c = inv.getArgument(0);
            c.id = 5L;
            return null;
        }).when(creditCardRepository).persist(any(CreditCard.class));

        given()
                .contentType("application/json")
                .body("""
                        {"accountId":1,"name":"Cartão XP","closingDay":5,"dueDay":12}
                        """)
                .when().post("/cards")
                .then().statusCode(201)
                .body("name", is("Cartão XP"));
    }

    @Test
    void create_missingAccountId_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"name":"Cartão Sem Conta"}
                        """)
                .when().post("/cards")
                .then().statusCode(400);
    }

    @Test
    void create_missingName_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"accountId":1}
                        """)
                .when().post("/cards")
                .then().statusCode(400);
    }

    // ---------------------------------------------------------------
    // PUT /cards/{id}
    // ---------------------------------------------------------------

    @Test
    void update_notFound_returns404() {
        when(creditCardRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given()
                .contentType("application/json")
                .body("""
                        {"accountId":1,"name":"Qualquer"}
                        """)
                .when().put("/cards/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // DELETE /cards/{id}
    // ---------------------------------------------------------------

    @Test
    void delete_success_returns204() {
        Account acc = buildAccount(1L);
        CreditCard c = buildCard(1L, "Cartão", acc);
        when(creditCardRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(c));

        given().when().delete("/cards/1")
                .then().statusCode(204);
    }

    @Test
    void delete_notFound_returns404() {
        when(creditCardRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().delete("/cards/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private Account buildAccount(Long id) {
        Account a = new Account();
        a.id = id;
        a.userId = TEST_USER;
        a.name = "Conta " + id;
        return a;
    }

    private CreditCard buildCard(Long id, String name, Account account) {
        CreditCard c = new CreditCard();
        c.id = id;
        c.userId = TEST_USER;
        c.name = name;
        c.account = account;
        c.creditLimit = new BigDecimal("5000.00");
        c.closingDay = 10;
        c.dueDay = 15;
        return c;
    }
}
