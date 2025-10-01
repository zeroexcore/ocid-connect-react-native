/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * JWKS (JSON Web Key Set) fetcher and cache manager
 * Securely fetches and caches public keys from OpenCampus JWKS endpoints
 */

const JWKS_SANDBOX_URL = 'https://static.opencampus.xyz/jwks/jwks-sandbox.json';
const JWKS_LIVE_URL = 'https://static.opencampus.xyz/jwks/jwks-live.json';

// Cache JWKS for 1 hour to avoid unnecessary network requests
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

class JWKSCache {
    constructor() {
        this.cache = new Map();
    }

    set(url, jwks) {
        this.cache.set(url, {
            jwks,
            timestamp: Date.now()
        });
    }

    get(url) {
        const cached = this.cache.get(url);
        if (!cached) return null;

        // Check if cache is still valid
        if (Date.now() - cached.timestamp > CACHE_TTL) {
            this.cache.delete(url);
            return null;
        }

        return cached.jwks;
    }

    clear() {
        this.cache.clear();
    }
}

const jwksCache = new JWKSCache();

/**
 * Fetch JWKS from the specified URL with caching
 * @param {string} jwksUrl - The JWKS endpoint URL
 * @returns {Promise<Object>} The JWKS object
 */
export const fetchJWKS = async (jwksUrl) => {
    console.log('[JWKS Fetcher] ───────────────────────────────────────');
    console.log('[JWKS Fetcher] Fetching JWKS from:', jwksUrl);
    
    // Check cache first
    const cached = jwksCache.get(jwksUrl);
    if (cached) {
        console.log('[JWKS Fetcher] ✓ Using cached JWKS');
        console.log('[JWKS Fetcher] ───────────────────────────────────────');
        return cached;
    }

    console.log('[JWKS Fetcher] No cache found, fetching from server...');
    
    try {
        const response = await fetch(jwksUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
        });



        if (!response.ok) {
            throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
        }

        const jwks = await response.json();

        if (!jwks.keys || !Array.isArray(jwks.keys)) {
            throw new Error('Invalid JWKS format: missing keys array');
        }

        console.log('[JWKS Fetcher] ✓ JWKS validated');
        console.log('[JWKS Fetcher] Number of keys:', jwks.keys.length);


        // Cache the result
        jwksCache.set(jwksUrl, jwks);
        console.log('[JWKS Fetcher] ✓ JWKS cached for 1 hour');
        console.log('[JWKS Fetcher] ───────────────────────────────────────');

        return jwks;
    } catch (error) {
        console.error('[JWKS Fetcher] ✗ Error fetching JWKS:', error.message);
        console.error('[JWKS Fetcher] Error stack:', error.stack);
        console.error('[JWKS Fetcher] ───────────────────────────────────────');
        throw new Error(`Failed to fetch JWKS: ${error.message}`);
    }
};

/**
 * Get the appropriate JWKS URL based on environment
 * @param {boolean} isSandbox - Whether to use sandbox or live environment
 * @returns {string} The JWKS URL
 */
export const getJWKSUrl = (isSandbox) => {
    return isSandbox ? JWKS_SANDBOX_URL : JWKS_LIVE_URL;
};

/**
 * Find a key in JWKS by key ID (kid)
 * @param {Object} jwks - The JWKS object
 * @param {string} kid - The key ID to find
 * @returns {Object|null} The matching key or null
 */
export const findKeyInJWKS = (jwks, kid) => {
    if (!jwks.keys || !Array.isArray(jwks.keys)) {
        return null;
    }

    return jwks.keys.find(key => key.kid === kid) || null;
};

/**
 * Clear the JWKS cache (useful for testing or forcing refresh)
 */
export const clearJWKSCache = () => {
    jwksCache.clear();
};
