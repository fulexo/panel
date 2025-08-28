# ADR-002: JWT Algorithms and Key Management

## Status
Accepted

## Context
- We require short-lived access tokens and longer-lived refresh tokens.
- Symmetric (HS256) is simple but centralizes risk; asymmetric (RS256) enables public verification.

## Decision
- Development/Staging: HS256 with environment `JWT_SECRET`.
- Production: RS256 with private key stored as a secret; JWKS (public keys) exposed via `/auth/.well-known/jwks.json` for verification and rotation.
- Key rotation every 90 days using dual-key grace period.

## Consequences
- Slightly more complex operational setup for RS256.
- Safer blast radius and easier key rotation.

## Implementation Notes
- Access token ttl: 15m, Refresh token ttl: 7d.
- Dual-key rotation window: 24h; accept both old and new keys.
- Store current `kid` in token header; JWKS includes both keys during rotation.