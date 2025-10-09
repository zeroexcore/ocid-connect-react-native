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
        // Clear local storage and auth state
        await this.clearStorage();
        // Clear auth info manager state to trigger UI updates
        this.authInfoManager.clear();
        
        // Open browser to logout endpoint to clear server-side session cookies
        // Skip if OpenCampus servers are having issues or if explicitly requested
        if (!skipBrowserLogout && this.logoutEndPoint) {
            try {
                const logoutUrl = new URL(this.logoutEndPoint);
                if (logoutReturnTo) {
                    logoutUrl.searchParams.append('returnTo', logoutReturnTo);
                }
                
                console.log('Opening logout URL to clear browser session:', logoutUrl.href);
                
                // Open browser to logout (this clears cookies)
                const result = await WebBrowser.openAuthSessionAsync(logoutUrl.href, this.redirectUri);
                
                // Handle different result types - cancel/dismiss is expected during logout
                if (result.type === 'success' || result.type === 'cancel' || result.type === 'dismiss') {
                    console.log('Browser session cleared');
                }
            } catch (error) {
                console.warn('Browser logout failed (OpenCampus server issue):', error.message);
                console.log('Local session cleared, but browser session may persist');
            }
        } else {
            console.log('Skipping browser logout - only clearing local session');
        }
        
        console.log('Logout successful - local session cleared');
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
        
        // Open in-app browser and wait for redirect
        const result = await WebBrowser.openAuthSessionAsync(requestUrl, this.redirectUri);
        
        if (result.type === 'success' && result.url) {
            // Handle the callback directly
            return await this.handleLoginRedirect(result.url);
        } else if (result.type === 'cancel') {
            throw new AuthError('Authentication was cancelled');
        } else {
            throw new AuthError('Authentication failed');
        }
    }

    async handleLoginRedirect(url) {
        // For React Native, URL will be passed from deep link handler
        const urlParams = this.parseUrlFromString(url);
        // Again we only handle PKCE code flow
        if (urlParams.code) {
            const meta = await this.transactionManager.getTransactionMeta();
            const { codeVerifier } = meta;
            if (codeVerifier) {
                // we used pkce mode, use it
                await this.tokenManager.exchangeTokenFromCode(urlParams.code, codeVerifier, urlParams.state);
                // clear transaction meta, coz it's completed
                await this.transactionManager.clear();
                await this.syncAuthInfo();
                return await this.getAuthState();
            } else {
                throw new AuthError('codeVerifier not found, cannot complete flow');
            }
        }

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
