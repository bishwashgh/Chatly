import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { GlassButton } from './GlassButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error!} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} style={styles.icon} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          The app encountered an unexpected error. Your data is safe.
        </Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <View style={styles.buttonRow}>
          <GlassButton
            title="Retry"
            variant="fluid"
            onPress={onRetry}
            style={styles.retryBtn}
            icon={<Ionicons name="refresh-outline" size={18} color="#fff" />}
          />
          <GlassButton
            title="Report Issue"
            variant="outline"
            onPress={() => Alert.alert('Report', 'Please contact support with this error:\n' + error.message)}
            style={styles.reportBtn}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.gutter,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.stackLg,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  icon: { marginBottom: 16 },
  title: {
    ...typography.headlineMd,
    color: colors.onBackground,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorText: {
    ...typography.labelSm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retryBtn: { flex: 1 },
  reportBtn: { flex: 1 },
});