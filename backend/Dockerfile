# Un mismo Dockerfile para los cuatro servicios: docker build --build-arg SERVICIO=ms-auth backend
FROM maven:3.9-eclipse-temurin-21 AS build
ARG SERVICIO
WORKDIR /app
COPY ${SERVICIO}/pom.xml .
RUN mvn -q -B dependency:go-offline
COPY ${SERVICIO}/src src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --no-create-home app
COPY --from=build /app/target/*.jar app.jar
USER app
ENTRYPOINT ["java", "-jar", "app.jar"]
