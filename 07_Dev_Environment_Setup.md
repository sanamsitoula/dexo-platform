# Dev Environment Setup

## Overview
Complete development environment setup instructions for the Dexo Platform, enabling new developers to become productive within one day. Covers monorepo structure, Docker configuration, local development tools, and CI/CD integration.

## Prerequisites
**Required Software**:
- Node.js >= 18.x (LTS)
- npm >= 9.x or yarn >= 1.22.x
- Docker Desktop >= 4.0.x
- Git >= 2.30.x
- PostgreSQL client >= 14.x (for local debugging)
- Redis Desktop Manager or similar (optional)
- VS Code recommended with extensions

**Recommended**:
- AWS CLI (for localstack/testing)
- Kubernetes CLI (kubectl) >= 1.24.x
- Helm >= 3.0.x
- Postman or Insomnia for API testing
- GitHub Desktop or similar GUI

## Monorepo Structure
```
dexo-platform/
├── .github/                    # GitHub workflows and configs
├── .husky/                     # Git hooks
├── .vscode/                    # VS Code workspace settings
├── apps/                       # Deployable applications
│   ├── web/                    # React web application
│   ├── mobile/                 # React Native mobile app
│   └── admin/                  # Admin dashboard (React)
├── packages/                   # Shared packages and libraries
│   ├── shared/                 # TypeScript utilities, types, constants
│   ├── ui/                     # Shared React components
│   ├── auth/                   # Auth service (NestJS)
│   ├── tenant/                 # Tenant service (NestJS)
│   ├── user/                   # User service (NestJS)
│   ├── role/                   # Role service (NestJS)
│   ├── permission/             # Permission service (NestJS)
│   ├── subscription/           # Subscription service (NestJS)
│   ├── billing/                # Billing service (NestJS)
│   ├── notification/           # Notification service (NestJS)
│   ├── files/                  # Files service (NestJS)
│   ├── settings/               # Settings service (NestJS)
│   ├── plugin-system/          # Plugin system service (NestJS)
│   └── dashboard/              # Dashboard service (NestJS)
├── infra/                      # Infrastructure as Code
│   ├── k8s/                    # Kubernetes manifests
│   ├── terraform/              # Terraform modules
│   ├── docker/                 # Docker configurations
│   └── scripts/                # Deployment and utility scripts
├── docs/                       # Documentation
├── tests/                      # End-to-end and integration tests
├── scripts/                    # Development scripts
├── turborepo.json              # Turborepo configuration
├── package.json                # Root package.json
├── tsconfig.json               # Root TypeScript config
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── .gitignore                  # Git ignore rules
└── README.md                   # Project overview
```

## Installation Process

### 1. Fork and Clone Repository
```bash
# Fork the repository on GitHub first
git clone https://github.com/your-username/dexo-platform.git
cd dexo-platform
```

### 2. Install Development Dependencies
```bash
# Install Node.js dependencies
npm ci  # or yarn install --frozen-lockfile

# Install Turborepo globally (optional)
npm install -g turborepo
```

### 3. Environment Configuration
```bash
# Copy example environment files
cp .env.example .env
cp .env.example.local .env.local  # For local overrides

# Edit .env.local with your local settings:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/dexo
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-super-secret-jwt-key-change-in-production
# REFRESH_TOKEN_SECRET=your-refresh-token-secret
# NODE_ENV=development
# PORT=3000
```

### 4. Set Up Local Services
#### Option A: Docker Compose (Recommended for beginners)
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Services started:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - LocalStack (AWS mock, port 4566)
# - MailHog (email testing, port 8025)
# - MinIO (S3 mock, port 9000)
```

#### Option B: Manual Installation (for experienced developers)
```bash
# Install and start PostgreSQL
# macOS: brew install postgresql && brew services start postgresql
# Ubuntu: sudo apt install postgresql && sudo systemctl start postgresql

# Install and start Redis
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server && sudo systemctl start redis-server

# Create database
createdb dexo
psql -d dexo -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 5. Initialize Database
```bash
# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed initial data (optional)
npx prisma db seed
```

### 6. Start Development Servers
```bash
# Start all apps in development mode
npm run dev

# Or start individual apps:
 npm run dev -- --scope=apps/web
 npm run dev -- --scope=apps/mobile
 npm run dev -- --scope=apps/admin

# Or start backend services:
 npm run dev -- --scope=packages/auth
 npm run dev -- --scope=packages/tenant
```

### 7. Verify Installation
Open your browser to:
- Web App: http://localhost:3000
- Admin Dashboard: http://localhost:3001
- API Documentation: http://localhost:4000/docs
- Health Check: http://localhost:4000/health

