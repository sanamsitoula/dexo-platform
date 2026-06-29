# API Design Conventions

## Overview
Standardized API design principles for the Dexo Platform ensuring consistency, developer experience, scalability, and maintainability across all services and modules.

## API Philosophy
**Design First**: Contract-first approach using OpenAPI/Swagger
**Consistency**: Predictable patterns reduce cognitive load
**Simplicity**: Easy to understand and use correctly
**Evolvability**: Backward-compatible changes wherever possible
**Security**: Secure by default principles
**Performance**: Optimized for common use cases
**Debuggability**: Clear error messages and diagnostic information

## API Style
**RESTful Principles** with pragmatism:
- Resources as nouns (not verbs)
- Standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- HTTP status codes for outcomes
- JSON as primary exchange format
- HATEOAS links for discoverability (where beneficial)
- Versioning in URL path
- Resource nesting for relationships
- Query parameters for filtering, sorting, pagination

**Not Strictly REST When**:
- Batch operations improve efficiency
- Webhooks for asynchronous notifications
- GraphQL-like capabilities for complex queries
- Streaming endpoints for real-time data
- RPC-style for internal service communication

## API Versioning Strategy
**URL Path Versioning**: `/api/v1/resource`
**Why This Approach**:
- Clear and visible in API calls
- Easy to cache and route
- Simple to document and test
- Client-side version locking straightforward
- Avoids header parsing complexity
- Works well with API gateways and proxies

**Versioning Policy**:
- **Major Version** (v1 → v2): Breaking changes allowed
  - Removing or renaming endpoints
  - Changing request/response structure significantly
  - Changing authentication mechanisms
  - Removing deprecated features
  - Requires new client implementation
- **Minor Version** (v1.1 → v1.2): Backward-compatible additions
  - Adding new endpoints
  - Adding optional fields to requests/responses
  - Adding new enum values
  - Adding new HTTP methods to existing endpoints
  - Clients can ignore additions safely
- **Patch Version** (v1.0.1 → v1.0.2): Bug fixes only
  - Fixing incorrect behavior
  - Performance improvements
  - Security patches
  - No contract changes

**Deprecation Policy**:
- Deprecate minor version features 6 months before removal
- Provide deprecation warnings in responses
- Maintain deprecated features for minimum 6 months
- Communicate deprecation via developer portal and email
- Sunset major versions with 12-month notice

**Example URLs**:
```
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}
GET    /api/v1/tenants/{tenantId}/users
POST   /api/v1/tenants/{tenantId}/invitations
```

## Resource Naming Conventions
**Use Plural Nouns for Collections**:
- ✅ `/users`, `/tenants`, `/roles`, `/permissions`
- ❌ `/user`, `/tenant`, `/role`, `/permission`

**Use Singular for Specific Resources**:
- ✅ `/users/{userId}`, `/tenants/{tenantId}`
- ❌ `/users/{userId}/profile` (prefer `/users/{userId}` with fields)

**Use Hyphens for Multi-word Resources**:
- ✅ `/api-keys`, `/web-hooks`, `/file-uploads`
- ❌ `/api_keys`, `/apiKeys`

**Avoid Verbs in Resource Names**:
- ❌ `/getUsers`, `/createUser`, `/deleteUser`
- ✅ Use HTTP methods instead: `GET /users`, `POST /users`, `DELETE /users/{id}`

