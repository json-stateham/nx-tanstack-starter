# Auth Module

JWT-based authentication for the NestJS backend. RS256-signed access/refresh tokens delivered as
httpOnly cookies, email OTP verification, invite-based onboarding, and role-based authorization.

## Files

```
auth/
├── auth.module.ts                    # Wires JwtModule (RS256), Passport, providers
├── auth.controller.ts                # HTTP endpoints, cookie handling
├── auth.service.ts                   # All business logic
├── types.ts                          # JwtPayload, JwtUser
├── strategies/
│   └── jwt.strategy.ts               # Passport strategy — reads access_token cookie, verifies RS256
├── guards/
│   ├── jwt-auth.guard.ts             # Wraps the 'jwt' Passport strategy
│   ├── roles.guard.ts                # Reads @Roles() metadata, deny-by-default
│   └── roles.guard.spec.ts
├── decorators/
│   ├── current-user.decorator.ts     # @CurrentUser() → JwtUser from request
│   └── roles.decorator.ts            # @Roles(...roles) → sets ROLES_KEY metadata
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   ├── verify-email.dto.ts
│   ├── accept-invite.dto.ts
│   └── resend-verification.dto.ts
└── auth.service.spec.ts
```

## Token model

Two JWTs, both **RS256** (asymmetric — private key signs, public key verifies), both delivered as
**httpOnly cookies** (never exposed to JS, never returned in a JSON body):

| Token | Cookie | TTL | Path | Purpose |
|---|---|---|---|---|
| `access_token` | `access_token` | 15m | `/` | Sent on every request, verified by `JwtStrategy` |
| `refresh_token` | `refresh_token` | 7d (configurable) | `/api/v1/auth/refresh` only | Only usable against the refresh endpoint |

Cookie flags: `httpOnly`, `sameSite: 'lax'`, `secure` unless `NODE_ENV=development`.

`JwtPayload` (`types.ts`) carries `sub` (user id), `email`, `role`, and a `type: 'access' | 'refresh'`
discriminator baked into the signed payload itself — belt-and-suspenders against a refresh token
being replayed where an access token is expected (or vice versa).

Refresh tokens are also **persisted server-side**: `auth.service.ts` stores an HMAC-SHA256 hash of
the refresh token (`RefreshToken.tokenHash`) in the DB, never the raw token. This is what makes
revocation and rotation possible — a JWT is normally stateless/unrevokable, but keying a DB row off
its hash gives you a server-side kill switch.

## Request flows

**Register** (`POST /auth/register`)
Lowercases email → checks `AuthProvider` for an existing `EMAIL` identifier (409 if taken) → creates
`User` (status `PENDING_VERIFICATION`) + `AuthProvider` (bcrypt-hashed password) + a 6-digit OTP
(`EMAIL_VERIFICATION`, TTL from `OTP_TTL_MINUTES`) → emails the code. No tokens issued yet.

**Verify email** (`POST /auth/verify-email`)
Looks up the user, requires status `PENDING_VERIFICATION`, matches an unused/unexpired OTP →
transactionally marks the OTP used and flips the user to `ACTIVE` → issues + cookies the token pair.

**Accept invite** (`POST /auth/accept-invite`)
For pre-provisioned users (e.g. staff invited by an admin). Token is HMAC-hashed and matched against
an `OtpCode` of type `USER_INVITE`. On success: marks the invite used, creates the `AuthProvider`
(this is where the password is first set), activates the user, issues tokens. See
`createInviteToken()` for the inverse — generates a 256-bit random token, stores only its HMAC hash,
emails the raw token.

**Login** (`POST /auth/login`)
Finds the `AuthProvider` by email, bcrypt-compares the password, requires user status `ACTIVE` →
updates `lastLoginAt` → issues tokens. See **Timing-safety** below for why the compare always runs.

**Refresh** (`POST /auth/refresh`)
Reads `refresh_token` cookie → verifies RS256 signature → hashes the raw token and looks it up in
`RefreshToken` → checks not revoked / not expired / user still `ACTIVE` → **rotates**: revokes the
old DB row, issues a brand-new access+refresh pair. See **Token theft detection** below.

**Logout** (`POST /auth/logout`, requires `JwtAuthGuard`)
Hashes the refresh cookie, revokes the matching `RefreshToken` row, clears both cookies.

**Me** (`GET /auth/me`, requires `JwtAuthGuard`)
Returns the `JwtUser` (`id`, `email`, `role`) that `JwtStrategy.validate()` attached to the request.

