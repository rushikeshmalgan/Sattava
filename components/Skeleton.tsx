/**
 * Sattva — Skeleton Loader System
 * Replaces ALL ActivityIndicator spinners. Shimmer animation.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      style={[
        { width, height: height as any, borderRadius: radius, backgroundColor: theme.border, opacity },
        style,
      ]}
    />
  );
}

// ── Pre-built skeleton layouts ─────────────────────────────────────────────

/** 3-column quick stats row skeleton */
export function QuickStatsRowSkeleton() {
  return (
    <View style={sk.row}>
      {[0, 1, 2].map(i => (
        <View key={i} style={sk.statCard}>
          <Skeleton width={32} height={32} radius={16} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={20} radius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={12} radius={4} />
        </View>
      ))}
    </View>
  );
}

/** Single activity card skeleton */
export function ActivityCardSkeleton() {
  return (
    <View style={sk.activityCard}>
      <Skeleton width={4} height="100%" radius={2} style={{ alignSelf: 'stretch' }} />
      <Skeleton width={40} height={40} radius={12} style={{ marginHorizontal: 10 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="70%" height={14} radius={5} />
        <Skeleton width="45%" height={11} radius={4} />
      </View>
    </View>
  );
}

/** Stacked activity list skeleton (3 items, staggered) */
export function ActivityListSkeleton() {
  return (
    <View style={{ gap: 8 }}>
      {[0, 1, 2].map(i => (
        <ActivityCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Calories donut card skeleton */
export function CaloriesCardSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[sk.caloriesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={sk.caloriesInner}>
        <Skeleton width={160} height={160} radius={80} />
        <View style={{ flex: 1, gap: 10, paddingLeft: 20 }}>
          <Skeleton width="80%" height={14} radius={5} />
          <Skeleton width="60%" height={22} radius={6} />
          <Skeleton width="90%" height={11} radius={4} />
          <Skeleton width="70%" height={11} radius={4} />
          <Skeleton width="50%" height={11} radius={4} />
        </View>
      </View>
    </View>
  );
}

/** Analytics macro bar skeleton */
export function MacroBarSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ gap: 6 }}>
          <View style={sk.macroLabelRow}>
            <Skeleton width={60} height={12} radius={4} />
            <Skeleton width={40} height={12} radius={4} />
          </View>
          <Skeleton width={([`95%`,`78%`,`62%`,`85%`] as `${number}%`[])[i]} height={10} radius={5} />
        </View>
      ))}
    </View>
  );
}

/** Analytics bar chart skeleton */
export function BarChartSkeleton() {
  const heights = [91, 112, 63, 126, 77, 98, 140] as const;
  return (
    <View style={sk.barChart}>
      {heights.map((h, i) => (
        <View key={i} style={sk.barCol}>
          <Skeleton width={28} height={h} radius={6} />
          <Skeleton width={24} height={10} radius={4} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** Chat bubble skeleton */
export function ChatSkeletonBubbles() {
  return (
    <View style={{ gap: 16, padding: 16 }}>
      {/* AI bubble (left) */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Skeleton width={36} height={36} radius={18} />
        <View style={{ gap: 6, maxWidth: '70%' }}>
          <Skeleton width="100%" height={14} radius={5} />
          <Skeleton width="80%" height={14} radius={5} />
          <Skeleton width="55%" height={14} radius={5} />
        </View>
      </View>
      {/* User bubble (right) */}
      <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
        <Skeleton width={36} height={36} radius={18} />
        <Skeleton width="55%" height={14} radius={5} />
      </View>
      {/* AI bubble 2 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Skeleton width={36} height={36} radius={18} />
        <View style={{ gap: 6, maxWidth: '75%' }}>
          <Skeleton width="100%" height={14} radius={5} />
          <Skeleton width="65%" height={14} radius={5} />
        </View>
      </View>
    </View>
  );
}

/** Diet score card skeleton */
export function DietScoreSkeleton() {
  return (
    <View style={sk.dietScoreCard}>
      <View style={sk.dietScoreRow}>
        <Skeleton width={80} height={80} radius={40} />
        <View style={{ flex: 1, gap: 10, paddingLeft: 16 }}>
          <Skeleton width="70%" height={14} radius={5} />
          <Skeleton width="90%" height={10} radius={4} />
          <Skeleton width="80%" height={10} radius={4} />
          <Skeleton width="60%" height={10} radius={4} />
        </View>
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
  },
  caloriesCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  caloriesInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 8,
    paddingHorizontal: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dietScoreCard: {
    borderRadius: 20,
    padding: 16,
  },
  dietScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
