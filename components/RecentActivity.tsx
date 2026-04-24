/**
 * Sattva — Recent Activity Feed
 * Theme-aware activity cards with swipe-to-delete animation.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface Activity {
  id: string;
  name: string;
  calories: number;
  time: string;
  type: 'food' | 'exercise' | 'water' | 'cardio' | 'weight' | 'manual';
  amount?: string;
  intensity?: string;
  duration?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
  createdAt?: any;
}

interface RecentActivityProps {
  activities: Activity[];
  onDelete?: (activity: Activity) => void;
}

// ── Single row ────────────────────────────────────────────────────────────────
function ActivityRow({
  activity,
  onDelete,
}: {
  activity: Activity;
  onDelete?: (a: Activity) => void;
}) {
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  const getIcon = (): string => {
    switch (activity.type) {
      case 'water':   return 'water';
      case 'cardio':  return 'walk';
      case 'weight':  return 'barbell';
      case 'food':
      case 'manual':  return 'restaurant';
      default: {
        const n = (activity.name || '').toLowerCase();
        if (n.includes('walk') || n.includes('run')) return 'walk';
        if (n.includes('barbell') || n.includes('gym')) return 'barbell';
        return 'restaurant';
      }
    }
  };

  const getColor = (): string => {
    switch (activity.type) {
      case 'water':  return theme.macroWater;
      case 'cardio': return theme.info;
      case 'weight': return theme.macroProtein;
      case 'food':
      case 'manual': return theme.success;
      default:       return theme.primary;
    }
  };

  const isExercise = ['cardio', 'weight', 'exercise'].includes(activity.type);
  const color = getColor();

  const confirmDelete = () => {
    Alert.alert(
      'Remove Entry',
      `Remove "${activity.name}" from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Animated.timing(translateX, {
              toValue: -420,
              duration: 240,
              useNativeDriver: true,
            }).start(() => onDelete?.(activity));
          },
        },
      ]
    );
  };

  return (
    <Animated.View style={{ transform: [{ translateX }] }}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadow.shadowColor,
          },
        ]}
      >
        {/* Colored left bar */}
        <View style={[styles.colorBar, { backgroundColor: color }]} />

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
          <Ionicons name={getIcon() as any} size={20} color={color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {activity.name || ''}
            </Text>
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {activity.time || ''}
            </Text>
          </View>

          {activity.type === 'water' ? (
            <Text style={[styles.sub, { color: theme.primary }]}>
              {activity.amount || '250ml'} logged
            </Text>
          ) : isExercise ? (
            <View style={styles.exerciseRow}>
              <Ionicons name="flame" size={12} color="#F97316" />
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                {activity.calories} cal burned
                {activity.duration ? ` · ${activity.duration} min` : ''}
                {activity.intensity ? ` · ${activity.intensity}` : ''}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                {activity.calories} kcal
              </Text>
              {(activity.protein || activity.carbs || activity.fat) ? (
                <Text style={[styles.macros, { color: theme.textLight }]}>
                  {[
                    activity.protein ? `P ${activity.protein}g` : null,
                    activity.carbs   ? `C ${activity.carbs}g`   : null,
                    activity.fat     ? `F ${activity.fat}g`     : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Delete button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={confirmDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={16} color={theme.error} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────
const RecentActivity = React.memo(({ activities, onDelete }: RecentActivityProps) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>Today's Log</Text>
        {activities.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.countText, { color: theme.primary }]}>
              {activities.length}
            </Text>
          </View>
        )}
      </View>

      {activities.length === 0 ? (
        // Empty state
        <View
          style={[
            styles.emptyState,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="restaurant-outline" size={28} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No meals logged yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Tap the + button below to log your first meal
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {activities.map((activity, i) => (
            <ActivityRow
              key={`${activity.id}-${i}`}
              activity={activity}
              onDelete={onDelete}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default RecentActivity;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  list: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 12,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
  },
  sub: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macros: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 14,
  },
  // Empty state
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
