import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useThemeStore, useTheme } from './src/store/themeStore';
import { useAuthStore } from './src/store/authStore';
import { useCallStore } from './src/store/callStore';
import { useChatStore } from './src/store/chatStore';
import { api, Conversation, User } from './src/services/api';
import { wsService } from './src/services/websocket';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { OtpScreen } from './src/screens/OtpScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { NewChatScreen } from './src/screens/NewChatScreen';
import { CallScreen } from './src/screens/CallScreen';
import { PeopleScreen } from './src/screens/PeopleScreen';
import { GroupsScreen } from './src/screens/GroupsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { IncomingCallOverlay } from './src/components/IncomingCallOverlay';
import { TabKey } from './src/components/BottomNav';
import { AuthScreenName, OtpParams } from './src/navigation/types';

type AppScreen =
  | { name: 'messages' }
  | { name: 'groups' }
  | { name: 'discover' }
  | { name: 'profile' }
  | { name: 'chat'; conversation: Conversation }
  | { name: 'newchat' };

export default function App() {
  const { colors, isDark } = useTheme();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialize = useAuthStore((s) => s.initialize);
  const callStatus = useCallStore((s) => s.status);
  const callType = useCallStore((s) => s.callType);
  const remoteUserId = useCallStore((s) => s.remoteUserId);

  const [activeTab, setActiveTab] = useState<TabKey>('messages');
  const [screen, setScreen] = useState<AppScreen>({ name: 'messages' });
  const [authScreen, setAuthScreen] = useState<AuthScreenName>('login');
  const [authParams, setAuthParams] = useState<OtpParams | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const screenFade = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    screenFade.setValue(0);
    Animated.timing(screenFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [screen.name]);

  const handleAuthNavigate = (screen: AuthScreenName, params?: OtpParams) => {
    setAuthScreen(screen);
    setAuthParams(params || null);
  };

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    useThemeStore.getState().hydrate();
  }, []);

  // Reset to the login screen whenever the user is authenticated.
  useEffect(() => {
    if (isAuthenticated) {
      setAuthScreen('login');
      setAuthParams(null);
    }
  }, [isAuthenticated]);

  // Register WS handlers for incoming calls
  useEffect(() => {
    const unsubOffer = wsService.on('call_offer', async (data) => {
      // Find/create conversation with caller
      const fromUserId = data.from_id;
      try {
        const conv = await api.createConversation(fromUserId);
        useChatStore.getState().loadConversations();
      } catch (e) {
        // ignore - user might not be a valid participant
      }
    });

    return () => {
      unsubOffer();
    };
  }, []);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {authScreen === 'login' && <LoginScreen onNavigate={handleAuthNavigate} />}
          {authScreen === 'register' && (
            <RegisterScreen onNavigate={handleAuthNavigate} initialData={authParams?.pendingData} />
          )}
          {authScreen === 'otp' && (
            <OtpScreen
              params={authParams}
              onBack={() => handleAuthNavigate('register', authParams || undefined)}
            />
          )}
          {authScreen === 'forgot' && (
            <ForgotPasswordScreen
              initialEmail={authParams?.email}
              onBack={() => handleAuthNavigate('login')}
              onDone={() => handleAuthNavigate('login')}
            />
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  // Incoming call full-screen
  if (callStatus === 'ringing') {
    const callerName = 'Incoming Call';
    return (
      <SafeAreaProvider>
        <View style={styles.flex}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <IncomingCallOverlay
            callType={callType || 'audio'}
            callerName={callerName}
            onAccept={() => {
              useCallStore.getState().acceptIncomingCall();
            }}
            onDecline={() => {
              useCallStore.getState().rejectCall(remoteUserId || undefined);
            }}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  // Active call in progress
  if (callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'connected') {
    if (activeConversation) {
      return (
        <SafeAreaProvider>
          <View style={styles.flex}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <CallScreen
              conversation={activeConversation}
              onEnded={() => {
                // CallScreen handles cleanup
              }}
            />
          </View>
        </SafeAreaProvider>
      );
    }
  }

  // Main app
  const renderScreen = () => {
    const handleTabPress = (tab: TabKey) => {
      setActiveTab(tab);
      setScreen({ name: tab } as AppScreen);
    };

    switch (screen.name) {
      case 'messages':
        return (
          <MessagesScreen
            activeTab={activeTab}
            onTabPress={handleTabPress}
            onOpenChat={(conv) => {
              setActiveConversation(conv);
              setScreen({ name: 'chat', conversation: conv });
            }}
            onNewChat={() => setScreen({ name: 'newchat' })}
          />
        );
      case 'groups':
        return (
          <GroupsScreen
            activeTab={activeTab}
            onTabPress={handleTabPress}
            onOpenChat={(conv) => {
              setActiveConversation(conv);
              setScreen({ name: 'chat', conversation: conv });
            }}
          />
        );
      case 'discover':
        return (
          <PeopleScreen
            activeTab={activeTab}
            onTabPress={handleTabPress}
            onOpenChat={(conv) => {
              setActiveConversation(conv);
              setScreen({ name: 'chat', conversation: conv });
            }}
          />
        );
      case 'profile':
        return <ProfileScreen activeTab={activeTab} onTabPress={handleTabPress} />;
      case 'newchat':
        return (
          <NewChatScreen
            onBack={() => setScreen({ name: 'messages' })}
            onOpenConversation={(conv) => {
              setActiveConversation(conv);
              setScreen({ name: 'chat', conversation: conv });
            }}
          />
        );
      case 'chat':
        return (
          <ChatScreen
            conversation={screen.conversation}
            onBack={() => setScreen({ name: 'messages' })}
            onStartCall={async (type) => {
              const other = screen.conversation.participants.find(
                (p) => p.id !== useAuthStore.getState().user?.id
              );
              if (!other) return;
              setActiveConversation(screen.conversation);
              try {
                await useCallStore.getState().startCall(other.id, type);
              } catch (e: any) {
                useCallStore.getState().resetCall();
                Alert.alert('Call unavailable', e.message || 'Could not start the call.');
              }
            }}
            onOpenProfile={() => {}}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.flex}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Animated.View style={[styles.flex, { opacity: screenFade }]}>
          {renderScreen()}
        </Animated.View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});