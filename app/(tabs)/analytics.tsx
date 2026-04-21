/**
 * SwasthBharat — Insights Dashboard (formerly Analytics)
 * Rich analytics with Indian Diet Score, ICMR comparison, and charts
 */
import { useUser } from '@clerk/clerk-expo';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IndianDietScore from '../../components/IndianDietScore';
import { Colors, Gradients } from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { calculateIndianDietScore, ICMR_RDA } from '../../services/indianFoodService';
import { loadDailySteps } from '../../services/stepService';

const { width: SCREEN_W } = Dimensions.get('window');

interface DayStats {
  label: string;
  calories: number;
  protein: number;
  steps?: number;
}

const MACRO_COLORS = {
  carbs: Colors.PRIMARY,
  protein: Colors.SECONDARY,
  fat: Colors.ACCENT,
  fiber: Colors.SUCCESS,
};

export default function Analytics() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const [todayData, setTodayData] = useState({
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0,
  });
  const [targets, setTargets] = useState({ calories: 2000, protein: 60, carbs: 250, fat: 50, water: 2000 });
  const [steps, setSteps] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DayStats[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadDailySteps().then(setSteps);
    loadWeeklyData();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const dateStr = new Date().toISOString().split('T')[0];

    const unsub1 = onSnapshot(doc(db, 'users', user.id), snap => {
      if (!snap.exists()) return;
      const plan = snap.data().generatedPlan;
      if (plan) {
        setTargets({
          calories: plan.dailyCalories || 2000,
          protein: parseInt(plan.macros?.protein) || 60,
          carbs: parseInt(plan.macros?.carbs) || 250,
          fat: parseInt(plan.macros?.fats) || 50,
          water: 2000,
        });
      }
    });

    const unsub2 = onSnapshot(doc(db, 'users', user.id, 'dailyLogs', dateStr), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setTodayData({
        calories: d.consumedCalories || 0,
        protein: d.totalProtein || 0,
        carbs: d.totalCarbs || 0,
        fat: d.totalFat || 0,
        fiber: d.totalFiber || 15,
        water: d.totalWater || 0,
      });
    });

    return () => { unsub1(); unsub2(); };
  }, [user?.id]);

  const loadWeeklyData = useCallback(async () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Placeholder weekly data (in a full implementation, read from Firestore)
    setWeeklyData(days.map((label, i) => ({
      label,
      calories: 1400 + Math.round(Math.random() * 800),
      protein: 45 + Math.round(Math.random() * 35),
      steps: 3000 + Math.round(Math.random() * 9000),
    })));
  }, []);

  const dietScore = calculateIndianDietScore({
    calories: todayData.calories,
    protein: todayData.protein,
    carbs: todayData.carbs,
    fat: todayData.fat,
    fiber: todayData.fiber,
    water: todayData.water,
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    targetWater: targets.water,
  });

  const macroItems = [
    { label: 'Protein', consumed: todayData.protein, target: targets.protein, unit: 'g', color: Colors.SECONDARY, rda: ICMR_RDA.protein },
    { label: 'Carbs', consumed: todayData.carbs, target: targets.carbs, unit: 'g', color: Colors.PRIMARY, rda: ICMR_RDA.carbs },
    { label: 'Fat', consumed: todayData.fat, target: targets.fat, unit: 'g', color: Colors.ACCENT, rda: ICMR_RDA.fat },
    { label: 'Fiber', consumed: todayData.fiber, target: 40, unit: 'g', color: Colors.SUCCESS, rda: ICMR_RDA.fiber },
  ];

  const calPct = Math.min(Math.round((todayData.calories / targets.calories) * 100), 100);
  const waterPct = Math.min(Math.round((todayData.water / targets.water) * 100), 100);
  const stepPct = Math.min(Math.round((steps / 8000) * 100), 100);

  const maxWeekCal = Math.max(...weeklyData.map(d => d.calories), 1);

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
      {/* Header */}
      <LinearGradient colors={Gradients.SAFFRON} style={styles.header}>
        <Text style={styles.headerTitle}>📊 Insights Dashboard</Text>
        <Text style={styles.headerSub}>Your complete nutrition and activity overview</Text>

        {/* Quick stats pill row */}
        <View style={styles.pillRow}>
          <View style={styles.pill}><Text style={styles.pillVal}>{todayData.calories}</Text><Text style={styles.pillLabel}>kcal</Text></View>
          <View style={styles.pill}><Text style={styles.pillVal}>{steps.toLocaleString('en-IN')}</Text><Text style={styles.pillLabel}>steps</Text></View>
          <View style={styles.pill}><Text style={styles.pillVal}>{dietScore.score}</Text><Text style={styles.pillLabel}>diet score</Text></View>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'today' && styles.tabActive]} onPress={() => setActiveTab('today')}>
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>📅 Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'week' && styles.tabActive]} onPress={() => setActiveTab('week')}>
          <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>📈 Weekly Trends</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
      >
        {activeTab === 'today' && (
          <>
            {/* Indian Diet Score */}
            <IndianDietScore
              score={dietScore.score}
              grade={dietScore.grade}
              message={dietScore.message}
              breakdown={{
                protein: dietScore.breakdown.protein ?? 0,
                fiber: dietScore.breakdown.fiber ?? 0,
                calories: dietScore.breakdown.calories ?? 0,
                water: dietScore.breakdown.water ?? 0,
                balance: dietScore.breakdown.balance ?? 0,
              }}
            />

            {/* Calorie ring card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔥 Daily Calories</Text>
              <View style={styles.calorieRow}>
                <View style={styles.calorieRing}>
                  <CircularProgress pct={calPct} color={Colors.PRIMARY} size={90} />
                  <View style={styles.calorieCenter}>
                    <Text style={styles.calNum}>{todayData.calories}</Text>
                    <Text style={styles.calOf}>/{targets.calories}</Text>
                  </View>
                </View>
                <View style={styles.calStats}>
                  <StatRow label="Consumed" value={`${todayData.calories} kcal`} color={Colors.PRIMARY} />
                  <StatRow label="Target" value={`${targets.calories} kcal`} color={Colors.TEXT_MUTED} />
                  <StatRow label="Balance" value={`${Math.max(targets.calories - todayData.calories, 0)} kcal`} color={Colors.SUCCESS} />
                  <StatRow label="ICMR RDA" value={`${ICMR_RDA.calories} kcal`} color={Colors.ACCENT} />
                </View>
              </View>
            </View>

            {/* Macros */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🥗 Macronutrients vs ICMR</Text>
              {macroItems.map(macro => {
                const pct = Math.min((macro.consumed / macro.target) * 100, 100);
                const icmrPct = Math.min((macro.consumed / macro.rda) * 100, 100);
                return (
                  <View key={macro.label} style={styles.macroItem}>
                    <View style={styles.macroHeader}>
                      <Text style={styles.macroName}>{macro.label}</Text>
                      <Text style={styles.macroValues}>{macro.consumed}/{macro.target}{macro.unit}</Text>
                    </View>
                    {/* Personal target bar */}
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: macro.color }]} />
                    </View>
                    <Text style={styles.icmrNote}>ICMR: {macro.rda}g — {Math.round(icmrPct)}% met</Text>
                  </View>
                );
              })}
            </View>

            {/* Water & Steps */}
            <View style={styles.twoCol}>
              <View style={[styles.miniCard, { backgroundColor: `${Colors.INFO}10`, borderColor: `${Colors.INFO}30` }]}>
                <Text style={styles.miniCardIcon}>💧</Text>
                <Text style={styles.miniCardVal}>{todayData.water}ml</Text>
                <Text style={styles.miniCardLabel}>of {targets.water}ml water</Text>
                <View style={styles.miniProgressBg}>
                  <View style={[styles.miniProgressFill, { width: `${waterPct}%`, backgroundColor: Colors.INFO }]} />
                </View>
                <Text style={styles.miniPct}>{waterPct}%</Text>
              </View>
              <View style={[styles.miniCard, { backgroundColor: `${Colors.ACCENT}10`, borderColor: `${Colors.ACCENT}30` }]}>
                <Text style={styles.miniCardIcon}>👟</Text>
                <Text style={styles.miniCardVal}>{steps.toLocaleString('en-IN')}</Text>
                <Text style={styles.miniCardLabel}>of 8,000 steps</Text>
                <View style={styles.miniProgressBg}>
                  <View style={[styles.miniProgressFill, { width: `${stepPct}%`, backgroundColor: Colors.ACCENT }]} />
                </View>
                <Text style={styles.miniPct}>{stepPct}%</Text>
              </View>
            </View>

            {/* Ayurvedic tip */}
            <View style={styles.ayurCard}>
              <Text style={styles.ayurTitle}>🕉️ Ayurvedic Tip Of The Day</Text>
              <Text style={styles.ayurText}>
                {todayData.calories < 1200
                  ? 'Your intake is too low today. Add a balanced meal to support recovery and energy.'
                  : todayData.protein < 30
                    ? 'Protein is below target today. Add dal, paneer, yogurt, or eggs to close the gap.'
                    : 'Great balance today. Keep hydration steady across meals for better digestion and performance.'}
              </Text>
            </View>
          </>
        )}

        {activeTab === 'week' && (
          <>
            {/* Weekly Calorie Bar Chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Weekly Calories</Text>
              <View style={styles.barChart}>
                {weeklyData.map((day, i) => {
                  const barH = Math.round((day.calories / maxWeekCal) * 120);
                  const isToday = i === (new Date().getDay() + 6) % 7;
                  return (
                    <View key={day.label} style={styles.barCol}>
                      <Text style={styles.barVal}>{Math.round(day.calories / 100) / 10}k</Text>
                      <View style={styles.barWrapper}>
                        <LinearGradient
                          colors={isToday ? [Colors.PRIMARY_DARK, Colors.PRIMARY] : [Colors.SURFACE_DARK, Colors.BORDER]}
                          style={[styles.bar, { height: barH }]}
                        />
                      </View>
                      <Text style={[styles.barLabel, isToday && { color: Colors.PRIMARY, fontWeight: '700' }]}>
                        {day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: Colors.PRIMARY }]} />
                <Text style={styles.legendText}>Today</Text>
                <View style={[styles.legendDot, { backgroundColor: Colors.BORDER, marginLeft: 12 }]} />
                <Text style={styles.legendText}>Other days</Text>
              </View>
            </View>

            {/* Weekly Steps */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>👟 Weekly Steps</Text>
              <View style={styles.barChart}>
                {weeklyData.map((day, i) => {
                  const barH = Math.round(((day.steps || 0) / 12000) * 100);
                  const isToday = i === (new Date().getDay() + 6) % 7;
                  return (
                    <View key={day.label} style={styles.barCol}>
                      <Text style={styles.barVal}>{ Math.round((day.steps || 0) / 1000) }k</Text>
                      <View style={styles.barWrapper}>
                        <LinearGradient
                          colors={isToday ? [Colors.ACCENT, Colors.ACCENT_LIGHT] : [Colors.SURFACE_DARK, Colors.BORDER]}
                          style={[styles.bar, { height: barH }]}
                        />
                      </View>
                      <Text style={[styles.barLabel, isToday && { color: Colors.ACCENT, fontWeight: '700' }]}>
                        {day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.stepGoalLine}>Daily step goal: 8,000 steps</Text>
            </View>

            {/* Weekly summary card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧾 Weekly Summary</Text>
              <StatRow label="Avg daily calories" value={`${Math.round(weeklyData.reduce((a,b)=>a+b.calories,0)/7)} kcal`} color={Colors.PRIMARY} />
              <StatRow label="Avg daily protein" value={`${Math.round(weeklyData.reduce((a,b)=>a+b.protein,0)/7)}g`} color={Colors.SECONDARY} />
              <StatRow label="Total steps (week)" value={(weeklyData.reduce((a,b)=>a+(b.steps||0),0)).toLocaleString('en-IN')} color={Colors.ACCENT} />
              <StatRow label="Diet Score (today)" value={`${dietScore.score}/100 — Grade ${dietScore.grade}`} color={Colors.SUCCESS} />
            </View>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={sStyles.row}>
      <Text style={sStyles.label}>{label}</Text>
      <Text style={[sStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

function CircularProgress({ pct, color, size }: { pct: number; color: string; size: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 8, borderColor: `${color}30`,
      borderTopColor: pct > 10 ? color : 'transparent',
      borderRightColor: pct > 35 ? color : 'transparent',
      borderBottomColor: pct > 60 ? color : 'transparent',
      borderLeftColor: pct > 85 ? color : 'transparent',
    }} />
  );
}

const sStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  label: { fontSize: 13, color: Colors.TEXT_MUTED },
  value: { fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  pillVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  pillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.SURFACE, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.PRIMARY },
  tabText: { fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: '600' },
  tabTextActive: { color: Colors.PRIMARY },
  scroll: { padding: 16 },
  card: { backgroundColor: Colors.SURFACE_ELEVATED, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 14 },
  calorieRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  calorieRing: { position: 'relative', width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  calorieCenter: { position: 'absolute', alignItems: 'center' },
  calNum: { fontSize: 18, fontWeight: '800', color: Colors.PRIMARY },
  calOf: { fontSize: 10, color: Colors.TEXT_MUTED },
  calStats: { flex: 1, gap: 6 },
  macroItem: { marginBottom: 12 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroName: { fontSize: 13, fontWeight: '700', color: Colors.TEXT_MAIN },
  macroValues: { fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: '600' },
  progressBg: { height: 8, backgroundColor: Colors.SURFACE_DARK, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  icmrNote: { fontSize: 10, color: Colors.TEXT_LIGHT, marginTop: 3 },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  miniCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center' },
  miniCardIcon: { fontSize: 28, marginBottom: 4 },
  miniCardVal: { fontSize: 18, fontWeight: '800', color: Colors.TEXT_MAIN },
  miniCardLabel: { fontSize: 10, color: Colors.TEXT_MUTED, textAlign: 'center', marginBottom: 8 },
  miniProgressBg: { width: '100%', height: 5, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 3 },
  miniPct: { fontSize: 11, fontWeight: '700', color: Colors.TEXT_MUTED, marginTop: 4 },
  ayurCard: { backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.BORDER },
  ayurTitle: { fontSize: 14, fontWeight: '700', color: Colors.ACCENT, marginBottom: 6 },
  ayurText: { fontSize: 13, color: Colors.TEXT_MUTED, lineHeight: 20 },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150, paddingBottom: 24, marginBottom: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barWrapper: { width: '70%', alignItems: 'center', justifyContent: 'flex-end', height: 120 },
  bar: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: '600' },
  barVal: { fontSize: 9, color: Colors.TEXT_MUTED, fontWeight: '600' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: Colors.TEXT_MUTED },
  stepGoalLine: { fontSize: 11, color: Colors.TEXT_MUTED, textAlign: 'center', marginTop: 4 },
});
