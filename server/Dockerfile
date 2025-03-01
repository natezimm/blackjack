# Stage 1: Build the application
FROM gradle:7.3.3-jdk11 AS build

# Set the working directory
WORKDIR /app

# Copy the Gradle wrapper and build files
COPY build.gradle settings.gradle /app/

# Copy the source code
COPY src /app/src

# Build the application
RUN gradle build --no-daemon

# Stage 2: Create the runtime image
FROM openjdk:11-jre-slim

# Set the working directory
WORKDIR /app

# Copy the JAR file from the build stage
COPY --from=build /app/build/libs/*.jar app.jar

# Expose the port the app runs on
EXPOSE 8080

# Set the environment variable
ENV ALLOWED_ORIGINS=https://nerdle-frontend.onrender.com

# Run the JAR file
ENTRYPOINT ["java", "-jar", "app.jar"]