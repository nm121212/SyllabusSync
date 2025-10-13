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

- **Java 17+**
- **Node.js 18+**
- **Google Cloud Console** account (for Calendar API - FREE)
- **Gmail account** (for email notifications - FREE)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/SyllabusSync.git
   cd SyllabusSync
   ```

2. **Backend Setup**
   ```bash
   cd backend
   ./mvnw clean install
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # No database setup needed! 
   # SyllabusSync uses H2 embedded database for development (FREE)
   # H2 console available at: http://localhost:8080/h2-console
   ```

5. **Environment Configuration**
   ```bash
   # Copy and configure environment files
   cp backend/src/main/resources/application-example.yml backend/src/main/resources/application.yml
   cp frontend/.env.example frontend/.env
   ```

6. **Start the application**
   ```bash
   # Terminal 1: Backend
   cd backend && ./mvnw spring-boot:run
   
   # Terminal 2: Frontend  
   cd frontend && npm start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - API Docs: http://localhost:8080/swagger-ui.html

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
    redirect-uri: http://localhost:8080/auth/google/callback

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
   - `http://localhost:8080/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)

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
├── backend/
│   ├── src/main/java/com/syllabussync/
│   │   ├── controller/          # REST controllers
│   │   ├── service/            # Business logic
│   │   ├── repository/         # Data access layer
│   │   ├── model/              # JPA entities
│   │   ├── dto/                # Data transfer objects
│   │   ├── config/             # Configuration classes
│   │   └── util/               # Utility classes
│   └── src/main/resources/
│       ├── application.yml     # Configuration
│       └── db/migration/       # Flyway migrations
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   ├── hooks/              # Custom hooks
│   │   └── utils/              # Utility functions
│   └── public/
└── docs/                       # Documentation
```

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