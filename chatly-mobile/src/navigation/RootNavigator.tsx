import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignInScreen, SignUpScreen, OtpScreen, ForgotPasswordScreen, ResetPasswordScreen } from '../screens/AuthFlowScreens';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { CallLogScreen } from '../screens/CallLogScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';

export type RootStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Otp: { challengeId: string; destination: string; mode: 'signup' };
  ForgotPassword: undefined;
  ResetPassword: { email: string; challengeId: string };
  Conversations: undefined;
  Friends: undefined;
  CallLog: undefined;
  Settings: undefined;
  Profile: undefined;
  Chat: {
    conversationId: string;
    title?: string;
    peerId?: string;
    peerAvatarUrl?: string;
    peerIsOnline?: boolean;
  };
};
const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { currentUser, isLoading } = useAuth();
  const { colors } = useTheme();
  if (isLoading) return null;
  return (
    <NavigationContainer>
      {!currentUser ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Landing" component={LoginScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Conversations" component={ConversationsScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="CallLog" component={CallLogScreen} />
          <Stack.Screen name="Settings" component={ProfileScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Chat">
            {({ route, navigation }) => (
              <ChatScreen
                navigation={navigation}
                conversationId={route.params.conversationId}
                currentUserId={currentUser.id}
                peerId={route.params?.peerId}
                peerName={route.params?.title}
                peerAvatarUrl={route.params?.peerAvatarUrl}
                peerIsOnline={route.params?.peerIsOnline}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
