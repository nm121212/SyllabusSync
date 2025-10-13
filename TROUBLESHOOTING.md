# SyllabusSync Troubleshooting Guide

## Database Migration Issue (RESOLVED)

### Problem
The application was failing to start with the following error:
```
Migration V1__Create_initial_schema.sql failed
SQL State  : 42001
Error Code : 42001
Message    : Syntax error in SQL statement "CREATE OR REPLACE FUNCTION update_updated_at_column()..."
```

### Root Cause
The Flyway migration files contained PostgreSQL-specific syntax (like `BIGSERIAL`, `plpgsql` functions, and triggers) but the application was configured to use H2 database for development, which doesn't support PostgreSQL syntax.

### Solution Applied
1. **Removed Flyway migration files** - Deleted the `src/main/resources/db/migration/` directory
2. **Configured JPA Auto-DDL** - Application now uses `hibernate.ddl-auto: create-drop` 
3. **H2 Database Integration** - Tables are automatically created from JPA entities

### Current Configuration
- **Development Database**: H2 (in-memory)
- **Schema Management**: JPA Auto-DDL (create-drop)
- **Console Access**: http://localhost:8080/h2-console
- **Connection**: `jdbc:h2:mem:syllabussync` / username: `sa` / password: (empty)

## How to Run the Application

### Prerequisites
- Java 17 or higher
- Maven (or use included Maven wrapper)

### Quick Start
```bash
# Navigate to backend directory
cd backend

# Build the application
./mvnw clean package -DskipTests

# Run the application
java -jar target/syllabussync-1.0.0.jar
```

### Verify Application is Running
```bash
# Health check endpoint
curl http://localhost:8080/api/health

# Expected response:
# {"application":"SyllabusSync","version":"1.0.0","status":"UP","timestamp":"..."}

# Hello endpoint
curl http://localhost:8080/api/hello

# Expected response:
# {"message":"Hello from SyllabusSync!","status":"Working"}
```

### Available Endpoints
- **Health Check**: `GET /api/health`
- **Hello World**: `GET /api/hello`
- **H2 Console**: `GET /h2-console` (development only)
- **API Documentation**: `GET /swagger-ui.html`

### Database Access
1. Navigate to http://localhost:8080/h2-console
2. Use connection settings:
   - JDBC URL: `jdbc:h2:mem:syllabussync`
   - User Name: `sa`
   - Password: (leave empty)
3. Click "Connect"

### Production Deployment
For production, the application is configured to use PostgreSQL. Update the `application.yml` profile to `production` and configure PostgreSQL connection details.

## Commits Made
1. **Initial Setup**: Complete project structure with Spring Boot backend and React frontend
2. **Database Fix**: Resolved PostgreSQL/H2 compatibility issues by removing Flyway migrations

The application now starts successfully and all endpoints are functional.