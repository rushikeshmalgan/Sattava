import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { Colors } from '../constants/Colors';
import { Strings } from '../constants/HindiStrings';

function getGreeting(name: string): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: `Suprabhat, ${name}!`, emoji: '🌅' };
  if (hour < 17) return { text: `Namaskar, ${name}!`, emoji: '☀️' };
  if (hour < 20) return { text: `Shubh Sandhya, ${name}!`, emoji: '🌆' };
  return { text: `Shubh Ratri, ${name}!`, emoji: '🌙' };
}

export default function HomeHeader() {
  const { user } = useUser();
  const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Swasth';
  const { text, emoji } = getGreeting(firstName);

  return (
    <View style={styles.container}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.greetingBlock}>
          <Text style={styles.appName}>🇮🇳 SwasthBharat</Text>
          <Text style={styles.greetingText}>{emoji} {text}</Text>
          <Text style={styles.tagline}>{Strings.APP_TAGLINE_HINDI}</Text>
        </View>

        {/* Avatar */}
        {user?.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingBlock: {
    flex: 1,
  },
  appName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.PRIMARY,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.TEXT_MAIN,
    lineHeight: 28,
  },
  tagline: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
    fontStyle: 'italic',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.PRIMARY,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
});
