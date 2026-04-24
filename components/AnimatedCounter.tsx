/**
 * Sattva — Animated Counter
 * Counts up from 0 to a target value with easing. Premium perceived quality.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TextStyle } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: TextStyle;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 800,
  style,
  suffix = '',
  prefix = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(0);

  useEffect(() => {
    anim.setValue(prevValue.current);
    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();
    prevValue.current = value;
  }, [value]);

  const displayText = anim.interpolate({
    inputRange: [0, Math.max(value, 1)],
    outputRange: [
      `${prefix}0${suffix}`,
      `${prefix}${value.toFixed(decimals)}${suffix}`,
    ],
  });

  return <Animated.Text style={style}>{displayText}</Animated.Text>;
}
