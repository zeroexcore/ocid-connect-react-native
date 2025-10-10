/*!
 * Copyright 2024-Present Animoca Brands Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import AuthInfoManager from './lib/AuthInfoManager';
import TokenManager from './lib/TokenManager';
import TransactionManager from './lib/TransactionManager';
import { getStorageClass } from './lib/StorageManager';
import { createPkceMeta, parseJwt, prepareTokenParams } from './utils';
import { buildAuthEndpointUrl } from './endpoints';
import { AuthError, InvalidParamsError } from './utils/errors';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

export class OCAuthCore {
    clientId;
    tokenManager;
    authInfoManager;
    transactionManager;
    redirectUri;
    loginEndPoint;
    logoutEndPoint;
    referralCode;
    initialized;

    constructor(clientId, loginEndpoint, redirectUri, transactionManager, tokenManager, referralCode, logoutEndPoint) {
        if (!clientId) {
            throw new InvalidParamsError('clientId is not defined');
        }
        this.transactionManager = transactionManager;
        this.tokenManager = tokenManager;
        this.authInfoManager = new AuthInfoManager();
        this.loginEndPoint = loginEndpoint;
        this.logoutEndPoint = logoutEndPoint;
        this.redirectUri = redirectUri;
        this.referralCode = referralCode;
        this.clientId = clientId;
        this.initialized = false;
        
        console.log('🔧 [SDK DEBUG] OCAuth initialized with endpoints:');
        console.log('🔧 [SDK DEBUG] - Client ID:', clientId);
        console.log('🔧 [SDK DEBUG] - Login Endpoint:', loginEndpoint);
        console.log('🔧 [SDK DEBUG] - Logout Endpoint:', logoutEndPoint);
        console.log('🔧 [SDK DEBUG] - Redirect URI:', redirectUri);
        console.log('🔧 [SDK DEBUG] - Referral Code:', referralCode || '(none)');
    }

    async initialize() {
        if (!this.initialized) {
            await this.syncAuthInfo();
            this.initialized = true;
        }
    }

    async clearStorage() {
        await this.tokenManager.clear();
        await this.transactionManager.clear();
    }

    async logout(logoutReturnTo, skipBrowserLogout = false) {
        console.log('🚪 [LOGOUT DEBUG] ========== Starting Logout Flow ==========');
        console.log('🚪 [LOGOUT DEBUG] Parameters:', {
            logoutReturnTo: logoutReturnTo,
            skipBrowserLogout: skipBrowserLogout
        });
        
        // Clear local storage and auth state
        console.log('🚪 [LOGOUT DEBUG] Clearing local storage (tokens, transaction data)...');
        await this.clearStorage();
        console.log('✅ [LOGOUT DEBUG] Local storage cleared');
        
        // Clear auth info manager state to trigger UI updates
        console.log('🚪 [LOGOUT DEBUG] Clearing auth info manager...');
        this.authInfoManager.clear();
        console.log('✅ [LOGOUT DEBUG] Auth info manager cleared (UI will update)');
        
        // IMPORTANT: We do NOT call the logout endpoint because:
        // 1. expo-web-browser uses the OS-managed system browser (ASWebAuthenticationSession/Chrome Custom Tabs)
        //    which we cannot programmatically clear without opening a browser window
        // 2. The logout endpoint redirects to auth.staging.opencampus.xyz/login WITHOUT query params,
        //    which is NOT a valid login page and causes confusion
        // 3. Terminal 3's server session will expire naturally (typically 24h)
        // 4. Next login starts fresh from api.login.sandbox.opencampus.xyz/login with new session anyway
        // 5. We've already cleared all local tokens and state, so user is logged out from our perspective
        
        console.log('⏭️ [LOGOUT DEBUG] Skipping browser logout endpoint');
        console.log('💡 [LOGOUT DEBUG] Local tokens cleared - user is logged out');
        console.log('💡 [LOGOUT DEBUG] Terminal 3 session will expire naturally');
        console.log('💡 [LOGOUT DEBUG] Next login will start fresh with new session');
        
        console.log('🎉 [LOGOUT DEBUG] ========== Logout Complete ==========');
        console.log('📝 [LOGOUT DEBUG] Next login will start from:', this.loginEndPoint);
    }

    async signInWithRedirect(params) {
        // we use ONLY code flow with PKCE, so lacks a lot of options
        // available in other OAuth SDKs.
        const paramsClone = Object.assign({}, params);
        paramsClone.redirectUri = this.redirectUri;
        paramsClone.clientId = this.clientId;
        const signinParams = await prepareTokenParams(paramsClone);
        const meta = createPkceMeta(signinParams);
        await this.transactionManager.save(meta);
        signinParams.referralCode = this.referralCode;
        
        // Add prompt=login if forceLogin is set (forces re-authentication)
        if (params.forceLogin) {
            signinParams.prompt = 'login';
        }
        
        const requestUrl = buildAuthEndpointUrl(signinParams, this.loginEndPoint);
        
        console.log('🚀 [AUTH DEBUG] ========== Starting Authentication Flow ==========');
        console.log('🔗 [AUTH DEBUG] Initial Auth URL:', requestUrl);
        console.log('📋 [AUTH DEBUG] Auth Parameters:', {
            clientId: signinParams.clientId,
            redirectUri: signinParams.redirectUri,
            responseType: signinParams.responseType,
            scope: signinParams.scope,
            codeChallenge: signinParams.codeChallenge?.substring(0, 20) + '...',
            codeChallengeMethod: signinParams.codeChallengeMethod,
            state: signinParams.state,
            prompt: signinParams.prompt,
            referralCode: signinParams.referralCode
        });
        
        // Open in-app browser and wait for redirect
        console.log('🌐 [AUTH DEBUG] Opening WebBrowser.openAuthSessionAsync...');
        const result = await WebBrowser.openAuthSessionAsync(requestUrl, this.redirectUri);
        
        console.log('📱 [AUTH DEBUG] WebBrowser result:', {
            type: result.type,
            url: result.url
        });
        
        if (result.type === 'success' && result.url) {
            console.log('✅ [AUTH DEBUG] Auth browser returned success');
            console.log('🔙 [AUTH DEBUG] Redirect URL received:', result.url);
            // Handle the callback directly
            return await this.handleLoginRedirect(result.url);
        } else if (result.type === 'cancel') {
            console.log('❌ [AUTH DEBUG] User cancelled authentication');
            throw new AuthError('Authentication was cancelled');
        } else {
            console.log('❌ [AUTH DEBUG] Authentication failed with type:', result.type);
            throw new AuthError('Authentication failed');
        }
    }

    async handleLoginRedirect(url) {
        console.log('🔄 [AUTH DEBUG] ========== Handling Login Redirect ==========');
        console.log('🔙 [AUTH DEBUG] Full redirect URL:', url);
        
        // For React Native, URL will be passed from deep link handler
        const urlParams = this.parseUrlFromString(url);
        console.log('📋 [AUTH DEBUG] Parsed URL params:', urlParams);
        
        // Again we only handle PKCE code flow
        if (urlParams.code) {
            console.log('✅ [AUTH DEBUG] Authorization code received:', urlParams.code?.substring(0, 20) + '...');
            
            const meta = await this.transactionManager.getTransactionMeta();
            console.log('🔐 [AUTH DEBUG] Retrieved transaction meta from storage');
            
            const { codeVerifier } = meta;
            if (codeVerifier) {
                console.log('🔑 [AUTH DEBUG] Code verifier found, exchanging code for tokens...');
                console.log('🔑 [AUTH DEBUG] Code verifier (first 20 chars):', codeVerifier?.substring(0, 20) + '...');
                
                // we used pkce mode, use it
                await this.tokenManager.exchangeTokenFromCode(urlParams.code, codeVerifier, urlParams.state);
                console.log('✅ [AUTH DEBUG] Token exchange successful');
                
                // clear transaction meta, coz it's completed
                await this.transactionManager.clear();
                await this.syncAuthInfo();
                
                const authState = await this.getAuthState();
                console.log('✅ [AUTH DEBUG] Auth state synced:', {
                    isAuthenticated: authState.isAuthenticated,
                    OCId: authState.OCId,
                    ethAddress: authState.ethAddress
                });
                console.log('🎉 [AUTH DEBUG] ========== Authentication Complete ==========');
                
                return authState;
            } else {
                console.log('❌ [AUTH DEBUG] codeVerifier not found in transaction meta!');
                throw new AuthError('codeVerifier not found, cannot complete flow');
            }
        }

        console.log('⚠️ [AUTH DEBUG] No authorization code found in redirect URL');
        // no code found, nothing to do
        return {};
    }

    parseUrlFromString(urlString) {
        if (!urlString) return {};
        try {
            const url = new URL(urlString);
            const urlParams = new URLSearchParams(url.search);
            const validParams = {};
            
            if (urlParams.has('id_token')) validParams.id_token = urlParams.get('id_token');
            if (urlParams.has('code')) validParams.code = urlParams.get('code');
            if (urlParams.has('state')) validParams.state = urlParams.get('state');
            
            return validParams;
        } catch (e) {
            return {};
        }
    }

    async isAuthenticated() {
        // if both token exist and not expired
        return !(await this.tokenManager.hasExpired());
    }

    async syncAuthInfo() {
        if (await this.tokenManager.hasExpired()) {
            this.authInfoManager.clear();
        } else {
            const { edu_username, eth_address } = await this.getParsedIdToken();
            this.authInfoManager.setAuthState(
                await this.getAccessToken(),
                await this.getIdToken(),
                edu_username,
                eth_address,
                true
            );
        }
    }

    getAuthState() {
        return this.authInfoManager.getAuthState();
    }

    async getStateParameter() {
        return await this.tokenManager.getStateParameter();
    }

    async getIdToken() {
        return await this.tokenManager.getIdToken();
    }

    async getAccessToken() {
        return await this.tokenManager.getAccessToken();
    }

    async getParsedIdToken() {
        // return all info in id token
        const idToken = await this.tokenManager.getIdToken();
        if (idToken) {
            return parseJwt(idToken);
        }
        return {};
    }

    async getParsedAccessToken() {
        // return all info in access token
        const accessToken = await this.tokenManager.getAccessToken();
        if (accessToken) {
            return parseJwt(accessToken);
        }
        return {};
    }

    get OCId() {
        const info = this.authInfoManager.getAuthState();
        return info.OCId ?? null;
    }

    get ethAddress() {
        const info = this.authInfoManager.getAuthState();
        return info.ethAddress ?? null;
    }
}

// JWKS URLs for secure JWT verification
const JWKS_LIVE_URL = 'https://static.opencampus.xyz/jwks/jwks-live.json';
const JWKS_SANDBOX_URL = 'https://static.opencampus.xyz/jwks/jwks-sandbox.json';
export class OCAuthLive extends OCAuthCore {
    constructor(opts = {}) {
        const {
            tokenEndPoint: overrideTokenEndpoint,
            loginEndPoint: overrideLoginEndpoint,
            logoutEndPoint: overrideLogoutEndpoint,
            jwksUrl: overrideJwksUrl,
            redirectUri,
            referralCode,
            clientId,
        } = opts;
        const tokenEndpoint = overrideTokenEndpoint || 'https://api.login.opencampus.xyz/auth/token';
        const loginEndpoint = overrideLoginEndpoint || 'https://api.login.opencampus.xyz/auth/login';
        const logoutEndpoint = overrideLogoutEndpoint || 'https://api.login.opencampus.xyz/auth/logout';
        const jwksUrl = overrideJwksUrl || JWKS_LIVE_URL;

        const storageClass = getStorageClass(opts);
        const pkceTransactionManager = new TransactionManager(storageClass);
        const tokenManager = new TokenManager(storageClass, tokenEndpoint, jwksUrl, clientId);
        super(clientId, loginEndpoint, redirectUri, pkceTransactionManager, tokenManager, referralCode, logoutEndpoint);
    }
}

export class OCAuthSandbox extends OCAuthCore {
    constructor(opts = {}) {
        const {
            tokenEndPoint: overrideTokenEndpoint,
            loginEndPoint: overrideLoginEndpoint,
            logoutEndPoint: overrideLogoutEndpoint,
            jwksUrl: overrideJwksUrl,
            redirectUri,
            referralCode,
        } = opts;
        const clientId = opts.clientId || 'sandbox';
        const tokenEndpoint = overrideTokenEndpoint || 'https://api.login.sandbox.opencampus.xyz/auth/token';
        const loginEndpoint = overrideLoginEndpoint || 'https://api.login.sandbox.opencampus.xyz/auth/login';
        const logoutEndpoint = overrideLogoutEndpoint || 'https://api.login.sandbox.opencampus.xyz/auth/logout';
        const jwksUrl = overrideJwksUrl || JWKS_SANDBOX_URL;

        const storageClass = getStorageClass(opts);
        const pkceTransactionManager = new TransactionManager(storageClass);
        const tokenManager = new TokenManager(storageClass, tokenEndpoint, jwksUrl, clientId);
        super(clientId, loginEndpoint, redirectUri, pkceTransactionManager, tokenManager, referralCode, logoutEndpoint);
    }
}
