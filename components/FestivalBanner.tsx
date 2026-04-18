import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { IndianFestival } from '../constants/IndianFestivals';

interface FestivalBannerProps {
  festival: IndianFestival;
  onDismiss?: () => void;
  onFastingMode?: () => void;
}

export default function FestivalBanner({ festival, onDismiss, onFastingMode }: FestivalBannerProps) {
  const hasFasting = festival.fastingType === 'full' || festival.fastingType === 'partial';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.emoji}>{festival.emoji}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.greetingHindi}>{festival.greetingHindi}</Text>
          <Text style={styles.greetingEng}>{festival.greetingEnglish}</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasFasting && (
        <>
          <View style={styles.divider} />
          <Text style={styles.fastingLabel}>🙏 Vrat ({festival.fastingType === 'full' ? 'Full Fast' : 'Partial Fast'})</Text>
          {festival.fastingRules && (
            <Text style={styles.fastingRules}>{festival.fastingRules}</Text>
          )}
          {festival.fastingFoods && festival.fastingFoods.length > 0 && (
            <View style={styles.foodChips}>
              {festival.fastingFoods.slice(0, 4).map((food, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>✅ {food}</Text>
                </View>
              ))}
            </View>
          )}
          {onFastingMode && (
            <TouchableOpacity style={styles.fastingModeBtn} onPress={onFastingMode}>
              <Text style={styles.fastingModeBtnText}>Enable Fasting Mode 🕉️</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.FESTIVAL_GOLD,
    shadowColor: Colors.FESTIVAL_GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  greetingHindi: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.TEXT_MAIN,
  },
  greetingEng: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  dismissBtn: {
    padding: 4,
  },
  dismissText: {
    fontSize: 16,
    color: Colors.TEXT_MUTED,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.FESTIVAL_GOLD,
    opacity: 0.3,
    marginVertical: 10,
  },
  fastingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.TURMERIC,
    marginBottom: 4,
  },
  fastingRules: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    lineHeight: 16,
    marginBottom: 8,
  },
  foodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: `${Colors.SUCCESS}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.SUCCESS}40`,
  },
  chipText: {
    fontSize: 10,
    color: Colors.SUCCESS,
    fontWeight: '600',
  },
  fastingModeBtn: {
    backgroundColor: Colors.TURMERIC,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  fastingModeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
