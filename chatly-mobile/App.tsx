import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ApolloProvider } from '@apollo/client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from './src/lib/apolloClient';
import { AuthProvider, useAuth } from './src/lib/AuthContext';
import { CallProvider } from './src/lib/CallContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CallModal } from './src/components/CallModal';
import { colors } from './src/lib/theme';
import './global.css';

function AppShell() {
  const { currentUser } = useAuth();
  return (
    <CallProvider>
      {currentUser && <CallModal currentUserId={currentUser.id} />}
      <RootNavigator />
    </CallProvider>
  );
}

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" backgroundColor={colors.bg} translucent={false} />
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ApolloProvider>
  );
}