# API Authentication (Laravel Passport)

## Overview

- **Web (Inertia)**: Laravel Fortify — session-based login at `/login`
- **Mobile / API**: Laravel Passport — Bearer token authentication

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Email + password → Bearer token |
| POST | `/api/auth/logout` | Bearer | Revoke current token |
| GET | `/api/auth/me` | Bearer | Current user + role |
| GET | `/api/user` | Bearer | Current user (Passport default) |

### Login request

```json
POST /api/auth/login
{
  "email": "intern@example.com",
  "password": "password"
}
```

### Login response

```json
{
  "token_type": "Bearer",
  "access_token": "...",
  "expires_at": "2026-06-12T00:00:00+00:00",
  "user": { "id": 1, "name": "...", "email": "...", "role": { ... } }
}
```

### Authenticated requests

```
Authorization: Bearer {access_token}
```

## OAuth2 token endpoint (optional)

Password grant is enabled. Use the public password client created by `passport:client --password --public`.

```
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "password",
  "client_id": "{client_id}",
  "username": "email@example.com",
  "password": "password",
  "scope": ""
}
```

## Token lifetimes

- Access tokens: 15 days
- Refresh tokens: 30 days
- Personal access tokens: 6 months

## Setup commands

```bash
cd web
php artisan migrate
php artisan passport:keys
php artisan passport:client --personal --name="Intern Mobile" --provider=users
```
