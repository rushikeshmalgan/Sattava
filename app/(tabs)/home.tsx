import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CaloriesCard from '../../components/CaloriesCard';
import FestivalBanner from '../../components/FestivalBanner';
import HomeHeader from '../../components/HomeHeader';
import MealTimelineCard from '../../components/MealTimelineCard';
import RecentActivity, { Activity } from '../../components/RecentActivity';
import WaterIntakeCard from '../../components/WaterIntakeCard';
import WeeklyCalendar from '../../components/WeeklyCalendar';
import HealthyStreak from '../../components/HealthyStreak';
import DailyTip from '../../components/DailyTip';
import QuickStatsRow from '../../components/QuickStatsRow';
import StreakRewardsCard from '../../components/StreakRewardsCard';
import TodayMissionsCard from '../../components/TodayMissionsCard';
import SmartCoachSuggestionCard from '../../components/SmartCoachSuggestionCard';
import CoachSelectionModal, { CoachType } from '../../components/CoachSelectionModal';
import SuggestFoodModal from '../../components/SuggestFoodModal';
import VoiceCoachButton from '../../components/VoiceCoachButton';
import { showSmartToast } from '../../components/SmartToast';
import { ActivityListSkeleton, CaloriesCardSkeleton, QuickStatsRowSkeleton } from '../../components/Skeleton';
import { getDailyHealthTip } from '../../services/geminiVisionService';
import { Colors } from '../../constants/Colors';
import { ThemeType } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentFestival } from '../../constants/IndianFestivals';
import { db } from '../../firebaseConfig';
import { addActivityLog, updateUserTargets, updateUserProfile } from '../../services/userService';
import { deleteFoodLog, getStreakCount } from '../../services/logService';
import { startStepCounting, loadDailySteps, StepData } from '../../services/stepService';
import { getTodaysSchedule } from '../../services/mealSchedulerService';
import { ScheduledMeal } from '../../data/mealPlans';

