/**
 * SwasthBharat — Diet Tab
 * Smart Indian Meal Planning Screen
 */
import { useUser } from '@clerk/clerk-expo';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, Modal, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '../../constants/Colors';
import { INDIAN_REGIONS, IndianRegion } from '../../constants/IndianRegions';
import { Strings } from '../../constants/HindiStrings';
import { INDIAN_FOODS } from '../../data/indianFoods';
import { ScheduledMeal } from '../../data/mealPlans';
import {
  generateMealPlan, getTodaysSchedule, getUpcomingMeal,
  getWeeklyGroceryList, getMealIcon, MealPreferences, getMealStatus,
} from '../../services/mealSchedulerService';
import { searchLocalIndianFoods, getFoodsForMeal } from '../../services/indianFoodService';
import { IndianFood } from '../../data/indianFoods';

type DietType = 'Veg' | 'Non-Veg' | 'Vegan';
type GoalType = 'weight_loss' | 'maintain' | 'weight_gain' | 'muscle_gain';

const DIET_OPTIONS: { id: DietType; label: string; emoji: string; color: string }[] = [
  { id: 'Veg',     label: 'Shaakahaari', emoji: '🟢', color: Colors.SUCCESS },
  { id: 'Non-Veg', label: 'Maansahaari', emoji: '🔴', color: Colors.ERROR },
  { id: 'Vegan',   label: 'Vegan',       emoji: '🌱', color: Colors.SECONDARY },
];

const GOAL_OPTIONS: { id: GoalType; label: string; emoji: string }[] = [
  { id: 'weight_loss',  label: 'Wajan Kam Karna', emoji: '⬇️' },
  { id: 'maintain',     label: 'Maintain Karna',  emoji: '⚖️' },
  { id: 'weight_gain',  label: 'Wajan Badhana',   emoji: '⬆️' },
  { id: 'muscle_gain',  label: 'Muscle Gain',      emoji: '💪' },
];

