# 📄 SyllabusSync

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.java.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Intelligent academic task management system that automatically extracts deadlines and deliverables from course syllabi and syncs them with Google Calendar.**

## 🎯 Overview

SyllabusSync eliminates the tedious manual work of transferring assignment dates from syllabi to calendars. Simply upload your course syllabi (PDF, DOCX, TXT), and SyllabusSync will:

- 🔍 **Parse** assignment titles, due dates, and exam schedules
- 📅 **Sync** everything to your Google Calendar automatically  
- 📊 **Organize** tasks in a unified dashboard
- 🔔 **Send** smart reminders before due dates
- 📈 **Track** your progress across all courses

## ✨ Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| 📄 **Syllabus Parsing** | Extract tasks from PDF/DOCX/TXT files using NLP | ✅ Core |
| 📅 **Google Calendar Sync** | OAuth2 integration with automatic event creation | ✅ Core |
| 🗂️ **Task Dashboard** | Unified view with sorting, filtering, and search | ✅ Core |
| 🔔 **Smart Reminders** | Customizable notifications (7d, 3d, 1d before due) | ✅ Core |
| ✏️ **Manual Task Management** | Add, edit, and delete tasks manually | ✅ Core |
| 📊 **Progress Analytics** | Track completion rates per course | 🚧 Planned |

## 🏗️ Architecture

```
┌───────────────────────────────┐
│           Frontend            │
│       React.js (SPA)          │
│ - Task Dashboard UI           │
│ - Upload & Confirmation UI    │
│ - Calendar Sync Controls      │
└──────────────┬────────────────┘
               │ REST API Calls
┌──────────────▼────────────────┐
│          Backend (Java)       │
│        Spring Boot API        │
│ - Syllabus Parsing Service    │
│ - Task Management Service     │
│ - Calendar Integration Layer  │
│ - Reminder Scheduler          │
└──────────────┬────────────────┘
               │ JPA / JDBC
┌──────────────▼────────────────┐
│          Database             │
│ PostgreSQL (Users, Courses,   │
│ Tasks, Reminders, Tokens)     │
└──────────────┬────────────────┘
               │
┌──────────────▼────────────────┐
│         External APIs          │
│  - Google Calendar API         │
│  - OAuth 2.0 Auth              │
└───────────────────────────────┘
```

## 🆓 **FREE Services Used**

### **Database**
- ✅ **H2 Database** - Embedded, no setup required (FREE)
- ✅ **PostgreSQL** - Optional for production (FREE)

### **Authentication & APIs**
- ✅ **Google OAuth2** - Free OAuth service (FREE)
- ✅ **Google Calendar API** - Free API with generous limits (FREE)
- ✅ **JWT Tokens** - No external service needed (FREE)

### **Email & Notifications**
- ✅ **Gmail SMTP** - Free email service (FREE)
- ✅ **Spring Mail** - Built-in email support (FREE)

### **Caching & Storage**
- ✅ **Simple Cache** - Built-in Spring cache (FREE)
- ✅ **Local File Storage** - No cloud storage needed (FREE)

### **Development Tools**
- ✅ **H2 Console** - Built-in database management (FREE)
- ✅ **Swagger UI** - Built-in API documentation (FREE)
- ✅ **Spring Boot Actuator** - Built-in monitoring (FREE)

## 🚀 Quick Start

### Prerequisites