export default function Home() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [targets, setTargets] = useState({ calories: 2000, carbs: 250, protein: 60, fat: 70, water: 2.0 });
  const [consumed, setConsumed] = useState({ calories: 0, caloriesBurned: 0, carbs: 0, protein: 0, fat: 0, water: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editableTargets, setEditableTargets] = useState({ calories: 2000, carbs: '250', protein: '60', fat: '70', water: '2000' });
  const [isSaving, setIsSaving] = useState(false);

  // Loading states — skeleton system
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { theme, isDark } = useTheme();
  const [streak, setStreak] = useState(0);

  // Step counter
  const [stepData, setStepData] = useState<StepData>({ steps: 0, calories: 0, distanceKm: 0, activeMinutes: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);
  
  const [isPro, setIsPro] = useState(false);

  // Load Pro Status
  useEffect(() => {
    AsyncStorage.getItem('isPro').then(val => setIsPro(val === 'true'));
  }, []);
  const stopTrackingRef = useRef<(() => void) | null>(null);

  // Meal plan
  const [todaysMeals, setTodaysMeals] = useState<ScheduledMeal[]>([]);

  // Suggest Food Modal
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [userGoal, setUserGoal] = useState('Maintain Weight');

  // Coach Selection
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachType, setCoachType] = useState<string | null>(null);

  // Festival
  const festival = getCurrentFestival();
  const [showFestivalBanner, setShowFestivalBanner] = useState(!!festival);

  // Screen entrance animation
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    loadDailySteps().then(s => setStepData(prev => ({ ...prev, steps: s })));
    getTodaysSchedule().then(setTodaysMeals).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const unsubUser = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.userProfile?.goal) {
          setUserGoal(data.userProfile.goal);
      }
      
      const plan = data.generatedPlan;
      if (plan) {
        setTargets({
          calories: plan.dailyCalories || 2000,
          carbs:    parseInt(plan.macros?.carbs)    || 250,
          protein:  parseInt(plan.macros?.protein)  || 60,
          fat:      parseInt(plan.macros?.fats)     || 70,
          water:    parseFloat(plan.waterIntake)    || 2.0,
        });
      }
      
      if (data.userProfile?.coachType) {
          setCoachType(data.userProfile.coachType);
      } else {
          setShowCoachModal(true);
      }
    });

    const dateStr = selectedDate.toISOString().split('T')[0];
    const unsubLogs = onSnapshot(doc(db, 'users', user.id, 'dailyLogs', dateStr), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setConsumed({
          calories:       d.consumedCalories || 0,
          caloriesBurned: d.caloriesBurned   || 0,
          carbs:          d.totalCarbs       || 0,
          protein:        d.totalProtein     || 0,
          fat:            d.totalFat         || 0,
          water:          d.totalWater       || 0,
        });
        setActivities([...d.logs || []].reverse());
      } else {
        setConsumed({ calories: 0, caloriesBurned: 0, carbs: 0, protein: 0, fat: 0, water: 0 });
        setActivities([]);
      }
      // Mark initial load complete after first Firestore response
      setIsInitialLoad(false);
    });

    getStreakCount(user.id, targets.calories, targets.water * 1000).then(setStreak);

    // Initial Coach Triggers and Scheduling
    const now = new Date();

    // Smart Water Reminder (Legacy UI Toast)
    if (now.getHours() >= 16 && consumed.water < 1000) {
      const t = setTimeout(() => {
        showSmartToast({ message: "You're behind on water today! 🚰", icon: 'water' });
      }, 5000);
      return () => { unsubUser(); unsubLogs(); clearTimeout(t); };
    }

    return () => { unsubUser(); unsubLogs(); };
  }, [user?.id, selectedDate]);

  useEffect(() => { fetchTip(); }, [user?.id]);

  const fetchTip = async () => {
    setLoadingTip(true);
    try {
      const tip = await getDailyHealthTip({
        calories: consumed.calories,
        water:    consumed.water,
        steps:    stepData.steps,
      });
      setDailyTip(tip);
    } catch {
      setDailyTip('Start your day with a glass of warm water and a handful of almonds for sustained energy.');
    } finally {
      setLoadingTip(false);
    }
  };

  const runSamosaDemo = async () => {
    if (!user?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const dateStr = selectedDate.toISOString().split('T')[0];
    const demoFood = {
        id: Date.now().toString(),
        name: 'Samosa (4 pieces)',
        calories: 1200,
        protein: 15,
        carbs: 120,
        fat: 80,
        amount: '4',
        unit: 'pieces',
        timestamp: new Date().toISOString()
    };
    await addActivityLog(user.id, dateStr, { type: 'food', ...demoFood } as any);
    Alert.alert("Demo Mode", "Logged 4 Samosas (1200 kcal).");
  };

  const toggleStepTracking = async () => {
    if (isTracking) {
      setIsTracking(false);
      stopTrackingRef.current?.();
      stopTrackingRef.current = null;
    } else {
      setIsTracking(true);
      const stop = await startStepCounting(70, (data) => setStepData(data));
      stopTrackingRef.current = stop;
    }
  };

  const handleEditPress = () => {
    setEditableTargets({
      calories: targets.calories,
      carbs:    targets.carbs.toString(),
      protein:  targets.protein.toString(),
      fat:      targets.fat.toString(),
      water:    (targets.water * 1000).toString(),
    });
    setIsEditModalVisible(true);
  };

  const handleSaveTargets = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await updateUserTargets(user.id, {
        calories: Number(editableTargets.calories),
        macros: {
          carbs:   `${editableTargets.carbs}g`,
          protein: `${editableTargets.protein}g`,
          fats:    `${editableTargets.fat}g`,
        },
        waterIntake: `${parseFloat(editableTargets.water) / 1000}L`,
      });
      setIsEditModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddWater = async () => {
    if (!user?.id) return;
    const dateStr = selectedDate.toISOString().split('T')[0];

    const logWater = async () => {
        try {
            await addActivityLog(user.id!, dateStr, {
              id:       Date.now().toString(),
              name:     'Paani (Water)',
              calories: 0,
              time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type:     'water',
              amount:   '250ml',
            });
            showSmartToast({ message: "Hydration on point 💧", icon: "water" });
        } catch (e) {
            Alert.alert("Error", "Could not log water.");
        }
    };

    logWater();
  };

  const handleSelectCoach = async (type: CoachType) => {
      if (!user?.id) return;
      try {
          await updateUserProfile(user.id, { 'userProfile.coachType': type });
          setCoachType(type);
          setShowCoachModal(false);
      } catch (err) {
          Alert.alert("Error", "Could not save coach preference.");
      }
  };

  const insets = useSafeAreaInsets();
  const totalBurned = consumed.caloriesBurned + stepData.calories;
  const waterTargetMl = targets.water * 1000;

  const styles = getStyles(theme);

  if (!user) return null;

  return (
    <View style={styles.mainContainer}>
      <View style={{ height: insets.top, backgroundColor: theme.background }} />

      <Animated.View
        style={[
          { flex: 1 },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        >
          {/* ── Header ──────────────────────────────────────────── */}
          <LinearGradient
            colors={isDark
              ? [theme.card, theme.background]
              : [Colors.SURFACE_ELEVATED, Colors.BACKGROUND]}
            style={styles.headerSection}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onLongPress={runSamosaDemo} 
              delayLongPress={3000}
            >
              <HomeHeader />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: 0.8, gap: 8 }}>
                <Ionicons name="body" size={14} color={theme.primary} />
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                    {userGoal} • Active
                </Text>
            </View>
          </LinearGradient>

          {/* ── Festival Banner ──────────────────────────────────── */}
          {showFestivalBanner && festival && (
            <FestivalBanner
              festival={festival}
              onDismiss={() => setShowFestivalBanner(false)}
            />
          )}

          {/* ── Weekly Calendar ──────────────────────────────────── */}
          <WeeklyCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

          <View style={styles.content}>
            {isInitialLoad ? (
              // ── SKELETON LOADING STATE ───────────────────────────
              <>
                <CaloriesCardSkeleton />
                <QuickStatsRowSkeleton />
                <ActivityListSkeleton />
              </>
            ) : (
              // ── REAL CONTENT ─────────────────────────────────────
              <>
                <StreakRewardsCard streak={streak} />
                
                <TodayMissionsCard 
                  waterMl={consumed.water}
                  calories={consumed.calories}
                  targetCalories={targets.calories}
                  mealsLogged={activities.filter(a => a.type === 'food').length}
                />

                {/* AI Strategy Deck — Your AI Tools */}
                <View style={styles.strategyDeck}>
                    <Text style={styles.deckTitle}>AI Strategy Deck</Text>
                    
                    <View style={{ overflow: 'hidden', borderRadius: 20 }}>
                        <View style={styles.deckRow}>
                            <TouchableOpacity 
                                style={[styles.deckButton, { backgroundColor: theme.primary }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (!isPro) router.push('/subscription');
                                    else setShowSuggestModal(true);
                                }}
                            >
                                <View style={styles.deckIconBg}>
                                    <Ionicons name="sparkles" size={18} color="#fff" />
                                </View>
                                <Text style={styles.deckButtonText}>Smart Picks</Text>
                                {!isPro && <Ionicons name="lock-closed" size={14} color="#fff" style={{ marginLeft: 6 }} />}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.deckButton, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (!isPro) router.push('/subscription');
                                    else router.push('/combo-builder');
                                }}
                            >
                                <View style={[styles.deckIconBg, { backgroundColor: theme.surfaceMuted }]}>
                                    <Ionicons name="color-wand" size={18} color={theme.text} />
                                </View>
                                <Text style={[styles.deckButtonText, { color: theme.text }]}>Combo Builder</Text>
                                {!isPro && <Ionicons name="lock-closed" size={14} color={theme.text} style={{ marginLeft: 6 }} />}
                            </TouchableOpacity>
                        </View>

                        {activities.length === 0 && (
                            <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }}>
                                    <Ionicons name="lock-closed" size={24} color={theme.text} />
                                    <Text style={{ color: theme.text, fontWeight: '700', marginTop: 8 }}>Log your first meal to unlock AI insights</Text>
                                </View>
                            </BlurView>
                        )}
                    </View>
                </View>

                {/* Hero: Calories Card */}
                <CaloriesCard
                  consumed={consumed.calories}
                  burned={totalBurned}
                  target={targets.calories}
                  onEdit={handleEditPress}
                  macros={{
                    carbs:   Math.max(targets.carbs   - consumed.carbs,   0),
                    protein: Math.max(targets.protein - consumed.protein, 0),
                    fat:     Math.max(targets.fat     - consumed.fat,     0),
                  }}
                />

                {/* AI Daily Tip — Above fold differentiator */}
                <DailyTip
                  theme={theme}
                  tip={dailyTip || undefined}
                  onRefresh={fetchTip}
                  loading={loadingTip}
                />

                {/* Quick Stats Row: Steps | Water | Streak */}
                <QuickStatsRow
                  steps={stepData.steps}
                  waterMl={consumed.water}
                  waterTargetMl={waterTargetMl}
                  streak={streak}
                  onWaterPress={handleAddWater}
                  onStepsPress={toggleStepTracking}
                />

                {/* Healthy Streak Card */}
                <HealthyStreak streak={streak} theme={theme} />

                {/* Today's Meal Plan (if available) */}
                {todaysMeals.length > 0 && (
                  <MealTimelineCard
                    meals={todaysMeals}
                    onLogMeal={(meal) => {
                      router.push({
                        pathname: '/food-search',
                        params: { query: meal.items[0] ?? meal.label },
                      });
                    }}
                  />
                )}

                {/* Recent Activity Feed */}
                <RecentActivity
                  activities={activities}
                  onDelete={async (activity) => {
                    if (!user?.id) return;
                    const dateStr = selectedDate.toISOString().split('T')[0];
                    try {
                      await deleteFoodLog(user.id, dateStr, activity as any);
                    } catch {
                      // Firestore listener reverts UI automatically
                    }
                  }}
                />
              </>
            )}
          </View>
        </ScrollView>

        {/* Floating Voice Coach Button */}
        <View style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 100 }}>
            <VoiceCoachButton />
        </View>

      </Animated.View>

      {/* ── Coach Selection Modal ──────────────────────────────────── */}
      <CoachSelectionModal 
        isVisible={showCoachModal} 
        onSelect={handleSelectCoach}
        onClose={() => setShowCoachModal(false)}
      />

      {/* ── AI Food Suggestion Modal ───────────────────────────────── */}
      <SuggestFoodModal 
        visible={showSuggestModal} 
        onClose={() => setShowSuggestModal(false)} 
        theme={theme}
        userGoal={userGoal}
      />

      {/* ── Edit Goals Modal ─────────────────────────────────────── */}
      <Modal
        transparent
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Daily Targets</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Daily Calories Goal', key: 'calories', icon: 'flame-outline', color: theme.primary },
                  { label: 'Water Target (ml)',    key: 'water',    icon: 'water-outline', color: theme.macroWater },
                ].map(field => (
                  <View key={field.key} style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{field.label}</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name={field.icon as any} size={20} color={field.color} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={(editableTargets as any)[field.key].toString()}
                        onChangeText={t =>
                          setEditableTargets(prev => ({
                            ...prev,
                            [field.key]: field.key === 'calories' ? Number(t) || 0 : t,
                          }))
                        }
                        keyboardType="numeric"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                ))}

                <Text style={styles.sectionTitle}>Macronutrient Targets</Text>
                <View style={styles.macroGrid}>
                  {[
                    { label: 'Protein g', key: 'protein', color: theme.macroProtein },
                    { label: 'Fats g',    key: 'fat',     color: theme.macroFat     },
                    { label: 'Carbs g',   key: 'carbs',   color: theme.macroCarbs   },
                  ].map(m => (
                    <View key={m.key} style={styles.macroBox}>
                      <Text style={[styles.macroBoxLabel, { color: m.color }]}>{m.label}</Text>
                      <View style={styles.macroInputWrapper}>
                        <TextInput
                          style={styles.macroInput}
                          value={(editableTargets as any)[m.key]}
                          onChangeText={t => setEditableTargets(prev => ({ ...prev, [m.key]: t }))}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={theme.textMuted}
                        />
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.border }]}
                    onPress={() => setIsEditModalVisible(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.primary }]}
                    onPress={handleSaveTargets}
                    disabled={isSaving}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSaving ? 'Saving…' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (theme: ThemeType) => StyleSheet.create({
  mainContainer:      { flex: 1, backgroundColor: theme.background },
  container:          { flex: 1, backgroundColor: theme.background },
  scrollContent:      { flexGrow: 1 },
  headerSection:      { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  content:            { flex: 1, marginTop: 4, paddingHorizontal: 16 },
  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  keyboardView:       { width: '100%' },
  modalContent:       { backgroundColor: theme.card, borderRadius: 24, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:         { fontSize: 20, fontWeight: '800', color: theme.text },
  strategyDeck:       { marginTop: 16, marginBottom: 8 },
  deckTitle:          { fontSize: 14, fontWeight: '800', color: theme.text, marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },
  deckRow:            { flexDirection: 'row', gap: 12 },
  deckButton:         { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, gap: 10, ...theme.shadow },
  deckIconBg:         { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  deckButtonText:     { color: '#fff', fontSize: 13, fontWeight: '800' },
  inputLabel:         { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, marginTop: 12 },
  inputWrapper:       { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border },
  inputIcon:          { marginRight: 10 },
  input:              { flex: 1, height: 48, fontSize: 16, color: theme.text },
  inputContainer:     { marginBottom: 4 },
  modalButtons:       { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 10 },
  modalButton:        { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelButtonText:   { fontWeight: '600', fontSize: 14 },
  saveButtonText:     { color: 'white', fontWeight: '800', fontSize: 14 },
  sectionTitle:       { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 14, marginTop: 20 },
  macroGrid:          { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  macroBox:           { flex: 1, alignItems: 'center', gap: 8 },
  macroBoxLabel:      { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  macroInputWrapper:  { width: '100%', height: 50, backgroundColor: theme.surfaceMuted, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border },
  macroInput:         { fontSize: 16, fontWeight: '700', color: theme.text, textAlign: 'center' },
});
