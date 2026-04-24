/**
 * Sattva — Insights Dashboard
 * Real weekly data from Firestore · SVG circular progress · Indian Diet Score
 */
import { useUser } from '@clerk/clerk-expo';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import IndianDietScore from '../../components/IndianDietScore';
import { Colors, Gradients } from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { calculateIndianDietScore, ICMR_RDA } from '../../services/indianFoodService';
import { loadDailySteps } from '../../services/stepService';
import { getStreakCount } from '../../services/logService';
import { useTheme } from '../../context/ThemeContext';
import { BarChartSkeleton, MacroBarSkeleton, DietScoreSkeleton } from '../../components/Skeleton';
import { AnimatedCounter } from '../../components/AnimatedCounter';
import { explainDietScore } from '../../services/dietScoreExplainService';

const { width: SCREEN_W } = Dimensions.get('window');

// ── SVG Circular Progress ─────────────────────────────────────────────────────
interface CircularProgressProps {
    percentage: number; // 0–100
    color: string;
    size?: number;
    strokeWidth?: number;
    children?: React.ReactNode;
}

export function CircularProgress({
    percentage,
    color,
    size = 90,
    strokeWidth = 9,
    children,
}: CircularProgressProps) {
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    const clamp = Math.min(Math.max(percentage, 0), 100);
    const strokeDashoffset = circumference * (1 - clamp / 100);
    const cx = size / 2;
    const cy = size / 2;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                {/* Background Shadow Effect */}
                <Circle
                    cx={cx}
                    cy={cy}
                    r={r + 2}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.5}
                    strokeOpacity={0.1}
                />
                {/* Track */}
                <Circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={`${color}15`}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress arc */}
                <Circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${cx}, ${cy}`}
                />
            </Svg>
            {children}
        </View>
    );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface DayStats {
    label: string;
    dateStr: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    water: number;
    steps?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <View style={sStyles.row}>
            <Text style={sStyles.label}>{label}</Text>
            <Text style={[sStyles.value, { color }]}>{value}</Text>
        </View>
    );
}

// Returns ISO date strings for the last 7 days (oldest → newest)
function getLast7Days(): { label: string; dateStr: string }[] {
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: { label: string; dateStr: string }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
            label: DAY_LABELS[d.getDay()],
            dateStr: d.toISOString().split('T')[0],
        });
    }
    return days;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Analytics() {
    const { user } = useUser();
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();

    const [todayData, setTodayData] = useState({
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0,
    });
    const [targets, setTargets] = useState({ calories: 2000, protein: 60, carbs: 250, fat: 50, water: 2000 });
    const [steps, setSteps] = useState(0);
    const [weeklyData, setWeeklyData] = useState<DayStats[]>([]);
    const [weeklyLoading, setWeeklyLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const router = useRouter();

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Entry animation
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        loadDailySteps().then(setSteps);
    }, []);

    // Today's data – live Firestore listener
    useEffect(() => {
        if (!user?.id) return;
        const dateStr = new Date().toISOString().split('T')[0];

        const unsub1 = onSnapshot(doc(db, 'users', user.id), (snap) => {
            if (!snap.exists()) return;
            const plan = snap.data().generatedPlan;
            if (plan) {
                setTargets({
                    calories: plan.dailyCalories || 2000,
                    protein: parseInt(plan.macros?.protein) || 60,
                    carbs:   parseInt(plan.macros?.carbs)   || 250,
                    fat:     parseInt(plan.macros?.fats)    || 50,
                    water:   2000,
                });
            }
        });

        const unsub2 = onSnapshot(doc(db, 'users', user.id, 'dailyLogs', dateStr), (snap) => {
            if (!snap.exists()) return;
            const d = snap.data();
            setTodayData({
                calories: d.consumedCalories || 0,
                protein:  d.totalProtein     || 0,
                carbs:    d.totalCarbs       || 0,
                fat:      d.totalFat         || 0,
                fiber:    d.totalFiber       || 0,  // real value, no fallback
                water:    d.totalWater       || 0,
            });
        });

        return () => { unsub1(); unsub2(); };
    }, [user?.id]);

    // Weekly data – reads last 7 days from Firestore
    const loadWeeklyData = useCallback(async () => {
        if (!user?.id) return;
        setWeeklyLoading(true);
        const days = getLast7Days();
        const results: DayStats[] = await Promise.all(
            days.map(async ({ label, dateStr }) => {
                try {
                    const snap = await getDoc(doc(db, 'users', user.id!, 'dailyLogs', dateStr));
                    if (snap.exists()) {
                        const d = snap.data();
                        return {
                            label,
                            dateStr,
                            calories: d.consumedCalories || 0,
                            protein:  d.totalProtein     || 0,
                            carbs:    d.totalCarbs       || 0,
                            fat:      d.totalFat         || 0,
                            fiber:    d.totalFiber       || 0,
                            water:    d.totalWater       || 0,
                        };
                    }
                } catch { /* skip missing days */ }
                return { label, dateStr, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 };
            })
        );
        setWeeklyData(results);
        setWeeklyLoading(false);
    }, [user?.id]);

    // Load weekly data on mount and when tab switches to week
    useEffect(() => {
        if (activeTab === 'week') loadWeeklyData();
    }, [activeTab, loadWeeklyData]);

    // Pre-load on mount
    useEffect(() => { loadWeeklyData(); }, [loadWeeklyData]);

    // ── Derived values ────────────────────────────────────────────────────────
    const dietScore = calculateIndianDietScore({
        calories:       todayData.calories,
        protein:        todayData.protein,
        carbs:          todayData.carbs,
        fat:            todayData.fat,
        fiber:          todayData.fiber || undefined,
        water:          todayData.water,
        targetCalories: targets.calories,
        targetProtein:  targets.protein,
        targetWater:    targets.water,
    });

    useEffect(() => {
        // Only refresh explanation if score changes significantly or after first load
        if (activeTab === 'today' && todayData.calories > 0) {
            const shouldRefresh = !aiExplanation || Math.abs(todayData.calories - (todayData.calories || 0)) > 200;
            
            if (shouldRefresh && !loadingExplanation) {
                setLoadingExplanation(true);
                explainDietScore(
                    dietScore.score,
                    todayData.calories,
                    todayData.protein,
                    todayData.carbs,
                    todayData.fat,
                    todayData.fiber,
                    todayData.water
                ).then(res => {
                    setAiExplanation(res);
                    setLoadingExplanation(false);
                }).catch(() => setLoadingExplanation(false));
            }
        }
    }, [todayData.calories, activeTab]);

    const macroItems = [
        { label: 'Protein', consumed: todayData.protein, target: targets.protein, unit: 'g', color: Colors.SECONDARY,  rda: ICMR_RDA.protein },
        { label: 'Carbs',   consumed: todayData.carbs,   target: targets.carbs,   unit: 'g', color: Colors.PRIMARY,    rda: ICMR_RDA.carbs },
        { label: 'Fat',     consumed: todayData.fat,      target: targets.fat,     unit: 'g', color: Colors.ACCENT,     rda: ICMR_RDA.fat },
        { label: 'Fiber',   consumed: todayData.fiber,   target: 40,              unit: 'g', color: Colors.SUCCESS,    rda: ICMR_RDA.fiber },
    ];

    const calPct   = Math.min(Math.round((todayData.calories / targets.calories) * 100), 100);
    const waterPct = Math.min(Math.round((todayData.water / targets.water)       * 100), 100);
    const stepPct  = Math.min(Math.round((steps / 8000)                          * 100), 100);

    const maxWeekCal   = Math.max(...weeklyData.map(d => d.calories), 1);
    const todayDateStr = new Date().toISOString().split('T')[0];
    const avgCalories  = weeklyData.length
        ? Math.round(weeklyData.reduce((a, b) => a + b.calories, 0) / weeklyData.length)
        : 0;
    const avgProtein = weeklyData.length
        ? Math.round(weeklyData.reduce((a, b) => a + b.protein, 0) / weeklyData.length)
        : 0;

    if (!user) return null;

    return (
        <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
            {/* Header */}
            <LinearGradient colors={Gradients.PRIMARY} style={styles.header}>
                <Text style={styles.headerTitle}>Sattva Insights</Text>
                <Text style={styles.headerSub}>Your complete nutrition & activity overview</Text>

                <View style={styles.pillRow}>
                    <View style={styles.pill}>
                        <AnimatedCounter value={todayData.calories} style={styles.pillVal} />
                        <Text style={styles.pillLabel}>kcal</Text>
                    </View>
                    <View style={styles.pill}>
                        <AnimatedCounter value={steps} style={styles.pillVal} />
                        <Text style={styles.pillLabel}>steps</Text>
                    </View>
                    <View style={styles.pill}>
                        <AnimatedCounter value={dietScore.score} style={styles.pillVal} />
                        <Text style={styles.pillLabel}>diet score</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'today' && styles.tabActive]}
                    onPress={() => setActiveTab('today')}
                >
                    <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'week' && styles.tabActive]}
                    onPress={() => setActiveTab('week')}
                >
                    <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>Weekly Trends</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
            >
                {/* ── TODAY TAB ────────────────────────────────────────── */}
                {activeTab === 'today' && (
                    <View style={styles.bentoContainer}>
                        {/* Indian Diet Score - Primary Bento Item */}
                        <View style={[styles.bentoItem, { width: '100%' }]}>
                            <IndianDietScore
                                score={dietScore.score}
                                grade={dietScore.grade}
                                message={dietScore.message}
                                breakdown={{
                                    protein:  dietScore.breakdown.protein  ?? 0,
                                    fiber:    dietScore.breakdown.fiber    ?? 0,
                                    calories: dietScore.breakdown.calories ?? 0,
                                    water:    dietScore.breakdown.water    ?? 0,
                                    balance:  dietScore.breakdown.balance  ?? 0,
                                }}
                            />
                        </View>

                        {/* AI Diet Score Explanation - Bento Item */}
                        {todayData.calories > 0 && (
                            <View style={[styles.bentoItem, styles.aiBento, { width: '100%', backgroundColor: isDark ? theme.card : '#F0F9FF', borderColor: theme.primary + '30' }]}>
                                <View style={styles.aiHeader}>
                                    <View style={[styles.aiIconBg, { backgroundColor: theme.primary + '20' }]}>
                                        <Ionicons name="sparkles" size={16} color={theme.primary} />
                                    </View>
                                    <Text style={[styles.aiTitle, { color: theme.primary }]}>AI Analysis</Text>
                                </View>
                                {loadingExplanation ? (
                                    <View style={styles.aiLoading}>
                                        <ActivityIndicator size="small" color={theme.primary} />
                                        <Text style={[styles.aiLoadingText, { color: theme.textMuted }]}>Analyzing meals...</Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.aiText, { color: theme.text }]}>{aiExplanation}</Text>
                                )}
                            </View>
                        )}

                        {/* Calorie Progress - Bento Item (Left) */}
                        <View style={[styles.bentoItem, styles.card, { width: '48%', marginBottom: 12 }]}>
                            <Text style={styles.bentoLabel}>Calories</Text>
                            <View style={styles.bentoCalRow}>
                                <CircularProgress percentage={calPct} color={Colors.PRIMARY} size={85} strokeWidth={8}>
                                    <View style={styles.calorieCenter}>
                                        <Text style={[styles.calNum, { fontSize: 16 }]}>{todayData.calories}</Text>
                                        <Text style={styles.calOf}>kcal</Text>
                                    </View>
                                </CircularProgress>
                            </View>
                            <Text style={styles.bentoSubLabel}>Target: {targets.calories}</Text>
                        </View>

                        {/* Macros Progress - Bento Item (Right) */}
                        <View style={[styles.bentoItem, styles.card, { width: '48%', marginBottom: 12 }]}>
                            <Text style={styles.bentoLabel}>Macros Balance</Text>
                            <View style={styles.macroBentoList}>
                                {macroItems.slice(0, 3).map(macro => {
                                    const pct = Math.min((macro.consumed / (macro.target || 1)) * 100, 100);
                                    return (
                                        <View key={macro.label} style={styles.macroBentoItem}>
                                            <View style={styles.macroBentoHeader}>
                                                <Text style={styles.macroBentoName}>{macro.label.substring(0,1)}</Text>
                                                <View style={styles.macroBentoBarBg}>
                                                    <View style={[styles.macroBentoBarFill, { width: `${pct}%`, backgroundColor: macro.color }]} />
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                            <Text style={styles.bentoSubLabel}>Protein: {Math.round(todayData.protein)}g</Text>
                        </View>

                        {/* Water & Steps - Mini Bento Row */}
                        <View style={[styles.bentoItem, styles.miniBento, { width: '48%', backgroundColor: `${Colors.INFO}10`, borderColor: `${Colors.INFO}30` }]}>
                            <Ionicons name="water" size={20} color={Colors.INFO} />
                            <Text style={[styles.miniBentoVal, { color: Colors.INFO }]}>{todayData.water}ml</Text>
                            <Text style={styles.miniBentoLabel}>Hydration</Text>
                        </View>

                        <View style={[styles.bentoItem, styles.miniBento, { width: '48%', backgroundColor: `${Colors.ACCENT}10`, borderColor: `${Colors.ACCENT}30` }]}>
                            <Ionicons name="walk" size={20} color={Colors.ACCENT} />
                            <Text style={[styles.miniBentoVal, { color: Colors.ACCENT }]}>{steps}</Text>
                            <Text style={styles.miniBentoLabel}>Steps</Text>
                        </View>

                        {/* Detailed Macros vs ICMR - Full Width */}
                        <View style={[styles.bentoItem, styles.card, { width: '100%', marginTop: 8 }]}>
                            <Text style={styles.cardTitle}>Nutrient Targets vs ICMR</Text>
                            {macroItems.map(macro => {
                                const pct = Math.min((macro.consumed / (macro.target || 1)) * 100, 100);
                                const icmrPct = Math.min((macro.consumed / (macro.rda || 1)) * 100, 100);
                                return (
                                    <View key={macro.label} style={styles.macroItem}>
                                        <View style={styles.macroHeader}>
                                            <Text style={styles.macroName}>{macro.label}</Text>
                                            <Text style={styles.macroValues}>{Math.round(macro.consumed)}/{Math.round(macro.target)}{macro.unit}</Text>
                                        </View>
                                        <View style={styles.progressBg}>
                                            <LinearGradient 
                                                colors={[macro.color, macro.color + 'AA']} 
                                                start={{x:0, y:0}} end={{x:1, y:0}}
                                                style={[styles.progressFill, { width: `${pct}%` }]} 
                                            />
                                        </View>
                                        <Text style={styles.icmrNote}>ICMR Recommended: {macro.rda}g ({Math.round(icmrPct)}% met)</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Smart Insight - Bento Item */}
                        <View style={[styles.bentoItem, styles.ayurCard, { width: '100%', borderLeftWidth: 4, borderLeftColor: theme.primary }]}>
                            <View style={styles.insightHeader}>
                                <Ionicons name="bulb" size={18} color={theme.primary} />
                                <Text style={[styles.ayurTitle, { color: theme.primary }]}>Daily Strategy</Text>
                            </View>
                            <Text style={[styles.ayurText, { color: theme.textMuted }]}>
                                {todayData.calories === 0
                                    ? 'No meals logged yet. Start logging to reveal your daily strategy.'
                                    : todayData.calories < 1200
                                    ? 'Calorie intake is low. Focus on nutrient-dense complex carbs like dalia or brown rice.'
                                    : todayData.protein < 40
                                    ? 'Protein gap detected. Consider adding chana or paneer to your next meal.'
                                    : todayData.fiber < 15
                                    ? 'Fiber intake is low. A side of raw cucumber or carrot can bridge the gap.'
                                    : 'Excellent balance today. Focus on maintaining hydration through the evening.'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* ── WEEK TAB ──────────────────────────────────────────── */}
                {activeTab === 'week' && (
                    <>
                        {weeklyLoading ? (
                            <View style={styles.loadingBox}>
                                <BarChartSkeleton />
                            </View>
                        ) : weeklyData.every(d => d.calories === 0) ? (
                            <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Text style={[styles.emptyIcon]}>📊</Text>
                                <Text style={[styles.emptyTitle, { color: theme.text }]}>No weekly data yet</Text>
                                <Text style={[styles.emptySub, { color: theme.textMuted }]}>Log meals across the week to see your trends here</Text>
                            </View>
                        ) : (
                            <>
                                {/* Weekly Calorie Bar Chart */}
                                <View style={[styles.card, { backgroundColor: isDark ? theme.card : Colors.SURFACE_ELEVATED, borderColor: theme.border }]}>
                                    <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Calories</Text>
                                    <View style={styles.barChart}>
                                        {weeklyData.map((day) => {
                                            const barH = maxWeekCal > 0
                                                ? Math.round((day.calories / maxWeekCal) * 120)
                                                : 0;
                                            const isToday = day.dateStr === todayDateStr;
                                            return (
                                                <View key={day.dateStr} style={styles.barCol}>
                                                    <Text style={styles.barVal}>
                                                        {day.calories > 0 ? `${Math.round(day.calories / 100) / 10}k` : '–'}
                                                    </Text>
                                                    <View style={styles.barWrapper}>
                                                        <LinearGradient
                                                            colors={isToday
                                                                ? [Colors.PRIMARY_DARK, Colors.PRIMARY]
                                                                : [Colors.SURFACE_DARK, Colors.BORDER]}
                                                            style={[styles.bar, { height: Math.max(barH, 4) }]}
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

                                {/* Weekly Protein Bar Chart */}
                                <View style={[styles.card, { backgroundColor: isDark ? theme.card : Colors.SURFACE_ELEVATED, borderColor: theme.border }]}>
                                    <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Protein</Text>
                                    <View style={styles.barChart}>
                                        {weeklyData.map((day) => {
                                            const maxProt = Math.max(...weeklyData.map(d => d.protein), 1);
                                            const barH = Math.round((day.protein / maxProt) * 100);
                                            const isToday = day.dateStr === todayDateStr;
                                            return (
                                                <View key={day.dateStr} style={styles.barCol}>
                                                    <Text style={styles.barVal}>
                                                        {day.protein > 0 ? `${Math.round(day.protein)}g` : '–'}
                                                    </Text>
                                                    <View style={styles.barWrapper}>
                                                        <LinearGradient
                                                            colors={isToday
                                                                ? [Colors.SECONDARY, '#FF8A80']
                                                                : [Colors.SURFACE_DARK, Colors.BORDER]}
                                                            style={[styles.bar, { height: Math.max(barH, 4) }]}
                                                        />
                                                    </View>
                                                    <Text style={[styles.barLabel, isToday && { color: Colors.SECONDARY, fontWeight: '700' }]}>
                                                        {day.label}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* AI Weekly Report Entry */}
                                <TouchableOpacity 
                                    style={[styles.aiReportBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                                    onPress={() => router.push('/weekly-report')}
                                >
                                    <Ionicons name="sparkles" size={20} color="#fff" />
                                    <Text style={styles.aiReportBtnText}>Generate AI Weekly Report</Text>
                                </TouchableOpacity>

                                {/* Weekly summary */}
                                <View style={[styles.card, { backgroundColor: isDark ? theme.card : Colors.SURFACE_ELEVATED, borderColor: theme.border }]}>
                                    <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Summary</Text>
                                    <StatRow label="Avg daily calories" value={`${Math.round(avgCalories)} kcal`}                                 color={Colors.PRIMARY} />
                                    <StatRow label="Avg daily protein"  value={`${Math.round(avgProtein)}g`}                                       color={Colors.SECONDARY} />
                                    <StatRow label="Days logged"         value={`${weeklyData.filter(d => d.calories > 0).length} / 7`} color={Colors.ACCENT} />
                                    <StatRow label="Diet Score (today)"  value={`${dietScore.score}/100 — Grade ${dietScore.grade}`}   color={Colors.SUCCESS} />
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </Animated.View>
    );
}

const sStyles = StyleSheet.create({
    row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
    label: { fontSize: 13, color: Colors.TEXT_MUTED },
    value: { fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: Colors.BACKGROUND },
    bentoContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    bentoItem:    { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.BORDER, backgroundColor: '#fff' },
    bentoLabel:   { fontSize: 13, fontWeight: '700', color: Colors.TEXT_MUTED, marginBottom: 8 },
    bentoSubLabel:{ fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 8, textAlign: 'center' },
    bentoCalRow:  { alignItems: 'center', justifyContent: 'center' },
    aiBento:      { padding: 14, marginBottom: 4 },
    aiIconBg:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    macroBentoList: { gap: 8, marginTop: 4 },
    macroBentoItem: { },
    macroBentoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    macroBentoName: { fontSize: 10, fontWeight: '800', width: 12 },
    macroBentoBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2 },
    macroBentoBarFill: { height: '100%', borderRadius: 2 },
    miniBento:    { padding: 12, alignItems: 'center', gap: 4, justifyContent: 'center' },
    miniBentoVal: { fontSize: 16, fontWeight: '800' },
    miniBentoLabel:{ fontSize: 10, fontWeight: '600', color: Colors.TEXT_MUTED },
    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    emptyState:   { margin: 16, borderRadius: 20, padding: 40, alignItems: 'center', borderWidth: 1 },
    emptyIcon:    { fontSize: 40, marginBottom: 12 },
    emptyTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    emptySub:     { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    header:       { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
    headerTitle:  { fontSize: 22, fontWeight: '800', color: '#fff' },
    headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
    pillRow:      { flexDirection: 'row', gap: 10 },
    pill:         { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
    pillVal:      { fontSize: 18, fontWeight: '800', color: '#fff' },
    pillLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    tabBar:       { flexDirection: 'row', backgroundColor: Colors.SURFACE, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
    tab:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive:    { borderBottomWidth: 2.5, borderBottomColor: Colors.PRIMARY },
    tabText:      { fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: '600' },
    tabTextActive: { color: Colors.PRIMARY, fontWeight: '800' },
    scroll:       { paddingHorizontal: 16, paddingTop: 16 },
    card:         { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    aiCard:       { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
    aiHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    aiTitle:      { fontSize: 16, fontWeight: '800' },
    aiText:       { fontSize: 14, lineHeight: 22, fontWeight: '500' },
    aiLoading:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    aiLoadingText:{ fontSize: 13, fontWeight: '600' },
    aiReportBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginTop: 12, marginBottom: 24, gap: 8 },
    aiReportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    cardTitle:    { fontSize: 15, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 14 },
    calorieRow:   { flexDirection: 'row', alignItems: 'center', gap: 20 },
    calorieCenter:{ alignItems: 'center' },
    calNum:       { fontSize: 18, fontWeight: '800', color: Colors.PRIMARY },
    calOf:        { fontSize: 10, color: Colors.TEXT_MUTED },
    calStats:     { flex: 1, gap: 4 },
    twoCol:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
    miniCard:     { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
    miniRingVal:  { fontSize: 13, fontWeight: '800' },
    miniCardVal:  { fontSize: 15, fontWeight: '800', color: Colors.TEXT_MAIN },
    miniCardLabel:{ fontSize: 10, color: Colors.TEXT_MUTED, textAlign: 'center' },
    macroItem:    { marginBottom: 12 },
    macroHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    macroName:    { fontSize: 13, fontWeight: '700', color: Colors.TEXT_MAIN },
    macroValues:  { fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: '600' },
    progressBg:   { height: 8, backgroundColor: Colors.SURFACE_DARK, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    icmrNote:     { fontSize: 10, color: Colors.TEXT_LIGHT, marginTop: 3 },
    ayurCard:     { backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.BORDER },
    ayurTitle:    { fontSize: 14, fontWeight: '700', color: Colors.ACCENT, marginBottom: 6 },
    ayurText:     { fontSize: 13, color: Colors.TEXT_MUTED, lineHeight: 20 },
    loadingBox:   { padding: 40, alignItems: 'center' },
    loadingText:  { fontSize: 14, color: Colors.TEXT_MUTED },
    barChart:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150, paddingBottom: 24, marginBottom: 8 },
    barCol:       { flex: 1, alignItems: 'center', gap: 4 },
    barWrapper:   { width: '70%', alignItems: 'center', justifyContent: 'flex-end', height: 120 },
    bar:          { width: '100%', borderRadius: 6 },
    barLabel:     { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: '600' },
    barVal:       { fontSize: 9,  color: Colors.TEXT_MUTED, fontWeight: '600' },
    legendRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot:    { width: 10, height: 10, borderRadius: 5 },
    legendText:   { fontSize: 11, color: Colors.TEXT_MUTED },
});
