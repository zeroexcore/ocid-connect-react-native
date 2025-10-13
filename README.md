# OCID Connect React Native SDK - Expo Go Integration Guide

A comprehensive guide for integrating the OCID Connect React Native SDK in an Expo Go application, including complete setup, configuration, and implementation examples.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Expo Configuration](#expo-configuration)
4. [Project Setup](#project-setup)
5. [Components Implementation](#components-implementation)
6. [Authentication Flow](#authentication-flow)
7. [Complete Example](#complete-example)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts and IDs

- **Sandbox Mode (Development)**: No Client ID required - perfect for testing and development


## Installation

Install the OCID Connect React Native SDK and required dependencies:

### 1. Install the SDK
```bash
# Install the main SDK
npm install ocid-connect-react-native

# Or with yarn
yarn add ocid-connect-react-native
```

### 2. Install peer dependencies
```bash
# Required dependencies (Expo-managed)
npx expo install \
  @react-native-async-storage/async-storage \
  react-native-get-random-values \
  expo-crypto \
  expo-web-browser \
  expo-auth-session \
  expo-linking

# Pure JS deps (regular install is fine)
npm install base-64 jwt-decode
# or
yarn add base-64 jwt-decode
`
```

## Expo Configuration

### 1. Configure app.json

Update your `app.json` to include the custom URL scheme for deep linking:

```json
{
  "expo": {
    "name": "your-app-name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "scheme": "yourapp",
    "linking": {
      //Add prefix
      "prefixes": [
        "yourapp://"
      ]
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE"
      }
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

**Important**: The `scheme` must match your redirect URI configuration.


## Project Setup

### 1. Import Required Polyfills

At the very top of your app's entry point (usually `_layout.tsx` or `App.js`  ), import the required polyfills:

```javascript
import 'react-native-get-random-values';
```

### 2. Define Configuration Constants

Create a configuration file or define constants for your OCID setup:

```javascript
// constants/ocid.ts
export const OCID_CONFIG = {
  CLIENT_ID: 'sandbox', // Use 'sandbox' for development, your actual client ID for production
  REDIRECT_URI: 'yourapp://auth/callback', // Must match your app.json scheme
  SANDBOX_MODE: true, // Set to false for production
};
```

## Components Implementation

### 1. Create OCID Components Directory

Create the following component files in your `components/ocid/` directory:

#### `components/ocid/OCContext.tsx`

```typescript
import * as React from 'react';

interface OCAuthContextType {
  OCId?: string;
  ethAddress?: string;
  ocAuth?: any;
  authState?: any;
  authError?: any;
  isInitialized: boolean;
  setAuthError: (error: any) => void;
}

export const OCContext = React.createContext<OCAuthContextType | null>(null);

export const useOCAuth = (): OCAuthContextType => {
  const context = React.useContext(OCContext);
  if (!context) {
    throw new Error('useOCAuth must be used within an OCConnect provider');
  }
  return context;
};
```

#### `components/ocid/OCConnect.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { OCAuthLive, OCAuthSandbox } from 'ocid-connect-react-native';
import { OCContext } from './OCContext';

interface OCConnectProps {
    children: React.ReactNode;
    opts: any;
    sandboxMode?: boolean;
}

const OCConnect: React.FC<OCConnectProps> = ({ children, opts, sandboxMode }) => {
    const [ocAuth, setOcAuth] = useState<any>();
    const [OCId, setOCId] = useState<string>();
    const [ethAddress, setEthAddress] = useState<string>();
    const [authState, setAuthState] = useState<any>();
    const [isInitialized, setIsInitialized] = useState(false);
    const [authError, setAuthError] = useState(null);

    const updateAuthState = (authState: any) => {
        setAuthState(authState);
        setOCId(authState.OCId);
        setEthAddress(authState.ethAddress);
    };

    // Initialize SDK
    useEffect(() => {
        const initAuth = async () => {
            const authSdk = sandboxMode ? new OCAuthSandbox(opts) : new OCAuthLive(opts);
            await authSdk.initialize();
            updateAuthState(authSdk.getAuthState());
            setOcAuth(authSdk);
            setIsInitialized(true);
        };
        
        initAuth();
    }, [opts, sandboxMode]);

    useEffect(() => {
        if (ocAuth && ocAuth.authInfoManager) {
            // Reactively receive updates on auth state changes
            ocAuth.authInfoManager.subscribe(updateAuthState);
            return () => {
                ocAuth.authInfoManager.unsubscribe(updateAuthState);
            };
        }
    }, [ocAuth]);

    return (
        <OCContext.Provider value={{ OCId, ethAddress, ocAuth, authState, authError, isInitialized, setAuthError }}>
            {children}
        </OCContext.Provider>
    );
};

export default OCConnect;
```

#### `components/ocid/LoginButton.tsx`

```typescript
import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { useOCAuth } from './OCContext';

const themes = {
    light: {
        backgroundColor: "#FFF",
        borderColor: "#DDDDEB", 
        textColor: "#C5C5D1",
    },
    dark: {
        backgroundColor: "#141414",
        borderColor: "#DDDDEB",
        textColor: "#FFFFFF",
    },
    neutral: {
        backgroundColor: "#F5F5F5",
        borderColor: "#DDDDEB",
        textColor: "#141414",
    },
    ocBlue: {
        backgroundColor: "#141BEB",
        borderColor: "#DDDDEB",
        textColor: "#FFFFFF",
    },
};

interface LoginButtonProps {
    pill?: boolean;
    disabled?: boolean;
    theme?: keyof typeof themes;
    state?: string;
}

export default function LoginButton({ pill, disabled, theme = 'ocBlue', state }: LoginButtonProps) {
    const { ocAuth } = useOCAuth();
    const selectedTheme = themes[theme] || themes.ocBlue;

    const loginWithRedirect = async () => {
        if (ocAuth) {
            try {
                await ocAuth.signInWithRedirect({ state });
            } catch (error: any) {
                if (error.message.includes('SANDBOX_VERIFICATION_REQUIRED')) {
                    // Handle sandbox verification error gracefully
                    console.warn('Sandbox verification required:', error.message);
                } else {
                    throw error;
                }
            }
        }
    };

    const buttonStyle = [
        styles.button,
        {
            backgroundColor: selectedTheme.backgroundColor,
            borderColor: selectedTheme.borderColor,
            borderRadius: pill ? 22 : 8,
        },
        disabled && styles.disabled
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={loginWithRedirect}
            disabled={disabled}
        >
            <Image 
                source={{ uri: 'https://static.opencampus.xyz/assets/oc_logo.svg' }}
                style={styles.logo}
            />
            <Text style={[styles.text, { color: selectedTheme.textColor }]}>
                Connect <Text style={styles.bold}>OCID</Text>
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        width: 160,
        paddingHorizontal: 12,
        borderWidth: 1,
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.6,
    },
    logo: {
        width: 26,
        height: 25,
        marginRight: 10,
    },
    text: {
        fontSize: 14,
    },
    bold: {
        fontWeight: 'bold',
    },
});
```

#### `components/ocid/OCSpinner.tsx`

```typescript
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface OCSpinnerProps {
    height?: number;
    width?: number;
    size?: 'small' | 'large';
    color?: string;
}

const OCSpinner: React.FC<OCSpinnerProps> = ({ 
    height = 50, 
    width = 50, 
    size = 'large',
    color = '#141BEB'
}) => {
    return (
        <View style={[styles.container, { height, width }]}>
            <ActivityIndicator size={size} color={color} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default OCSpinner;
```


#### `components/ocid/LoginCallBack.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOCAuth } from './OCContext';
import OCSpinner from './OCSpinner';

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
    const handledRedirectRef = useRef(false);

    useEffect(() => {
        const handleLogin = async () => {
            if (ocAuth && url && !handledRedirectRef.current) {
                handledRedirectRef.current = true;
                try {
                    console.log('Handling login redirect with URL:', url);
                    await ocAuth.handleLoginRedirect(url);
                    console.log('Login redirect handled successfully');
                    if (successCallback) successCallback();
                } catch (e) {
                    console.error('Login redirect error:', e);
                    setAuthError(e);
                    if (errorCallback) {
                        errorCallback(e);
                    }
                }
            }
        };
        
        if (isInitialized && ocAuth && url) {
            handleLogin();
        }
    }, [ocAuth, url, successCallback, errorCallback, setAuthError, isInitialized]);

    // Show error if there's an auth error and no custom error callback
    if (isInitialized && authState?.error !== undefined && !errorCallback) {
        return customErrorComponent ? customErrorComponent : (
            <View style={styles.container}>
                <Text style={styles.errorText}>Error Logging in: {authState.error.message}</Text>
            </View>
        );
    }
    
    // Show success message if authenticated
    if (isInitialized && authState?.isAuthenticated) {
        return (
            <View style={styles.container}>
                <Text style={styles.successText}>Login successful! Redirecting...</Text>
                {customLoadingComponent ? customLoadingComponent : <OCSpinner height={100} width={100} />}
            </View>
        );
    }
    
    // Default loading state
    return customLoadingComponent ? (
        customLoadingComponent
    ) : (
        <View style={styles.container}>
            <OCSpinner height={100} width={100} />
        </View>
    );
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
    successText: {
        fontSize: 16,
        color: 'green',
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
});

export default LoginCallBack;
```


#### `components/ocid/index.tsx`

```typescript
export { default as OCConnect } from './OCConnect';
export { default as LoginButton } from './LoginButton';
export { default as LoginCallBack } from './LoginCallBack';
export { default as OCSpinner } from './OCSpinner';
export { OCContext, useOCAuth } from './OCContext';
```

## Authentication Flow

### 1. App Root Setup

Wrap your entire app with the OCConnect provider in your main app component:

```typescript
// App.tsx or _layout.tsx (for Expo Router)
import React from 'react';
import { OCConnect } from '@/components/ocid';
import { OCID_CONFIG } from '@/constants/ocid';

export default function App() {
  const opts = {
    clientId: OCID_CONFIG.CLIENT_ID,
    redirectUri: OCID_CONFIG.REDIRECT_URI,
  };

  return (
    <OCConnect opts={opts} sandboxMode={OCID_CONFIG.SANDBOX_MODE}>
      {/* Your app components */}
      <YourAppContent />
    </OCConnect>
  );
}
```

### 2. Authentication Screen Implementation

Create a complete authentication screen:

```typescript
// app/(tabs)/auth.tsx
import React from 'react';
import { View, StyleSheet, Alert, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LoginButton, useOCAuth } from '@/components/ocid';

function AuthContent() {
  const { isInitialized, ocAuth, authState } = useOCAuth();

  const handleLogout = async () => {
    if (ocAuth) {
      try {
        await ocAuth.logout();
        Alert.alert('Success', 'You have been logged out successfully', [{ text: 'OK' }]);
      } catch (error) {
        console.error('Logout failed:', error);
        Alert.alert('Error', 'Logout failed');
      }
    }
  };

  const isAuthenticated = authState?.isAuthenticated || false;

  // Loading state
  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text>Initializing OCID Connect...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>OCID Connect Demo</Text>
        
        <View style={styles.section}>
          <Text style={styles.subtitle}>Authentication Status</Text>
          <View style={[styles.statusBadge, isAuthenticated ? styles.authenticated : styles.unauthenticated]}>
            <Text style={[styles.statusText, isAuthenticated ? styles.authenticatedText : styles.unauthenticatedText]}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </Text>
          </View>
        </View>

        {isAuthenticated && authState ? (
          <View style={styles.section}>
            <Text style={styles.subtitle}>User Information</Text>
            <View style={styles.userInfo}>
              <Text style={styles.infoText}>OCID: {authState.OCId || 'N/A'}</Text>
              <Text style={styles.infoText}>Eth Address: {authState.ethAddress || 'N/A'}</Text>
              <Text style={styles.infoText}>Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}</Text>
            </View>
            
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Get Started</Text>
            <Text style={styles.instructions}>
              Tap the login button below to start the OCID authentication flow.
            </Text>
            
            <View style={styles.buttonContainer}>
              <LoginButton
                theme="ocBlue"
                pill={true}
                disabled={false}
                state={JSON.stringify({ timestamp: Date.now() })}
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  authenticated: {
    backgroundColor: '#e8f5e8',
  },
  unauthenticated: {
    backgroundColor: '#ffeaea',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  authenticatedText: {
    color: '#2d5a2d',
  },
  unauthenticatedText: {
    color: '#8b2635',
  },
  userInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#495057',
  },
  instructions: {
    marginBottom: 16,
    lineHeight: 18,
    color: '#666',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

```


### 3. Add Auth Tab to Navigation (Expo Router)

If you're using Expo Router with tab navigation, you need to add the Auth screen to your tab layout.

#### Step 1: Save the Auth Screen in the Right Location


#### Step 2: Update Your Tab Layout

Add the Auth tab to your `app/(tabs)/_layout.tsx`:

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      {/* Add the Auth tab */}
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Auth',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Note**: If you don't have `IconSymbol` component, you can use any icon library (like `@expo/vector-icons`) or a simple `Text` component for the icon.

#### What You Should See

After completing these steps, your app should have:
- ✅ Three tabs visible at the bottom: **Home**, **Explore**, and **Auth**
- ✅ Tapping the **Auth** tab shows your authentication screen
- ✅ The screen displays the login button when not authenticated
- ✅ The screen displays user info and logout button when authenticated

### 4. Deep Link Handling (Expo Router)


```typescript
// app/auth/callback.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { LoginCallBack } from '../../components/ocid';

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const url = `yourapp://auth/callback?${new URLSearchParams(params as Record<string, string>).toString()}`;

  const handleSuccess = () => {
    console.log('Auth callback success - navigating to home');
    // Use push instead of replace to ensure proper navigation
    router.push('/');
  };

  const handleError = (error: any) => {
    console.error('Auth callback error:', error);
    // Navigate back to home even on error to prevent getting stuck
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <LoginCallBack
      url={url}
      successCallback={handleSuccess}
      errorCallback={handleError}
    />
  );
}
```




