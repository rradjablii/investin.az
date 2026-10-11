# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q -DskipTests package && cp target/investin-backend-*.jar /app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 app && mkdir -p /data/uploads && chown app /data/uploads
USER app
COPY --from=build /app.jar /app.jar
ENV STORAGE_DIR=/data/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
