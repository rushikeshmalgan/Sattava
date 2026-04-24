/**
 * Sattva — Healthy Streak Card
 * Shows flame animation, milestone badges, and a motivating zero-state.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeType } from '../constants/theme';

interface HealthyStreakProps {
  streak: number;
  theme: ThemeType;
}

// Milestone definitions
const MILESTONES = [
  { days: 3,  icon: 'ribbon-outline',  label: '3 Days',  color: '#CD7F32' }, // Bronze
  { days: 7,  icon: 'medal-outline',   label: 'Week',    color: '#C0C0C0' }, // Silver
  { days: 14, icon: 'trophy-outline',  label: '2 Weeks', color: '#FFD700' }, // Gold
  { days: 30, icon: 'star',            label: '30 Days', color: '#F59E0B' }, // Legend
];

const HealthyStreak: React.FC<HealthyStreakProps> = ({ streak, theme }) => {
  // Pulse animation for the flame
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Slide-in animation
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Continuous flame pulse only when streak > 0
    if (streak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }

    return () => pulseAnim.stopAnimation();
  }, [streak]);

  const earnedMilestone = [...MILESTONES].reverse().find(m => streak >= m.days);
  const nextMilestone   = MILESTONES.find(m => streak < m.days);
  const progressToNext  = nextMilestone ? (streak / nextMilestone.days) * 100 : 100;

  // ── Zero state ────────────────────────────────────────────────────────────
  if (streak === 0) {
    return (
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.zeroStateRow}>
          <View style={[styles.iconBubble, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="flame-outline" size={22} color={theme.textMuted} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.zeroTitle, { color: theme.text }]}>Start Your Streak</Text>
            <Text style={[styles.zeroSubtitle, { color: theme.textMuted }]}>
              Log a full day to light your first flame 🔥
            </Text>
          </View>
        </View>
        {/* Progress to first milestone */}
        <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: '0%', backgroundColor: theme.primary }]} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
          0 / 3 days to first badge
        </Text>
      </Animated.View>
    );
  }

  // ── Active streak ─────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={['#F97316', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.card}
      >
        <View style={styles.mainRow}>
          {/* Flame icon */}
          <Animated.View style={[styles.flameBubble, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="flame" size={28} color="#FFFFFF" />
          </Animated.View>

          {/* Text */}
          <View style={styles.textBlock}>
            <Text style={styles.streakLabel}>HEALTHY STREAK</Text>
            <Text style={styles.streakNumber}>
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </Text>
            {nextMilestone ? (
              <Text style={styles.nextGoal}>
                {nextMilestone.days - streak} more to {nextMilestone.label} badge
              </Text>
            ) : (
              <Text style={styles.nextGoal}>🏆 Legend status achieved!</Text>
            )}
          </View>

          {/* Milestone badge */}
          {earnedMilestone && (
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Ionicons name={earnedMilestone.icon as any} size={18} color="#FFFFFF" />
              <Text style={styles.badgeText}>{earnedMilestone.label}</Text>
            </View>
          )}
        </View>

        {/* Progress bar to next milestone */}
        {nextMilestone && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBg, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressToNext, 100)}%`, backgroundColor: '#FFFFFF' },
                ]}
              />
            </View>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

export default HealthyStreak;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  nextGoal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  badge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginTop: 12,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Zero state
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zeroTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  zeroSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  zeroStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'right',
  },
});