## Development Workflow

### Making Changes
1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow Coding Standards**:
   - ESLint and Prettier will run on pre-commit
   - TypeScript compiler checks types
   - Jest for unit tests

3. **Test Your Changes**:
   ```bash
   # Run unit tests for a specific package
   npm run test -- --scope=packages/auth
   
   # Run integration tests
   npm run test:integration
   
   # Run end-to-end tests
   npm run test:e2e
   ```

4. **Commit Changes**:
   ```bash
   git add .
   git commit -m "feat(auth): add password strength validation"
   ```

5. **Push and Create Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   # Then create PR on GitHub
   ```

### Common Development Commands
```bash
# Lint all packages
npm run lint

# Format all code
npm run format

# Type check all packages
npm run type-check

# Watch for changes and rebuild
npm run watch -- --scope=packages/shared

# Debug mode with node inspector
npm run debug -- --scope=apps/web

# Profile performance
npm run profile -- --scope=packages/billing

# Generate API docs
npm run docs

# Run storybook for UI components
npm run storybook

# Clean build artifacts
npm run clean

# Reset database to clean state
npm run db:reset
```

## Docker Development Setup

### Docker Compose Files
- `docker-compose.dev.yml`: Full development stack with hot reload
- `docker-compose.test.yml`: Testing environment with isolated services
- `docker-compose.ci.yml`: CI/CD pipeline environment

### Service Ports (Development)
```
PostgreSQL: 5432
Redis: 6379
LocalStack (AWS): 4566
MailHog (Email): 8025
MinIO (S3): 9000
Web App: 3000
Admin Dashboard: 3001
API Gateway: 4000
Auth Service: 4001
Tenant Service: 4002
User Service: 4003
... (each service on 4000+)
```

### Hot Reload Configuration
Each service uses:
- **NestJS**: `nest build --watch` for backend
- **React**: `react-scripts start` for frontend
- **React Native**: `expo start` for mobile
- File changes trigger automatic rebuild and restart

### Container Access
```bash
# Enter a running container
docker exec -it dexo-auth-service sh

# View logs
docker logs -f dexo-auth-service

# Restart a service
docker-compose restart auth-service

# Rebuild after dependency changes
docker-compose build --no-cache auth-service
```

## IDE Configuration

### VS Code Recommendations
**Extensions**:
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- Prisma
- Docker
- GitHub Pull Requests and Issues
- Jest
- Turbo Console Log
- Import Cost
- Path Intellisense

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/build": true,
    "**/coverage": true
  }
}
```

### Debugging Configuration
**.vscode/launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Web App",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--", "--scope=apps/web"],
      "port": 9229,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug API Services",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/packages/auth/src/main.ts",
      "args": ["--watch"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "openOnSessionStart"
    }
  ]
}
```

## Testing Strategy

### Unit Tests
- Located in `*.test.ts` files alongside source
- Use Jest with ts-jest
- Mock external dependencies
- Coverage target: 80%+
- Run: `npm run test -- --scope=packages/<service>`

### Integration Tests
- Located in `tests/integration/` directory
- Test service-to-service communication
- Use testcontainers for databases
- Run against Docker Compose test environment
- Run: `npm run test:integration`

### End-to-End Tests
- Located in `tests/e2e/` directory
- Use Playwright or Cypress
- Test complete user flows
- Run against staging-like environment
- Run: `npm run test:e2e`

### Test Data Management
- Factory patterns for test data
- Database seeding scripts
- Test data isolation between test runs
- Mock services for external dependencies

## Code Quality Tools

### Pre-commit Husky Hooks
- Runs lint-staged on staged files
- Prevents commits with lint errors
- Runs unit tests on affected packages
- Checks for console.log and debugger statements

### Pre-commit Configuration
```bash
# .husky/pre-commit
npx lint-staged
```

### lint-staged Configuration
```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "git add"
  ],
  "*.{js,jsx}": [
    "eslint --fix",
    "prettier --write",
    "git add"
  ],
  "*.{json,yml,yaml,css,scss,md}": [
    "prettier --write",
    "git add"
  ],
  "prisma/{schema.prisma}": [
    "prisma format",
    "git add"
  ]
}
```

### Code Review Checklist
1. [ ] Code follows established patterns
2. [ ] TypeScript types are correct and complete
3. [ ] Unit tests cover new functionality
4. [ ] No console.log or debugger in production code
5. [ ] Security considerations addressed
6. [ ] Performance implications considered
7. [ ] Documentation updated if needed
8. [ ] Changelog entry added for user-facing changes
9. [ ] Breaking changes noted and documented
10. [ ] Backward compatibility maintained

## Troubleshooting

### Common Issues

**1. Port Conflicts**
```bash
# Check what's using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
# Or change port in .env.local
```

**2. Database Connection Issues**
```bash
# Test connection
psql -h localhost -U postgres -d dexo
# Check Docker containers
docker ps | grep postgres
# Restart database
docker-compose restart postgres
```

**3. Redis Connection Issues**
```bash
# Test connection
redis-cli ping
# Should return PONG
# Check Docker
docker ps | grep redis
# Restart
docker-compose restart redis
```

**4. Docker Build Failures**
```bash
# Clear build cache
docker system prune -af
# Rebuild with no cache
docker-compose build --no-cache
# Check logs
docker-compose logs <service>
```

**5. Module Not Found Errors**
```bash
# Reinstall dependencies
npm ci
# Clear node_modules and reinstall
rm -rf node_modules && npm ci
# Clear Turborepo cache
npx turboclean
```

### Performance Tuning
**Hot Reload Optimization**:
- Increase file watcher limits (macOS/Linux):
  ```bash
  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
  ```
- Exclude node_modules from IDE indexing
- Use SSD for development
- Allocate sufficient memory to Docker (8GB+ recommended)

**Database Optimization**:
- Use proper indexes in development
- Limit fixture data size
- Use transactions for test isolation
- Consider using SQLite for unit tests (via Prisma provider switching)

## CI/CD Integration

### Local CI Simulation
```bash
# Simulate GitHub Actions locally
act -j build
act -j test
act -j deploy