**Exception: Action-Oriented Endpoints** (when not CRUD):
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/notifications/send
POST   /api/v1/reports/generate
POST   /api/v1/exports/create
POST   /api/v1/webhooks/test
```

## HTTP Methods Usage
**GET**:
- Retrieve resources (collection or single)
- Safe and idempotent
- No side effects
- Query parameters for filtering/sorting/pagination
- Examples: `GET /users`, `GET /users/{id}`, `GET /tenants?active=true`

**POST**:
- Create new resources
- Not idempotent (may create duplicates if retried)
- Can trigger actions/processes
- Examples: `POST /users`, `POST /auth/login`, `POST /notifications/send`

**PUT**:
- Replace entire resource (idempotent)
- Client provides complete representation
- Use for full updates
- Examples: `PUT /users/{id}`, `PUT /tenants/{tenantId}/settings`

**PATCH**:
- Partially update resource (ideally idempotent)
- Client provides only changed fields
- Use for partial updates
- Examples: `PATCH /users/{id}`, `PATCH /tenants/{tenantId}/settings`
- **Preferred over PUT for most updates**

**DELETE**:
- Remove resource (idempotent)
- Examples: `DELETE /users/{id}`, `DELETE /tenants/{tenantId}`
- Consider soft deletes for auditability

**HEAD**:
- Same as GET but without response body
- For checking existence/metadata
- Examples: `HEAD /users/{id}`

**OPTIONS**:
- Describe communication options for resource
- Used for CORS preflight
- Examples: `OPTIONS /users`

## Request/Response Format
**Content-Type**:
- Request: `application/json` (required for POST/PUT/PATCH)
- Response: `application/json` (unless otherwise specified)
- Exception: File downloads (`application/octet-stream`), CSV exports (`text/csv`)

**Character Encoding**: UTF-8 for all text

**Request Body Structure**:
```json
{
  "data": {
    // Main resource data
    "field1": "value",
    "field2": 123,
    "nested": {
      "subfield": "value"
    }
  },
  "meta": {
    // Request metadata (optional)
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "clientInfo": {
      "name": "web-app",
      "version": "1.0.0"
    }
  }
}
```

**Response Body Structure - Success**:
```json
{
  "success": true,
  "data": {
    // Resource data
    "id": "uuid",
    "field1": "value",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  },
  "meta": {
    // Response metadata
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "version": "API version",
    "pagination": { // For list endpoints
      "limit": 20,
      "offset": 0,
      "total": 150,
      "count": 20,
      "hasMore": true
    }
  }
}
```

**Response Body Structure - Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "not-an-email",
        "rule": "format.email"
      }
    ],
    "context": {
      "requestId": "uuid",
      "timestamp": "ISO-8601",
      "version": "API version"
    }
  }
}
```

## Status Codes
**Success Codes**:
- `200 OK`: Standard successful response
- `201 Created`: Resource created successfully (POST)
- `202 Accepted`: Request accepted for processing (async)
- `204 No Content`: Successful deletion or update with no return body

**Client Error Codes**:
- `400 Bad Request`: Malformed request, validation failure
- `401 Unauthorized`: Missing or invalid authentication
- `402 Payment Required`: Subscription required or payment issue
- `403 Forbidden`: Authenticated but insufficient permissions
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: HTTP method not supported for resource
- `406 Not Acceptable`: Requested format not available
- `408 Request Timeout`: Request timed out
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `410 Gone`: Resource permanently removed
- `411 Length Required`: Missing Content-Length
- `412 Precondition Failed`: Conditional request failed
- `413 Payload Too Large`: Request body too large
- `414 URI Too Long`: URL too long
- `415 Unsupported Media Type`: Invalid Content-Type
- `422 Unprocessable Entity`: Semantic errors (validation)
- `429 Too Many Requests`: Rate limit exceeded
- `431 Request Header Fields Too Large`: Headers too large
- `451 Unavailable For Legal Reasons**: Legal restriction

**Server Error Codes**:
- `500 Internal Server Error`: Unexpected server error
- `501 Not Implemented`: Feature not implemented
- `502 Bad Gateway`: Invalid response from upstream
- `503 Service Unavailable`: Server temporarily unavailable
- `504 Gateway Timeout`: Upstream server timeout
- `505 HTTP Version Not Supported`: Unsupported HTTP version
- `507 Insufficient Storage`: Server out of storage
- `508 Loop Detected`: Loop detected in processing
- `510 Not Extended`: Further extensions required
- `511 Network Authentication Required`: Network auth needed

## Headers
**Standard Request Headers**:
- `Authorization`: Bearer `<jwt>` or `Bearer <refresh-token>`
- `Content-Type`: `application/json` (for POST/PUT/PATCH)
- `Accept`: `application/json` (usually)
- `Accept-Language`: For localization (future)
- `User-Agent`: Client identification
- `X-Request-ID`: Unique request ID for tracing
- `X-Forwarded-For`: Original client IP (from proxy)
- `X-Forwarded-Proto`: Original protocol (http/https)
- `Idempotency-Key`: For idempotent requests (POST/PUT/PATCH)

**Standard Response Headers**:
- `Content-Type`: `application/json` (usually)
- `Content-Length`: Response body length
- `X-Request-ID`: Same as request ID for tracing
- `X-Rate-Limit-Limit`: Rate limit quota
- `X-Rate-Limit-Remaining`: Remaining requests in window
- `X-Rate-Limit-Reset`: Time when limit resets (epoch seconds)
- `Retry-After`: Seconds to wait before retrying (for 429/503)
- `Cache-Control`: Caching directives
- `ETag`: Entity tag for caching
- `Last-Modified`: Timestamp of last modification
- `Expires`: Expiration time for caching
- `Link`: For pagination and related resources (RFC 5988)
- `Strict-Transport-Security`: HSTS header
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY or SAMEORIGIN
- `X-XSS-Protection`: 1; mode=block
- `Content-Security-Policy`: CSP policy

## Query Parameters
**Filtering**:
- Use resource-appropriate field names
- Support common operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`
- Examples:
  - `GET /users?status=active`
  - `GET /users?createdAt[gte]=2023-01-01`
  - `GET /tenants?planId[in]=plan1,plan2,plan3`
  - `GET /users?email[contains]=@example.com`
  - `GET /roles?name[startswith]=Admin`

