package br.com.finapp.resource;

import br.com.finapp.domain.Subscription;
import br.com.finapp.repository.AccountRepository;
import br.com.finapp.repository.CreditCardRepository;
import br.com.finapp.repository.SubscriptionRepository;

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
class SubscriptionResourceTest {

    static final UUID TEST_USER = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @InjectMock
    SubscriptionRepository subscriptionRepository;

    @InjectMock
    AccountRepository accountRepository;

    @InjectMock
    CreditCardRepository creditCardRepository;

    // ---------------------------------------------------------------
    // GET /subscriptions
    // ---------------------------------------------------------------

    @Test
    void list_returnsAll() {
        Subscription s = buildSubscription(1L, "Netflix");
        when(subscriptionRepository.findByUser(TEST_USER)).thenReturn(List.of(s));

        given().when().get("/subscriptions")
                .then().statusCode(200)
                .body("size()", is(1))
                .body("[0].name", is("Netflix"));
    }

    @Test
    void list_empty_returnsEmptyArray() {
        when(subscriptionRepository.findByUser(TEST_USER)).thenReturn(List.of());

        given().when().get("/subscriptions")
                .then().statusCode(200)
                .body("size()", is(0));
    }

    // ---------------------------------------------------------------
    // GET /subscriptions/active
    // ---------------------------------------------------------------

    @Test
    void listActive_returnsActive() {
        Subscription s = buildSubscription(1L, "Spotify");
        when(subscriptionRepository.findActiveByUser(TEST_USER)).thenReturn(List.of(s));

        given().when().get("/subscriptions/active")
                .then().statusCode(200)
                .body("[0].name", is("Spotify"));
    }

    // ---------------------------------------------------------------
    // GET /subscriptions/due-soon
    // ---------------------------------------------------------------

    @Test
    void dueSoon_returnsUpcoming() {
        Subscription s = buildSubscription(2L, "Adobe");
        when(subscriptionRepository.findDueSoon(eq(TEST_USER), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(s));

        given().when().get("/subscriptions/due-soon")
                .then().statusCode(200)
                .body("[0].name", is("Adobe"));
    }

    // ---------------------------------------------------------------
    // GET /subscriptions/{id}
    // ---------------------------------------------------------------

    @Test
    void getById_returnsSubscription() {
        Subscription s = buildSubscription(1L, "Prime");
        when(subscriptionRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(s));

        given().when().get("/subscriptions/1")
                .then().statusCode(200)
                .body("name", is("Prime"));
    }

    @Test
    void getById_notFound_returns404() {
        when(subscriptionRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given().when().get("/subscriptions/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // POST /subscriptions
    // ---------------------------------------------------------------

    @Test
    void create_withValidData_returns201() {
        doAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            s.id = 10L;
            return null;
        }).when(subscriptionRepository).persist(any(Subscription.class));

        given()
                .contentType("application/json")
                .body("""
                        {
                          "name":"Disney+",
                          "amount":38.90,
                          "type":"expense",
                          "period":"monthly"
                        }
                        """)
                .when().post("/subscriptions")
                .then().statusCode(201)
                .body("name", is("Disney+"));
    }

    @Test
    void create_missingName_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"amount":38.90,"type":"expense","period":"monthly"}
                        """)
                .when().post("/subscriptions")
                .then().statusCode(400);
    }

    @Test
    void create_missingAmount_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"name":"X","type":"expense","period":"monthly"}
                        """)
                .when().post("/subscriptions")
                .then().statusCode(400);
    }

    @Test
    void create_missingPeriod_returns400() {
        given()
                .contentType("application/json")
                .body("""
                        {"name":"X","amount":10.00,"type":"expense"}
                        """)
                .when().post("/subscriptions")
                .then().statusCode(400);
    }

    // ---------------------------------------------------------------
    // PUT /subscriptions/{id}
    // ---------------------------------------------------------------

    @Test
    void update_notFound_returns404() {
        when(subscriptionRepository.findByIdAndUser(99L, TEST_USER)).thenReturn(Optional.empty());

        given()
                .contentType("application/json")
                .body("""
                        {"name":"X","amount":10.00,"type":"expense","period":"monthly"}
                        """)
                .when().put("/subscriptions/99")
                .then().statusCode(404);
    }

    @Test
    void update_success_returns200() {
        Subscription s = buildSubscription(1L, "Old Name");
        when(subscriptionRepository.findByIdAndUser(1L, TEST_USER)).thenReturn(Optional.of(s));

        given()
                .contentType("application/json")
                .body("""
                        {"name":"New Name","amount":19.90,"type":"expense","period":"yearly"}
                        """)
                .when().put("/subscriptions/1")
                .then().statusCode(200)
                .body("name", is("New Name"));
    }

    // ---------------------------------------------------------------
    // DELETE /subscriptions/{id}
    // ---------------------------------------------------------------

    @Test
    void delete_success_returns204() {
        when(subscriptionRepository.deleteByIdAndUser(1L, TEST_USER)).thenReturn(1L);

        given().when().delete("/subscriptions/1")
                .then().statusCode(204);
    }

    @Test
    void delete_notFound_returns404() {
        when(subscriptionRepository.deleteByIdAndUser(99L, TEST_USER)).thenReturn(0L);

        given().when().delete("/subscriptions/99")
                .then().statusCode(404);
    }

    // ---------------------------------------------------------------
    // Helper
    // ---------------------------------------------------------------

    private Subscription buildSubscription(Long id, String name) {
        Subscription s = new Subscription();
        s.id = id;
        s.userId = TEST_USER;
        s.name = name;
        s.amount = new BigDecimal("29.90");
        s.type = Subscription.Type.expense;
        s.period = Subscription.Period.monthly;
        s.active = true;
        return s;
    }
}
