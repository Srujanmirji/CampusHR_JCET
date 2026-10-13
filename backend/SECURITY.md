# Backend Security

## Authentication
- Password hashing with Argon2 or bcrypt
- Short-lived access tokens
- Refresh token rotation
- Logout token revocation strategy

## Authorization
- RBAC middleware
- Resource ownership checks
- Department-scope checks

## API Security
- Rate limiting
- CORS policy
- Helmet
- Payload size limits
- Input validation
- SQL injection protection via ORM
- Secure file upload validation

## Sensitive Data
Protect:
- Aadhaar
- PAN
- Bank details
- Salary

## Audit
Mandatory audit logs for:
- Permission changes
- Salary changes
- Employee changes
- Approvals