**Sorting**:
- Parameter: `sort`
- Format: `fieldName` (asc) or `-fieldName` (desc)
- Multiple fields: `sort=-createdAt,name`
- Examples:
  - `GET /users?sort=-createdAt`
  - `GET /tenants?sort=name,-createdAt`
  - `GET /reports?sort=-generatedAt,title`

**Pagination**:
**Strategy 1: Limit/Offset** (simple, consistent)
- Parameters: `limit`, `offset`
- Default limit: 20
- Max limit: 100 (configurable per endpoint)
- Examples:
  - `GET /users?limit=10&offset=0`
  - `GET /tenants?limit=50&offset=100`

**Strategy 2: Cursor-based** (for large datasets, real-time feeds)
- Parameters: `cursor`, `limit`
- Cursor: Encoded pointer to position in dataset
- More efficient for large offsets
- Examples:
  - `GET /events?cursor=abc123&limit=50`
  - `GET /notifications?cursor=def456&limit=20`

**Search**:
- Parameter: `q` or `search`
- Full-text search across relevant fields
- Examples:
  - `GET /users?q=john+smith`
  - `GET /tenants?search=acme+corporation`
  - `GET /reports?q=monthly+sales`

**Field Selection**:
- Parameter: `fields` or `select`
- Comma-separated list of fields to return
- Reduces payload size for mobile/low-bandwidth
- Examples:
  - `GET /users?fields=id,firstName,lastName,email`
  - `GET /tenants?select=id,name,status,planId`

**Expansion**:
- Parameter: `expand` or `include`
- Comma-separated list of related resources to embed
- Reduces number of requests for related data
- Examples:
  - `GET /users/{id}?expand=role,tenant`
  - `GET /tenants/{id}?expand=settings,plan,subscription`
  - `GET /reports/{id}?expand=generatedBy,sharedWith`

## Idempotency
**Idempotency-Key Header**:
- For POST, PUT, PATCH requests that should be idempotent
- Client-generated unique identifier (UUID recommended)
- Server stores key+response for 24 hours
- Repeated requests with same key return same response
- Especially important for payment processing, invitation sending

**Usage**:
```
POST /api/v1/payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

// If network error occurs, retry with same key
POST /api/v1/payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
// Returns same response as first call
```

## Rate Limiting
**Strategy**:
- **Per-User/IP**: Limits based on authenticated user or IP address
- **Per-Endpoint**: Different limits for different endpoints
- **Tiered Limits**: Different limits based on user plan/role
- **Burble Capacity**: Allow short bursts above limit
- **Graduated Response**: Warning headers before hard limit

