package br.com.finapp.resource;

import br.com.finapp.domain.CreditCard;
import br.com.finapp.domain.InstallmentGroup;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.InstallmentGroupRepository;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
@TestSecurity(user = "00000000-0000-0000-0000-000000000001", roles = { "user" })
class InstallmentGroupResourceTest {

    static final UUID TEST_USER = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @InjectMock
    InstallmentGroupRepository installmentGroupRepository;

    @InjectMock
    CreditCardRepository creditCardRepository;

    // ---------------------------------------------------------------
    // GET /installments
    // ---------------------------------------------------------------

    @Test
    void list_returnsOk() {
        InstallmentGroup g = buildGroup(1L, "Notebook");
        when(installmentGroupRepository.findByUser(TEST_USER)).thenReturn(List.of(g));

        given().when().get("/installments")
                .then().statusCode(200)
                .body("size()", is(1))
                .body("[0].description", is("Notebook"));
    }

    // ---------------------------------------------------------------
    // GET /installments/{id}
    // ---------------------------------------------------------------

    @Test
    void getById_returnsGroup() {
        InstallmentGroup g = buildGroup(1L, "TV");
        when(installmentGroupRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(g));

        given().when().get("/installments/1")
                .then().statusCode(200)
                .body("description", is("TV"));
    }

    @Test
    void getById_notFound_returns404() {
        when(installmentGroupRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().get("/installments/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // POST /installments
    // ---------------------------------------------------------------

    @Test
    void create_withValidData_returns201() {
        CreditCard card = buildCard(1L);
        when(creditCardRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(card));
        doAnswer(inv -> {
            InstallmentGroup g = inv.getArgument(0);
            g.id = 5L;
            return null;
        }).when(installmentGroupRepository).persist(any(InstallmentGroup.class));

        // Use current month (never future)
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("MM/yyyy"));

        given()
                .contentType("application/json")
                .body("""
                        {
                          "creditCardId":1,
                          "description":"Geladeira",
                          "totalAmount":3600.00,
                          "installments":12,
                          "firstBillingMonth":"%s"
                        }
                        """.formatted(currentMonth))
                .when().post("/installments")
                .then().statusCode(201)
                .body("description", is("Geladeira"));
    }

    @Test
    void create_belowMinInstallments_returns400() {
        // @Min(2) on installments field
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("MM/yyyy"));

        given()
                .contentType("application/json")
                .body("""
                        {
                          "creditCardId":1,
                          "description":"X",
                          "totalAmount":100.00,
                          "installments":1,
                          "firstBillingMonth":"%s"
                        }
                        """.formatted(currentMonth))
                .when().post("/installments")
                .then().statusCode(400);
    }

    @Test
    void create_futureFirstBillingMonth_returns400() {
        // Resource validates and returns 400 for future months (Q-06 fix)
        String futureMonth = YearMonth.now().plusMonths(2).format(DateTimeFormatter.ofPattern("MM/yyyy"));

        given()
                .contentType("application/json")
                .body("""
                        {
                          "creditCardId":1,
                          "description":"X",
                          "totalAmount":100.00,
                          "installments":3,
                          "firstBillingMonth":"%s"
                        }
                        """.formatted(futureMonth))
                .when().post("/installments")
                .then().statusCode(400);
    }

    @Test
    void create_invalidMonthFormat_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {
                          "creditCardId":1,
                          "description":"X",
                          "totalAmount":100.00,
                          "installments":3,
                          "firstBillingMonth":"2025-06"
                        }
                        """)
                .when().post("/installments")
                .then().statusCode(400);
    }

    @Test
    void create_cardNotFound_returns404() {
        when(creditCardRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("MM/yyyy"));

        given()
                .contentType("application/json")
                .body("""
                        {
                          "creditCardId":99,
                          "description":"X",
                          "totalAmount":100.00,
                          "installments":3,
                          "firstBillingMonth":"%s"
                        }
                        """.formatted(currentMonth))
                .when().post("/installments")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // DELETE /installments/{id}
    // ---------------------------------------------------------------

    @Test
    void delete_success_returns204() {
        when(installmentGroupRepository.deleteByIdAndUser(1L, TEST_USER)).thenReturn(1L);

        given().when().delete("/installments/1")
                .then().statusCode(204);
    }

    @Test
    void delete_notFound_returns404() {
        when(installmentGroupRepository.deleteByIdAndUser(99L, TEST_USER)).thenReturn(0L);

        given().when().delete("/installments/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private CreditCard buildCard(Long id) {
        CreditCard c = new CreditCard();
        c.id = id;
        c.userId = TEST_USER;
        c.name = "Cartão " + id;
        return c;
    }

    private InstallmentGroup buildGroup(Long id, String description) {
        InstallmentGroup g = new InstallmentGroup();
        g.id = id;
        g.userId = TEST_USER;
        g.description = description;
        g.totalAmount = new BigDecimal("1200.00");
        g.installments = 12;
        g.firstBillingMonth = "01/2024";
        g.creditCard = buildCard(1L);
        return g;
    }
}