export default function DietScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const [todaysMeals, setTodaysMeals] = useState<ScheduledMeal[]>([]);
  const [nextMeal, setNextMeal] = useState<ScheduledMeal | null>(null);
  const [groceryList, setGroceryList] = useState<string[]>([]);
  const [showGrocery, setShowGrocery] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IndianFood[]>([]);
  const [activeTab, setActiveTab] = useState<'plan' | 'search' | 'fasting'>('plan');

  // Preferences
  const [selectedDiet, setSelectedDiet] = useState<DietType>('Veg');
  const [selectedGoal, setSelectedGoal] = useState<GoalType>('maintain');
  const [selectedRegion, setSelectedRegion] = useState<IndianRegion>('North');

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    const meals = await getTodaysSchedule();
    setTodaysMeals(meals);
    const next = await getUpcomingMeal();
    setNextMeal(next);
  };

  const handleGeneratePlan = async () => {
    const prefs: MealPreferences = {
      goal: selectedGoal,
      dietType: selectedDiet,
      region: selectedRegion,
      targetCalories: selectedGoal === 'weight_loss' ? 1500 : selectedGoal === 'weight_gain' ? 2500 : 2000,
    };
    await generateMealPlan(prefs);
    await loadPlan();
    setShowSetup(false);
    Alert.alert('✅ Plan Ready!', 'Tera naya meal plan ban gaya! Dekho aaj ka schedule.');
  };

  const handleSearchFood = (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      const results = searchLocalIndianFoods(q, 15);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const loadGrocery = async () => {
    const list = await getWeeklyGroceryList();
    setGroceryList(list);
    setShowGrocery(true);
  };

  const FASTING_FOODS = INDIAN_FOODS.filter(f => f.tags.some(t => ['fasting', 'light', 'ayurvedic'].includes(t)));
  const POPULAR_FOODS = INDIAN_FOODS.filter(f => f.tags.includes('popular')).slice(0, 10);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={Gradients.SAFFRON} style={styles.header}>
        <Text style={styles.headerTitle}>🍛 Diet & Meal Plan</Text>
        <Text style={styles.headerSubtitle}>Aapka Swasth Khane Ka Schedule</Text>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.setupBtn} onPress={() => setShowSetup(true)}>
            <Text style={styles.setupBtnText}>⚙️ Customize Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.groceryBtn} onPress={loadGrocery}>
            <Text style={styles.groceryBtnText}>🛒 Grocery List</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {([
          ['plan',    '📅 Today Plan'],
          ['search',  '🔍 Find Food'],
          ['fasting', '🕉️ Vrat Foods'],
        ] as [string, string][]).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, activeTab === id && styles.tabActive]}
            onPress={() => setActiveTab(id as any)}
          >
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Next Meal Pill */}
      {nextMeal && activeTab === 'plan' && (
        <LinearGradient colors={['#FF6B1A', Colors.PRIMARY]} style={styles.nextMealPill}>
          <Text style={styles.nextMealLabel}>⏰ Next: {nextMeal.label}</Text>
          <Text style={styles.nextMealTime}>{nextMeal.timeDisplay}</Text>
        </LinearGradient>
      )}

      {/* ─── Tab Content ─── */}
      {activeTab === 'plan' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}
        >
          {todaysMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>Koi plan nahi mila!</Text>
              <Text style={styles.emptySubtitle}>Apna Indian meal plan customize karo</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowSetup(true)}>
                <Text style={styles.emptyBtnText}>Setup Meal Plan →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todaysMeals.map(meal => {
              const status = getMealStatus(meal);
              const icon = getMealIcon(meal.mealCategory);
              return (
                <View key={meal.id} style={[styles.mealRow, status === 'current' && styles.mealRowCurrent]}>
                  <View style={styles.mealTimeCol}>
                    <Text style={styles.mealTimeText}>{meal.timeDisplay}</Text>
                  </View>
                  <View style={styles.mealInfoCol}>
                    <Text style={styles.mealRowLabel}>{icon} {meal.label} — {meal.labelHindi}</Text>
                    {meal.items.map((item, i) => (
                      <Text key={i} style={styles.mealRowFood}>• {item}</Text>
                    ))}
                    <Text style={styles.mealRowCal}>~{meal.estimatedCalories} kcal</Text>
                  </View>
                  <View style={[styles.statusDot, {
                    backgroundColor: status === 'past' ? Colors.SUCCESS : status === 'current' ? Colors.PRIMARY : Colors.BORDER
                  }]} />
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {activeTab === 'search' && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <TextInput
            style={styles.searchBar}
            placeholder="🔍 Search Indian foods... (e.g. Dal, Idli, Chai)"
            value={searchQuery}
            onChangeText={handleSearchFood}
            placeholderTextColor={Colors.TEXT_LIGHT}
          />

          {searchQuery.length < 2 && (
            <>
              <Text style={styles.sectionLabel}>⭐ Popular Indian Foods</Text>
              <FlatList
                data={POPULAR_FOODS}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <FoodSearchItem food={item} />}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <FoodSearchItem food={item} />}
              showsVerticalScrollIndicator={false}
            />
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🤷</Text>
              <Text style={styles.emptyTitle}>Nahi mila!</Text>
              <Text style={styles.emptySubtitle}>Try searching in English or Hindi</Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'fasting' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}>
          <View style={styles.fastingHeader}>
            <Text style={styles.fastingTitle}>🕉️ Vrat / Fasting Foods</Text>
            <Text style={styles.fastingSubtitle}>Safe foods for Navratri, Ekadashi, Ramadan & more</Text>
          </View>
          {FASTING_FOODS.map(food => (
            <FoodSearchItem key={food.id} food={food} />
          ))}
        </ScrollView>
      )}

      {/* ── Grocery Modal ── */}
      <Modal visible={showGrocery} animationType="slide" transparent onRequestClose={() => setShowGrocery(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>🛒 Hafte Ka Grocery List</Text>
            <ScrollView>
              {groceryList.map((item, i) => (
                <View key={i} style={styles.groceryItem}>
                  <Text style={styles.groceryNum}>{i + 1}.</Text>
                  <Text style={styles.groceryText}>{item}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowGrocery(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Setup Plan Modal ── */}
      <Modal visible={showSetup} animationType="slide" transparent onRequestClose={() => setShowSetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>⚙️ Customize Meal Plan</Text>
            <ScrollView>
              <Text style={styles.setupLabel}>Diet Type</Text>
              <View style={styles.chipRow}>
                {DIET_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.chip, selectedDiet === d.id && { backgroundColor: `${d.color}20`, borderColor: d.color }]}
                    onPress={() => setSelectedDiet(d.id)}
                  >
                    <Text style={[styles.chipText, selectedDiet === d.id && { color: d.color }]}>{d.emoji} {d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.setupLabel}>Your Goal</Text>
              <View style={styles.chipRow}>
                {GOAL_OPTIONS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, selectedGoal === g.id && { backgroundColor: `${Colors.PRIMARY}20`, borderColor: Colors.PRIMARY }]}
                    onPress={() => setSelectedGoal(g.id)}
                  >
                    <Text style={[styles.chipText, selectedGoal === g.id && { color: Colors.PRIMARY }]}>{g.emoji} {g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.setupLabel}>Region / Cuisine</Text>
              <View style={styles.chipRow}>
                {INDIAN_REGIONS.filter(r => r.id !== 'Pan-India').map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, selectedRegion === r.id && { backgroundColor: `${r.color}20`, borderColor: r.color }]}
                    onPress={() => setSelectedRegion(r.id as IndianRegion)}
                  >
                    <Text style={[styles.chipText, selectedRegion === r.id && { color: r.color }]}>{r.emoji} {r.id}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[styles.closeBtn, { flex: 1, backgroundColor: Colors.SURFACE_DARK }]} onPress={() => setShowSetup(false)}>
                <Text style={[styles.closeBtnText, { color: Colors.TEXT_MUTED }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.closeBtn, { flex: 1 }]} onPress={handleGeneratePlan}>
                <Text style={styles.closeBtnText}>Generate Plan 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FoodSearchItem({ food }: { food: IndianFood }) {
  const ratingColor =
    food.healthRating === 'Healthy' ? Colors.SUCCESS :
    food.healthRating === 'Moderate' ? Colors.PRIMARY :
    Colors.ERROR;

  const dietEmoji = food.dietType === 'Non-Veg' ? '🔴' : food.dietType === 'Vegan' ? '🌱' : '🟢';

  return (
    <View style={styles.foodCard}>
      <View style={styles.foodCardLeft}>
        <Text style={styles.foodName}>{food.name}</Text>
        <Text style={styles.foodNameHindi}>{food.nameHindi}</Text>
        <View style={styles.foodTagRow}>
          <Text style={styles.foodTag}>{dietEmoji} {food.dietType}</Text>
          <Text style={styles.foodTag}>📍 {food.region}</Text>
          <Text style={[styles.foodTag, { color: ratingColor }]}>● {food.healthRating}</Text>
        </View>
      </View>
      <View style={styles.foodCardRight}>
        <Text style={styles.foodCal}>{food.calories}</Text>
        <Text style={styles.foodCalLabel}>kcal</Text>
        <Text style={styles.foodServing}>{food.servingSize}</Text>
        <View style={styles.macroRow}>
          <Text style={styles.macroMini}>P:{food.protein}g</Text>
          <Text style={styles.macroMini}>C:{food.carbs}g</Text>
          <Text style={styles.macroMini}>F:{food.fat}g</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
  headerRow: { flexDirection: 'row', gap: 10 },
  setupBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  setupBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  groceryBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  groceryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.SURFACE, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.PRIMARY },
  tabText: { fontSize: 11, color: Colors.TEXT_MUTED, fontWeight: '600' },
  tabTextActive: { color: Colors.PRIMARY },
  nextMealPill: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextMealLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nextMealTime: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13 },
  mealRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.SURFACE_ELEVATED, borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: Colors.BORDER, gap: 10 },
  mealRowCurrent: { borderColor: Colors.PRIMARY, backgroundColor: `${Colors.PRIMARY}08` },
  mealTimeCol: { width: 70, alignItems: 'center', paddingTop: 2 },
  mealTimeText: { fontSize: 12, fontWeight: '700', color: Colors.PRIMARY },
  mealInfoCol: { flex: 1 },
  mealRowLabel: { fontSize: 13, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 4 },
  mealRowFood: { fontSize: 11, color: Colors.TEXT_MUTED, lineHeight: 16 },
  mealRowCal: { fontSize: 11, fontWeight: '700', color: Colors.ACCENT_GOLD, marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.TEXT_MUTED, textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.PRIMARY, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  searchBar: { backgroundColor: Colors.SURFACE, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: Colors.TEXT_MAIN, borderWidth: 1, borderColor: Colors.BORDER, marginTop: 12, marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.TEXT_MAIN, marginBottom: 8 },
  foodCard: { flexDirection: 'row', backgroundColor: Colors.SURFACE_ELEVATED, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.BORDER },
  foodCardLeft: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '700', color: Colors.TEXT_MAIN },
  foodNameHindi: { fontSize: 11, color: Colors.TEXT_MUTED, marginBottom: 4 },
  foodTagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  foodTag: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: '600' },
  foodCardRight: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 70 },
  foodCal: { fontSize: 22, fontWeight: '800', color: Colors.PRIMARY },
  foodCalLabel: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: '600' },
  foodServing: { fontSize: 10, color: Colors.TEXT_MUTED, marginTop: 2 },
  macroRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  macroMini: { fontSize: 9, color: Colors.TEXT_MUTED, fontWeight: '700' },
  fastingHeader: { paddingVertical: 12 },
  fastingTitle: { fontSize: 18, fontWeight: '800', color: Colors.TEXT_MAIN },
  fastingSubtitle: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.BACKGROUND, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.BORDER, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.TEXT_MAIN, marginBottom: 16 },
  groceryItem: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  groceryNum: { fontSize: 13, color: Colors.TEXT_MUTED, fontWeight: '600', width: 24 },
  groceryText: { fontSize: 13, color: Colors.TEXT_MAIN, flex: 1 },
  closeBtn: { backgroundColor: Colors.PRIMARY, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  setupLabel: { fontSize: 14, fontWeight: '700', color: Colors.TEXT_MAIN, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.BORDER, backgroundColor: Colors.SURFACE },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.TEXT_MUTED },
});