**Headers**:
```
X-Rate-Limit-Limit: 100
X-Rate-Limit-Remaining: 57
X-Rate-Limit-Reset: 1640995200
Retry-After: 30
```

**Default Limits** (configurable per tenant/plan):
- Auth endpoints: 10 requests/minute
- General API: 100 requests/minute
- Heavy operations (exports, reports): 10 requests/minute
- Webhook endpoints: 1000 requests/minute
- File uploads: 10 requests/minute

## PATCH Implementation
**Preferred Format: JSON Patch (RFC 6902)**:
```json
[
  { "op": "replace", "path": "/email", "value": "new@example.com" },
  { "op": "add",    "path": "/tags/-",   "value": "premium" },
  { "op": "remove", "path": "/oldField" }
]
```

**Alternative Format: Merge Patch (RFC 7386)**:
```json
{
  "email": "new@example.com",
  "tags": ["premium", "beta"],
  "removedField": null
}
```
**Note**: null means delete the field

**Consistency**: Choose one format per API and document it clearly

## Webhooks
**Delivery Mechanism**:
- HTTP POST to registered URL
- JSON payload with event data
- Signature verification for security
- Retry mechanism with exponential backoff
- Configurable event types per subscription

**Event Structure**:
```json
{
  "id": "webhook-uuid",
  "timestamp": "ISO-8601",
  "event": "user.created",
  "tenantId": "tenant-uuid",
  "data": {
    // Resource-specific data
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "createdAt": "ISO-8601"
    }
  }
}
```

**Security**:
- Signature header: `X-Dexo-Signature: t=timestamp,v1=hexsignature`
- Verify using shared secret
- Timestamp prevents replay attacks
- HTTPS required for webhook URLs
- IP whitelisting option for high-security tenants

**Retry Policy**:
- Attempt 1: Immediate
- Attempt 2: 10 seconds
- Attempt 3: 30 seconds
- Attempt 4: 2 minutes
- Attempt 5: 10 minutes
- Attempt 6: 30 minutes
- After 6 failures: Disable webhook, notify admin
- Maximum retention: 24 hours

## File Uploads/Downloads
**Upload Process**:
1. **Single File** (small):
   ```
   POST /api/v1/files/upload
   Content-Type: multipart/form-data
   ```
   - Field: `file` (the file)
   - Optional fields: metadata (JSON string)
   - Returns: File metadata with S3 key

2. **Multipart Form** (with metadata):
   ```
   POST /api/v1/files
   Content-Type: multipart/form-data
   ```
   - Field: `file`
   - Field: `metadata` (JSON string)
   - Other form fields as needed

**Download**:
```
GET /api/v1/files/{fileId}/download
```
- Streams file from S3
- Sets appropriate Content-Type
- Sets Content-Disposition: attachment; filename="original-name.pdf"
- Includes ETag and Last-Modified for caching
- Supports range requests for resuming downloads

**Chunked Upload** (large files):
1. Initiate upload session
2. Upload chunks with content ranges
3. Complete upload session
- Similar to AWS S3 multipart upload
- Allows pause/resume
- Better reliability for large files

## Bulk Operations
**Bulk Create**:
```
POST /api/v1/users/bulk
Content-Type: application/json

{
  "items": [
    { "email": "user1@example.com", "firstName": "John", "lastName": "Doe" },
    { "email": "user2@example.com", "firstName": "Jane", "lastName": "Smith" }
  ]
}
```

**Bulk Update**:
```
PATCH /api/v1/users/bulk
Content-Type: application/json

{
  "filters": { "status": "inactive" },
  "updates": { "status": "active" }
}
```

**Bulk Delete**:
```
DELETE /api/v1/users/bulk
Content-Type: application/json

{
  "filters": { "status": "cancelled", "lastLoginBefore": "2022-01-01" }
}
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "processed": 150,
    "successful": 145,
    "failed": 5,
    "errors": [
      {
        "index": 2,
        "id": "user-uuid-2",
        "message": "Validation failed: email already exists"
      }
    ]
  }
}
```

