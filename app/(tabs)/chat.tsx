/**
 * Sattva — AI Coach Chat Screen
 * Context-aware AI nutrition coach powered by Gemini.
 * Features: quick prompts, typing indicator, message history, dark mode.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { doc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { Gradients } from '../../constants/Colors';
import { loadDailySteps } from '../../services/stepService';
import { getStreakCount } from '../../services/logService';
import { ChatSkeletonBubbles } from '../../components/Skeleton';
import { safeAIReply } from '../../services/aiCoach';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: number;
}

interface UserCoachContext {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  calorieTarget: number;
  proteinTarget: number;
  waterTarget: number;
  streak: number;
  steps: number;
  goal: string;
  diet: string;
  coachType: string;
  dietScore: number;
  recentFoods: string[];
}

const QUICK_PROMPTS = [
  'How am I doing today?',
  'What should I eat for lunch?',
  'Suggest an evening snack',
  'Analyze my nutrition this week',
  'Am I drinking enough water?',
  'Help me reach my protein goal',
];

const HISTORY_KEY = '@sattva/chat_history';
const USED_CHAT_KEY = '@sattva/has_used_chat';

function TypingIndicator({ visible }: { visible: boolean }) {
  const { theme } = useTheme();

  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;

    const makeDotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      makeDotAnim(dot1, 0),
      makeDotAnim(dot2, 200),
      makeDotAnim(dot3, 400),
    ];

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [visible, dot1, dot2, dot3]);

  if (!visible) return null;

  return (
    <View
      style={[
        typStyles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          typStyles.avatar,
          {
            backgroundColor: theme.primary + '20',
          },
        ]}
      >
        <Ionicons name="sparkles" size={14} color={theme.primary} />
      </View>

      <View style={typStyles.bubble}>
        {[dot1, dot2, dot3].map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              typStyles.dot,
              {
                backgroundColor: theme.primary,
                opacity: dot,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const { theme } = useTheme();

  const isAI = message.role === 'ai';
  const slideAnim = useRef(new Animated.Value(isAI ? -20 : 20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  return (
    <Animated.View
      style={[
        bubStyles.row,
        isAI ? bubStyles.rowLeft : bubStyles.rowRight,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {isAI ? (
        <View
          style={[
            bubStyles.avatar,
            {
              backgroundColor: theme.primary + '20',
            },
          ]}
        >
          <Ionicons name="sparkles" size={14} color={theme.primary} />
        </View>
      ) : null}

      <View
        style={[
          bubStyles.bubble,
          isAI
            ? [
                bubStyles.aiBubble,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]
            : [
                bubStyles.userBubble,
                {
                  backgroundColor: theme.primary,
                },
              ],
        ]}
      >
        <Text
          style={[
            bubStyles.text,
            {
              color: isAI ? theme.text : '#FFFFFF',
            },
          ]}
        >
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { user } = useUser();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const sendingRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [userCtx, setUserCtx] = useState<UserCoachContext>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0,
    calorieTarget: 2000,
    proteinTarget: 60,
    waterTarget: 2000,
    streak: 0,
    steps: 0,
    goal: 'Maintain Weight',
    diet: 'Veg',
    coachType: 'Friendly',
    dietScore: 80,
    recentFoods: [],
  });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem(HISTORY_KEY);

        if (!mounted) return;

        if (saved) {
          try {
            const parsed: Message[] = JSON.parse(saved);

            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed.slice(-40));
            } else {
              setMessages([createWelcomeMessage()]);
            }
          } catch {
            setMessages([createWelcomeMessage()]);
          }
        } else {
          setMessages([createWelcomeMessage()]);
        }

        const steps = await loadDailySteps();

        if (mounted) {
          setUserCtx(prev => ({
            ...prev,
            steps,
          }));
        }

        await AsyncStorage.setItem(USED_CHAT_KEY, 'true');
      } catch (error) {
        console.error('Chat init failed:', error);

        if (mounted) {
          setMessages([createWelcomeMessage()]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const dateStr = new Date().toISOString().split('T')[0];

    const unsubUser = onSnapshot(
      doc(db, 'users', user.id),
      async snap => {
        if (!snap.exists()) return;

        const data = snap.data();
        const plan = data.generatedPlan;

        const dailyCalories = Number(plan?.dailyCalories) || 2000;
        const proteinTarget = parseInt(plan?.macros?.protein, 10) || 60;
        const waterTarget = parseFloat(plan?.waterIntake) * 1000 || 2000;

        setUserCtx(prev => ({
          ...prev,
          calorieTarget: dailyCalories,
          proteinTarget,
          waterTarget,
          goal:
            data.userProfile?.goal ||
            data.physicalProfile?.goal ||
            'Maintain Weight',
          diet:
            data.userProfile?.dietType ||
            data.physicalProfile?.dietType ||
            'Veg',
          coachType: data.userProfile?.coachType || 'Friendly',
        }));

        try {
          const streakCount = await getStreakCount(
            user.id,
            dailyCalories,
            waterTarget
          );

          setUserCtx(prev => ({
            ...prev,
            streak: streakCount,
          }));
        } catch (error) {
          console.error('Failed to load streak:', error);
        }
      },
      error => {
        console.error('User context listener failed:', error);
      }
    );

    const unsubLog = onSnapshot(
      doc(db, 'users', user.id, 'dailyLogs', dateStr),
      snap => {
        if (!snap.exists()) {
          setUserCtx(prev => ({
            ...prev,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            water: 0,
            dietScore: 80,
            recentFoods: [],
          }));

          return;
        }

        const data = snap.data();

        const foodLogs = Array.isArray(data.foodLogs)
          ? data.foodLogs
          : Array.isArray(data.logs)
            ? data.logs.filter((item: any) => item.type === 'food')
            : [];

        const recentFoods = foodLogs
          .slice(-3)
          .reverse()
          .map((food: any) => food.name)
          .filter(Boolean);

        setUserCtx(prev => {
          const calories = Number(data.consumedCalories) || 0;
          const calorieTarget = prev.calorieTarget || 2000;
          const calPct = Math.round((calories / calorieTarget) * 100);

          let dietScore = 100 - Math.abs(100 - calPct);
          if (dietScore < 0) dietScore = 0;
          if (dietScore > 100) dietScore = 100;

          return {
            ...prev,
            calories,
            protein: Number(data.totalProtein) || 0,
            carbs: Number(data.totalCarbs) || 0,
            fat: Number(data.totalFat) || 0,
            water: Number(data.totalWater) || 0,
            dietScore,
            recentFoods,
          };
        });
      },
      error => {
        console.error('Daily log listener failed:', error);
      }
    );

    return () => {
      unsubUser();
      unsubLog();
    };
  }, [user?.id]);

  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40))).catch(
        error => {
          console.error('Failed to save chat history:', error);
        }
      );
    }
  }, [messages, isLoading]);

  const buildContext = useCallback(() => {
    const calPct = Math.round(
      (userCtx.calories / Math.max(userCtx.calorieTarget, 1)) * 100
    );

    const waterL = (userCtx.water / 1000).toFixed(1);
    const targetL = (userCtx.waterTarget / 1000).toFixed(1);

    let toneInstruction =
      'You are a FRIENDLY and SUPPORTIVE coach. Use positive encouragement, emojis, and gentle nudges.';

    if (userCtx.coachType === 'Strict') {
      toneInstruction =
        'You are a STRICT and DISCIPLINED coach. Use tough love, be direct, and do not encourage excuses.';
    } else if (userCtx.coachType === 'Neutral') {
      toneInstruction =
        'You are a NEUTRAL and FACTUAL coach. Be direct, data-driven, and objective.';
    }

    return `You are Sattva, an Indian AI nutrition coach inside a health app.

Coach personality:
${toneInstruction}

Current user data today:
Calories: ${userCtx.calories} / ${userCtx.calorieTarget} kcal (${calPct}%)
Protein: ${userCtx.protein}g / ${userCtx.proteinTarget}g
Carbs: ${userCtx.carbs}g
Fat: ${userCtx.fat}g
Water: ${waterL}L / ${targetL}L
Steps: ${userCtx.steps.toLocaleString('en-IN')}
Streak: ${userCtx.streak} days
Diet Score: ${userCtx.dietScore}/100
Goal: ${userCtx.goal}
Diet preference: ${userCtx.diet}
Recent foods logged: ${userCtx.recentFoods.join(', ') || 'None yet today'}

Instructions:
Reply in 2 to 4 sentences maximum.
Be specific and practical.
Reference the user's actual data when useful.
Suggest Indian foods and habits.
Do not use markdown, bullet points, or asterisks.
If suggesting a meal, include estimated calories.`;
  }, [userCtx]);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 80);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();

      if (!trimmedText || sendingRef.current) return;

      sendingRef.current = true;

      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: 'user',
        text: trimmedText,
        ts: Date.now(),
      };

      setMessages(prev => [...prev, userMsg]);
      setInputText('');
      setIsTyping(true);
      scrollToBottom(true);

      try {
        const reply = await safeAIReply(
          trimmedText,
          {
            calories: userCtx.calories,
            protein: userCtx.protein,
            carbs: userCtx.carbs,
            fat: userCtx.fat,
            water: userCtx.water,
            calorieTarget: userCtx.calorieTarget,
            proteinTarget: userCtx.proteinTarget,
            waterTarget: userCtx.waterTarget,
            steps: userCtx.steps,
            streak: userCtx.streak,
            goal: userCtx.goal || 'Maintain Weight',
            diet: userCtx.diet || 'Veg',
            coachType: userCtx.coachType || 'Friendly',
            dietScore: userCtx.dietScore,
            recentFoods: userCtx.recentFoods,
            systemContext: buildContext(),
          } as any
        );

        const aiMsg: Message = {
          id: `a_${Date.now()}`,
          role: 'ai',
          text:
            reply ||
            "I'm here with you. Keep logging your meals and hydration so I can guide you better.",
          ts: Date.now(),
        };

        setMessages(prev => [...prev, aiMsg]);
      } catch (error) {
        console.error('Chat Error:', error);

        const fallbackMsg: Message = {
          id: `a_${Date.now()}`,
          role: 'ai',
          text: getLocalFallbackReply(trimmedText, userCtx),
          ts: Date.now(),
        };

        setMessages(prev => [...prev, fallbackMsg]);
      } finally {
        setIsTyping(false);
        sendingRef.current = false;
        scrollToBottom(true);
      }
    },
    [buildContext, scrollToBottom, userCtx]
  );

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);

      const welcome: Message = {
        id: `welcome_${Date.now()}`,
        role: 'ai',
        text: "Namaste! 🙏 I've cleared our conversation. How can I help you today?",
        ts: Date.now(),
      };

      setMessages([welcome]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  if (!user) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <LinearGradient colors={Gradients.PRIMARY as any} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>

          <View>
            <Text style={styles.headerTitle}>Sattva Coach</Text>
            <Text style={styles.headerSub}>AI Nutrition Assistant</Text>
          </View>
        </View>

        <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
          <Ionicons
            name="trash-outline"
            size={18}
            color="rgba(255,255,255,0.85)"
          />
        </TouchableOpacity>
      </LinearGradient>

      <View
        style={[
          styles.quickRow,
          {
            borderBottomColor: theme.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickScroll}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={`${prompt}_${index}`}
              style={[
                styles.quickChip,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => sendMessage(prompt)}
              disabled={isTyping}
            >
              <Text
                style={[
                  styles.quickText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 20 : 0}
      >
        {isLoading ? (
          <ChatSkeletonBubbles />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={[
              styles.messageList,
              {
                paddingBottom: 18,
              },
            ]}
            onContentSizeChange={() => scrollToBottom(false)}
            onLayout={() => scrollToBottom(false)}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <TypingIndicator visible={isTyping} />

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.surfaceMuted,
              },
            ]}
            placeholder="Ask your nutrition coach..."
            placeholderTextColor={theme.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            editable={!isTyping}
            onSubmitEditing={() => {
              if (Platform.OS !== 'ios') {
                sendMessage(inputText);
              }
            }}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  inputText.trim() && !isTyping ? theme.primary : theme.border,
              },
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && !isTyping ? '#FFFFFF' : theme.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function createWelcomeMessage(): Message {
  return {
    id: `welcome_${Date.now()}`,
    role: 'ai',
    text: "Namaste! 🙏 I'm Sattva, your AI nutrition coach. I can read your food logs, goals, water, and activity data. How can I help you today?",
    ts: Date.now(),
  };
}

function getLocalFallbackReply(text: string, ctx: UserCoachContext): string {
  const lower = text.toLowerCase();

  if (lower.includes('water') || lower.includes('hydration')) {
    const remaining = Math.max(ctx.waterTarget - ctx.water, 0);
    return `You have had ${(ctx.water / 1000).toFixed(1)}L water today. Try to drink around ${(remaining / 1000).toFixed(1)}L more slowly through the day.`;
  }

  if (lower.includes('protein')) {
    const remaining = Math.max(ctx.proteinTarget - ctx.protein, 0);
    return `You have logged ${ctx.protein}g protein today. Add around ${remaining}g more with options like paneer, dal, sprouts, curd, eggs, chicken, or soy chunks.`;
  }

  if (
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('eat') ||
    lower.includes('meal')
  ) {
    return `For your goal of ${ctx.goal}, a good Indian option is 2 rotis with dal, sabzi, salad, and curd, around 500 to 650 kcal depending on portion size. Keep it balanced with protein and fiber.`;
  }

  const calPct = Math.round(
    (ctx.calories / Math.max(ctx.calorieTarget, 1)) * 100
  );

  return `Today you are at ${ctx.calories}/${ctx.calorieTarget} kcal, around ${calPct}% of your target. Keep logging meals accurately, drink water, and aim for a balanced Indian meal with protein, carbs, and vegetables.`;
}

const typStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

const bubStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 16,
    gap: 8,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  aiBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 1,
  },
  clearBtn: {
    padding: 8,
  },
  quickRow: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  quickScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageList: {
    paddingTop: 16,
    gap: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    fontWeight: '500',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});