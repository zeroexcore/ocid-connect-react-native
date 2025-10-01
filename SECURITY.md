# Security Implementation

## JWT Verification Security

This document describes the secure JWT verification implementation in the OCID Connect React Native SDK.

## Overview

The SDK now implements **cryptographically secure JWT verification** using industry best practices:

1. ✅ **JWKS (JSON Web Key Set)** - Public keys are fetched from trusted OpenCampus endpoints
2. ✅ **ECDSA P-256 Signature Verification** - Full cryptographic verification using elliptic curve signatures
3. ✅ **Standard Claims Validation** - Validates exp, nbf, iat, iss, and aud claims
4. ✅ **Key Caching** - JWKS is cached for 1 hour to reduce network overhead
5. ✅ **React Native Compliant** - Uses pure JavaScript crypto libraries compatible with React Native

## Previous Implementation (Insecure)

The previous implementation only performed basic JWT claim validation without verifying the cryptographic signature:

```javascript
// ❌ INSECURE - Only checked claims, didn't verify signature
const decoded = jwtDecode(idToken);
if (decoded.exp < now) return false;
if (decoded.iss !== 'OpenCampus') return false;
```

**Security Risk**: Anyone could forge a JWT token with valid claims but an invalid signature, and the SDK would accept it.

## New Implementation (Secure)

The new implementation performs full cryptographic verification:

```javascript
// ✅ SECURE - Fetches JWKS and verifies signature cryptographically
const jwks = await fetchJWKS(jwksUrl);
const publicKey = jwkToEllipticKey(jwk);
const isValid = publicKey.verify(hash, { r, s });
```

### Security Features

1. **JWKS Fetching**
   - Fetches public keys from official OpenCampus JWKS endpoints
   - Sandbox: `https://static.opencampus.xyz/jwks/jwks-sandbox.json`
   - Live: `https://static.opencampus.xyz/jwks/jwks-live.json`
   - Keys are cached for 1 hour (configurable)
   - Network timeout protection (10 seconds)

2. **Signature Verification**
   - Uses the `elliptic` library for ECDSA P-256 signature verification
   - Verifies JWT signature using public key from JWKS
   - Properly handles DER encoding and signature format (r, s components)
   - Uses expo-crypto for SHA-256 hashing

3. **Claims Validation**
   - `exp` (expiration): Token must not be expired
   - `nbf` (not before): Token must be valid at current time
   - `iat` (issued at): Token must not be issued in the future
   - `iss` (issuer): Must match "OpenCampus"
   - `aud` (audience): Must match the configured client ID

## Architecture

### Files

- **`src/sdk/crypto/jwks.js`** - JWKS fetcher with caching
- **`src/sdk/crypto/jwtVerifier.js`** - Core JWT verification logic
- **`src/sdk/crypto/verifyToken.js`** - Public API for token verification
- **`src/sdk/lib/TokenManager.js`** - Updated to use JWKS URLs
- **`src/sdk/auth.js`** - Updated OCAuthLive and OCAuthSandbox classes

### Verification Flow

```
1. Token received from auth server
   ↓
2. Decode JWT header to get kid (key ID)
   ↓
3. Fetch JWKS from OpenCampus endpoint (or use cache)
   ↓
4. Find matching key in JWKS using kid
   ↓
5. Convert JWK to elliptic curve public key
   ↓
6. Hash JWT payload (header + payload)
   ↓
7. Verify signature using ECDSA P-256
   ↓
8. Validate standard JWT claims (exp, iss, aud, etc.)
   ↓
9. Return verification result
```

## Dependencies

The implementation uses the following libraries:

- **`elliptic`** (^6.6.1) - ECDSA signature verification
- **`expo-crypto`** (^12.4.1) - SHA-256 hashing
- **`buffer`** (^6.0.3) - Buffer polyfill for React Native
- **`base-64`** (^1.0.0) - Base64 encoding/decoding

