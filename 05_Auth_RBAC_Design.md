# Auth & RBAC Design

## Overview
Comprehensive authentication and role-based access control system designed for multi-tenant SaaS with defense-in-depth security, flexible permission modeling, and enterprise-grade features.

## Authentication Architecture

### Core Authentication Strategy
**Primary Method**: JWT (JSON Web Tokens) with Refresh Tokens
**Why JWT**:
- Stateless authentication enables horizontal scaling
- No server-side session storage required
- Tokens contain user/tenant/context information
- Industry standard with broad library support
- Easy to revoke via token blacklisting when needed

### Token Structure
#### Access Token (Short-lived: 15 minutes)
```json
{
  "sub": "user-uuid",           // Subject (user ID)
  "tenant": "tenant-uuid",      // Tenant context
  "roles": ["role1", "role2"],  // User roles in tenant
  "permissions": ["p1", "p2"],  // Effective permissions (optimization)
  "iat": 1234567890,            // Issued at
  "exp": 1234567950,            // Expires at
  "jti": "unique-token-id",     // JWT ID for blacklisting
  "typ": "access"
}
```

#### Refresh Token (Long-lived: 30 days)
- Opaque random string stored in HTTP-only cookie
- Mapped to user/tenant in Redis with expiration
- Used to obtain new access tokens
- Rotated on use for theft detection
- Invalidated on password change, logout, or security events

### Authentication Endpoints
```
POST /api/v1/auth/register     // User registration
POST /api/v1/auth/login        // Username/password login
POST /api/v1/auth/refresh      // Token refresh
POST /api/v1/auth/logout       // Logout (blacklist tokens)
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
POST /api/v1/auth/mfa/setup
POST /api/v1/auth/mfa/verify
POST /api/v1/auth/mfa/disable
POST /api/v1/auth/social/:provider   // OAuth2 social login
GET  /api/v1/auth/social/:provider/callback
```

### Multi-Factor Authentication (MFA)
**Supported Methods**:
- TOTP (Google Authenticator, Authy, etc.)
- SMS-based OTP (Twilio/Nexmo)
- Email-based OTP
- Backup/recovery codes
- Future: WebAuthn/FIDO2, Hardware tokens

**MFA Flow**:
1. User enables MFA in account settings
2. System generates secret and QR code
3. User scans QR code with authenticator app
4. User enters code to verify setup
5. System provides backup codes
6. On login, after password verification, MFA challenge
7. User responds with code from device or backup code

### Social Login (OAuth2/OIDC)
**Supported Providers** (MVP):
- Google
- GitHub
- Microsoft Azure AD

**Future Providers**:
- Facebook
- LinkedIn
- SAML (for enterprise SSO)
- Apple
- Custom OIDC providers

**Flow**:
1. User clicks "Sign in with [Provider]"
2. Redirected to provider for authentication
3. Provider redirects back with authorization code
4. System exchanges code for user info
5. System finds or creates user account
6. System creates session and redirects to app

### Password Security
- **Hashing**: bcrypt with cost factor 12
- **Password Policy** (configurable per tenant):
  - Minimum length: 8 characters
  - Require uppercase, lowercase, number, special character
  - Maximum age: 90 days (configurable)
  - Password history: Remember last 5 passwords
  - Prevent common passwords (via haveibeenpwned API or local list)
- **Rate Limiting**: 
  - Login attempts: 5 per username per 15 minutes
  - Forgot password: 3 per email per hour
  - Account lockout: 15 minutes after 5 failed attempts
  - CAPTCHA after 3 failed login attempts

### Session Management
- **Access Tokens**: Short-lived (15m), stored in memory
- **Refresh Tokens**: Long-lived (30d), HTTP-only, Secure cookies
- **Token Blacklist**: Redis-based for logout/password change
- **Concurrent Sessions**: Configurable limit per user (default: 5)
- **Session Invalidated on**:
  - Password change
  - MFA enable/disable
  - Account lock/unlock
  - Role/permission changes (optional, configurable)
  - Admin-initiated session termination
  - Refresh token rotation/security events

### Tenant Context Resolution
**Middleware Order**:
1. Extract JWT from Authorization header
2. Decode and validate JWT signature
3. Extract tenant_id from token payload
4. Validate tenant exists and is active
5. Set tenant context in request (req.tenant)
6. Validate user exists and belongs to tenant
7. Load user roles and permissions
8. Attach user and permission info to request

**Fallback for Subdomain/Domain**:
- If no JWT (e.g., public endpoints), check Host header
- Extract subdomain or custom domain
- Look up tenant by subdomain/domain
- Set tenant context for public endpoints (like login pages)

## Authorization Architecture (RBAC)

### Role-Based Access Control Model
**Hierarchy**: Tenant → Roles → Permissions → Resources
**Key Principles**:
- Least Privilege: Users get minimum permissions needed
- Separation of Duties: Critical actions require multiple roles
- Role Hierarchy: Senior roles inherit permissions from junior roles
- Permission Authorization: Users perform actions via roles

