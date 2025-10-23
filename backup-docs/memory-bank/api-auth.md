# API Authentication

Global API prefix: `/api`.

## Endpoints
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET  /api/auth/sessions`
- `POST /api/auth/sessions/revoke`
- `POST /api/auth/sessions/revoke-all`
- `POST /api/auth/2fa/enable`
- `POST /api/auth/2fa/verify`
- `POST /api/auth/2fa/disable`
- `POST /api/auth/2fa/login`
- `POST /api/auth/set-tokens`
- `POST /api/auth/clear-tokens`

## Login flow
1) `POST /api/auth/login` with `{ email, password }`
   - If 2FA enabled: returns `{ requiresTwoFactor: true, tempToken }`
   - Else: sets httpOnly cookies (`access_token`, `refresh_token`) and returns user
2) If required, `POST /api/auth/2fa/login` with `{ tempToken, twoFactorToken }`

Cookies use `secure` only in production and `sameSite=strict`.

## Seed users (development)
- Admin: `admin@fulexo.com` / `demo123`
- Customer (optional): `customer@fulexo.com` / `demo123`

## Examples
PowerShell:
```powershell
(Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@fulexo.com","password":"demo123"}' -UseBasicParsing).Content
```

curl:
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fulexo.com","password":"demo123"}'
```

## Notes
- Re-check global prefix `/api` if you see `Cannot POST /auth/login` in logs
- Rate limits apply on auth routes (Nginx dev config limits auth more strictly)


