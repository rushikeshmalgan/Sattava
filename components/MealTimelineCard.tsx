import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { ScheduledMeal, getMealStatus, getMealIcon, formatTimeAgo } from '../services/mealSchedulerService';

interface MealTimelineCardProps {
  meals: ScheduledMeal[];
  onLogMeal?: (meal: ScheduledMeal) => void;
}

export default function MealTimelineCard({ meals, onLogMeal }: MealTimelineCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 Aaj Ka Meal Plan</Text>
      <Text style={styles.subtitle}>Today's Indian Meal Schedule</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
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
                        <Text style={styles.currentBadgeText}>Now!</Text>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.SURFACE_ELEVATED,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.TEXT_MAIN,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
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
    backgroundColor: Colors.BORDER,
    borderWidth: 2,
    borderColor: Colors.TEXT_MUTED,
  },
  dotCurrent: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY_DARK,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotPast: {
    backgroundColor: Colors.SUCCESS,
    borderColor: Colors.SECONDARY_DARK,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.BORDER,
    marginTop: 2,
  },
  linePast: {
    backgroundColor: Colors.SUCCESS,
    opacity: 0.4,
  },
  mealCard: {
    flex: 1,
    backgroundColor: Colors.SURFACE,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  mealCardCurrent: {
    backgroundColor: `${Colors.PRIMARY}10`,
    borderColor: Colors.PRIMARY,
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
    color: Colors.TEXT_MAIN,
  },
  mealLabelCurrent: {
    color: Colors.PRIMARY,
  },
  mealLabelHindi: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: '500',
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.TEXT_MAIN,
  },
  mealTimeAgo: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
  },
  pastBadge: {
    backgroundColor: `${Colors.SUCCESS}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  pastBadgeText: {
    fontSize: 9,
    color: Colors.SUCCESS,
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: `${Colors.PRIMARY}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  currentBadgeText: {
    fontSize: 9,
    color: Colors.PRIMARY,
    fontWeight: '700',
  },
  foodList: {
    marginBottom: 6,
  },
  foodItem: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    lineHeight: 16,
  },
  foodItemPast: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  moreItems: {
    fontSize: 10,
    color: Colors.PRIMARY,
    fontWeight: '600',
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    paddingTop: 6,
    marginTop: 2,
  },
  calText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.TEXT_MAIN,
  },
  logHint: {
    fontSize: 10,
    color: Colors.PRIMARY,
    fontWeight: '600',
  },
});
