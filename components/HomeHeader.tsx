import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { Colors } from '../constants/Colors';
import { showSmartToast } from './SmartToast';
import { Alert } from 'react-native';

function getGreeting(name: string): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: `Good Morning, ${name}!`, emoji: '🌅' };
  if (hour < 17) return { text: `Good Afternoon, ${name}!`, emoji: '☀️' };
  if (hour < 20) return { text: `Good Evening, ${name}!`, emoji: '🌆' };
  return { text: `Good Night, ${name}!`, emoji: '🌙' };
}

export default function HomeHeader() {
  const { user } = useUser();
  const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Swasth';
  const { text, emoji } = getGreeting(firstName);

  return (
    <View style={styles.container}>
      {/* Top row */}
      <View style={styles.topRow}>
        <TouchableOpacity 
          style={styles.greetingBlock} 
          activeOpacity={0.9}
        >
          <Text style={styles.appName}>Sattva</Text>
          <Text style={styles.greetingText}>{emoji} {text}</Text>
          <Text style={styles.tagline}>Your Intelligent Companion for Mindful Eating</Text>
        </TouchableOpacity>

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
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
    fontWeight: '500',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
});
