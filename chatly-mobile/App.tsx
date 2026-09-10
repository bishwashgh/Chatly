import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ApolloProvider } from '@apollo/client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from './src/lib/apolloClient';
import { AuthProvider, useAuth } from './src/lib/AuthContext';
import { CallProvider } from './src/lib/CallContext';
import { ThemeProvider, useTheme } from './src/lib/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CallModal } from './src/components/CallModal';
import './global.css';

function AppShell() {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  return (
    <CallProvider>
      {currentUser && <CallModal currentUserId={currentUser.id} />}
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#000000' : '#F5F5F7'} translucent={false} />
      <RootNavigator />
    </CallProvider>
  );
}

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ApolloProvider>
  );
}