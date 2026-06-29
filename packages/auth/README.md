# @dexo/auth

Authentication microservice for the Dexo Platform.

## Features

- User registration with email/password
- JWT-based authentication
- Password hashing with bcrypt
- Token validation
- Multi-tenant support
- Prisma ORM integration

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/dexo
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=1h
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRATION=7d
AUTH_PORT=3001
```

## API Endpoints

### Public Routes

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/validate` - Validate a JWT token
- `POST /auth/refresh` - Refresh an access token

### Protected Routes

- `GET /auth/profile` - Get current user profile (requires JWT)

## Installation

```bash
npm install
```

## Generate Prisma Client

```bash
npx prisma generate
```

## Running the Service

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## Testing

```bash
npm run test
npm run test:cov
```

## Example Requests

### Register
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Validate Token
```bash
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Get Profile (Protected)
```bash
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
