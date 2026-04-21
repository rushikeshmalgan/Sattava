import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CaloriesCard from '../../components/CaloriesCard';
import FestivalBanner from '../../components/FestivalBanner';
import HomeHeader from '../../components/HomeHeader';
import MealTimelineCard from '../../components/MealTimelineCard';
import RecentActivity, { Activity } from '../../components/RecentActivity';
import StepCounterWidget from '../../components/StepCounterWidget';
import WaterIntakeCard from '../../components/WaterIntakeCard';
import WeeklyCalendar from '../../components/WeeklyCalendar';
import { Colors, Gradients } from '../../constants/Colors';
import { getCurrentFestival } from '../../constants/IndianFestivals';
import { db } from '../../firebaseConfig';
import { addActivityLog, updateUserTargets } from '../../services/userService';
import { startStepCounting, stopStepCounting, loadDailySteps, StepData } from '../../services/stepService';
import { getTodaysSchedule } from '../../services/mealSchedulerService';
import { ScheduledMeal } from '../../data/mealPlans';

export default function Home() {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [targets, setTargets] = useState({ calories: 2000, carbs: 250, protein: 60, fat: 70, water: 2.0 });
  const [consumed, setConsumed] = useState({ calories: 0, caloriesBurned: 0, carbs: 0, protein: 0, fat: 0, water: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editableTargets, setEditableTargets] = useState({ calories: 2000, carbs: '250', protein: '60', fat: '70', water: '2000' });
  const [isSaving, setIsSaving] = useState(false);

  // Step counter
  const [stepData, setStepData] = useState<StepData>({ steps: 0, calories: 0, distanceKm: 0, activeMinutes: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const stopTrackingRef = useRef<(() => void) | null>(null);

  // Meal plan
  const [todaysMeals, setTodaysMeals] = useState<ScheduledMeal[]>([]);

  // Festival
  const festival = getCurrentFestival();
  const [showFestivalBanner, setShowFestivalBanner] = useState(!!festival);

  // User weight for step calories
  const [userWeightKg, setUserWeightKg] = useState(70);

  useEffect(() => {
    // Load today's steps
    loadDailySteps().then(s => setStepData(prev => ({ ...prev, steps: s })));

    // Load meal plan
    getTodaysSchedule().then(setTodaysMeals).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const plan = data.generatedPlan;
        if (plan) {
          setTargets({
            calories: plan.dailyCalories || 2000,
            carbs: parseInt(plan.macros?.carbs) || 250,
            protein: parseInt(plan.macros?.protein) || 60,
            fat: parseInt(plan.macros?.fats) || 70,
            water: parseFloat(plan.waterIntake) || 2.0,
          });
        }
        // Extract user weight for step calculations
        const profile = data.physicalProfile;
        if (profile?.weightKg) {
          setUserWeightKg(parseInt(profile.weightKg) || 70);
        }
      }
    });

    const dateString = selectedDate.toISOString().split('T')[0];
    const logDocRef = doc(db, 'users', user.id, 'dailyLogs', dateString);
    const unsubscribeLogs = onSnapshot(logDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConsumed({
          calories: data.consumedCalories || 0,
          caloriesBurned: data.caloriesBurned || 0,
          carbs: data.totalCarbs || 0,
          protein: data.totalProtein || 0,
          fat: data.totalFat || 0,
          water: data.totalWater || 0,
        });
        setActivities([...data.logs || []].reverse());
      } else {
        setConsumed({ calories: 0, caloriesBurned: 0, carbs: 0, protein: 0, fat: 0, water: 0 });
        setActivities([]);
      }
    });

    return () => { unsubscribeUser(); unsubscribeLogs(); };
  }, [user?.id, selectedDate]);

  const toggleStepTracking = async () => {
    if (isTracking) {
      setIsTracking(false);
      stopTrackingRef.current?.();
      stopTrackingRef.current = null;
    } else {
      setIsTracking(true);
      const stop = await startStepCounting(userWeightKg, (data) => {
        setStepData(data);
      });
      stopTrackingRef.current = stop;
    }
  };

  const handleEditPress = () => {
    setEditableTargets({
      calories: targets.calories,
      carbs: targets.carbs.toString(),
      protein: targets.protein.toString(),
      fat: targets.fat.toString(),
      water: (targets.water * 1000).toString(),
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
          carbs: `${editableTargets.carbs}g`,
          protein: `${editableTargets.protein}g`,
          fats: `${editableTargets.fat}g`,
        },
        waterIntake: `${parseFloat(editableTargets.water) / 1000}L`,
      });
      setIsEditModalVisible(false);
    } catch {
      alert('Failed to save changes. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddWater = async () => {
    if (!user?.id) return;
    const dateString = selectedDate.toISOString().split('T')[0];
    await addActivityLog(user.id, dateString, {
      id: Date.now().toString(),
      name: 'Paani (Water)',
      calories: 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'water',
      amount: '250ml',
    });
  };

  const insets = useSafeAreaInsets();
  const TOTAL_BOTTOM_SPACE = insets.bottom + 90;

  // Burned calories: exercise + steps
  const totalBurned = consumed.caloriesBurned + stepData.calories;

  return (
    <View style={styles.mainContainer}>
      <View style={{ height: insets.top, backgroundColor: Colors.BACKGROUND }} />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TOTAL_BOTTOM_SPACE }]}
      >
        <LinearGradient
          colors={[Colors.SURFACE_ELEVATED, Colors.BACKGROUND]}
          style={styles.headerSection}
        >
          <HomeHeader />
        </LinearGradient>

        {/* Festival Banner */}
        {showFestivalBanner && festival && (
          <FestivalBanner
            festival={festival}
            onDismiss={() => setShowFestivalBanner(false)}
          />
        )}

        <WeeklyCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

        <View style={styles.content}>
          {/* Step Counter */}
          <StepCounterWidget
            stepData={stepData}
            isTracking={isTracking}
            onToggle={toggleStepTracking}
          />

          {/* Calories Card */}
          <CaloriesCard
            consumed={consumed.calories}
            burned={totalBurned}
            target={targets.calories}
            onEdit={handleEditPress}
            macros={{
              carbs: Math.max(targets.carbs - consumed.carbs, 0),
              protein: Math.max(targets.protein - consumed.protein, 0),
              fat: Math.max(targets.fat - consumed.fat, 0),
            }}
          />

          {/* Water */}
          <WaterIntakeCard
            drunkMl={consumed.water}
            targetMl={targets.water * 1000}
            onEdit={handleEditPress}
            onAddWater={handleAddWater}
          />

          {/* Today's Meal Plan */}
          {todaysMeals.length > 0 && (
            <MealTimelineCard
              meals={todaysMeals}
              onLogMeal={(meal) => {
                // Future: open food search pre-populated
              }}
            />
          )}

          {/* Recent Activity */}
          <RecentActivity activities={activities} />
        </View>
      </ScrollView>

      {/* Edit Goals Modal */}
      <Modal transparent visible={isEditModalVisible} animationType="slide" onRequestClose={() => setIsEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✏️ Daily Targets</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Daily Calories Goal 🔥', key: 'calories', icon: 'flame-outline', color: Colors.PRIMARY, numeric: true },
                  { label: 'Water Target (ml) 💧', key: 'water', icon: 'water-outline', color: Colors.ACCENT, numeric: true },
                ].map(field => (
                  <View key={field.key} style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{field.label}</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name={field.icon as any} size={20} color={field.color} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={(editableTargets as any)[field.key].toString()}
                        onChangeText={t => setEditableTargets(prev => ({ ...prev, [field.key]: field.key === 'calories' ? Number(t) || 0 : t }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                ))}

                <Text style={styles.sectionTitle}>Macros</Text>
                <View style={styles.macroGrid}>
                  {[
                    { label: 'Protein g', key: 'protein', color: Colors.SECONDARY },
                    { label: 'Fats g', key: 'fat', color: Colors.ACCENT },
                    { label: 'Carbs g', key: 'carbs', color: Colors.PRIMARY },
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
                        />
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsEditModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveTargets} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
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

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Colors.BACKGROUND },
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  headerSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  content: { flex: 1, marginTop: 4, paddingHorizontal: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  keyboardView: { width: '100%' },
  modalContent: { backgroundColor: Colors.SURFACE, borderRadius: 24, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: Colors.BORDER },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.TEXT_MAIN },
  inputLabel: { fontSize: 14, fontWeight: '600', color: Colors.TEXT_MAIN, marginBottom: 8, marginTop: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.SURFACE, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.BORDER },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 16, color: Colors.TEXT_MAIN },
  inputContainer: { marginBottom: 4 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 10 },
  modalButton: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: Colors.SURFACE_DARK },
  saveButton: { backgroundColor: Colors.PRIMARY },
  cancelButtonText: { color: Colors.TEXT_MUTED, fontWeight: '600' },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 15, marginTop: 20 },
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  macroBox: { flex: 1, alignItems: 'center', gap: 8 },
  macroBoxLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  macroInputWrapper: { width: '100%', height: 50, backgroundColor: Colors.SURFACE, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.BORDER },
  macroInput: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.TEXT_MAIN, textAlign: 'center' },
});