- **Java 17+** - [Download OpenJDK](https://openjdk.java.net/)
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **Maven 3.6+** - [Download Maven](https://maven.apache.org/download.cgi) (or use included Maven wrapper)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/syllabussync.git
cd syllabussync
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your actual credentials
nano .env  # or use your preferred editor
```

**Required environment variables:**
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Gemini AI API Configuration  
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random

# Frontend Configuration
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:8080/api/syllabus/auth/google/callback` as authorized redirect URI
6. Copy the client ID and secret to your `.env` file

### 4. Set Up Gemini AI API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

### 5. Start the Application

#### 🎯 **One-Command Startup (Recommended)**

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

#### Alternative: Manual Setup

**Start Backend:**
```bash
cd backend
./mvnw spring-boot:run
```

**Start Frontend (in another terminal):**
```bash
cd frontend
npm install
npm start
```

#### Docker Setup

```bash
# Start all services with Docker
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 6. Access the Application

Once started, you can access:

- **🌐 Frontend:** http://localhost:3000
- **📊 Backend API:** http://localhost:8080/api
- **🗄️ H2 Database Console:** http://localhost:8080/h2-console
- **📚 Health Check:** http://localhost:8080/actuator/health

### 7. Stop the Application

```bash
# Stop all services
./stop.sh
```

Or press `Ctrl+C` in the terminal where you ran `./start.sh`

## 🔧 Configuration

### Backend Configuration (`application.yml`)

```yaml
spring:
  datasource:
    # FREE: Using H2 embedded database (no setup required)
    url: jdbc:h2:mem:syllabussync;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    username: sa
    password: 
    driver-class-name: org.h2.Driver
  
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true

  h2:
    console:
      enabled: true
      path: /h2-console

google:
  calendar:
    client-id: your_google_client_id
    client-secret: your_google_client_secret
    redirect-uri: http://localhost:8080/api/syllabus/auth/google/callback

syllabus:
  parsing:
    max-file-size: 10MB
    supported-formats: pdf,docx,txt
```

### Frontend Configuration (`.env`)

```env
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:8080/api/syllabus/auth/google/callback` (development)
   - `https://yourdomain.com/api/syllabus/auth/google/callback` (production — adjust if you change the API path)

## 📖 Usage

### 1. Upload Syllabus

1. Navigate to the **Upload** page
2. Select your syllabus file (PDF, DOCX, or TXT)
3. Choose the course from dropdown or create new course
4. Click **Upload & Parse**

### 2. Review Extracted Tasks

1. Review the parsed tasks in the confirmation screen
2. Edit task details if needed:
   - Assignment title
   - Due date
   - Task type (Assignment, Project, Exam, Quiz)
   - Priority level
3. Click **Confirm & Save**

### 3. Dashboard Management

1. View all tasks organized by course and due date
2. Use filters to find specific tasks:
   - By course
   - By task type
   - By due date range
   - By completion status
3. Mark tasks as completed
4. Edit or delete tasks manually

### 4. Google Calendar Sync

1. Click **Connect Google Calendar** (first time only)
2. Authorize SyllabusSync in the OAuth popup
3. Click **Sync to Calendar** to create events
4. Events will appear in your Google Calendar with:
   - Assignment title and course
   - Due date and time
   - Reminder notifications (7d, 3d, 1d before due)

## 🛠️ Development

### Tech Stack

- **Backend**: Java 17, Spring Boot 3.x, Spring Security, Spring Data JPA
- **Frontend**: React 18, Axios, Material-UI
- **Database**: PostgreSQL 15
- **Parsing**: Apache Tika, PDFBox, OpenNLP
- **Authentication**: OAuth 2.0, JWT
- **Build**: Maven, npm
- **Testing**: JUnit 5, Mockito, Jest, React Testing Library

### Project Structure

```
SyllabusSync/
├── backend/                 # Spring Boot API
│   ├── src/main/java/      # Java source code
│   ├── src/main/resources/ # Configuration files
│   └── pom.xml            # Maven dependencies
├── frontend/               # React.js SPA
│   ├── src/               # React source code
│   ├── public/            # Static assets
│   └── package.json       # Node.js dependencies
├── start.sh               # One-command startup script
├── stop.sh                # Clean shutdown script
├── docker-compose.yml     # Docker orchestration
└── README.md             # This file
```

### Running in Development

#### Quick Start (Recommended)
```bash
# Start everything with one command
./start.sh

# Stop everything
./stop.sh
```

#### Manual Development Setup
1. **Start Backend**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8080
   - H2 Console: http://localhost:8080/h2-console

### Running Tests

```bash
# Backend tests
cd backend && ./mvnw test

# Frontend tests
cd frontend && npm test

# Integration tests
cd backend && ./mvnw verify
```

### Code Quality

```bash
# Backend code quality
cd backend && ./mvnw checkstyle:check
cd backend && ./mvnw spotbugs:check

# Frontend code quality
cd frontend && npm run lint
cd frontend && npm run lint:fix
```

## 📊 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/syllabi/upload` | Upload and parse syllabus file |
| `GET` | `/api/tasks` | Get all tasks with filtering |
| `POST` | `/api/tasks` | Create new task manually |
| `PUT` | `/api/tasks/{id}` | Update task details |
| `DELETE` | `/api/tasks/{id}` | Delete task |
| `POST` | `/api/calendar/sync` | Sync tasks to Google Calendar |
| `GET` | `/api/courses` | Get all courses |

### Example API Usage

```bash
# Upload syllabus
curl -X POST http://localhost:8080/api/syllabi/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@syllabus.pdf" \
  -F "courseId=1"

# Get tasks
curl -X GET "http://localhost:8080/api/tasks?courseId=1&status=pending"

# Sync to calendar
curl -X POST http://localhost:8080/api/calendar/sync \
  -H "Authorization: Bearer your-jwt-token"
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual images
docker build -t syllabussync-backend ./backend
docker build -t syllabussync-frontend ./frontend
```

### Production Environment

1. **Database**: Set up PostgreSQL with proper backup strategy
2. **Backend**: Deploy Spring Boot JAR to cloud platform (AWS, Heroku, etc.)
3. **Frontend**: Build and deploy to CDN or static hosting
4. **Environment**: Configure production environment variables
5. **SSL**: Set up HTTPS certificates
6. **Monitoring**: Configure logging and monitoring

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Apache Tika](https://tika.apache.org/) for document parsing
- [Google Calendar API](https://developers.google.com/calendar) for calendar integration
- [Spring Boot](https://spring.io/projects/spring-boot) for the robust backend framework
- [React](https://reactjs.org/) for the modern frontend framework

## 📞 Support

- 📧 Email: support@syllabussync.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/SyllabusSync/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/SyllabusSync/wiki)

---

**Made with ❤️ for students everywhere**