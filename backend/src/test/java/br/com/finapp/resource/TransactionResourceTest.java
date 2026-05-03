package br.com.finapp.resource;

import br.com.finapp.domain.Account;
import br.com.finapp.domain.CreditCard;
import br.com.finapp.domain.Transaction;
import br.com.finapp.repository.AccountRepository;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.InstallmentGroupRepository;
import br.com.finapp.repository.TransactionCategoryRepository;
import br.com.finapp.repository.TransactionRepository;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
@TestSecurity(user = "00000000-0000-0000-0000-000000000001", roles = { "user" })
class TransactionResourceTest {

    static final UUID TEST_USER = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @InjectMock
    TransactionRepository transactionRepository;

    @InjectMock
    TransactionCategoryRepository categoryRepository;

    @InjectMock
    AccountRepository accountRepository;

    @InjectMock
    CreditCardRepository creditCardRepository;

    @InjectMock
    InstallmentGroupRepository installmentGroupRepository;

    // ---------------------------------------------------------------
    // GET /transactions
    // ---------------------------------------------------------------

    @Test
    void list_noFilter_returnsAll() {
        Transaction tx = buildTransaction(1L, "Mercado", Transaction.Type.expense);
        when(transactionRepository.findByUser(TEST_USER)).thenReturn(List.of(tx));

        given().when().get("/transactions")
                .then().statusCode(200)
                .body("size()", is(1))
                .body("[0].description", is("Mercado"));
    }

    @Test
    void list_byAccount_returnsFiltered() {
        Transaction tx = buildTransaction(1L, "Salário", Transaction.Type.income);
        when(transactionRepository.findByAccount(TEST_USER, 5L)).thenReturn(List.of(tx));

        given().when().get("/transactions?accountId=5")
                .then().statusCode(200)
                .body("[0].description", is("Salário"));
    }

    @Test
    void list_byCard_returnsFiltered() {
        Transaction tx = buildTransaction(2L, "Netflix", Transaction.Type.expense);
        when(transactionRepository.findByCard(TEST_USER, 3L)).thenReturn(List.of(tx));

        given().when().get("/transactions?cardId=3")
                .then().statusCode(200)
                .body("[0].description", is("Netflix"));
    }

    @Test
    void list_byType_returnsFiltered() {
        Transaction tx = buildTransaction(3L, "Tesouro Direto", Transaction.Type.investment);
        when(transactionRepository.findByUserAndType(TEST_USER, Transaction.Type.investment))
                .thenReturn(List.of(tx));

        given().when().get("/transactions?type=investment")
                .then().statusCode(200)
                .body("[0].description", is("Tesouro Direto"));
    }

    @Test
    void list_byCardAndBillingMonth_returnsFiltered() {
        Transaction tx = buildTransaction(4L, "Compra fatura", Transaction.Type.expense);
        when(transactionRepository.findByBillingMonth(TEST_USER, 2L, "06/2025"))
                .thenReturn(List.of(tx));

        given().when().get("/transactions?cardId=2&billingMonth=06/2025")
                .then().statusCode(200)
                .body("[0].description", is("Compra fatura"));
    }

    // ---------------------------------------------------------------
    // GET /transactions/{id}
    // ---------------------------------------------------------------

    @Test
    void getById_returnsTransaction() {
        Transaction tx = buildTransaction(1L, "Aluguel", Transaction.Type.expense);
        when(transactionRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(tx));

        given().when().get("/transactions/1")
                .then().statusCode(200)
                .body("description", is("Aluguel"))
                .body("id", is(1));
    }

    @Test
    void getById_notFound_returns404() {
        when(transactionRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().get("/transactions/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // POST /transactions
    // ---------------------------------------------------------------

    @Test
    void create_withValidData_returns201() {
        doAnswer(inv -> {
            Transaction tx = inv.getArgument(0);
            tx.id = 10L;
            return null;
        }).when(transactionRepository).persist(any(Transaction.class));

        given()
                .contentType("application/json")
                .body("""
                        {
                          "date":"2025-06-01",
                          "description":"Padaria",
                          "amount":25.50,
                          "type":"expense"
                        }
                        """)
                .when().post("/transactions")
                .then().statusCode(201)
                .body("description", is("Padaria"));
    }

    @Test
    void create_missingDate_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"description":"Sem data","amount":10.00,"type":"expense"}
                        """)
                .when().post("/transactions")
                .then().statusCode(400);
    }

    @Test
    void create_missingDescription_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"date":"2025-06-01","amount":10.00,"type":"expense"}
                        """)
                .when().post("/transactions")
                .then().statusCode(400);
    }

    @Test
    void create_negativeAmount_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"date":"2025-06-01","description":"Neg","amount":-1.00,"type":"expense"}
                        """)
                .when().post("/transactions")
                .then().statusCode(400);
    }

    // ---------------------------------------------------------------
    // PUT /transactions/{id}
    // ---------------------------------------------------------------

    @Test
    void update_notFound_returns404() {
        when(transactionRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given()
                .contentType("application/json")
                .body("""
                        {"date":"2025-06-01","description":"X","amount":1.00,"type":"expense"}
                        """)
                .when().put("/transactions/99")
                .then().statusCode(404);
    }

    @Test
    void update_success_returns200() {
        Transaction tx = buildTransaction(1L, "Antigo", Transaction.Type.expense);
        when(transactionRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(tx));

        given()
                .contentType("application/json")
                .body("""
                        {"date":"2025-06-15","description":"Atualizado","amount":50.00,"type":"income"}
                        """)
                .when().put("/transactions/1")
                .then().statusCode(200)
                .body("description", is("Atualizado"));
    }

    // ---------------------------------------------------------------
    // DELETE /transactions/{id}
    // ---------------------------------------------------------------

    @Test
    void delete_success_returns204() {
        when(transactionRepository.deleteByIdAndUser(1L, TEST_USER)).thenReturn(1L);

        given().when().delete("/transactions/1")
                .then().statusCode(204);
    }

    @Test
    void delete_notFound_returns404() {
        when(transactionRepository.deleteByIdAndUser(99L, TEST_USER)).thenReturn(0L);

        given().when().delete("/transactions/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // Helper
    // ---------------------------------------------------------------

    private Transaction buildTransaction(Long id, String description, Transaction.Type type) {
        Transaction tx = new Transaction();
        tx.id = id;
        tx.userId = TEST_USER;
        tx.description = description;
        tx.type = type;
        tx.amount = new BigDecimal("100.00");
        tx.date = LocalDate.of(2025, 6, 1);
        return tx;
    }
}
