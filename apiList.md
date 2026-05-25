# Errand Hubb - API List

## Base URL
`http://localhost:3001/api/v1`

## Authentication (`/auth`)
- `POST /auth/register/client`: Register a new client.
  - Body: `RegisterClientDto`
- `POST /auth/register/errand`: Register a new errand service provider.
  - Body: `RegisterErrandDto`
- `POST /auth/login`: Login and receive an HTTP-only cookie.
  - Body: `LoginDto`
- `POST /auth/logout`: Clear the authentication cookie.

## Global Response Format
### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-05-25T...",
  "path": "/api/v1/...",
  "message": "Error message or 'Validation failed'",
  "errors": ["list", "of", "validation", "errors"]
}
```