### RBAC Data Model
```
Tenant
  ↓
Role (belongs to tenant)
  ↓
Permission (can be tenant-specific or system)
  ↓
User ← UserRole Junction → Role
```

### Permission Granularity
**Resource-Based Permissions**:
```
resource:action format
Examples:
- users:create
- users:read
- users:update
- users:delete
- users:impersonate
- billing:read
- billing:update
- billing:refund
- reports:generate
- reports:export
- settings:read
- settings:update
- files:upload
- files:download
- files:delete
- webhook:create
- webhook:update
- webhook:delete
- plugin:install
- plugin:update
- plugin:delete
```

**Advanced Permission Attributes** (stored in JSONB):
```json
{
  "conditions": {
    "ownResource": true,      // Can only access own resources
    "department": "sales",    // Limited to specific department
    "timeRestriction": {      // Time-based access
      "start": "09:00",
      "end": "17:00",
      "days": ["mon","tue","wed","thu","fri"]
    },
    "ipWhitelist": ["192.168.1.0/24"]
  },
  "limits": {
    "maxRecords": 1000,       // Maximum records可返回
    "exportSizeMB": 10        // Maximum export size
  }
}
```

### Role Types
1. **System Roles**: Platform-wide, not tenant-specific
   - Super Admin: Full system access
   - Support Engineer: Limited system access for troubleshooting
   - Auditor: Read-only access to audit logs

2. **Tenant Roles**: Specific to each tenant
   - Admin: Full tenant access
   - Manager: Department/subset access
   - User: Standard employee access
   - Viewer: Read-only access
   - Guest: Limited access (for contractors/clients)

3. **Dynamic Roles**: Generated based on rules
   - Department-based: Auto-assigned based on user profile
   - Location-based: Based on office/location
   - Time-based: Active only during certain hours

### Authorization Implementation

#### Middleware Layer
```typescript
// auth.middleware.ts
export const requirePermissions = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Extract user and permissions from request (set by auth middleware)
    const user = req.user;
    const userPermissions = req.permissions || [];
    
    // 2. Check if user has all required permissions
    const hasPermission = requiredPermissions.every(required =>
      userPermissions.includes(required) || 
      userPermissions.includes('*:*') // Super user wildcard
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to perform this action',
        requiredPermissions,
        userPermissions
      });
    }
    
    // 3. Check resource ownership if required
    if (req.requiresOwnership) {
      const ownsResource = await checkResourceOwnership(
        user.id, 
        req.params.resourceId, 
        req.params.resourceType
      );
      
      if (!ownsResource) {
        return res.status(403).json({
          error: 'NOT_RESOURCE_OWNER',
          message: 'You can only access your own resources'
        });
      }
    }
    
    next();
  };
};

// Usage in controllers
app.post('/users', 
  requirePermissions('users:create'), 
  userController.createUser
);

app.get('/users/:id', 
  requirePermissions('users:read'), 
  userController.getUser
);

app.put('/users/:id', 
  requirePermissions('users:update'),
  userController.updateUser  
);

app.delete('/users/:id', 
  requirePermissions('users:delete'),
  userController.deleteUser
);
```

#### Decorator Approach (NestJS)
```typescript
// roles.decorator.ts
export const Roles = (...roles: string[]) => 
  SetMetadata('roles', roles);

export const Permissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

// auth.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredPermissions) {
      return true;
    }
    
    const { user, permissions } = context.switchToHttp().getRequest();
    return requiredPermissions.every(perm => permissions?.includes(perm));
  }
}

// Usage in controllers
@Roles('Admin', 'Manager')
@Permissions('users:create', 'users:update')
@Controller('users')
export class UsersController {
  @Post()
  createUser(@Body() dto: CreateUserDto) {}

  @Get(':id')
  @Roles('Admin', 'Manager', 'User')
  @Permissions('users:read')
  getUser(@Param('id') id: string) {}
}
```

### Authorization Decision Engine
**Logic Flow**:
1. **Authentication Verified**: Valid JWT or session
2. **Tenant Context Set**: User belongs to active tenant
3. **User Roles Loaded**: From database with caching
4. **Permissions Calculated**: 
   - Base permissions from direct role assignments
   - Inherited permissions from role hierarchy
   - Conditional permissions evaluated (time, IP, etc.)
   - Deny overrides (if implemented)
5. **Policy Evaluation**: 
   - Check if user has required permission
   - Apply any resource-specific conditions
   - Check ownership requirements
   - Apply rate limits/throttling if applicable
6. **Decision**: Permit or Deny with audit logging

