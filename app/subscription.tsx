import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Colors, Gradients } from '../constants/Colors';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

export default function Subscription() {
    const { theme, isDark } = useTheme();
    const router = useRouter();

    const handleSubscribe = async () => {
        try {
            await AsyncStorage.setItem('isPro', 'true');
            Alert.alert(
                "Welcome to Pro!",
                "Your 7-day free trial has started. All premium features are now unlocked.",
                [{ text: "Awesome", onPress: () => router.replace('/(tabs)/home') }]
            );
        } catch (e) {
            Alert.alert("Error", "Could not process subscription.");
        }
    };

    const features = [
        { icon: 'sparkles', text: 'AI Combo Builder (Budget + Protein optimized)', pro: true },
        { icon: 'chatbubbles', text: 'Multiple AI Coach Personalities (Strict/Friendly)', pro: true },
        { icon: 'document-text', text: 'Detailed Weekly AI Nutrition Reports', pro: true },
        { icon: 'notifications', text: 'Behavioral Nudges & Habit Reminders', pro: false },
        { icon: 'search', text: 'Unlimited Indian Food Search & Logging', pro: false },
        { icon: 'trophy', text: 'Streak Rewards & Locked Achievements', pro: true },
    ];

    const styles = getStyles(theme);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <LinearGradient colors={Gradients.PRIMARY} style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Ionicons name="diamond" size={60} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.headerTitle}>Sattva Pro</Text>
                    <Text style={styles.headerSub}>Unlock your full metabolic potential</Text>
                </LinearGradient>

                <View style={[styles.content, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Elevate Your Journey</Text>
                    
                    {features.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                            <View style={[styles.iconBg, { backgroundColor: feature.pro ? `${theme.primary}20` : `${Colors.SUCCESS}20` }]}>
                                <Ionicons name={feature.icon as any} size={20} color={feature.pro ? theme.primary : Colors.SUCCESS} />
                            </View>
                            <Text style={[styles.featureText, { color: theme.text }]}>{feature.text}</Text>
                            {feature.pro ? (
                                <View style={styles.proBadge}>
                                    <Text style={styles.proBadgeText}>PRO</Text>
                                </View>
                            ) : (
                                <View style={[styles.proBadge, { backgroundColor: `${Colors.SUCCESS}20`, borderColor: Colors.SUCCESS }]}>
                                    <Text style={[styles.proBadgeText, { color: Colors.SUCCESS }]}>FREE</Text>
                                </View>
                            )}
                        </View>
                    ))}

                    <View style={styles.pricingSection}>
                        <TouchableOpacity style={[styles.planCard, styles.activePlan, { borderColor: theme.primary }]}>
                            <View style={styles.planHeader}>
                                <Text style={[styles.planName, { color: theme.primary }]}>Monthly Pro</Text>
                                <View style={[styles.bestValue, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.bestValueText}>POPULAR</Text>
                                </View>
                            </View>
                            <Text style={[styles.planPrice, { color: theme.text }]}>₹199<Text style={styles.planDuration}>/month</Text></Text>
                            <Text style={styles.planDesc}>Perfect for serious fitness goals</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.planCard, { borderColor: theme.border }]}>
                            <View style={styles.planHeader}>
                                <Text style={[styles.planName, { color: theme.text }]}>Quarterly Pro</Text>
                            </View>
                            <Text style={[styles.planPrice, { color: theme.text }]}>₹499<Text style={styles.planDuration}>/3 months</Text></Text>
                            <Text style={styles.planDesc}>Save 15% on long-term health</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
                        <LinearGradient 
                            colors={Gradients.PRIMARY} 
                            start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                            style={styles.subscribeGradient}
                        >
                            <Text style={styles.subscribeText}>Start 7-Day Free Trial</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    <Text style={styles.cancelText}>Cancel anytime. No questions asked.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
    backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 16 },
    headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },
    content: { padding: 24, marginTop: -20, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 24 },
    featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
    iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    featureText: { flex: 1, fontSize: 14, fontWeight: '600' },
    proBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#1E7D5A', backgroundColor: '#1E7D5A10' },
    proBadgeText: { fontSize: 10, fontWeight: '800', color: '#1E7D5A' },
    pricingSection: { marginTop: 20, gap: 16 },
    planCard: { padding: 20, borderRadius: 20, borderWidth: 1 },
    activePlan: { backgroundColor: '#1E7D5A05', borderWidth: 2 },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    planName: { fontSize: 16, fontWeight: '800' },
    bestValue: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    bestValueText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    planPrice: { fontSize: 28, fontWeight: '900' },
    planDuration: { fontSize: 14, color: '#6B7280' },
    planDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    subscribeButton: { marginTop: 32, height: 60, borderRadius: 16, overflow: 'hidden', ...theme.shadow },
    subscribeGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    subscribeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    cancelText: { textAlign: 'center', color: '#9CA3AF', marginTop: 16, fontSize: 12 },
});
