import React, { useEffect, useState, useRef } from 'react';
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
import { HomeScreen } from './src/screens/HomeScreen';
import { IncomingCallOverlay } from './src/components/IncomingCallOverlay';
import { TabKey } from './src/components/BottomNav';
import { AuthScreenName, OtpParams } from './src/navigation/types';
import { spacing } from './src/theme';
import { PageTransition } from './src/components/PageTransition';
import { ErrorBoundary } from './src/components/ErrorBoundary';

type AppScreen =
  | { name: 'home' }
  | { name: 'messages' }
  | { name: 'groups' }
  | { name: 'discover' }
  | { name: 'profile' }
  | { name: 'chat'; conversation: Conversation }
  | { name: 'newchat' };

function screenKey(screen: AppScreen | { name: AuthScreenName }) {
  if ('conversation' in screen) return `chat-${screen.conversation.id}`;
  return screen.name;
}

export default function App() {
  const { colors, isDark } = useTheme();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialize = useAuthStore((s) => s.initialize);
  const callStatus = useCallStore((s) => s.status);
  const callType = useCallStore((s) => s.callType);
  const remoteUserId = useCallStore((s) => s.remoteUserId);

  const [activeTab, setActiveTab] = useState<TabKey>('messages');
  const [screen, setScreen] = useState<AppScreen>({ name: 'home' });
  const [authScreen, setAuthScreen] = useState<AuthScreenName>('login');
  const [authParams, setAuthParams] = useState<OtpParams | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const handleAuthNavigate = (screen: AuthScreenName, params?: OtpParams) => {
    setAuthScreen(screen);
    setAuthParams(params || null);
  };

  const handleSignIn = () => {
    setAuthScreen('login');
    setAuthParams(null);
  };

  const handleSignUp = () => {
    setAuthScreen('register');
    setAuthParams(null);
  };

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    useThemeStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (isAuthenticated && screen.name === 'home') {
      setScreen({ name: 'messages' });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      setAuthScreen('login');
      setAuthParams(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubOffer = wsService.on('call_offer', async (data) => {
      const fromUserId = data.from_id;
      try {
        const conv = await api.createConversation(fromUserId);
        useChatStore.getState().loadConversations();
      } catch (e) {
      }
    });

    return () => {
      unsubOffer();
    };
  }, []);

  const renderScreen = () => {
    const handleTabPress = (tab: TabKey) => {
      setActiveTab(tab);
      setScreen({ name: tab } as AppScreen);
    };

    const currentKey = isAuthenticated ? screenKey(screen) : `auth-${authScreen}`;

    if (isLoading) {
      return (
        <PageTransition key="loading" transition="fade">
          <SafeAreaProvider>
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </SafeAreaProvider>
        </PageTransition>
      );
    }

    if (!isAuthenticated) {
      if (authScreen !== 'home') {
        return (
          <PageTransition key={currentKey} transition="slide">
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
          </PageTransition>
        );
      }

      return (
        <PageTransition key={currentKey} transition="slide">
          <SafeAreaProvider>
            <HomeScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />
          </SafeAreaProvider>
        </PageTransition>
      );
    }

    if (callStatus === 'ringing') {
      const callerName = 'Incoming Call';
      return (
        <PageTransition key="call-ringing" transition="slide-up">
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
        </PageTransition>
      );
    }

    if (callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'connected') {
      if (activeConversation) {
        return (
          <PageTransition key={`call-${activeConversation.id}`} transition="slide-up">
            <SafeAreaProvider>
              <View style={styles.flex}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <CallScreen
                  conversation={activeConversation}
                  onEnded={() => {
                  }}
                />
              </View>
            </SafeAreaProvider>
          </PageTransition>
        );
      }
    }

    return (
      <PageTransition key={currentKey} transition="slide">
        <SafeAreaProvider>
          <View style={styles.flex}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {(() => {
              const handleTabPress = (tab: TabKey) => {
                setActiveTab(tab);
                setScreen({ name: tab } as AppScreen);
              };

              switch (screen.name) {
                case 'home':
                  return <HomeScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />;
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
            })()}
          </View>
        </SafeAreaProvider>
      </PageTransition>
    );
  };

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <View style={[styles.flex, { paddingHorizontal: spacing.gutter }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {renderScreen()}
        </View>
      </ErrorBoundary>
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