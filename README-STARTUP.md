# 🚀 SyllabusSync - Quick Start Guide

## Prerequisites

Before running the application, make sure you have:

- **Java 17+** installed
- **Node.js 18+** installed
- **Maven** (or use the included Maven wrapper)

## Quick Start

### 1. Set up Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your actual credentials
nano .env  # or use your preferred editor
```

**Required environment variables:**
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret  
- `GEMINI_API_KEY` - Your Google Gemini API key
- `JWT_SECRET` - A secure random string for JWT tokens

### 2. Run the Application

```bash
# Start everything with one command
./start.sh
```

This will:
- ✅ Check prerequisites (Java, Node.js)
- ✅ Start the Spring Boot backend
- ✅ Start the React frontend
- ✅ Wait for services to be ready
- ✅ Show you the URLs to access the application

### 3. Access the Application

Once started, you can access:

- **🌐 Frontend:** http://localhost:3000
- **📊 Backend API:** http://localhost:8080/api
- **🗄️ H2 Database Console:** http://localhost:8080/h2-console
- **📚 Health Check:** http://localhost:8080/actuator/health

### 4. Stop the Application

```bash
# Stop all services
./stop.sh
```

Or press `Ctrl+C` in the terminal where you ran `./start.sh`

## Alternative Startup Methods

### Development Mode (with hot reload)

```bash
# Backend only
cd backend
./mvnw spring-boot:run

# Frontend only (in another terminal)
cd frontend
npm start
```

### Production Mode

```bash
# Build and run with Docker
docker-compose up --build
```

## Troubleshooting

### Backend won't start
- Check if port 8080 is available
- Verify Java 17+ is installed
- Check `backend.log` for errors

### Frontend won't start  
- Check if port 3000 is available
- Verify Node.js 18+ is installed
- Run `npm install` in the frontend directory
- Check `frontend.log` for errors

### Environment variables not working
- Make sure `.env` file exists in the project root
- Verify all required variables are set
- Restart the application after changing `.env`

## Logs

- **Backend logs:** `tail -f backend.log`
- **Frontend logs:** `tail -f frontend.log`
- **Application logs:** `backend/logs/syllabussync.log`

## Getting Help

If you encounter issues:

1. Check the logs for error messages
2. Verify all prerequisites are installed
3. Ensure environment variables are properly set
4. Check that required ports (3000, 8080) are available

---

**Happy coding! 🎉**
