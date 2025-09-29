import React from 'react';
import { View, StyleSheet, Alert, ScrollView, Text, TouchableOpacity } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoginButton, OCConnect, useOCAuth } from '@/components/ocid';

const REDIRECT_URI = 'test://auth/callback'; // Use app scheme that matches server config
const CLIENT_ID = 'sandbox'; // Using sandbox default client ID

console.log('OCID SDK Redirect URI:', REDIRECT_URI);

function AuthContent() {
  const { isInitialized, ocAuth, authState } = useOCAuth();

  const handleLogout = async () => {
    if (ocAuth) {
      try {
        await ocAuth.logout();
      } catch (error) {
        console.error('Logout failed:', error);
        Alert.alert('Error', 'Logout failed');
      }
    }
  };

  const isAuthenticated = authState?.isAuthenticated || false;

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          OCID Connect Demo
        </ThemedText>
        
        <ThemedText type="subtitle" style={styles.subtitle}>
          React Native SDK Integration
        </ThemedText>

        <ThemedText style={styles.description}>
          This demonstrates the OCID Connect SDK for React Native. The SDK handles OAuth authentication flow with in-app browser.
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="subtitle">Authentication Status</ThemedText>
          <View style={[styles.statusBadge, isAuthenticated ? styles.authenticated : styles.unauthenticated]}>
            <Text style={[styles.statusText, isAuthenticated ? styles.authenticatedText : styles.unauthenticatedText]}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </Text>
          </View>
        </View>

        {isAuthenticated && authState ? (
          <View style={styles.section}>
            <ThemedText type="subtitle">User Information</ThemedText>
            <View style={styles.userInfo}>
              <Text style={styles.infoText}>OCID: {authState.OCId || 'N/A'}</Text>
              <Text style={styles.infoText}>Eth Address: {authState.ethAddress || 'N/A'}</Text>
              <Text style={styles.infoText}>Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}</Text>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <ThemedText type="subtitle">Get Started</ThemedText>
            <ThemedText style={styles.instructions}>
              Tap the login button below to start the OCID authentication flow. It will open an in-app browser for secure authentication.
            </ThemedText>
            
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

        <View style={styles.section}>
          <ThemedText type="subtitle">Configuration</ThemedText>
          <View style={styles.configInfo}>
            <Text style={styles.configText}>Environment: Sandbox</Text>
            <Text style={styles.configText}>Client ID: {CLIENT_ID}</Text>
            <Text style={styles.configText}>Redirect URI: {REDIRECT_URI}</Text>
          </View>
        </View>
      </ThemedView>
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
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
  configInfo: {
    marginTop: 8,
  },
  configText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
    },
});

export default function AuthScreen() {
  const opts = {
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
  };

  return (
    <OCConnect opts={opts} sandboxMode={true}>
      <AuthContent />
    </OCConnect>
  );
}
