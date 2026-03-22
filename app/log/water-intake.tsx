import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { addActivityLog } from '../../services/userService';

const WaterIntakeScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [waterAmount, setWaterAmount] = useState(0); // in ml
    const [isSaving, setIsSaving] = useState(false);

    const ML_PER_HALF_GLASS = 125;
    const ML_PER_FULL_GLASS = 250;
    const MAX_ML = 1000; // 4 glasses

    const handleIncrease = () => {
        if (waterAmount < MAX_ML) {
            setWaterAmount(prev => Math.min(prev + ML_PER_HALF_GLASS, MAX_ML));
        }
    };

    const handleDecrease = () => {
        if (waterAmount > 0) {
            setWaterAmount(prev => Math.max(prev - ML_PER_HALF_GLASS, 0));
        }
    };

    const handleLogWater = async () => {
        if (!user?.id) return;
        if (waterAmount <= 0) {
            alert("Please add some water first!");
            return;
        }

        setIsSaving(true);
        try {
            const dateString = new Date().toISOString().split('T')[0];
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Amount in ml for DB consistency
            const amountMl = waterAmount;

            await addActivityLog(user.id, dateString, {
                id: Date.now().toString(),
                name: 'Water Intake',
                calories: 0,
                time: timeString,
                type: 'water',
                amount: `${amountMl}ml`
            });

            router.replace('/(tabs)/home');
        } catch (error) {
            console.error('Failed to log water:', error);
            alert('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Render logic for glasses
    const renderGlasses = () => {
        const fullGlasses = Math.floor(waterAmount / ML_PER_FULL_GLASS);
        const hasHalf = (waterAmount % ML_PER_FULL_GLASS) >= ML_PER_HALF_GLASS;
        
        if (waterAmount === 0) {
            return (
                <Image 
                    source={require('../../assets/images/empty_glass.png')} 
                    style={styles.bigGlassImage}
                    resizeMode="contain"
                />
            );
        }

        const glassElements = [];
        for (let i = 0; i < fullGlasses; i++) {
            glassElements.push(
                <Image 
                    key={`full-${i}`}
                    source={require('../../assets/images/full_glass.png')} 
                    style={styles.glassImage}
                    resizeMode="contain"
                />
            );
        }
        if (hasHalf) {
            glassElements.push(
                <Image 
                    key="half"
                    source={require('../../assets/images/half_glass.png')} 
                    style={styles.glassImage}
                    resizeMode="contain"
                />
            );
        }

        return (
            <View style={styles.glassesGrid}>
                {glassElements}
            </View>
        );
    };

    return (
        <View style={styles.mainContainer}>
            <View style={{ height: insets.top, backgroundColor: Colors.BACKGROUND }} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.TEXT_MAIN} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Water Intake</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.displayContainer}>
                    {renderGlasses()}
                </View>

                <View style={styles.counterCard}>
                    <View style={styles.controlsRow}>
                        <TouchableOpacity 
                            style={styles.controlButton} 
                            onPress={handleDecrease}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="remove" size={32} color={Colors.PRIMARY} />
                        </TouchableOpacity>

                        <View style={styles.amountDisplay}>
                            <Text style={styles.amountText}>{waterAmount}</Text>
                            <Text style={styles.unitText}>ml</Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.controlButton} 
                            onPress={handleIncrease}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={32} color={Colors.PRIMARY} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>Tap + to add half glass (125ml)</Text>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={[styles.logButton, (isSaving || waterAmount <= 0) && { opacity: 0.6 }]}
                    onPress={handleLogWater}
                    disabled={isSaving || waterAmount <= 0}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.logButtonText}>Log Water</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default WaterIntakeScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    displayContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    bigGlassImage: {
        width: 120,
        height: 180,
    },
    glassImage: {
        width: 70,
        height: 100,
        margin: 5,
    },
    glassesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15,
    },
    controlButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${Colors.PRIMARY}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amountDisplay: {
        alignItems: 'center',
    },
    amountText: {
        fontSize: 48,
        fontWeight: '900',
        color: Colors.TEXT_MAIN,
    },
    unitText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginTop: -5,
    },
    helperText: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        fontWeight: '500',
    },
    footer: {
        padding: 24,
        backgroundColor: Colors.BACKGROUND,
    },
    logButton: {
        backgroundColor: Colors.PRIMARY,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    logButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    systemMask: {
        width: '100%',
        backgroundColor: Colors.BACKGROUND,
    },
});