## Health Checks and Metadata
**Liveness Probe**:
```
GET /api/v1/health/live
```
- Returns 200 if service is running
- Does not check dependencies
- Used by orchestration systems (Kubernetes)

**Readiness Probe**:
```
GET /api/v1/health/ready
```
- Returns 200 if service is ready to traffic
- Checks database, cache, dependencies
- Used by orchestration systems

**Health Detail**:
```
GET /api/v1/health
```
- Comprehensive health status
- Component-wise status (db, cache, external services)
- Response times, queue depths, etc.
- Used for monitoring dashboards

**API Metadata**:
```
GET /api/v1/meta
```
- API version
- Supported versions
- Service name and description
- Documentation links
- Rate limit info
- Feature flags

**OpenAPI/Swagger**:
```
GET /api/v1/docs
GET /api/v1/openapi.json
```
- Interactive API documentation
- Machine-readable API specification
- Generated from code annotations

## Error Handling Philosophy
**Fail Fast**: Detect and report errors early
**Be Specific**: Provide actionable error messages
**Don't Leak Information**: Avoid exposing internal details in errors
**Consistent Structure**: Uniform error format across all endpoints
**Include Context**: Request ID, timestamp for correlation
**Suggest Recovery**: When possible, suggest how to fix the error

**Error Categories**:
1. **Client Errors** (4xx): Bad request, auth issues, validation
2. **Server Errors** (5xx): Internal failures, service unavailable
3. **Business Logic Errors**: Domain-specific violations (use 400/422)
4. **Rate Limit Errors**: 429 with retry guidance
5. **Timeout Errors**: 408/504 with suggestion to retry

**Error Codes**: Application-specific error codes in addition to HTTP status
- Format: `DOMAIN_ERROR_TYPE` (e.g., `VALIDATION_ERROR`, `USER_NOT_FOUND`)
- Stable across versions (unlike messages which may change for localization)
- Enable programmatic error handling by clients
- Documented in API reference

## Security Considerations
**Authentication**:
- Require Authorization header for all non-public endpoints
- Validate JWT signature and expiration
- Check tenant status and user status
- Implement brute force protection
- Use secure, HTTP-only cookies for refresh tokens

**Authorization**:
- Check permissions on every endpoint
- Implement resource ownership verification
- Use principle of least privilege
- Audit all access decisions

**Input Validation**:
- Validate all inputs (query params, body, headers)
- Use allowlists, not blocklists
- Validate types, ranges, formats, lengths
- Sanitize where appropriate (HTML, SQL, etc.)
- Validate file types and sizes for uploads

**Output Encoding**:
- Context-appropriate encoding (HTML, JSON, etc.)
- Prevent XSS, injection attacks
- Use trusted sanitization libraries

**Information Disclosure**:
- Don't expose stack traces in production
- Don't reveal internal IDs or paths unnecessarily
- Generic error messages for authentication failures
- Timing attack防范 (constant-time comparisons where relevant)

**Transport Security**:
- Enforce HTTPS everywhere
- HSTS header with appropriate max-age
- Forward secrecy in TLS configuration
- Disable weak cipher suites and protocols
- Certificates from trusted CAs with proper renewal

**Dependency Security**:
- Regular dependency scanning
- Prompt vulnerability patching
- Software Bill of Materials (SBOM) generation
- Container image scanning

## Developer Experience
**Consistency**:
- Same patterns across all endpoints
- Predictable naming and structure
- Consistent error formats
- Uniform date/time formats (ISO-8601)
- Standard UUID format (lowercase, hyphenated)

**Documentation**:
- Auto-generated from code annotations
- Interactive examples (Try it out)
- Clear descriptions and examples
- SDK generation support
- Versioned documentation
- Change logs and migration guides

**SDKs**:
- Official SDKs for popular languages (JS/TS, Python, Java, Go)
- Generated from OpenAPI specs
- Thin wrappers around HTTP calls
- Handle authentication, retries, pagination
- Type-safe where language supports
- Published to package registries (npm, PyPI, Maven, etc.)

