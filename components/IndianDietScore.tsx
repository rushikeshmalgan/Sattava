import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface IndianDietScoreProps {
  score: number;
  grade: string;
  message: string;
  breakdown?: { protein: number; fiber: number; calories: number; water: number; balance: number };
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return Colors.SUCCESS;
  if (score >= 55) return Colors.PRIMARY;
  return Colors.ERROR;
};

const SCORE_SEGMENTS = [
  { label: 'Protein', color: '#DC2626', key: 'protein', max: 25 },
  { label: 'Fiber',   color: '#059669', key: 'fiber',   max: 20 },
  { label: 'Calories',color: Colors.PRIMARY, key: 'calories', max: 25 },
  { label: 'Water',   color: '#0284C7', key: 'water',   max: 15 },
  { label: 'Balance', color: '#9B59B6', key: 'balance', max: 15 },
];

export default function IndianDietScore({ score, grade, message, breakdown }: IndianDietScoreProps) {
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const color = getScoreColor(score);

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const displayScore = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
  });

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>🇮🇳 Indian Diet Score</Text>
        <View style={[styles.gradeBadge, { backgroundColor: `${color}20`, borderColor: color }]}>
          <Text style={[styles.gradeText, { color }]}>{grade}</Text>
        </View>
      </View>

      {/* Score display */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreCircle, { borderColor: color }]}>
          <Animated.Text style={[styles.scoreNumber, { color }]}>
            {score}
          </Animated.Text>
          <Text style={styles.scoreOf}>/100</Text>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
          {breakdown && (
            <View style={styles.segmentsContainer}>
              {SCORE_SEGMENTS.map(seg => {
                const val = (breakdown as any)[seg.key] || 0;
                const pct = (val / seg.max) * 100;
                return (
                  <View key={seg.key} style={styles.segRow}>
                    <Text style={styles.segLabel}>{seg.label}</Text>
                    <View style={styles.segBarBg}>
                      <View style={[styles.segBarFill, { width: `${pct}%`, backgroundColor: seg.color }]} />
                    </View>
                    <Text style={[styles.segValue, { color: seg.color }]}>{val}/{seg.max}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* ICMR comparison note */}
      <View style={styles.icmrNote}>
        <Text style={styles.icmrText}>📊 Based on ICMR Indian Dietary Guidelines</Text>
      </View>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.TEXT_MAIN,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.SURFACE,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '900',
  },
  scoreOf: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: '600',
  },
  messageBox: {
    flex: 1,
  },
  messageText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    marginBottom: 8,
    lineHeight: 18,
  },
  segmentsContainer: {
    gap: 4,
  },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segLabel: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    width: 52,
    fontWeight: '600',
  },
  segBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.SURFACE_DARK,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  segValue: {
    fontSize: 9,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  icmrNote: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  icmrText: {
    fontSize: 11,
    color: Colors.TEXT_LIGHT,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
