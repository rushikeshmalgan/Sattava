/**
 * Sattva — Achievement System
 * Locally computed badges with spring animations.
 * No Firebase needed — all logic based on streak, log count, and usage.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AchievementDef {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  gradient: [string, string];
}

const ALL_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'streak_3',
    icon: 'flame',
    label: '3-Day Fire',
    desc: 'Log 3 days in a row',
    color: '#F97316',
    gradient: ['#F97316', '#F59E0B'],
  },
  {
    id: 'streak_7',
    icon: 'flame',
    label: 'Week Warrior',
    desc: '7-day streak',
    color: '#EF4444',
    gradient: ['#EF4444', '#F97316'],
  },
  {
    id: 'meals_10',
    icon: 'restaurant',
    label: 'Foodie',
    desc: '10 meals logged',
    color: '#1E7D5A',
    gradient: ['#145A46', '#1E7D5A'],
  },
  {
    id: 'meals_30',
    icon: 'leaf',
    label: 'Nutrition Pro',
    desc: '30 meals logged',
    color: '#10B981',
    gradient: ['#059669', '#10B981'],
  },
  {
    id: 'water_goal',
    icon: 'water',
    label: 'Hydration Hero',
    desc: 'Hit water goal',
    color: '#0EA5E9',
    gradient: ['#0284C7', '#0EA5E9'],
  },
  {
    id: 'steps_10k',
    icon: 'footsteps',
    label: 'Step Master',
    desc: '10,000 steps in a day',
    color: '#6366F1',
    gradient: ['#4F46E5', '#6366F1'],
  },
  {
    id: 'ai_chat',
    icon: 'chatbubble-ellipses',
    label: 'AI Explorer',
    desc: 'Chat with Sattva AI',
    color: '#1E7D5A',
    gradient: ['#145A46', '#34D399'],
  },
  {
    id: 'score_80',
    icon: 'trophy',
    label: 'Diet Champion',
    desc: 'Diet score ≥ 80',
    color: '#F59E0B',
    gradient: ['#D97706', '#F59E0B'],
  },
];

/** Compute which achievements are unlocked from user stats */
export function computeAchievements(stats: {
  streak: number;
  mealsLogged: number;
  hitWaterGoal: boolean;
  maxStepsInDay: number;
  hasUsedAIChat: boolean;
  bestDietScore: number;
}): Set<string> {
  const unlocked = new Set<string>();
  if (stats.streak >= 3)           unlocked.add('streak_3');
  if (stats.streak >= 7)           unlocked.add('streak_7');
  if (stats.mealsLogged >= 10)     unlocked.add('meals_10');
  if (stats.mealsLogged >= 30)     unlocked.add('meals_30');
  if (stats.hitWaterGoal)          unlocked.add('water_goal');
  if (stats.maxStepsInDay >= 10000) unlocked.add('steps_10k');
  if (stats.hasUsedAIChat)         unlocked.add('ai_chat');
  if (stats.bestDietScore >= 80)   unlocked.add('score_80');
  return unlocked;
}

// ── Single badge ──────────────────────────────────────────────────────────────
function AchievementBadge({
  achievement,
  unlocked,
  delay,
}: {
  achievement: AchievementDef;
  unlocked: boolean;
  delay: number;
}) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.badge,
        { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
      ]}
    >
      {unlocked ? (
        <LinearGradient
          colors={achievement.gradient}
          style={styles.badgeInner}
        >
          <Ionicons name={achievement.icon as any} size={22} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={[styles.badgeInner, styles.badgeLocked, { backgroundColor: theme.border }]}>
          <Ionicons name="lock-closed" size={18} color={theme.textLight} />
        </View>
      )}
      <Text
        style={[
          styles.badgeLabel,
          { color: unlocked ? theme.text : theme.textMuted },
        ]}
        numberOfLines={2}
      >
        {achievement.label}
      </Text>
    </Animated.View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ unlocked, total, onViewAll }: { unlocked: number; total: number; onViewAll?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
        <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
          {unlocked} of {total} unlocked
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.progressPill, { backgroundColor: theme.primary + '20', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
        onPress={onViewAll}
      >
        <Text style={[styles.progressPillText, { color: theme.primary }]}>
          {Math.round((unlocked / total) * 100)}%
        </Text>
        <Ionicons name="chevron-forward" size={14} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface AchievementSectionProps {
  stats: {
    streak: number;
    mealsLogged: number;
    hitWaterGoal: boolean;
    maxStepsInDay: number;
    hasUsedAIChat: boolean;
    bestDietScore: number;
  };
}

export default function AchievementSection({ stats: realStats }: AchievementSectionProps) {
  const [stats, setStats] = React.useState(realStats);

  React.useEffect(() => {
      const checkGodMode = async () => {
          const godMode = await AsyncStorage.getItem('demoGodMode');
          if (godMode === 'true') {
              setStats({
                  streak: 15,
                  mealsLogged: 100,
                  hitWaterGoal: true,
                  maxStepsInDay: 20000,
                  hasUsedAIChat: true,
                  bestDietScore: 100,
              });
          } else {
              setStats(realStats);
          }
      };
      checkGodMode();
  }, [realStats]);

  const unlockedSet = computeAchievements(stats);
  const unlockedCount = unlockedSet.size;
  const router = useRouter();

  // Sort: unlocked first, then locked
  const sorted = [
    ...ALL_ACHIEVEMENTS.filter(a => unlockedSet.has(a.id)),
    ...ALL_ACHIEVEMENTS.filter(a => !unlockedSet.has(a.id)),
  ];

  return (
    <View style={styles.container}>
      <SectionHeader 
        unlocked={unlockedCount} 
        total={ALL_ACHIEVEMENTS.length} 
        onViewAll={() => router.push('/achievements')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {sorted.map((achievement, i) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            unlocked={unlockedSet.has(achievement.id)}
            delay={i * 50}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  progressPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  progressPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  badge: {
    alignItems: 'center',
    width: 70,
    gap: 6,
  },
  badgeInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
});
