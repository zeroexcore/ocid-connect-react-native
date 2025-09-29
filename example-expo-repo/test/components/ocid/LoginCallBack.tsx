/*!
 * Copyright 2024-Present Animoca Brands Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OCSpinner from './OCSpinner';
import { useOCAuth } from './OCContext';

let handledRedirect = false;

interface LoginCallBackProps {
    url: string;
    successCallback?: () => void;
    errorCallback?: (error: any) => void;
    customErrorComponent?: React.ReactNode;
    customLoadingComponent?: React.ReactNode;
}

const LoginCallBack: React.FC<LoginCallBackProps> = ({ 
    url, 
    successCallback, 
    errorCallback, 
    customErrorComponent, 
    customLoadingComponent 
}) => {
    const { isInitialized, ocAuth, authState, setAuthError } = useOCAuth();

    useEffect(() => {
        const handleLogin = async () => {
            if (ocAuth && url) {
                try {
                    await ocAuth.handleLoginRedirect(url);
                    if (successCallback) successCallback();
                } catch (e) {
                    setAuthError(e);
                    if (errorCallback) {
                        errorCallback(e);
                    }
                }
            }
        };
        if (!handledRedirect) {
            handleLogin();
            handledRedirect = true;
        }
    }, [ocAuth, url, successCallback, errorCallback, setAuthError]);

    if (isInitialized && authState?.error !== undefined && !errorCallback) {
        return customErrorComponent ? customErrorComponent : (
            <View style={styles.container}>
                <Text style={styles.errorText}>Error Logging in: {authState.error.message}</Text>
            </View>
        );
    } else {
        return customLoadingComponent ? (
            customLoadingComponent
        ) : (
            <View style={styles.container}>
                <OCSpinner height={100} width={100} />
            </View>
        );
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});

export default LoginCallBack;
