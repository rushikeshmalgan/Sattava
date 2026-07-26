/**
 * SwasthBharat — Yoga & Wellness Screen
 * Surya Namaskar counter, Pranayama timer, calorie burn log
 */
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '../../constants/Colors';
import { addActivityLog } from '../../services/userService';

// Surya Namaskar poses (12 steps)
const SURYA_NAMASKAR_POSES = [
  { name: 'Pranamasana',      nameHindi: 'प्रणामासन',    emoji: '🙏', instruction: 'Stand straight, hands in prayer' },
  { name: 'Hasta Uttanasana', nameHindi: 'हस्त उत्तानासन', emoji: '🙌', instruction: 'Raise arms overhead, arch back' },
  { name: 'Pada Hastasana',   nameHindi: 'पाद हस्तासन',   emoji: '🤸', instruction: 'Bend forward, touch feet' },
  { name: 'Ashwa Sanchalanasana', nameHindi: 'अश्व संचालनासन', emoji: '🏃', instruction: 'Right leg back, lunge' },
  { name: 'Dandasana',         nameHindi: 'दंडासन',    emoji: '⬆️', instruction: 'Plank position' },
  { name: 'Ashtanga Namaskar', nameHindi: 'अष्टाङ्ग नमस्कार', emoji: '🙇', instruction: '8 body parts on floor' },
  { name: 'Bhujangasana',     nameHindi: 'भुजंगासन',   emoji: '🐍', instruction: 'Cobra pose, lift chest' },
  { name: 'Parvatasana',      nameHindi: 'पर्वतासन',   emoji: '🔺', instruction: 'Mountain / Down dog' },
  { name: 'Ashwa Sanchalanasana', nameHindi: 'अश्व संचालनासन', emoji: '🏃', instruction: 'Left leg forward, lunge' },
  { name: 'Pada Hastasana',   nameHindi: 'पाद हस्तासन',   emoji: '🤸', instruction: 'Forward fold' },
  { name: 'Hasta Uttanasana', nameHindi: 'हस्त उत्तानासन', emoji: '🙌', instruction: 'Raise arms, arch back' },
  { name: 'Pranamasana',      nameHindi: 'प्रणामासन',    emoji: '🙏', instruction: 'Return to prayer pose' },
];

// Pranayama exercises
const PRANAYAMA_EXERCISES = [
  { id: 'anulom', name: 'Anulom Vilom',  nameHindi: 'अनुलोम विलोम', duration: 300, inhale: 4, hold: 4, exhale: 4, description: 'Alternate nostril breathing — balances Vata, Pitta, Kapha', benefits: 'Stress relief, lung capacity, focus', emoji: '🌬️' },
  { id: 'bhramari', name: 'Bhramari',    nameHindi: 'भ्रामरी',       duration: 180, inhale: 6, hold: 0, exhale: 6, description: 'Humming bee breathing — calms nervous system', benefits: 'Anxiety relief, migraine, sleep', emoji: '🐝' },
  { id: 'kapalabhati', name: 'Kapalabhati', nameHindi: 'कपालभाती',  duration: 180, inhale: 0, hold: 0, exhale: 1, description: 'Skull shining breathing — rapid exhalations', benefits: 'Detox, metabolism, digestion', emoji: '✨' },
  { id: 'bhastrika', name: 'Bhastrika',  nameHindi: 'भस्त्रिका',     duration: 120, inhale: 2, hold: 0, exhale: 2, description: 'Bellows breathing — energizing pranayama', benefits: 'Energy, circulation, warmth', emoji: '🔥' },
  { id: 'sheetali', name: 'Sheetali',    nameHindi: 'शीतली',         duration: 180, inhale: 4, hold: 4, exhale: 6, description: 'Cooling breath — reduces Pitta, cools body', benefits: 'Cooling, stress, hunger control', emoji: '❄️' },
];

// Yoga types and calorie burn rates (per minute)
const YOGA_BURN_RATES = {
  'Surya Namaskar': 7,    // kcal/min (moderate)
  'Pranayama': 2,
  'Hatha Yoga': 3,
  'Vinyasa Flow': 6,
  'Yin Yoga': 2,
  'Power Yoga': 8,
};

type Screen = 'home' | 'surya' | 'pranayama';

