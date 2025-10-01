/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// import StorageManager from './StorageManager';
import { parseJwt } from '../utils';
import { verifyToken } from '../crypto';
import { AuthError } from '../utils/errors';

const TOKEN_STORAGE_NAME = 'oc-token-storage';

class TokenManager
{
    storageManager;
    tokenExpiredAt;
    tokenEndPoint;
    jwksUrl;
    clientId;

    constructor ( StorageManagerClass, tokenEndPoint, jwksUrl, clientId )
    {
        this.storageManager = new StorageManagerClass( TOKEN_STORAGE_NAME );
        this.tokenEndPoint = tokenEndPoint;
        this.jwksUrl = jwksUrl;
        this.clientId = clientId;
    }

    async clear ()
    {
        await this.storageManager.getStorageObject().clearStorage();
    }

    async exchangeTokenFromCode ( accessCode, codeVerifier, state = null )
    {
        const body = { accessCode, codeVerifier };
        console.log('Token exchange request:', { endpoint: this.tokenEndPoint, body });
        try
        {
            const response = await fetch( this.tokenEndPoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify( body ),
            } );

            console.log('Token exchange response status:', response.status);
            const responseData = await response.json();
            console.log('Token exchange response data:', responseData);
            
            // Handle sandbox verification error specifically
            if (responseData.error && responseData.error.subType === 'SANDBOX_WALLET_ERROR') {
                throw new AuthError(JSON.stringify(responseData.error));
            }
            
            const { access_token, id_token } = responseData;
            if ( !access_token || !id_token )
            {
                throw new AuthError( 'Fail to exchange token: ' + JSON.stringify(responseData) );
            }
            
            // Verify token with cryptographic signature verification using JWKS
            const jwksUrl = await this.getJWKSUrl();
            const tokenVerified = await verifyToken( id_token, jwksUrl, {
                expectedIssuer: 'OpenCampus',
                expectedAudience: this.clientId
            });
            
            if ( !tokenVerified )
            {
                throw new AuthError( 'Unable to verify token: signature or claims validation failed' );
            }
            const parsedAccessToken = parseJwt( access_token );
            const storageData = Object.assign(
                {
                    access_token,
                    id_token,
                    expired: parsedAccessToken.exp
                },
                state && { state }
            );
            await this.storageManager.getStorageObject().setStorage(storageData);
        } catch ( error )
        {
            console.log( error );
            throw new AuthError( 'Token acquisition failed' );
        }
    }

    async getStateParameter ()
    {
        return await this.storageManager.getStorageObject().getItem( 'state' );
    }

    async getIdToken ()
    {
        return await this.storageManager.getStorageObject().getItem( 'id_token' );
    }

    async getAccessToken ()
    {
        return await this.storageManager.getStorageObject().getItem( 'access_token' );
    }

    async getExpiredAt () 
    {
        return await this.storageManager.getStorageObject().getItem( 'expired' );
    }

    async getJWKSUrl () 
    {
        return this.jwksUrl;
    }

    async hasExpired ()
    {
        const expiredAt = await this.getExpiredAt();
        if ( !expiredAt )
        {
            return true;
        }
        const cur = Math.round( new Date().valueOf() / 1000 );

        return cur >= expiredAt;
    }
}

export default TokenManager;
