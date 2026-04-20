# Render (and other hosts) build from repo root with context `.` — backend assets live under /backend.
FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /app

COPY backend/mvnw .
COPY backend/.mvn .mvn
COPY backend/pom.xml .

RUN chmod +x mvnw

RUN ./mvnw dependency:go-offline -B

COPY backend/src src

RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN groupadd -r syllabussync \
  && useradd -r -g syllabussync -m -d /home/syllabussync syllabussync

WORKDIR /app

COPY --from=builder /app/target/syllabussync-*.jar app.jar

RUN mkdir -p /app/uploads /home/syllabussync/.credentials/syllabussync \
  && chown -R syllabussync:syllabussync /app /home/syllabussync

USER syllabussync

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
