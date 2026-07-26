import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

import { useTheme } from '../context/ThemeContext';
import { showSmartToast } from './SmartToast';
import { generateText } from '../services/geminiVisionService';

const MOCK_TRANSCRIPT = 'I ate 2 rotis and a bowl of dal';

const FALLBACK_RESPONSE =
  'Nice meal choice! Two rotis and a bowl of dal are roughly around 280 to 350 calories, with a good balance of carbs and protein.';

export default function VoiceCoachButton() {
  const { theme } = useTheme();

  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const mountedRef = useRef(true);

  const isBusy = isListening || isThinking;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopPulse();
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPulse = () => {
    pulseLoopRef.current?.stop();

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.22,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoopRef.current.start();
  };

  const stopPulse = () => {
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;

    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const getGeminiCoachResponse = async () => {
    const prompt = `
You are Sattva, a friendly Indian AI nutrition coach.

The user said: "${MOCK_TRANSCRIPT}"

Reply in 2 short spoken-style sentences.
Estimate calories around 280 to 350 kcal.
Praise the dal for protein and the rotis for energy.
Keep it natural, supportive, and easy to understand.
Do not use markdown or bullet points.
`;

    try {
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini timeout')), 12000);
      });

      const response = await Promise.race([
        generateText(prompt),
        timeoutPromise,
      ]);

      if (typeof response === 'string' && response.trim().length > 0) {
        return response.trim();
      }

      return FALLBACK_RESPONSE;
    } catch (error) {
      console.log('[VoiceCoachButton] Gemini failed:', error);
      return FALLBACK_RESPONSE;
    }
  };

  const speakCoachResponse = async (response: string) => {
    try {
      await Speech.stop();

      showSmartToast({
        message: 'Coach is speaking...',
        icon: 'volume-high',
        duration: 3000,
      });

      Speech.speak(response, {
        language: 'en-IN',
        pitch: 1.05,
        rate: 0.9,
        onDone: () => {
          if (!mountedRef.current) return;
          setIsThinking(false);
        },
        onStopped: () => {
          if (!mountedRef.current) return;
          setIsThinking(false);
        },
        onError: error => {
          console.log('[VoiceCoachButton] Speech error:', error);
          if (!mountedRef.current) return;
          setIsThinking(false);
          Alert.alert('Voice Error', 'Could not play the coach response.');
        },
      });
    } catch (error) {
      console.log('[VoiceCoachButton] Speech failed:', error);
      if (!mountedRef.current) return;
      setIsThinking(false);
      Alert.alert('Voice Error', 'Could not start voice response.');
    }
  };

  const handlePress = async () => {
    if (isBusy) return;

    try {
      await Speech.stop();

      setIsListening(true);
      startPulse();

      showSmartToast({
        message: 'Listening demo...',
        icon: 'mic',
        duration: 2200,
      });

      await new Promise(resolve => setTimeout(resolve, 2200));

      if (!mountedRef.current) return;

      setIsListening(false);
      stopPulse();

      setIsThinking(true);

      showSmartToast({
        message: `"${MOCK_TRANSCRIPT}"`,
        icon: 'text',
        duration: 2600,
      });

      const response = await getGeminiCoachResponse();

      if (!mountedRef.current) return;

      await speakCoachResponse(response);
    } catch (error) {
      console.log('[VoiceCoachButton] Failed:', error);

      if (!mountedRef.current) return;

      setIsListening(false);
      setIsThinking(false);
      stopPulse();

      Alert.alert(
        'Voice Coach Error',
        'Something went wrong while preparing the voice response.'
      );
    }
  };

  const buttonColor = isThinking
    ? theme.accent || theme.primary
    : theme.primary;

  const iconName = isListening
    ? 'mic'
    : isThinking
      ? 'ellipsis-horizontal'
      : 'mic';

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseCircle,
          {
            backgroundColor: theme.primary,
            transform: [{ scale: pulseAnim }],
            opacity: isListening ? 0.3 : 0,
          },
        ]}
      />

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: buttonColor,
            opacity: isBusy ? 0.85 : 1,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={isBusy}
      >
        <Ionicons name={iconName} size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 2,
  },
  pulseCircle: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 1,
  },
});