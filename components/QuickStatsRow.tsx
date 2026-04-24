/**
 * Sattva — Quick Stats Row
 * 3 equal mini-cards: Steps | Water | Streak
 * Replaces the bloated StepCounterWidget standalone card.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface QuickStat {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  onPress?: () => void;
  highlight?: boolean;
}

interface QuickStatsRowProps {
  steps: number;
  waterMl: number;
  waterTargetMl: number;
  streak: number;
  onWaterPress?: () => void;
  onStepsPress?: () => void;
}

function StatCard({
  icon, iconColor, value, label, onPress, highlight, delay = 0,
}: QuickStat & { delay?: number }) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 150, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  return (
    <Animated.View
      style={[
        { flex: 1, transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: fadeAnim },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={[
          styles.card,
          {
            backgroundColor: highlight ? iconColor + '15' : theme.card,
            borderColor: highlight ? iconColor + '40' : theme.border,
          },
        ]}
      >
        <View style={[styles.iconBubble, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const QuickStatsRow: React.FC<QuickStatsRowProps> = ({
  steps,
  waterMl,
  waterTargetMl,
  streak,
  onWaterPress,
  onStepsPress,
}) => {
  const { theme } = useTheme();

  const stepGoal = 8000;
  const stepsFormatted = steps >= 1000
    ? `${(steps / 1000).toFixed(1)}k`
    : String(steps);
  const waterL = (waterMl / 1000).toFixed(1);
  const waterPct = Math.min(Math.round((waterMl / waterTargetMl) * 100), 100);

  const stats: (QuickStat & { delay: number })[] = [
    {
      icon: 'footsteps',
      iconColor: theme.info,
      value: stepsFormatted,
      label: `of ${(stepGoal / 1000).toFixed(0)}k steps`,
      onPress: onStepsPress,
      highlight: steps >= stepGoal,
      delay: 0,
    },
    {
      icon: 'water',
      iconColor: theme.macroWater,
      value: `${waterL}L`,
      label: `${waterPct}% hydrated`,
      onPress: onWaterPress,
      highlight: waterMl >= waterTargetMl,
      delay: 80,
    },
    {
      icon: 'flame',
      iconColor: streak > 0 ? '#F97316' : theme.textMuted,
      value: `${streak}`,
      label: streak === 1 ? 'day streak' : 'day streak',
      highlight: streak >= 3,
      delay: 160,
    },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </View>
  );
};

export default QuickStatsRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
