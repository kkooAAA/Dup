# Authentication Flow

Facebook OAuth login with JWT session management.

## Login Flow

1. **Frontend** — Facebook SDK (`FacebookSDK.tsx`) opens FB login dialog, receives short-lived access token (~1-2 hours)
2. **Backend** `POST /api/auth/facebook` — receives the short-lived token:
   a. Verifies token with `graph.facebook.com/me` (fetches id, name, email)
   b. Exchanges for long-lived token (~60 days) via `graph.facebook.com/oauth/access_token`
   c. Find-or-create User in database, stores the long-lived token
   d. Signs a JWT (`expiresIn: 60d`) containing `{ userId }`
3. **Frontend** — stores JWT in memory, attaches via Axios interceptor (`Authorization: Bearer <jwt>`)

## Auth Middleware

`auth.middleware.ts` runs on all protected routes:
1. Extracts JWT from `Authorization` header
2. Verifies and decodes to get `userId`
3. Loads User from DB, attaches `userId` and `userAccessToken` (the long-lived FB token) to the request
4. Returns `401` with `code: TOKEN_EXPIRED` if user or token is missing

## Token Lifecycle

| Token | Lifetime | Storage |
|-------|----------|---------|
| FB short-lived | ~1-2 hours | Transient (login only) |
| FB long-lived | ~60 days | `User.accessToken` in DB |
| JWT | 60 days | Frontend memory |

## Environment Variables

- `FB_APP_ID` — Facebook App ID (needed for token exchange)
- `FB_APP_SECRET` — Facebook App Secret (needed for token exchange)
- `JWT_SECRET` — Secret for signing JWTs (defaults to `'supersecret'`)

## Related Pages

- [[controllers]] — auth controller handles login
- [[routes]] — `POST /api/auth/facebook`
- [[facebook-service]] — uses the stored long-lived token for API calls
