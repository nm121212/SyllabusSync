# Contributing to SyllabusSync

Thank you for your interest in contributing to SyllabusSync! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please check if it already exists. When creating an issue, please include:

- **Clear description** of the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment details** (OS, Java version, Node version)
- **Screenshots** if applicable

### Suggesting Features

We welcome feature suggestions! Please:

- Check existing issues first
- Provide a clear description of the feature
- Explain the use case and benefits
- Consider implementation complexity

## 🚀 Development Setup

### Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL 15+
- Git

### Getting Started

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/SyllabusSync.git
   cd SyllabusSync
   ```

2. **Set up the backend**
   ```bash
   cd backend
   ./mvnw clean install
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb syllabussync_dev
   
   # Run migrations
   cd backend
   ./mvnw flyway:migrate
   ```

5. **Configure environment**
   ```bash
   # Copy example configurations
   cp backend/src/main/resources/application-example.yml backend/src/main/resources/application.yml
   cp frontend/.env.example frontend/.env
   ```

## 📝 Code Style Guidelines

### Java/Spring Boot

- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use meaningful variable and method names
- Add Javadoc comments for public methods
- Keep methods under 50 lines when possible
- Use `@Transactional` for database operations

```java
/**
 * Creates a new task for the specified course.
 * 
 * @param taskDto the task data transfer object
 * @param courseId the course identifier
 * @return the created task
 * @throws CourseNotFoundException if course doesn't exist
 */
@Transactional
public Task createTask(TaskDto taskDto, Long courseId) {
    // Implementation
}
```

### React/JavaScript

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks
- Use TypeScript for type safety
- Keep components small and focused
- Use meaningful prop and variable names

```typescript
interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onEdit }) => {
  // Implementation
};
```

## 🧪 Testing Guidelines

### Backend Testing

- Write unit tests for all service methods
- Write integration tests for API endpoints
- Aim for 80%+ code coverage
- Use `@MockBean` for mocking dependencies

```java
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {
    
    @Mock
    private TaskRepository taskRepository;
    
    @InjectMocks
    private TaskService taskService;
    
    @Test
    void shouldCreateTaskSuccessfully() {
        // Test implementation
    }
}
```

### Frontend Testing

- Write unit tests for components
- Write integration tests for user flows
- Use React Testing Library
- Mock API calls

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from './TaskCard';

describe('TaskCard', () => {
  it('should display task information', () => {
    const mockTask = { id: '1', title: 'Test Task', dueDate: '2025-01-01' };
    render(<TaskCard task={mockTask} onComplete={jest.fn()} onEdit={jest.fn()} />);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Run tests and linting**
   ```bash
   # Backend
   cd backend && ./mvnw test checkstyle:check
   
   # Frontend
   cd frontend && npm test && npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Pull Request Guidelines

- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Link to related issues** using "Fixes #123" or "Closes #123"
- **Screenshots** for UI changes
- **Testing instructions** for reviewers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

## 🏷️ Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(api): add task filtering by course
fix(ui): resolve calendar sync button styling
docs(readme): update installation instructions
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment information**
   - OS and version
   - Java version
   - Node.js version
   - Browser (for frontend issues)

2. **Reproduction steps**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Error messages or logs

3. **Additional context**
   - Screenshots or screen recordings
   - Related issues
   - Workarounds if any

## 🎯 Feature Requests

For feature requests, please:

1. **Check existing issues** first
2. **Describe the use case** clearly
3. **Explain the benefits** to users
4. **Consider implementation** complexity
5. **Provide examples** if possible

## 📚 Documentation

### Code Documentation

- Add Javadoc for public Java methods
- Add JSDoc for complex JavaScript functions
- Update README for new features
- Update API documentation for endpoint changes

### User Documentation

- Update user guides for new features
- Add screenshots for UI changes
- Update troubleshooting guides

## 🏆 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Email**: support@syllabussync.com

## 📋 Code of Conduct

Please be respectful and constructive in all interactions. We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/).

## 🙏 Thank You

Thank you for contributing to SyllabusSync! Your contributions help make academic life easier for students everywhere.

---

**Happy coding! 🚀**
