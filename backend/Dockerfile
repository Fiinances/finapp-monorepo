# =============================================================
# Finapp Backend — Dockerfile (Multi-stage, JVM mode)
# =============================================================
# Stage 1: Build com Maven
# =============================================================
FROM maven:3.9-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Copia o pom.xml e baixa dependências (layer cache)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copia o código-fonte e compila
COPY src ./src
RUN mvn package -DskipTests -q

# =============================================================
# Stage 2: Runtime mínimo (JRE Alpine)
# =============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copia o fast-jar do Quarkus
COPY --from=build /app/target/quarkus-app/lib/       ./lib/
COPY --from=build /app/target/quarkus-app/*.jar       ./
COPY --from=build /app/target/quarkus-app/app/        ./app/
COPY --from=build /app/target/quarkus-app/quarkus/    ./quarkus/

# Usuário não-root para segurança
RUN addgroup -S finapp && adduser -S finapp -G finapp
USER finapp

# Porta padrão; Vercel injeta $PORT em runtime
EXPOSE 8080

# Variáveis de ambiente com defaults
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0"

# Usa $PORT injetado pela Vercel (fallback 8080)
CMD ["sh", "-c", "java ${JAVA_OPTS} -Dquarkus.http.port=${PORT:-8080} -jar quarkus-run.jar"]