**Testing Support**:
- Test doubles/mock servers
- Sandbox environments
- Test credentials and data
- Webhook testing tools
- Performance benchmark endpoints
- Load testing guidelines

**Monitoring & Observability**:
- Distributed tracing (OpenTelemetry)
- Structured logging (JSON)
- Metrics endpoints (Prometheus format)
- Health check endpoints
- API usage analytics
- Performance dashboards
- Alerting on error rates, latency

## Evolution and Maintenance
**Backward Compatibility**:
- Avoid breaking changes in minor versions
- Deprecate before removing
- Provide migration guides
- Support multiple versions simultaneously when needed
- Use feature flags for gradual rollouts

**API Governance**:
- API review board for major changes
- Style guide enforcement via linters
- Contract testing between consumers and providers
- Version compatibility matrix
- Deprecation tracking and reporting

**Documentation Driven Development**:
- Write API spec before implementation
- Use spec as contract between teams
- Generate stubs and tests from spec
- Keep spec and implementation in sync
- Treat spec as source of truth

**Deprecation Process**:
1. Mark endpoint/field as deprecated in docs
2. Add deprecation warning to responses
3. Log deprecated usage for monitoring
4. Notify affected customers via email/portal
5. Wait minimum deprecation period
6. Remove implementation
7. Update documentation

## Internationalization (Future)
**Headers**:
- `Accept-Language`: For response localization
- `Content-Language`: To indicate response language

**URLs** (Optional):
- `/api/v1/en/users` or `/api/v1/users?lang=en`
- Prefer header-based approach for cleaner URLs

**Error Messages**:
- Localized based on Accept-Language
- Error codes remain language-independent
- Provide fallback to English
- Support pluralization and formatting

**Formatting**:
- Dates/times: Respect locale preferences
- Numbers: Local decimal/thousands separators
- Currencies: Local currency symbols and formats
- Names: Respect name ordering conventions

## Real-time and Streaming APIs
**Server-Sent Events (SSE)**:
```
GET /api/v1/events/stream
Accept: text/event-stream
```
- For real-time updates to clients
- Automatic reconnect handling
- Heartbeat comments to prevent timeouts
- Last-Event-ID for resume capability

**WebSocket** (for bidirectional):
```
WS /api/v1/ws/events
```
- For chat, collaboration, real-time editing
- Room/tenant-based scoping
- Heartbeat/ping-pong for connection health
- Reconnection strategies with backoff

**Streaming Responses**:
- For large data exports
- Chunked transfer encoding
- Progressive rendering possible
- Cancellable on client disconnect

## API Examples
**Standard CRUD Endpoint**:
```
GET    /api/v1/tenants
POST   /api/v1/tenants
GET    /api/v1/tenants/{id}
PUT    /api/v1/tenants/{id}
PATCH  /api/v1/tenants/{id}
DELETE /api/v1/tenants/{id}
```

**Nested Resource**:
```
GET    /api/v1/tenants/{tenantId}/users
POST   /api/v1/tenants/{tenantId}/users
GET    /api/v1/tenants/{tenantId}/users/{userId}
PUT    /api/v1/tenants/{tenantId}/users/{userId}
PATCH  /api/v1/tenants/{tenantId}/users/{userId}
DELETE /api/v1/tenants/{tenantId}/users/{userId}
```

**Action Endpoint**:
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/notifications/send-test
POST   /api/v1/reports/generate-monthly
POST   /api/v1/exports/create-csv
POST   /api/v1/webhooks/test-delivery
```

**Bulk Endpoint**:
```
POST   /api/v1/users/bulk-create
PATCH  /api/v1/users/bulk-update
DELETE /api/v1/users/bulk-delete
```

**Search/Filter**:
```
GET    /api/v1/users?status=active&role[in]=admin,manager&createdAt[gte]=2023-01-01&q=john&sort=-createdAt&limit=20&offset=0
```

**Health Check**:
```
GET    /api/v1/health/live
GET    /api/v1/health/ready
GET    /api/v1/health
```

**Metadata**:
```
GET    /api/v1/meta
GET    /api/v1/docs
GET    /api/v1/openapi.json
```