/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { verifyJWT } from './jwtVerifier';

/**
 * Verify ID token with full cryptographic signature verification
 * @param {string} idToken - The JWT token to verify
 * @param {string} jwksUrl - The JWKS URL to fetch public keys from
 * @param {Object} options - Verification options (expectedIssuer, expectedAudience)
 * @returns {Promise<boolean>} True if token is valid
 */
export const verifyToken = async (idToken, jwksUrl, options = {}) => {
    try {
        console.log('Verifying token with JWKS URL:', jwksUrl);
        
        const result = await verifyJWT(idToken, jwksUrl, options);
        
        if (!result.valid) {
            console.error('Token verification failed:', result.error);
            return false;
        }
        
        console.log('✓ Token verified successfully');
        console.log('Token payload:', {
            user_id: result.payload.user_id,
            eth_address: result.payload.eth_address,
            edu_username: result.payload.edu_username,
            exp: new Date(result.payload.exp * 1000).toISOString(),
            iss: result.payload.iss,
            aud: result.payload.aud
        });
        
        return true;
        
    } catch (error) {
        console.error('Token verification exception:', error);
        return false;
    }
};

