import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/Colors';
import { StepData, getStepGoalProgress, getStepMotivation } from '../services/stepService';

interface StepCounterWidgetProps {
  stepData: StepData;
  goal?: number;
  isTracking: boolean;
  onToggle: () => void;
}

const RING_SIZE = 120;
const RING_STROKE = 10;
const Radius = (RING_SIZE - RING_STROKE) / 2;
const Circumference = 2 * Math.PI * Radius;

export default function StepCounterWidget({
  stepData, goal = 8000, isTracking, onToggle,
}: StepCounterWidgetProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressPct = getStepGoalProgress(stepData.steps, goal);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressPct]);

  useEffect(() => {
    if (isTracking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isTracking]);

  const dashOffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Circumference, 0],
  });

  return (
    <LinearGradient
      colors={Gradients.STEPS_CARD}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>👟 Aaj ke Kadam</Text>
        <TouchableOpacity onPress={onToggle} style={[styles.trackBtn, isTracking && styles.trackBtnActive]}>
          <Text style={styles.trackBtnText}>{isTracking ? '⏹ Stop' : '▶ Track'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainRow}>
        {/* Ring Progress */}
        <Animated.View style={[styles.ringContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.ringInner}>
            <Text style={styles.stepCount}>{stepData.steps.toLocaleString('en-IN')}</Text>
            <Text style={styles.stepLabel}>steps</Text>
          </View>
          {/* Simple progress circle using View trick */}
          <View style={styles.progressRing}>
            <View style={[styles.progressArc, { opacity: progressPct / 100 }]} />
          </View>
        </Animated.View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stepData.calories}</Text>
            <Text style={styles.statLabel}>kcal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stepData.distanceKm}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{progressPct}%</Text>
            <Text style={styles.statLabel}>goal</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.motivation}>{getStepMotivation(stepData.steps, goal)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  trackBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  trackBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  trackBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  ringContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ringInner: {
    alignItems: 'center',
  },
  stepCount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  progressRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  progressArc: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#fff',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  motivation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
});