**Resend verification** (`POST /auth/resend-verification`)
Invalidates any outstanding `EMAIL_VERIFICATION` OTPs for the user, issues a fresh one. Always
returns `{ ok: true }` regardless of whether the email exists (enumeration protection).

## Security details worth knowing

- **Login timing-safety**: `login()` always runs a bcrypt `compare()`, even when no `AuthProvider`
  exists for the email — against a `dummyHash` computed at construction time, at the *same*
  `BCRYPT_ROUNDS` cost as real hashes. Without this, a missing-email response returns faster than a
  wrong-password response, letting an attacker enumerate registered emails by timing alone.
- **Enumeration protection elsewhere**: `verifyEmail`, `acceptInvite`, and `resendVerification` all
  return identical errors (or identical success) for "user not found," "wrong code," and "user in
  the wrong state" — an attacker can't distinguish "no such account" from "account exists but code
  was wrong."
- **Stale-token reactivation guard**: `verifyEmail` and `acceptInvite` both require the user to
  currently be `PENDING_VERIFICATION`. Without that check, a leaked-but-unused OTP/invite could
  reactivate an account that was suspended or banned *after* the code was issued.
- **Token theft detection on refresh**: if a refresh token isn't found, or is already revoked, or is
  expired, `refreshToken()` doesn't just reject it — it revokes **every** active refresh token for
  that user (`payload.sub`). Rationale: a revoked-but-presented token means either token rotation
  raced (benign) or an attacker replayed a stolen token after the legitimate rotation already
  happened (not benign) — the service can't tell which, so it invalidates the whole session set as
  the safe default.
- **Refresh token rotation**: every refresh call revokes the presented token and issues a new pair —
  refresh tokens are single-use. This bounds the damage window if one leaks.
- **Secrets are never stored raw**: refresh tokens and invite tokens are stored in the DB as
  `HMAC-SHA256(value, HMAC_SECRET)`. A DB dump alone doesn't yield usable tokens.
- **Password bounds**: `class-validator` caps passwords at 72 chars (bcrypt's own input limit) and
  requires 8+ on register/accept-invite.

## Authorization (guards & decorators)

- `JwtAuthGuard` — thin wrapper over Passport's `AuthGuard('jwt')`; triggers `JwtStrategy.validate()`.
- `JwtStrategy` — extracts the JWT from the `access_token` cookie (`cookieExtractor`, not the
  `Authorization` header), verifies against `JWT_PUBLIC_KEY` with `algorithms: ['RS256']` explicitly
  pinned (prevents an `alg: none`/HS256-confusion downgrade attack), and maps the payload to a
  minimal `JwtUser`.
- `RolesGuard` — reads `@Roles(...)` metadata via `Reflector`. **Deny by default**: a route with no
  `@Roles()` decorator returns `false`, not "no restriction." Must be combined with `JwtAuthGuard`
  (relies on `request.user` already being populated) and logs every denial with user id/role/path.
- `@Roles(...roles: UserRole[])` — sets `ROLES_KEY` metadata for `RolesGuard` to read.
- `@CurrentUser()` — param decorator, pulls `JwtUser` off `request.user`.

Typical protected route:
```ts
@Get('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
adminOnly(@CurrentUser() user: JwtUser) { ... }
```

## Configuration

Required env vars (`config/app.config.ts`, throws on boot if missing):

| Var | Default | Used for |
|---|---|---|
| `JWT_PRIVATE_KEY` | — required | Signing access/refresh JWTs (RS256) |
| `JWT_PUBLIC_KEY` | — required | Verifying JWTs |
| `HMAC_SECRET` | — required | Hashing refresh tokens & invite tokens before DB storage |
| `BCRYPT_ROUNDS` | 10 | Password hashing cost |
| `REFRESH_TOKEN_TTL_DAYS` | 7 | Refresh token DB expiry (JWT itself is signed `expiresIn: '7d'`, fixed) |
| `OTP_TTL_MINUTES` | 15 | Email verification code expiry |
| `INVITE_TTL_HOURS` | 48 | Invite token expiry |

Note: `generateTokens()` hardcodes `expiresIn: '15m'` / `'7d'` on the JWTs themselves —
`REFRESH_TOKEN_TTL_DAYS` only governs the DB-side `RefreshToken.expiresAt`, so changing that env var
without also changing the hardcoded `'7d'` would desync the two.

## Rate limiting

All mutating endpoints are throttled via `@Throttle()` (per-IP, NestJS `@nestjs/throttler`):
register 10/min, resend-verification 3/min, verify-email/login/accept-invite 5/min. `refresh` and
`logout` are unthrottled (gated by the cookie/guard instead).
