import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle, Easing } from 'react-native';

type PageTransitionProps = {
  children: React.ReactNode;
  key: string;
  style?: StyleProp<ViewStyle>;
  transition?: 'fade' | 'slide' | 'slide-up' | 'none';
  duration?: number;
};

export function PageTransition({ 
  children, 
  key, 
  style, 
  transition = 'slide',
  duration = 300 
}: PageTransitionProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration, 
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateAnim, { 
        toValue: 0, 
        duration, 
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(opacityAnim, { 
        toValue: 1, 
        duration, 
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const transform = transition === 'slide' 
    ? [{ translateX: translateAnim }]
    : transition === 'slide-up'
    ? [{ translateY: translateAnim }]
    : [];

  return (
    <Animated.View
      key={key}
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});