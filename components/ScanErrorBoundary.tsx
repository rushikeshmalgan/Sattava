import React, { Component, ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface Props {
  children: ReactNode;
  /** Called when the user taps "Try Again" — reset any parent state you need to */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error boundary for the food scanning flow.
 *
 * Catches render errors in the scan result display (e.g. unexpected null
 * data structures from Gemini or a bad parse). Shows a friendly retry UI
 * instead of a blank or crashed screen.
 *
 * Usage:
 *   <ScanErrorBoundary onRetry={() => resetScanState()}>
 *     <ScanResultPanel ... />
 *   </ScanErrorBoundary>
 */
export class ScanErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Log to console in dev; swap for a crash reporter (Sentry etc.) in prod
    console.error('[ScanErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning-outline" size={48} color={Colors.SECONDARY} />
        </View>

        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          The food analysis hit an unexpected error. Your data is safe — just try again.
        </Text>

        {__DEV__ && this.state.errorMessage ? (
          <Text style={styles.devError}>{this.state.errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.retryButton}
          onPress={this.handleRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0F1115',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,152,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  devError: {
    fontSize: 11,
    color: '#FF6B6B',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'left',
    width: '100%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
