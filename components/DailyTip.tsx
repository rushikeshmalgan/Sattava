/**
 * Sattva — AI Health Tip Card
 * Premium AI insight display with shimmer loading, reveal animation, and proper dark mode.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeType } from '../constants/theme';

interface DailyTipProps {
  theme: ThemeType;
  tip?: string;
  onRefresh: () => void;
  loading?: boolean;
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
function SkeletonLine({ width, theme }: { width: number | `${number}%`; theme: ThemeType }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    return () => shimmer.stopAnimation();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <Animated.View
      style={[
        styles.skeletonLine,
        { width, backgroundColor: theme.border, opacity },
      ]}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const DailyTip = ({ theme, tip, onRefresh, loading = false }: DailyTipProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Fade-in when tip appears
  useEffect(() => {
    if (tip && !loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(8);
    }
  }, [tip, loading]);

  // Spin the refresh icon when loading
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Header strip */}
      <LinearGradient
        colors={[theme.primary + '18', theme.primary + '05']}
        style={styles.headerStrip}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconBubble, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="sparkles" size={14} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.label, { color: theme.primary }]}>AI Health Tip</Text>
            <Text style={[styles.subLabel, { color: theme.textMuted }]}>Powered by Gemini</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.refreshBtn, { borderColor: theme.border }]}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons
              name={loading ? 'reload' : 'refresh'}
              size={15}
              color={loading ? theme.primary : theme.textMuted}
            />
          </Animated.View>
          {!loading && (
            <Text style={[styles.refreshText, { color: theme.textMuted }]}>Refresh</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Body */}
      <View style={styles.body}>
        {loading ? (
          // Skeleton loading state
          <View style={styles.skeletonContainer}>
            <SkeletonLine width="95%" theme={theme} />
            <SkeletonLine width="80%" theme={theme} />
            <SkeletonLine width="65%" theme={theme} />
          </View>
        ) : (
          <Animated.Text
            style={[
              styles.tipText,
              { color: theme.text, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {tip || 'Generating your personalized tip…'}
          </Animated.Text>
        )}

        {/* Bottom: Gemini badge */}
        {!loading && tip && (
          <View style={[styles.badge, { backgroundColor: theme.primary + '12' }]}>
            <Ionicons name="bulb-outline" size={11} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>
              Personalized for you today
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default DailyTip;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  skeletonContainer: {
    gap: 10,
    paddingTop: 6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
