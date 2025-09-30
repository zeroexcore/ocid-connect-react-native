/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { ec as EC } from 'elliptic';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';
import { base64UrlDecode } from './base64';
import { atob } from './webcrypto';
import { fetchJWKS, findKeyInJWKS } from './jwks';

/**
 * Decode JWT without verification to extract header and payload
 * @param {string} token - The JWT token
 * @returns {Object} Decoded header and payload
 */
const decodeJWT = (token) => {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format: must have 3 parts');
    }

    try {
        // base64UrlDecode already calls atob internally, don't call it twice!
        const header = JSON.parse(base64UrlDecode(parts[0]));
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        const signature = parts[2];

        return { header, payload, signature, message: `${parts[0]}.${parts[1]}` };
    } catch (error) {
        throw new Error(`Failed to decode JWT: ${error.message}`);
    }
};

/**
 * Convert JWK (JSON Web Key) to elliptic curve public key
 * @param {Object} jwk - The JSON Web Key
 * @returns {Object} Elliptic curve key object
 */
const jwkToEllipticKey = (jwk) => {
    if (jwk.kty !== 'EC') {
        throw new Error(`Unsupported key type: ${jwk.kty}. Only EC (Elliptic Curve) is supported.`);
    }

    if (jwk.crv !== 'P-256') {
        throw new Error(`Unsupported curve: ${jwk.crv}. Only P-256 is supported.`);
    }

    // Decode base64url encoded x and y coordinates
    const xBuffer = Buffer.from(base64UrlDecode(jwk.x), 'binary');
    const yBuffer = Buffer.from(base64UrlDecode(jwk.y), 'binary');

    // Convert to hex
    const x = xBuffer.toString('hex');
    const y = yBuffer.toString('hex');

    // Create elliptic curve instance
    const ec = new EC('p256');
    
    // Create public key from coordinates
    const key = ec.keyFromPublic({
        x: x,
        y: y
    }, 'hex');

    return key;
};

/**
 * Verify JWT signature using ECDSA P-256
 * @param {string} message - The JWT header and payload (parts[0].parts[1])
 * @param {string} signature - The base64url encoded signature
 * @param {Object} publicKey - The elliptic curve public key
 * @returns {Promise<boolean>} True if signature is valid
 */
const verifySignature = async (message, signature, publicKey) => {
    try {
        // Hash the message using SHA-256
        const messageBuffer = Buffer.from(message, 'utf8');
        const hash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            message,
            { encoding: Crypto.CryptoEncoding.HEX }
        );

        // Decode the signature from base64url
        const signatureBuffer = Buffer.from(base64UrlDecode(signature), 'binary');
        
        // ECDSA signature in JWT is r + s concatenated (64 bytes for P-256)
        if (signatureBuffer.length !== 64) {
            throw new Error(`Invalid signature length: ${signatureBuffer.length}, expected 64`);
        }

        // Split into r and s (32 bytes each)
        const r = signatureBuffer.slice(0, 32).toString('hex');
        const s = signatureBuffer.slice(32, 64).toString('hex');

        // Verify the signature
        const isValid = publicKey.verify(hash, { r, s });

        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
};

/**
 * Validate JWT claims
 * @param {Object} payload - The decoded JWT payload
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with errors if any
 */
const validateClaims = (payload, options = {}) => {
    const errors = [];
    const now = Math.floor(Date.now() / 1000);

    // Check expiration (exp)
    if (payload.exp !== undefined) {
        if (typeof payload.exp !== 'number') {
            errors.push('exp claim must be a number');
        } else if (payload.exp < now) {
            errors.push('Token has expired');
        }
    } else {
        errors.push('exp claim is required but missing');
    }

    // Check not before (nbf)
    if (payload.nbf !== undefined) {
        if (typeof payload.nbf !== 'number') {
            errors.push('nbf claim must be a number');
        } else if (payload.nbf > now) {
            errors.push('Token not yet valid (nbf claim)');
        }
    }

    // Check issued at (iat)
    if (payload.iat !== undefined) {
        if (typeof payload.iat !== 'number') {
            errors.push('iat claim must be a number');
        } else if (payload.iat > now) {
            errors.push('Token issued in the future (iat claim)');
        }
    }

    // Check issuer (iss)
    if (options.expectedIssuer) {
        if (payload.iss !== options.expectedIssuer) {
            errors.push(`Invalid issuer: expected ${options.expectedIssuer}, got ${payload.iss}`);
        }
    }

    // Check audience (aud)
    if (options.expectedAudience) {
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!audiences.includes(options.expectedAudience)) {
            errors.push(`Invalid audience: expected ${options.expectedAudience}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Verify JWT token with full cryptographic signature verification
 * @param {string} idToken - The JWT token to verify
 * @param {string} jwksUrl - The JWKS URL to fetch public keys from
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} Verification result
 */
export const verifyJWT = async (idToken, jwksUrl, options = {}) => {
    try {
        // Step 1: Decode the JWT
        const { header, payload, signature, message } = decodeJWT(idToken);

        console.log('JWT Header:', header);
        console.log('JWT Payload:', {
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
            sub: payload.sub
        });

        // Step 2: Check algorithm
        if (header.alg !== 'ES256') {
            throw new Error(`Unsupported algorithm: ${header.alg}. Only ES256 is supported.`);
        }

        // Step 3: Fetch JWKS
        const jwks = await fetchJWKS(jwksUrl);

        // Step 4: Find the key with matching kid
        let jwk;
        if (header.kid) {
            jwk = findKeyInJWKS(jwks, header.kid);
            if (!jwk) {
                throw new Error(`Key with kid "${header.kid}" not found in JWKS`);
            }
        } else {
            // If no kid in header, try the first key (fallback for some implementations)
            if (jwks.keys && jwks.keys.length > 0) {
                jwk = jwks.keys[0];
                console.warn('No kid in JWT header, using first key from JWKS');
            } else {
                throw new Error('No kid in JWT header and no keys in JWKS');
            }
        }

        // Step 5: Convert JWK to elliptic key
        const publicKey = jwkToEllipticKey(jwk);

        // Step 6: Verify signature
        const signatureValid = await verifySignature(message, signature, publicKey);
        if (!signatureValid) {
            throw new Error('JWT signature verification failed');
        }

        console.log('✓ JWT signature verified successfully');

        // Step 7: Validate claims
        const claimsValidation = validateClaims(payload, {
            expectedIssuer: options.expectedIssuer,
            expectedAudience: options.expectedAudience
        });

        if (!claimsValidation.valid) {
            throw new Error(`JWT claims validation failed: ${claimsValidation.errors.join(', ')}`);
        }

        console.log('✓ JWT claims validated successfully');

        return {
            valid: true,
            payload,
            header
        };

    } catch (error) {
        console.error('JWT verification failed:', error.message);
        return {
            valid: false,
            error: error.message
        };
    }
};