All dependencies are well-maintained and widely used in the React Native ecosystem.

## Security Best Practices

### ✅ What We Do

1. **Verify Signatures**: All JWT tokens are cryptographically verified
2. **Use JWKS**: Public keys are fetched from trusted endpoints
3. **Validate Claims**: Standard JWT claims are validated
4. **Cache Keys**: JWKS is cached to reduce network requests
5. **Timeout Protection**: Network requests have timeouts
6. **Error Handling**: Comprehensive error handling and logging

### ⚠️ What You Should Do

1. **Use HTTPS**: Ensure all network communication uses HTTPS
2. **Store Tokens Securely**: Use secure storage for tokens (AsyncStorage with encryption)
3. **Handle Token Expiry**: Implement token refresh logic
4. **Validate Server Identity**: Ensure you're connecting to official OpenCampus endpoints
5. **Keep Dependencies Updated**: Regularly update the SDK and its dependencies

### ❌ What NOT to Do

1. **Don't skip verification**: Never set `verifyToken` to always return true
2. **Don't trust unverified tokens**: Always verify tokens before using claims
3. **Don't store secrets in code**: Never hardcode API keys or secrets
4. **Don't disable HTTPS**: Always use HTTPS in production
5. **Don't use expired tokens**: Check expiration before using tokens

## API Usage

### Basic Usage

```javascript
import { OCAuthSandbox } from '@opencampus/ocid-connect-react-native';

const auth = new OCAuthSandbox({
  clientId: 'your-client-id',
  redirectUri: 'your-redirect-uri',
  referralCode: 'PARTNER6'
});

// Tokens are automatically verified during login
await auth.signInWithRedirect();
```

### Custom JWKS URL (Advanced)

```javascript
const auth = new OCAuthSandbox({
  clientId: 'your-client-id',
  jwksUrl: 'https://custom.jwks.url/jwks.json', // Override JWKS URL
  redirectUri: 'your-redirect-uri'
});
```

### Manual Token Verification

```javascript
import { verifyToken } from '@opencampus/ocid-connect-react-native';

const isValid = await verifyToken(
  idToken, 
  'https://static.opencampus.xyz/jwks/jwks-sandbox.json',
  {
    expectedIssuer: 'OpenCampus',
    expectedAudience: 'sandbox'
  }
);

if (isValid) {
  console.log('Token is valid and verified!');
} else {
  console.error('Token verification failed');
}
```

## Testing

### Verify the Implementation

You can verify the implementation is working by checking the console logs:

```
Verifying token with JWKS URL: https://static.opencampus.xyz/jwks/jwks-sandbox.json
Fetching JWKS from: https://static.opencampus.xyz/jwks/jwks-sandbox.json
JWT Header: { alg: 'ES256', kid: '...' }
JWT Payload: { iss: 'OpenCampus', aud: 'sandbox', ... }
✓ JWT signature verified successfully
✓ JWT claims validated successfully
✓ Token verified successfully
```

### Test Against Forged Tokens

The SDK will now reject forged tokens:

```javascript
const forgedToken = 'eyJ...fake.signature';
const result = await verifyToken(forgedToken, jwksUrl);
// Returns false - signature verification fails
```

## Migration Guide

If you're upgrading from an older version:

1. **Update Dependencies**:
   ```bash
   npm install
   ```

2. **Code Changes**: No code changes required! The API remains the same.

3. **Verify**: Check console logs to ensure verification is working.

## Security Disclosure

If you discover a security vulnerability, please email: security@opencampus.xyz

**Do NOT** create a public GitHub issue for security vulnerabilities.

## References

- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [RFC 7515 - JSON Web Signature (JWS)](https://tools.ietf.org/html/rfc7515)
- [RFC 7517 - JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [ECDSA with P-256 (ES256)](https://tools.ietf.org/html/rfc7518#section-3.4)

## License

Copyright 2024-Present Animoca Brands Corporation Ltd. - MIT License
