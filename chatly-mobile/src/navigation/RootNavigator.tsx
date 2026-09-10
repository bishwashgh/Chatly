import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAuth } from '../lib/AuthContext';

export type RootStackParamList = {
  Conversations: undefined;
  Friends: undefined;
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

  if (isLoading) return null;

  return (
    <NavigationContainer>
      {!currentUser ? (
        <LoginScreen />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            animationDuration: 240,
            contentStyle: { backgroundColor: '#F4FAF9' },
          }}
        >
          <Stack.Screen name="Conversations" component={ConversationsScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
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