# Or use Docker Compose CI file
docker-compose -f docker-compose.ci.yml up --abort-on-container-exit
```

### GitHub Actions Secrets
Set these in repository settings:
- `DATABASE_URL`: Production database URL
- `REDIS_URL`: Production Redis URL
- `JWT_SECRET`: Production JWT secret
- `REFRESH_TOKEN_SECRET`: Production refresh token secret
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `S3_BUCKET`: Production S3 bucket name
- `STRIPE_SECRET_KEY`: Stripe secret key
- `SENDGRID_API_KEY`: SendGrid API key
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications
- `SENTRY_DSN`: Sentry DSN for error monitoring

### Deployment Pipeline Stages
1. **Build**: Compile TypeScript, run lint, type check
2. **Test**: Run unit, integration, and smoke tests
3. **Security**: Run dependency scan, container scan
4. **Build Images**: Create Docker images with version tags
5. **Push Images**: Push to container registry (ECR/GCR/ Docker Hub)
6. **Deploy**: Deploy to Kubernetes (staging → production)
7. **Verify**: Run health checks, smoke tests
8. **Notify**: Post deployment status to Slack/email

## Onboarding Checklist for New Developers

### Day 1
- [ ] Fork and clone repository
- [ ] Install prerequisites (Node, Docker, etc.)
- [ ] Set up environment variables
- [ ] Start local services with Docker Compose
- [ ] Run database migrations
- [ ] Start development servers
- [ ] Verify all services are running
- [ ] Make first minor change (typo fix, comment)
- [ ] Submit first pull request

### Day 2
- [ ] Read architecture documentation
- [ ] Explore codebase structure
- [ ] Fix a beginner-friendly issue
- [ ] Write unit tests for new functionality
- [ ] Participate in code review
- [ ] Learn testing patterns
- [ ] Understand API conventions

### Day 3
- [ ] Work on a small feature
- [ ] Implement end-to-end tests
- [ ] Performance test your changes
- [ ] Document any undocumented behaviors
- [ ] Prepare for code review
- [ ] Merge your first feature branch

### Week 1
- [ ] Complete assigned tickets
- [ ] Contribute to documentation improvements
- [ ] Suggest improvements to developer experience
- [ ] Participate in team retro
- [ ] Set up personal development preferences
- [ ] Become comfortable with deployment process

## Resources
- **Internal Wiki**: [Link to internal documentation]
- **API Documentation**: http://localhost:4000/docs
- **Prisma Docs**: https://www.prisma.io/docs/
- **NestJS Docs**: https://docs.nestjs.com/
- **React Docs**: https://reactjs.org/
- **React Native Docs**: https://reactnative.dev/
- **Expo Docs**: https://docs.expo.dev/
- **Turborepo Docs**: https://turborepo.org/
- **Docker Docs**: https://docs.docker.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/documentation

## Getting Help
- **#dev-help** Slack channel
- **Weekly office hours** with senior developers
- **Pair programming** sessions available
- **Code review** feedback is your friend
- **Documentation** is continuously improved
- **Mentorship** program for new hires