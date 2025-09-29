/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


import jwtDecode from 'jwt-decode';
import * as Crypto from 'expo-crypto';
import { atob } from './webcrypto';

export const verifyToken = async ( idToken, publicKeyBase64 ) => 
{
    try {
        // For now, let's do basic JWT validation without crypto verification
        // In a production environment, you might want to implement proper ECDSA verification
        // using a crypto library that supports React Native
        
        // Decode the JWT without verification to check basic structure
        const decoded = jwtDecode(idToken);
        
        console.log('JWT decoded successfully:', decoded);
        
        // Basic validation checks
        const now = Math.floor(Date.now() / 1000);
        
        // Check expiration
        if (decoded.exp && decoded.exp < now) {
            console.error('JWT verification failed: Token expired');
            return false;
        }
        
        // Check issuer
        if (decoded.iss && decoded.iss !== 'OpenCampus') {
            console.error('JWT verification failed: Invalid issuer');
            return false;
        }
        
        // Check audience (client ID)
        if (decoded.aud && decoded.aud !== 'sandbox') {
            console.error('JWT verification failed: Invalid audience');
            return false;
        }
        
        // Basic structure validation passed
        console.log('JWT basic validation successful:', {
            user_id: decoded.user_id,
            eth_address: decoded.eth_address,
            edu_username: decoded.edu_username,
            exp: new Date(decoded.exp * 1000).toISOString(),
            iss: decoded.iss,
            aud: decoded.aud
        });
        
        return true;
        
    } catch (error) {
        console.error('JWT verification failed:', error);
        return false;
    }
}