export default function YogaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [screen, setScreen] = useState<Screen>('home');
  const [rounds, setRounds] = useState(0);
  const [currentPose, setCurrentPose] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [selectedPranayama, setSelectedPranayama] = useState(PRANAYAMA_EXERCISES[0]);
  const [pranayamaPhase, setPranayamaPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [pranayamaRunning, setPranayamaRunning] = useState(false);
  const [totalPranayamaTime, setTotalPranayamaTime] = useState(0);

  const timerRef = useRef<any>(null);
  const pranayamaRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const phaseDurations = selectedPranayama;

  // Surya Namaskar timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Pranayama phase timer
  useEffect(() => {
    if (!pranayamaRunning) {
      clearInterval(pranayamaRef.current);
      return;
    }

    pranayamaRef.current = setInterval(() => {
      setPhaseTimer(t => {
        const durKey: Record<string, number> = { inhale: phaseDurations.inhale, hold: phaseDurations.hold, exhale: phaseDurations.exhale };
        const currentDur = durKey[pranayamaPhase];
        if (t + 1 >= currentDur) {
          Vibration.vibrate(100);
          setPranayamaPhase(prev => {
            if (prev === 'inhale') return phaseDurations.hold > 0 ? 'hold' : 'exhale';
            if (prev === 'hold') return 'exhale';
            return 'inhale';
          });
          setTotalPranayamaTime(tt => tt + 1);
          return 0;
        }
        setTotalPranayamaTime(tt => tt + 1);
        return t + 1;
      });
    }, 1000);

    return () => clearInterval(pranayamaRef.current);
  }, [pranayamaRunning, pranayamaPhase, phaseDurations]);

  // Pulse animation for current pose
  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isRunning]);

  const nextPose = () => {
    if (currentPose < SURYA_NAMASKAR_POSES.length - 1) {
      setCurrentPose(p => p + 1);
      Vibration.vibrate(50);
    } else {
      // Completed one round
      setRounds(r => r + 1);
      setCurrentPose(0);
      Vibration.vibrate([100, 100, 200]);
    }
  };

  const finishSurya = async () => {
    setIsRunning(false);
    const totalCalories = Math.round(rounds * SURYA_NAMASKAR_POSES.length * 0.6);
    if (user?.id && rounds > 0) {
      const dateStr = new Date().toISOString().split('T')[0];
      await addActivityLog(user.id, dateStr, {
        id: Date.now().toString(),
        name: `Surya Namaskar (${rounds} round${rounds > 1 ? 's' : ''})`,
        calories: totalCalories,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'exercise',
      });
    }
    Alert.alert('🙏 Shabash!', `${rounds} rounds of Surya Namaskar complete!\n~${totalCalories} kcal burned.\nLogged successfully!`);
    setScreen('home');
    setRounds(0);
    setCurrentPose(0);
    setTimeElapsed(0);
  };

  const finishPranayama = async () => {
    setPranayamaRunning(false);
    const totalCalories = Math.round((totalPranayamaTime / 60) * YOGA_BURN_RATES['Pranayama']);
    if (user?.id && totalPranayamaTime > 30) {
      const dateStr = new Date().toISOString().split('T')[0];
      await addActivityLog(user.id, dateStr, {
        id: Date.now().toString(),
        name: `${selectedPranayama.name} (${Math.round(totalPranayamaTime / 60)} min)`,
        calories: totalCalories,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'exercise',
      });
    }
    Alert.alert('🌬️ Pranayama Complete!', `${Math.round(totalPranayamaTime / 60)} minutes done.\n~${totalCalories} kcal burned.\nLogged!`);
    setScreen('home');
    setTotalPranayamaTime(0);
    setPhaseTimer(0);
    setPranayamaPhase('inhale');
  };

  const formatTime = (secs: number) =>
    `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  // ── HOME SCREEN ───────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={Gradients.PRIMARY} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧘 Yoga & Wellness</Text>
          <Text style={styles.headerSub}>Sehat ke liye desi nuskhe</Text>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {/* Surya Namaskar Card */}
          <TouchableOpacity style={styles.yogaCard} onPress={() => setScreen('surya')} activeOpacity={0.85}>
            <LinearGradient colors={['#FF6B35', '#FF9B47']} style={styles.yogaCardGrad}>
              <Text style={styles.yogaCardEmoji}>☀️</Text>
              <Text style={styles.yogaCardTitle}>Surya Namaskar</Text>
              <Text style={styles.yogaCardHindi}>सूर्य नमस्कार</Text>
              <Text style={styles.yogaCardDesc}>12-pose sequence • ~7 kcal/round</Text>
              <Text style={styles.yogaCardStart}>Start →</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Pranayama Card */}
          <TouchableOpacity style={styles.yogaCard} onPress={() => setScreen('pranayama')} activeOpacity={0.85}>
            <LinearGradient colors={['#138808', '#22C55E']} style={styles.yogaCardGrad}>
              <Text style={styles.yogaCardEmoji}>🌬️</Text>
              <Text style={styles.yogaCardTitle}>Pranayama</Text>
              <Text style={styles.yogaCardHindi}>प्राणायाम</Text>
              <Text style={styles.yogaCardDesc}>5 breathing exercises • Anulom, Bhramari & more</Text>
              <Text style={styles.yogaCardStart}>Start →</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Benefits section */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>🕉️ Benefits of Daily Yoga</Text>
            {[
              '💪 Improves strength and flexibility',
              '😌 Reduces stress and anxiety (Cortisol ↓)',
              '🫁 Boosts lung capacity (Pranayama)',
              '🩺 Controls Blood Sugar (Type 2 Diabetes)',
              '⚖️ Supports weight management',
              '🧠 Improves focus and mental clarity',
              '❤️ Reduces Blood Pressure and heart risk',
            ].map((b, i) => (
              <Text key={i} style={styles.benefit}>{b}</Text>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── SURYA NAMASKAR SCREEN ────────────────────────────────────────────────
  if (screen === 'surya') {
    const pose = SURYA_NAMASKAR_POSES[currentPose];
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#FF6B35', '#FF9B47']} style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('home')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>☀️ Surya Namaskar</Text>
          <Text style={styles.headerSub}>Round {rounds + 1} • Pose {currentPose + 1}/12</Text>
        </LinearGradient>

        <View style={styles.suryaContent}>
          {/* Stats row */}
          <View style={styles.suryaStats}>
            <View style={styles.suryaStat}><Text style={styles.suryaStatVal}>{rounds}</Text><Text style={styles.suryaStatLabel}>Rounds</Text></View>
            <View style={styles.suryaStat}><Text style={styles.suryaStatVal}>{formatTime(timeElapsed)}</Text><Text style={styles.suryaStatLabel}>Time</Text></View>
            <View style={styles.suryaStat}><Text style={styles.suryaStatVal}>{Math.round(rounds * 8.4)}</Text><Text style={styles.suryaStatLabel}>kcal</Text></View>
          </View>

          {/* Pose display */}
          <Animated.View style={[styles.poseCard, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.poseEmoji}>{pose.emoji}</Text>
            <Text style={styles.poseName}>{pose.name}</Text>
            <Text style={styles.poseHindi}>{pose.nameHindi}</Text>
            <Text style={styles.poseInstruction}>{pose.instruction}</Text>
          </Animated.View>

          {/* Progress dots */}
          <View style={styles.poseDots}>
            {SURYA_NAMASKAR_POSES.map((_, i) => (
              <View key={i} style={[styles.poseDot, i === currentPose && styles.poseDotActive, i < currentPose && styles.poseDotDone]} />
            ))}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {!isRunning ? (
              <TouchableOpacity style={styles.startBtn} onPress={() => setIsRunning(true)}>
                <LinearGradient colors={Gradients.SAFFRON} style={styles.startBtnGrad}>
                  <Text style={styles.startBtnText}>▶ Start</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.controlRow}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => setIsRunning(false)}>
                  <Text style={styles.controlBtnText}>⏸ Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, styles.nextBtn]} onPress={nextPose}>
                  <Text style={[styles.controlBtnText, { color: '#fff' }]}>Next Pose →</Text>
                </TouchableOpacity>
              </View>
            )}
            {rounds > 0 && (
              <TouchableOpacity style={styles.finishBtn} onPress={finishSurya}>
                <Text style={styles.finishBtnText}>✅ Finish & Log</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── PRANAYAMA SCREEN ──────────────────────────────────────────────────────
  const phaseColors: Record<string, string> = { inhale: Colors.SUCCESS, hold: Colors.TURMERIC, exhale: Colors.INFO };
  const currentPhaseDur: Record<string, number> = { inhale: selectedPranayama.inhale, hold: selectedPranayama.hold, exhale: selectedPranayama.exhale };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#138808', '#22C55E']} style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('home')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌬️ Pranayama</Text>
        <Text style={styles.headerSub}>{Math.floor(totalPranayamaTime / 60)} min completed</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Select exercise */}
        {!pranayamaRunning && (
          <>
            <Text style={styles.sectionTitle}>Choose Pranayama:</Text>
            {PRANAYAMA_EXERCISES.map(exercise => (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.pranayamaOption, selectedPranayama.id === exercise.id && styles.pranayamaOptionActive]}
                onPress={() => { setSelectedPranayama(exercise); setPranayamaPhase('inhale'); setPhaseTimer(0); }}
              >
                <Text style={styles.pranayamaEmoji}>{exercise.emoji}</Text>
                <View style={styles.pranayamaInfo}>
                  <Text style={styles.pranayamaName}>{exercise.name} — {exercise.nameHindi}</Text>
                  <Text style={styles.pranayamaDesc}>{exercise.description}</Text>
                  <Text style={styles.pranayamaBenefits}>✅ {exercise.benefits}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Active pranayama */}
        {pranayamaRunning && (
          <View style={styles.pranayamaActive}>
            <Text style={styles.pranayamaActiveName}>{selectedPranayama.emoji} {selectedPranayama.name}</Text>
            <View style={[styles.phaseCircle, { borderColor: phaseColors[pranayamaPhase] }]}>
              <Text style={[styles.phaseLabel, { color: phaseColors[pranayamaPhase] }]}>
                {pranayamaPhase.toUpperCase()}
              </Text>
              <Text style={styles.phaseNum}>{phaseTimer + 1}</Text>
              <Text style={styles.phaseOf}>/ {currentPhaseDur[pranayamaPhase]}s</Text>
            </View>
            <Text style={styles.totalTime}>{formatTime(totalPranayamaTime)} elapsed</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.pranayamaControls}>
          {!pranayamaRunning ? (
            <TouchableOpacity style={styles.startBtn} onPress={() => setPranayamaRunning(true)}>
              <LinearGradient colors={['#138808', '#22C55E']} style={styles.startBtnGrad}>
                <Text style={styles.startBtnText}>▶ Begin {selectedPranayama.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setPranayamaRunning(false)}>
                <Text style={styles.controlBtnText}>⏸ Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, styles.finishBtn, { flex: 1 }]} onPress={finishPranayama}>
                <Text style={styles.finishBtnText}>✅ Finish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  backBtn: { marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  yogaCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 14 },
  yogaCardGrad: { padding: 24 },
  yogaCardEmoji: { fontSize: 40, marginBottom: 6 },
  yogaCardTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  yogaCardHindi: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  yogaCardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 12 },
  yogaCardStart: { fontSize: 15, fontWeight: '700', color: '#fff' },
  benefitsCard: { backgroundColor: Colors.SURFACE_ELEVATED, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.BORDER },
  benefitsTitle: { fontSize: 16, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 10 },
  benefit: { fontSize: 13, color: Colors.TEXT_MUTED, lineHeight: 22 },
  suryaContent: { flex: 1, padding: 16 },
  suryaStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.BORDER },
  suryaStat: { alignItems: 'center' },
  suryaStatVal: { fontSize: 26, fontWeight: '800', color: Colors.PRIMARY },
  suryaStatLabel: { fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: '600' },
  poseCard: { backgroundColor: Colors.SURFACE_ELEVATED, borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: Colors.BORDER, shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  poseEmoji: { fontSize: 72, marginBottom: 12 },
  poseName: { fontSize: 22, fontWeight: '800', color: Colors.TEXT_MAIN, textAlign: 'center' },
  poseHindi: { fontSize: 14, color: Colors.TEXT_MUTED, marginBottom: 8 },
  poseInstruction: { fontSize: 14, color: Colors.TEXT_MUTED, textAlign: 'center', lineHeight: 20 },
  poseDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  poseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.BORDER },
  poseDotActive: { backgroundColor: Colors.PRIMARY, width: 16 },
  poseDotDone: { backgroundColor: Colors.SUCCESS },
  controls: { gap: 12 },
  controlRow: { flexDirection: 'row', gap: 12 },
  controlBtn: { flex: 1, backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.BORDER },
  controlBtnText: { fontSize: 15, fontWeight: '700', color: Colors.TEXT_MAIN },
  nextBtn: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  startBtn: { borderRadius: 20, overflow: 'hidden' },
  startBtnGrad: { padding: 16, alignItems: 'center' },
  startBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  finishBtn: { backgroundColor: Colors.SUCCESS, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 0 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 12 },
  pranayamaOption: { flexDirection: 'row', backgroundColor: Colors.SURFACE, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.BORDER, gap: 12 },
  pranayamaOptionActive: { borderColor: Colors.SUCCESS, backgroundColor: `${Colors.SUCCESS}10` },
  pranayamaEmoji: { fontSize: 28, marginTop: 2 },
  pranayamaInfo: { flex: 1 },
  pranayamaName: { fontSize: 14, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 2 },
  pranayamaDesc: { fontSize: 11, color: Colors.TEXT_MUTED, lineHeight: 16 },
  pranayamaBenefits: { fontSize: 11, color: Colors.SUCCESS, fontWeight: '600', marginTop: 4 },
  pranayamaActive: { alignItems: 'center', paddingVertical: 30 },
  pranayamaActiveName: { fontSize: 20, fontWeight: '800', color: Colors.TEXT_MAIN, marginBottom: 30 },
  phaseCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  phaseLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  phaseNum: { fontSize: 52, fontWeight: '900', color: Colors.TEXT_MAIN },
  phaseOf: { fontSize: 14, color: Colors.TEXT_MUTED },
  totalTime: { fontSize: 14, color: Colors.TEXT_MUTED },
  pranayamaControls: { marginTop: 16, gap: 12 },
});
