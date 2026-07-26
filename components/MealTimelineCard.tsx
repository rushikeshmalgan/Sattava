import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScheduledMeal, getMealStatus, getMealIcon, formatTimeAgo } from '../services/mealSchedulerService';
import { useTheme } from '../context/ThemeContext';
import { ThemeType } from '../constants/theme';

interface MealTimelineCardProps {
  meals: ScheduledMeal[];
  onLogMeal?: (meal: ScheduledMeal) => void;
}

export default function MealTimelineCard({ meals, onLogMeal }: MealTimelineCardProps) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 Today Meal Plan</Text>
      <Text style={styles.subtitle}>Today's Indian Meal Schedule</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list} nestedScrollEnabled={true}>
        {meals.map((meal, idx) => {
          const status = getMealStatus(meal);
          const icon = getMealIcon(meal.mealCategory);
          const isCurrent = status === 'current';
          const isPast = status === 'past';

          return (
            <View key={meal.id} style={styles.timelineRow}>
              {/* Timeline line */}
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.dot,
                  isCurrent && styles.dotCurrent,
                  isPast && styles.dotPast,
                ]} />
                {idx < meals.length - 1 && (
                  <View style={[styles.line, isPast && styles.linePast]} />
                )}
              </View>

              {/* Meal card */}
              <TouchableOpacity
                style={[
                  styles.mealCard,
                  isCurrent && styles.mealCardCurrent,
                  isPast && styles.mealCardPast,
                ]}
                onPress={() => onLogMeal?.(meal)}
                activeOpacity={0.8}
              >
                <View style={styles.mealHeader}>
                  <View style={styles.mealTitleRow}>
                    <Text style={styles.mealIcon}>{icon}</Text>
                    <View style={styles.mealTitles}>
                      <Text style={[styles.mealLabel, isCurrent && styles.mealLabelCurrent]}>
                        {meal.label}
                      </Text>
                      <Text style={styles.mealLabelHindi}>{meal.labelHindi}</Text>
                    </View>
                  </View>

                  <View style={styles.mealRight}>
                    <Text style={styles.mealTime}>{meal.timeDisplay}</Text>
                    <Text style={styles.mealTimeAgo}>{formatTimeAgo(meal.time)}</Text>
                    {isPast ? (
                      <View style={styles.pastBadge}>
                        <Text style={styles.pastBadgeText}>Done</Text>
                      </View>
                    ) : isCurrent ? (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Smart Recommendation</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.foodList}>
                  {meal.items.slice(0, 3).map((item: string, i: number) => (
                    <Text key={i} style={[styles.foodItem, isPast && styles.foodItemPast]}>
                      • {item}
                    </Text>
                  ))}
                  {meal.items.length > 3 && (
                    <Text style={styles.moreItems}>+{meal.items.length - 3} more</Text>
                  )}
                </View>

                <View style={styles.mealFooter}>
                  <Text style={styles.calText}>~{meal.estimatedCalories} kcal</Text>
                  {!isPast && (
                    <Text style={styles.logHint}>Tap to log →</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: ThemeType) => StyleSheet.create({
  container: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 12,
  },
  list: {
    maxHeight: 400,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 16,
    paddingTop: 14,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.border,
    borderWidth: 2,
    borderColor: theme.textMuted,
  },
  dotCurrent: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotPast: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: theme.border,
    marginTop: 2,
  },
  linePast: {
    backgroundColor: theme.accent,
    opacity: 0.4,
  },
  mealCard: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mealCardCurrent: {
    backgroundColor: `${theme.primary}10`,
    borderColor: theme.primary,
  },
  mealCardPast: {
    opacity: 0.6,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  mealIcon: {
    fontSize: 20,
  },
  mealTitles: {
    flex: 1,
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
  mealLabelCurrent: {
    color: theme.primary,
  },
  mealLabelHindi: {
    fontSize: 10,
    color: theme.textMuted,
    fontWeight: '500',
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text,
  },
  mealTimeAgo: {
    fontSize: 10,
    color: theme.textMuted,
  },
  pastBadge: {
    backgroundColor: `${theme.accent}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  pastBadgeText: {
    fontSize: 9,
    color: theme.accent,
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: `${theme.primary}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  currentBadgeText: {
    fontSize: 9,
    color: theme.primary,
    fontWeight: '700',
  },
  foodList: {
    marginBottom: 6,
  },
  foodItem: {
    fontSize: 11,
    color: theme.textMuted,
    lineHeight: 16,
  },
  foodItemPast: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  moreItems: {
    fontSize: 10,
    color: theme.primary,
    fontWeight: '600',
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 6,
    marginTop: 2,
  },
  calText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
  },
  logHint: {
    fontSize: 10,
    color: theme.primary,
    fontWeight: '600',
  },
});
