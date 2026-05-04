package br.com.finapp.health;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
import org.eclipse.microprofile.health.Readiness;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@Readiness
@ApplicationScoped
public class DatabaseReadinessCheck implements HealthCheck {

    @Inject
    DataSource dataSource;

    @Override
    public HealthCheckResponse call() {
        HealthCheckResponseBuilder builder = HealthCheckResponse.named("database-ready");

        try (Connection conn = dataSource.getConnection();
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery("SELECT 1")) {

            if (rs.next()) {
                return builder
                        .up()
                        .withData("url", conn.getMetaData().getURL())
                        .withData("product", conn.getMetaData().getDatabaseProductName())
                        .withData("version", conn.getMetaData().getDatabaseProductVersion())
                        .build();
            }

            return builder.down().withData("reason", "SELECT 1 returned no rows").build();

        } catch (Exception e) {
            return builder.down().withData("error", e.getMessage()).build();
        }
    }
}
