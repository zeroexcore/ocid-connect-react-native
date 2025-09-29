# OCID Connect SDK - Expo Integration Example

This is a complete integration example showing how to use the OCID Connect SDK with React Native components in a modern Expo application.

## Features Demonstrated

✅ **Core SDK Integration**: Uses `@opencampus/ocid-connect-js` main entry point  
✅ **Custom UI Components**: Demonstrates building custom login buttons  
✅ **Expo Router**: Deep linking with OAuth callbacks  
✅ **TypeScript**: Full type safety  
✅ **Multiple Login Themes**: Custom styled buttons with different themes  
✅ **Cross-Platform**: iOS, Android, and Web support  
✅ **Modern Expo SDK**: v54 with new architecture
✅ **Metro Compatibility**: Optimized for React Native bundler

## Quick Start

### 1. Dependencies are already installed
```bash
# All required dependencies are already set up:
# - @react-native-async-storage/async-storage
# - expo-crypto  
# - expo-linking
# - OCID Connect SDK (linked locally)
```

### 2. Start the app
```bash
npm start
```

### 3. Test authentication
1. Open the app in Expo Go or development build
2. Go to the **Auth tab**
3. Tap any "Connect OCID" button
4. Complete authentication in browser
5. Get redirected back to the app

## Project Structure

```
app/
├── (tabs)/
│   ├── auth.tsx          # Main authentication demo
│   ├── index.tsx         # Updated home screen
│   ├── explore.tsx       # Default explore screen
│   └── _layout.tsx       # Tab navigation
├── auth/
│   └── callback.tsx      # OAuth callback handler
└── _layout.tsx           # Root layout
```

## Deep Linking Configuration

The app is configured with:
- **Scheme**: `test://`
- **Redirect URI**: `test://auth/callback`
- **OAuth Handler**: `/app/auth/callback.tsx`

## Authentication Flow

1. **User taps LoginButton** → Opens browser with OCID auth
2. **User completes auth** → Browser redirects to `test://auth/callback?code=...`
3. **App receives deep link** → Processes OAuth callback
4. **Auth state updates** → UI shows user info

## Component Usage

```typescript
// Import core SDK components
import { OCConnect, useOCAuth } from '@opencampus/ocid-connect-js';
import { ThemedView, ThemedText } from '@/components/themed-view';

// Configure SDK
const opts = {
    clientId: 'sandbox',
    redirectUri: Linking.createURL('auth/callback'),
};

// Use in component
function AuthScreen() {
    return (
        <OCConnect opts={opts} sandboxMode={true}>
            <AuthContent />
        </OCConnect>
    );
}

function AuthContent() {
    const { OCId, ethAddress, ocAuth } = useOCAuth();
    
    return (
        <View>
            {OCId ? (
                <Text>Welcome, {OCId}!</Text>
            ) : (
                <ThemedView style={customButtonStyle}>
                    <ThemedText onPress={() => ocAuth?.signInWithRedirect()}>
                        Connect OCID
                    </ThemedText>
                </ThemedView>
            )}
        </View>
    );
}
```

## SDK Features Tested

### Core Authentication
- OAuth 2.0 + PKCE flow
- Sandbox mode testing
- State parameter management
- Token validation and storage

### OCConnect & useOCAuth
- React Context provider
- Auth state management
- Cross-platform compatibility
- Automatic initialization

### Deep Link Handling
- OAuth callback processing
- URL parameter parsing
- Error handling and user feedback
- Expo Router integration

### Custom UI Implementation
- Theme-aware components
- Touch interaction handling
- Responsive button design
- Consistent visual styling

## Development

### Testing Changes
1. Make changes to the SDK in `../../src/`
2. Rebuild: `cd ../.. && npm run build`
3. Restart Expo: `npm start`

### Debugging
- Check Metro logs for authentication flow
- Use `showAuthState()` to inspect auth data
- Deep link testing via Expo CLI

## Platform Support

✅ **Expo Go**: Works with expo-crypto  
✅ **Development Build**: Full native features  
✅ **iOS Simulator**: Deep linking support  
✅ **Android Emulator**: Deep linking support  
✅ **Web**: Browser-based flow

## Configuration Details

- **Sandbox Mode**: `true` (no client ID required)
- **Storage**: AsyncStorage with sync API wrapper
- **Crypto**: expo-crypto for Expo Go compatibility
- **Navigation**: Expo Linking for deep links
- **UI**: React Native components with ThemedView/ThemedText

This example demonstrates a production-ready integration of the OCID Connect SDK with modern Expo and React Native best practices.