### Permission Caching Strategy
- **L1 Cache**: In-memory (per instance) for hot permissions (5 min TTL)
- **L2 Cache**: Redis (shared) for permission sets (30 min TTL)
- **Cache Key**: `permissions:{userId}:{tenantId}`
- **Cache Invalidation**: 
  - On role/permission assignment changes
  - On user status changes (lock/unlock)
  - On tenant plan changes (feature enable/disable)
  - Manual invalidation for security events

### Super User / Break Glass
**Emergency Access**:
- Designated super user accounts (limited number)
- Access requires additional approval workflow
- All actions logged and alerted
- Time-limited sessions (max 1 hour)
- Requires MFA and secondary authentication
- Access restricted to specific IP ranges (corporate/VPN)
- Automatic session recording for audit

### Service-to-Service Authentication
**Internal APIs**:
- Service accounts with JWT signed by internal CA
- Short-lived tokens (5 min) with specific scopes
- Mutual TLS for service-to-service communication
- API gateways validate service tokens
- Principle of least privilege applies to services

**External APIs** (for tenants):
- API keys with scoped permissions
- Rate limiting per key
- IP whitelisting capabilities
- key rotation and expiry
- Usage analytics per key

## Security Features

### Defense in Depth
1. **Transport Security**: TLS 1.3 everywhere
2. **Authentication**: JWT + Refresh Tokens + MFA
3. **Authorization**: RBAC with contextual permissions
4. **Input Validation**: Strict validation at API boundaries
5. **Output Encoding**: Context-appropriate encoding
6. **Logging & Auditing**: Comprehensive audit trail
7. **Monitoring**: Real-time anomaly detection
8. **Rate Limiting**: Per-user, per-IP, per-endpoint limits
9. **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
10. **Dependency Scanning**: Regular vulnerability scanning

### Account Security
- **Login Anomaly Detection**: 
  - New device/location
  - Unusual time of access
  - Multiple failed attempts
  - Impossible travel detection
- **Account Recovery**:
  - Verified email required for recovery
  - Recovery codes required if email unavailable
  - Waiting period for high-risk recoveries
  - Notification on all recovery attempts
- **Password Breach Monitoring**:
  - Check new passwords against breach databases
  - Periodic checking of existing passwords
  - Forced reset if password found in breach
- **Session Security**:
  - Binding to user agent + IP fingerprint
  - Automatic invalidation on significant changes
  - Concurrent session limits
  - Idle timeout (15 minutes activity, 8 hours absolute)

### Administrative Controls
- **Just-In-Time Access**: 
  - Temporary elevation of privileges
  - Approval workflow required
  - automatic revocation after time period
- **Access Reviews**: 
  - Quarterly review of role assignments
  - Automated reports for stale permissions
  - Manager approval for access continuation
- **Privileged Access Management**:
  - Separate admin accounts from user accounts
  - Admin MFA always required
  - Admin session recording
  - Admin action approval for high-risk operations

## Compliance & Standards
- **OWASP ASVS Level 2** compliance
- **NIST 800-63B** for digital identities
- **GDPR** considerations for user data
- **SOC 2** Type 2 preparation (planned)
- **ISO 27001** alignment (planned)
- **HIPAA** ready configuration (for healthcare tenants)
- **PCI DSS** scope reduction (payment processing outsourced)

## Performance & Scalability

### Authentication Performance
- **Login**: <300ms 95th percentile (includes bcrypt)
- **Token Validation**: <50ms 95th percentile
- **Permission Check**: <100ms 95th percentile (with caching)
- **Concurrent Authentications**: 1000+ with proper scaling
- **Redis Dependency**: Mitigated by local caching fallbacks

### Scaling Considerations
- **Horizontal Scaling**: Stateless auth services scale easily
- **Database Load**: 
  - Reads: User/role/permission lookups (cacheable)
  - Writes: Login events, token blacklists (buffered via queues)
- **Caching Strategy**: Multi-layer caching reduces DB load
- **Geographic Distribution**: JWT validation works globally
- **Redis Usage**: 
  - Primary: Refresh tokens, token blacklist, permission cache
  - Secondary: Rate limiting, session tracking
  - Fallback: Local memory + database for critical functions

## Implementation Roadmap

### Phase 1 (MVP)
- Core JWT + Refresh Token flow
- Basic email/password authentication
- Role-based access control (flat roles)
- Permission checking at API level
- MFA with TOTP
- Basic rate limiting
- Audit logging for auth events
- Password security basics

### Phase 2
- Social login (Google, GitHub, Microsoft)
- Advanced MFA (SMS, backup codes)
- Role hierarchy and inheritance
- Contextual permissions (time, IP, etc.)
- Just-in-time access
- Access review workflows
- Advanced anomaly detection
- API key management for external access
- Service-to-service authentication
- Session recording for admin actions
- Just-In-Time access
- Advanced password policies (breach checking, etc.)
- Federated identity (SAML, OIDC providers)
- Delegated administration
- Emergency access break-glass procedures
- Comprehensive compliance reporting